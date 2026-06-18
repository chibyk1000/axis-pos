use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use futures_util::{SinkExt, StreamExt};
use local_ip_address::local_ip;
use mdns_sd::{ServiceDaemon, ServiceInfo};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{broadcast, oneshot, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::Message as WsMessage};
use tower_http::cors::{Any, CorsLayer};

// Global status struct
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub running: bool,
    pub ip: String,
    pub port: u16,
    pub store_name: String,
    pub store_id: String,
    pub device_name: String,
    pub live_requests: u64,
}

// Managed state for Tauri
pub struct SyncServerManager {
    pub server_tx: Mutex<Option<oneshot::Sender<()>>>,
    pub mdns_daemon: Mutex<Option<ServiceDaemon>>,
    pub mdns_service: Mutex<Option<ServiceInfo>>,
    pub status: Mutex<ServerStatus>,
    pub db_path: Mutex<Option<PathBuf>>,
    pub ws_tx: broadcast::Sender<String>,
}

impl SyncServerManager {
    pub fn new() -> Self {
        let (ws_tx, _) = broadcast::channel(100);
        Self {
            server_tx: Mutex::new(None),
            mdns_daemon: Mutex::new(None),
            mdns_service: Mutex::new(None),
            status: Mutex::new(ServerStatus {
                running: false,
                ip: String::new(),
                port: 8080,
                store_name: String::new(),
                store_id: String::new(),
                device_name: String::new(),
                live_requests: 0,
            }),
            db_path: Mutex::new(None),
            ws_tx,
        }
    }
}

// Axum Server State
struct AxumState {
    db_path: PathBuf,
    ws_tx: broadcast::Sender<String>,
    live_requests: Arc<AtomicU64>,
    device_name: String,
    store_id: String,
}

// Types for Requests/Responses
#[derive(Debug, Deserialize, Serialize)]
pub struct RegisterRequest {
    pub id: String,
    pub name: String,
    pub ip: String,
    pub role: String,
}

#[derive(Debug, Serialize)]
pub struct RegisterResponse {
    #[serde(rename = "deviceId")]
    pub device_id: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct PullQuery {
    #[serde(rename = "lastSequence")]
    pub last_sequence: i64,
    #[serde(rename = "deviceId")]
    pub device_id: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ChangeItem {
    pub entity: String,
    pub action: String,
    pub payload: Value,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PushRequest {
    #[serde(rename = "deviceId")]
    pub device_id: String,
    pub changes: Vec<ChangeItem>,
}

#[derive(Debug, Serialize, Clone)]
pub struct DiscoveredServer {
    pub name: String,
    pub ip: String,
    pub port: u16,
    #[serde(rename = "storeName")]
    pub store_name: String,
    #[serde(rename = "storeId")]
    pub store_id: String,
}

// Dynamic Sqlite Change Applier
fn apply_change(conn: &Connection, table: &str, action: &str, payload: &Value) -> Result<(), String> {
    let obj = payload.as_object().ok_or_else(|| "Payload is not a JSON object".to_string())?;
    if obj.is_empty() {
        return Ok(());
    }

    match action {
        "INSERT" | "UPDATE" => {
            let mut cols = Vec::new();
            let mut placeholders = Vec::new();
            let mut vals = Vec::new();

            for (k, v) in obj {
                cols.push(format!("`{}`", k));
                placeholders.push("?".to_string());
                vals.push(v.clone());
            }

            let cols_str = cols.join(", ");
            let placeholders_str = placeholders.join(", ");

            // Build INSERT OR REPLACE or ON CONFLICT statement
            let sql = if obj.contains_key("id") {
                let mut update_sets = Vec::new();
                for k in obj.keys() {
                    if k != "id" {
                        update_sets.push(format!("`{}` = excluded.`{}`", k, k));
                    }
                }
                if update_sets.is_empty() {
                    format!(
                        "INSERT INTO `{}` ({}) VALUES ({}) ON CONFLICT(id) DO NOTHING",
                        table, cols_str, placeholders_str
                    )
                } else {
                    format!(
                        "INSERT INTO `{}` ({}) VALUES ({}) ON CONFLICT(id) DO UPDATE SET {}",
                        table, cols_str, placeholders_str, update_sets.join(", ")
                    )
                }
            } else {
                // Junction tables
                let conflict_target = match table {
                    "product_taxes" => Some("(product_id, tax_id)"),
                    "promotion_customers" => Some("(promotion_id, customer_id)"),
                    "promotion_nodes" => Some("(promotion_id, node_id)"),
                    "promotion_products" => Some("(promotion_id, product_id)"),
                    _ => None,
                };

                if let Some(target) = conflict_target {
                    format!(
                        "INSERT INTO `{}` ({}) VALUES ({}) ON CONFLICT{} DO NOTHING",
                        table, cols_str, placeholders_str, target
                    )
                } else {
                    format!("INSERT OR REPLACE INTO `{}` ({}) VALUES ({})", table, cols_str, placeholders_str)
                }
            };

            let mut stmt = conn.prepare(&sql).map_err(|e| format!("Prepare error: {} (SQL: {})", e, sql))?;

            let params = rusqlite::params_from_iter(vals.iter().map(|v| -> Box<dyn rusqlite::types::ToSql> {
                match v {
                    Value::Null => Box::new(rusqlite::types::Null),
                    Value::Bool(b) => Box::new(*b),
                    Value::Number(num) => {
                        if let Some(i) = num.as_i64() {
                            Box::new(i)
                        } else if let Some(f) = num.as_f64() {
                            Box::new(f)
                        } else {
                            Box::new(rusqlite::types::Null)
                        }
                    }
                    Value::String(s) => Box::new(s.clone()),
                    _ => Box::new(v.to_string()),
                }
            }));

            stmt.execute(params).map_err(|e| format!("Execute error: {} (SQL: {})", e, sql))?;
        }
        "DELETE" => {
            if let Some(id_val) = obj.get("id") {
                let sql = format!("DELETE FROM `{}` WHERE `id` = ?", table);
                let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
                let id_str = match id_val {
                    Value::String(s) => s.clone(),
                    _ => id_val.to_string(),
                };
                stmt.execute([id_str]).map_err(|e| e.to_string())?;
            } else {
                let mut conds = Vec::new();
                let mut vals = Vec::new();
                for (k, v) in obj {
                    conds.push(format!("`{}` = ?", k));
                    vals.push(v.clone());
                }
                if conds.is_empty() {
                    return Ok(());
                }
                let sql = format!("DELETE FROM `{}` WHERE {}", table, conds.join(" AND "));
                let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
                let params = rusqlite::params_from_iter(vals.iter().map(|v| -> Box<dyn rusqlite::types::ToSql> {
                    match v {
                        Value::Null => Box::new(rusqlite::types::Null),
                        Value::Bool(b) => Box::new(*b),
                        Value::Number(num) => {
                            if let Some(i) = num.as_i64() {
                                Box::new(i)
                            } else if let Some(f) = num.as_f64() {
                                Box::new(f)
                            } else {
                                Box::new(rusqlite::types::Null)
                            }
                        }
                        Value::String(s) => Box::new(s.clone()),
                        _ => Box::new(v.to_string()),
                    }
                }));
                stmt.execute(params).map_err(|e| e.to_string())?;
            }
        }
        _ => return Err(format!("Unknown action: {}", action)),
    }

    Ok(())
}

// Dynamic triggers setup for SQLite
pub fn setup_database_triggers(conn: &Connection) -> Result<(), rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT name FROM sqlite_master \
         WHERE type='table' AND name NOT LIKE 'sqlite_%' \
         AND name NOT IN ('sync_queue', 'devices', 'drizzle_migrations')",
    )?;
    let tables: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .filter_map(|r| r.ok())
        .collect();

    for table in tables {
        let _ = conn.execute(&format!("DROP TRIGGER IF EXISTS `sync_{}_insert`", table), []);
        let _ = conn.execute(&format!("DROP TRIGGER IF EXISTS `sync_{}_update`", table), []);
        let _ = conn.execute(&format!("DROP TRIGGER IF EXISTS `sync_{}_delete`", table), []);

        let mut col_stmt = conn.prepare(&format!("PRAGMA table_info(`{}`)", table))?;
        let columns: Vec<(String, bool)> = col_stmt
            .query_map([], |row| {
                let name: String = row.get(1)?;
                let pk: i32 = row.get(5)?;
                Ok((name, pk > 0))
            })?
            .filter_map(|r| r.ok())
            .collect();

        if columns.is_empty() {
            continue;
        }

        let mut json_fields_new = Vec::new();
        let mut json_fields_old = Vec::new();
        for (col, _) in &columns {
            json_fields_new.push(format!("'{}', NEW.`{}`", col, col));
            json_fields_old.push(format!("'{}', OLD.`{}`", col, col));
        }
        let json_obj_new = format!("json_object({})", json_fields_new.join(", "));
        let json_obj_old = format!("json_object({})", json_fields_old.join(", "));

        let insert_trigger = format!(
            "CREATE TRIGGER IF NOT EXISTS `sync_{}_insert` AFTER INSERT ON `{}` \
             BEGIN \
                 INSERT INTO `sync_queue` (`entity`, `action`, `payload`, `created_at`, `device_id`) \
                 VALUES ('{}', 'INSERT', {}, strftime('%s', 'now') * 1000, 'local'); \
             END;",
            table, table, table, json_obj_new
        );
        conn.execute(&insert_trigger, [])?;

        let update_trigger = format!(
            "CREATE TRIGGER IF NOT EXISTS `sync_{}_update` AFTER UPDATE ON `{}` \
             BEGIN \
                 INSERT INTO `sync_queue` (`entity`, `action`, `payload`, `created_at`, `device_id`) \
                 VALUES ('{}', 'UPDATE', {}, strftime('%s', 'now') * 1000, 'local'); \
             END;",
            table, table, table, json_obj_new
        );
        conn.execute(&update_trigger, [])?;

        let delete_payload = if columns.iter().any(|(name, is_pk)| name == "id" && *is_pk) {
            "json_object('id', OLD.`id`)".to_string()
        } else {
            json_obj_old
        };

        let delete_trigger = format!(
            "CREATE TRIGGER IF NOT EXISTS `sync_{}_delete` AFTER DELETE ON `{}` \
             BEGIN \
                 INSERT INTO `sync_queue` (`entity`, `action`, `payload`, `created_at`, `device_id`) \
                 VALUES ('{}', 'DELETE', {}, strftime('%s', 'now') * 1000, 'local'); \
             END;",
            table, table, table, delete_payload
        );
        conn.execute(&delete_trigger, [])?;
    }

    Ok(())
}

// Request Counter Middleware Helper
struct RequestCounter {
    counter: Arc<AtomicU64>,
}

impl RequestCounter {
    fn new(counter: Arc<AtomicU64>) -> Self {
        counter.fetch_add(1, Ordering::SeqCst);
        Self { counter }
    }
}

impl Drop for RequestCounter {
    fn drop(&mut self) {
        self.counter.fetch_sub(1, Ordering::SeqCst);
    }
}

// --- Endpoints Handlers ---

async fn handle_health(State(state): State<Arc<AxumState>>) -> impl IntoResponse {
    let _counter = RequestCounter::new(state.live_requests.clone());
    Json(serde_json::json!({
        "status": "ok",
        "role": "admin",
        "store_id": state.store_id,
        "device_name": state.device_name
    }))
}

async fn handle_register(
    State(state): State<Arc<AxumState>>,
    Json(payload): Json<RegisterRequest>,
) -> impl IntoResponse {
    let _counter = RequestCounter::new(state.live_requests.clone());

    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let sql = "INSERT INTO `devices` (`id`, `name`, `ip`, `role`, `last_seen`) \
               VALUES (?, ?, ?, ?, strftime('%s', 'now') * 1000) \
               ON CONFLICT(id) DO UPDATE SET name=excluded.name, ip=excluded.ip, role=excluded.role, last_seen=excluded.last_seen";

    if let Err(e) = conn.execute(sql, rusqlite::params![payload.id, payload.name, payload.ip, payload.role]) {
        return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
    }

    // Broadcast to websockets
    let _ = state.ws_tx.send(serde_json::json!({
        "event": "device_registered",
        "device": {
            "id": payload.id,
            "name": payload.name,
            "ip": payload.ip,
            "role": payload.role
        }
    }).to_string());

    Json(RegisterResponse {
        device_id: payload.id,
        status: "registered".to_string(),
    })
    .into_response()
}

async fn handle_get_devices(State(state): State<Arc<AxumState>>) -> impl IntoResponse {
    let _counter = RequestCounter::new(state.live_requests.clone());

    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let mut stmt = match conn.prepare("SELECT `id`, `name`, `ip`, `role`, `last_seen` FROM `devices` ORDER BY last_seen DESC") {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let devices: Vec<Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "ip": row.get::<_, String>(2)?,
                "role": row.get::<_, String>(3)?,
                "last_seen": row.get::<_, i64>(4)?,
            }))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    Json(devices).into_response()
}

async fn handle_push(
    State(state): State<Arc<AxumState>>,
    Json(payload): Json<PushRequest>,
) -> impl IntoResponse {
    let _counter = RequestCounter::new(state.live_requests.clone());

    let mut conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let tx = match conn.transaction() {
        Ok(t) => t,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    // Apply all changes
    for change in &payload.changes {
        if let Err(err) = apply_change(&tx, &change.entity, &change.action, &change.payload) {
            return (StatusCode::BAD_REQUEST, format!("Failed to apply change on entity {}: {}", change.entity, err)).into_response();
        }
    }

    // Now update device_id of all changes that were just logged by the local triggers
    // to the incoming device_id so that this client won't fetch them back.
    if let Err(e) = tx.execute(
        "UPDATE `sync_queue` SET `device_id` = ? WHERE `device_id` = 'local'",
        rusqlite::params![payload.device_id],
    ) {
        return (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update sync_queue device_id: {}", e)).into_response();
    }

    if let Err(e) = tx.commit() {
        return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
    }

    // Update last seen for the device
    let _ = conn.execute(
        "UPDATE `devices` SET `last_seen` = strftime('%s', 'now') * 1000 WHERE `id` = ?",
        rusqlite::params![payload.device_id],
    );

    // Broadcast to all WS clients that changes were pushed
    let _ = state.ws_tx.send(serde_json::json!({
        "event": "changes_pushed",
        "deviceId": payload.device_id,
        "count": payload.changes.len()
    }).to_string());

    (StatusCode::OK, "pushed").into_response()
}

async fn handle_pull(
    State(state): State<Arc<AxumState>>,
    Query(query): Query<PullQuery>,
) -> impl IntoResponse {
    let _counter = RequestCounter::new(state.live_requests.clone());

    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    // If a device_id is provided, exclude their changes
    let rows = if let Some(ref d_id) = query.device_id {
        let sql = "SELECT `id`, `entity`, `action`, `payload`, `created_at` FROM `sync_queue` \
                   WHERE `id` > ? AND (`device_id` != ? OR `device_id` IS NULL) \
                   ORDER BY id ASC LIMIT 500";
        let mut stmt = match conn.prepare(sql) {
            Ok(s) => s,
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        };
        stmt
            .query_map(rusqlite::params![query.last_sequence, d_id], |row| {
                let id: i64 = row.get(0)?;
                let entity: String = row.get(1)?;
                let action: String = row.get(2)?;
                let payload_str: String = row.get(3)?;
                let created_at: i64 = row.get(4)?;
                let payload: Value = serde_json::from_str(&payload_str).unwrap_or(Value::Null);
                Ok(serde_json::json!({"sequence": id, "entity": entity, "action": action, "payload": payload, "created_at": created_at}))
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect::<Vec<Value>>()
    } else {
        let sql = "SELECT `id`, `entity`, `action`, `payload`, `created_at` FROM `sync_queue` \
                   WHERE `id` > ? ORDER BY id ASC LIMIT 500";
        let mut stmt = match conn.prepare(sql) {
            Ok(s) => s,
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        };
        stmt
            .query_map(rusqlite::params![query.last_sequence], |row| {
                let id: i64 = row.get(0)?;
                let entity: String = row.get(1)?;
                let action: String = row.get(2)?;
                let payload_str: String = row.get(3)?;
                let created_at: i64 = row.get(4)?;
                let payload: Value = serde_json::from_str(&payload_str).unwrap_or(Value::Null);
                Ok(serde_json::json!({"sequence": id, "entity": entity, "action": action, "payload": payload, "created_at": created_at}))
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect::<Vec<Value>>()
    };

    Json(rows).into_response()
}

// WebSocket connection handler
async fn handle_ws(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AxumState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| {
        let state = Arc::clone(&state);
        async move {
            handle_websocket_socket(socket, state).await
        }
    })
}

async fn handle_websocket_socket(socket: WebSocket, state: Arc<AxumState>) {
    let mut rx = state.ws_tx.subscribe();
    let live_req_clone = state.live_requests.clone();
    live_req_clone.fetch_add(1, Ordering::SeqCst);

    let (mut ws_sink, mut ws_stream) = socket.split();

    loop {
        tokio::select! {
            msg_res = ws_stream.next() => {
                match msg_res {
                    Some(Ok(Message::Ping(p))) => {
                        if ws_sink.send(Message::Pong(p)).await.is_err() {
                            break;
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
            broadcast_res = rx.recv() => {
                if let Ok(msg) = broadcast_res {
                    if ws_sink.send(Message::Text(msg.into())).await.is_err() {
                        break;
                    }
                }
            }
        }
    }

    live_req_clone.fetch_sub(1, Ordering::SeqCst);
}

// --- Tauri Commands ---

#[tauri::command]
pub async fn get_sync_server_status(
    state: tauri::State<'_, Arc<SyncServerManager>>,
) -> Result<ServerStatus, String> {
    let status = state.status.lock().await.clone();
    Ok(status)
}

#[tauri::command]
pub async fn start_sync_server(
    app: AppHandle,
    state: tauri::State<'_, Arc<SyncServerManager>>,
    device_name: String,
    store_name: String,
    store_id: String,
) -> Result<ServerStatus, String> {
    let mut status_lock = state.status.lock().await;
    if status_lock.running {
        return Ok(status_lock.clone());
    }

    let port = 8080;
    let local_ip_addr = local_ip().unwrap_or(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)));

    // Load db path
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data.join("data.db");

    // Initialize triggers in database on startup
    // Ensure sync-related tables exist in case migrations were applied to a different DB path
    {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        // Create minimal sync tables if they're missing (migrations may not have been applied
        // to this DB file depending on plugin configuration).
        conn.execute_batch(r#"
            CREATE TABLE IF NOT EXISTS `devices` (
                `id` text PRIMARY KEY NOT NULL,
                `name` text NOT NULL,
                `ip` text NOT NULL,
                `role` text NOT NULL,
                `last_seen` integer NOT NULL
            );
            CREATE TABLE IF NOT EXISTS `sync_queue` (
                `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                `entity` text NOT NULL,
                `action` text NOT NULL,
                `payload` text NOT NULL,
                `created_at` integer NOT NULL,
                `synced` integer DEFAULT 0 NOT NULL,
                `device_id` text
            );
        "#).map_err(|e| e.to_string())?;

        setup_database_triggers(&conn).map_err(|e| e.to_string())?;
    }

    *state.db_path.lock().await = Some(db_path.clone());

    let live_req_counter = Arc::new(AtomicU64::new(0));
    let live_req_counter_clone = live_req_counter.clone();

    let axum_state = Arc::new(AxumState {
        db_path,
        ws_tx: state.ws_tx.clone(),
        live_requests: live_req_counter,
        device_name: device_name.clone(),
        store_id: store_id.clone(),
    });

    let app_router = Router::new()
        .route("/health", get(handle_health))
        .route("/register", post(handle_register))
        .route("/devices", get(handle_get_devices))
        .route("/sync/push", post(handle_push))
        .route("/sync/pull", get(handle_pull))
        .route("/ws", get(handle_ws))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(axum_state);

    let addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(0, 0, 0, 0)), port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Failed to bind port: {}", e))?;

    let (tx, rx) = oneshot::channel::<()>();
    *state.server_tx.lock().await = Some(tx);

    // Spawn server task
    tokio::spawn(async move {
        axum::serve(listener, app_router)
            .with_graceful_shutdown(async move {
                let _ = rx.await;
            })
            .await
            .unwrap();
    });

    // Start mDNS advertisement
    let mdns = ServiceDaemon::new().map_err(|e| e.to_string())?;
    let service_type = "_axis-pos._tcp.local.";
    let instance_name = format!("axis-pos-{}", store_id);

    let mut properties = HashMap::new();
    properties.insert("store_name".to_string(), store_name.clone());
    properties.insert("store_id".to_string(), store_id.clone());
    properties.insert("server_ip".to_string(), local_ip_addr.to_string());
    properties.insert("port".to_string(), port.to_string());
    properties.insert("device_name".to_string(), device_name.clone());

    let service_info = ServiceInfo::new(
        service_type,
        &instance_name,
        &format!("{}.local.", instance_name),
        local_ip_addr.to_string(),
        port,
        Some(properties),
    )
    .map_err(|e| e.to_string())?;

    mdns.register(service_info.clone()).map_err(|e| e.to_string())?;

    *state.mdns_daemon.lock().await = Some(mdns);
    *state.mdns_service.lock().await = Some(service_info);

    // Update status
    status_lock.running = true;
    status_lock.ip = local_ip_addr.to_string();
    status_lock.port = port;
    status_lock.store_name = store_name;
    status_lock.store_id = store_id;
    status_lock.device_name = device_name;

    // Background task to keep status live_requests updated
    let state_clone = Arc::clone(&state);
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            let mut status = state_clone.status.lock().await;
            if !status.running {
                break;
            }
            status.live_requests = live_req_counter_clone.load(Ordering::SeqCst);
        }
    });

    Ok(status_lock.clone())
}

#[tauri::command]
pub async fn stop_sync_server(
    state: tauri::State<'_, Arc<SyncServerManager>>,
) -> Result<ServerStatus, String> {
    let mut status_lock = state.status.lock().await;
    if !status_lock.running {
        return Ok(status_lock.clone());
    }

    // Stop Axum Server
    if let Some(tx) = state.server_tx.lock().await.take() {
        let _ = tx.send(());
    }

    // Stop mDNS advertisement
    if let Some(mdns) = state.mdns_daemon.lock().await.take() {
        if let Some(service) = state.mdns_service.lock().await.take() {
            let _ = mdns.unregister(&service.get_fullname());
        }
        let _ = mdns.shutdown();
    }

    status_lock.running = false;
    status_lock.ip = String::new();
    status_lock.live_requests = 0;

    Ok(status_lock.clone())
}

#[tauri::command]
pub async fn discover_sync_servers() -> Result<Vec<DiscoveredServer>, String> {
    let mdns = ServiceDaemon::new().map_err(|e| e.to_string())?;
    let service_type = "_axis-pos._tcp.local.";
    let receiver = mdns.browse(service_type).map_err(|e| e.to_string())?;

    // Wait 2 seconds to gather resolved services
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    let mut servers = Vec::new();
    while let Ok(event) = receiver.try_recv() {
        if let mdns_sd::ServiceEvent::ServiceResolved(info) = event {
            let props = info.get_properties();
            let store_name = props.get_property_val_str("store_name")
                .unwrap_or_else(|| info.get_fullname())
                .to_string();
            let store_id = props.get_property_val_str("store_id")
                .unwrap_or("")
                .to_string();
            let device_name = props.get_property_val_str("device_name")
                .unwrap_or_else(|| info.get_fullname())
                .to_string();

            // Get IP Address from resolved info
            let ip_str = info.get_addresses().iter().next()
                .map(|a| a.to_string())
                .unwrap_or_else(|| info.get_hostname().replace(".local.", ""));

            servers.push(DiscoveredServer {
                name: device_name,
                ip: ip_str,
                port: info.get_port(),
                store_name,
                store_id,
            });
        }
    }

    let _ = mdns.shutdown();
    Ok(servers)
}

#[tauri::command]
pub async fn apply_sync_changes(
    app: AppHandle,
    changes: Vec<ChangeItem>,
) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data.join("data.db");
    let mut conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Set a transaction so everything is written together and rollback works
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    for change in &changes {
        if let Err(err) = apply_change(&tx, &change.entity, &change.action, &change.payload) {
            return Err(format!("Failed to apply pulled change in client: {}", err));
        }
    }

    // Clean up local triggers for these applied changes in cashier's sync_queue
    for change in &changes {
        if let Some(id_val) = change.payload.get("id") {
            let id_str = match id_val {
                serde_json::Value::String(s) => s.clone(),
                _ => id_val.to_string(),
            };
            let _ = tx.execute(
                "DELETE FROM `sync_queue` WHERE `entity` = ? AND `action` = ? AND (`payload` LIKE ? OR json_extract(`payload`, '$.id') = ?)",
                rusqlite::params![change.entity, change.action, format!("%\"id\":\"{}\"%", id_str), id_str]
            );
        } else {
            let payload_str = change.payload.to_string();
            let _ = tx.execute(
                "DELETE FROM `sync_queue` WHERE `entity` = ? AND `action` = ? AND `payload` = ?",
                rusqlite::params![change.entity, change.action, payload_str]
            );
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP PROXY COMMANDS
// All network calls to the LAN sync server go through Rust (reqwest) so they
// bypass Tauri's WebView CSP restrictions that block JS fetch() to LAN IPs.
// ─────────────────────────────────────────────────────────────────────────────

/// Register this terminal with the admin sync server.
#[tauri::command]
pub async fn sync_register(
    server_url: String,
    device_id: String,
    device_name: String,
) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "id": device_id,
        "name": device_name,
        "ip": "0.0.0.0",
        "role": "cashier",
    });
    let res = client
        .post(format!("{}/register", server_url))
        .json(&body)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(res.status().is_success())
}

/// Pull changes from the admin server since a given sequence number.
#[derive(Debug, Serialize)]
pub struct PullResult {
    pub changes: Vec<ChangeItem>,
    #[serde(rename = "maxSequence")]
    pub max_sequence: i64,
}

#[tauri::command]
pub async fn sync_pull(
    server_url: String,
    device_id: String,
    last_sequence: i64,
) -> Result<PullResult, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/sync/pull?lastSequence={}&deviceId={}",
        server_url, last_sequence, device_id
    );
    let res = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Pull request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Pull returned HTTP {}", res.status()));
    }

    // The server returns an array of objects each with entity/action/payload/sequence
    let raw: Vec<Value> = res
        .json()
        .await
        .map_err(|e| format!("Pull JSON parse error: {}", e))?;

    let mut max_sequence = last_sequence;
    let changes: Vec<ChangeItem> = raw
        .into_iter()
        .filter_map(|v| {
            if let Some(seq) = v.get("sequence").and_then(|s| s.as_i64()) {
                if seq > max_sequence {
                    max_sequence = seq;
                }
            }
            let entity = v.get("entity")?.as_str()?.to_string();
            let action = v.get("action")?.as_str()?.to_string();
            let payload = v.get("payload").cloned().unwrap_or(Value::Null);
            Some(ChangeItem { entity, action, payload })
        })
        .collect();

    Ok(PullResult { changes, max_sequence })
}

/// Connect to the admin server's WebSocket and forward messages to the
/// frontend as a Tauri event, since the WebView itself can't reach LAN
/// WebSocket endpoints directly.

#[tauri::command]
pub async fn connect_sync_ws(app: AppHandle, server_url: String) -> Result<(), String> {
    let ws_url = server_url.replacen("http", "ws", 1) + "/ws";
    let (ws_stream, _) = connect_async(&ws_url).await.map_err(|e| e.to_string())?;
    let (_, mut read) = ws_stream.split();

    tokio::spawn(async move {
        while let Some(Ok(WsMessage::Text(text))) = read.next().await {
            let _ = app.emit("sync-ws-event", text);
        }
    });

    Ok(())
}

/// Push local pending changes to the admin server.
/// Reads from the sync_queue table and marks them synced on success.
#[tauri::command]
pub async fn sync_push(
    app: AppHandle,
    server_url: String,
    device_id: String,
) -> Result<usize, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data.join("data.db");

    // Read pending changes from local DB
    let changes: Vec<(i64, ChangeItem)> = {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, entity, action, payload FROM sync_queue \
                 WHERE synced = 0 ORDER BY id ASC LIMIT 50",
            )
            .map_err(|e| e.to_string())?;

        let x = stmt.query_map([], |row| {
            let id: i64 = row.get(0)?;
            let entity: String = row.get(1)?;
            let action: String = row.get(2)?;
            let payload_str: String = row.get(3)?;
            let payload: Value =
                serde_json::from_str(&payload_str).unwrap_or(Value::Null);
            Ok((id, ChangeItem { entity, action, payload }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        x
    };

    if changes.is_empty() {
        return Ok(0);
    }

    let max_id = changes.last().map(|(id, _)| *id).unwrap_or(0);
    let items: Vec<&ChangeItem> = changes.iter().map(|(_, c)| c).collect();

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "deviceId": device_id,
        "changes": items,
    });

    let res = client
        .post(format!("{}/sync/push", server_url))
        .json(&body)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Push request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Push returned HTTP {}", res.status()));
    }

    // Mark synced
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE sync_queue SET synced = 1 WHERE id <= ?",
        rusqlite::params![max_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(changes.len())
}