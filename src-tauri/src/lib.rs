// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod sync_server;
use crate::commands::{
    greet,
    check_sql_server_installation,
    install_sql_server_localdb,
    import_aronium_bak,
    ensure_sqlcmd_available,
    export_database,
};
use rusqlite::{Connection, OptionalExtension};
use sha2::{Digest, Sha384};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

/// Single source of truth for the schema migrations: `(version, description,
/// sql)`. Both the `tauri_plugin_sql` migrator and the startup
/// `reconcile_sqlx_migrations` repair below are built from this, so a
/// backfilled checksum can never drift from what the plugin validates.
const MIGRATIONS: &[(i64, &str, &str)] = &[
    (
        1,
        "create_initial_tables",
        include_str!("../migrations/0000_rich_daimon_hellstrom.sql"),
    ),
    (
        2,
        "add_paid_and_total_paid_to_documents",
        include_str!("../migrations/0001_gigantic_violations.sql"),
    ),
    (
        3,
        "add_position_to_customers",
        include_str!("../migrations/0002_bright_master_chief.sql"),
    ),
    (
        4,
        "create_sync_tables",
        include_str!("../migrations/0003_sync_system.sql"),
    ),
    (
        5,
        "create_activity_logs",
        include_str!("../migrations/0004_activity_log.sql"),
    ),
];

fn table_exists(conn: &Connection, name: &str) -> Result<bool, rusqlite::Error> {
    let count: i64 = conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?1",
        [name],
        |r| r.get(0),
    )?;
    Ok(count > 0)
}

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, rusqlite::Error> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info(`{table}`)"))?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name == column {
            return Ok(true);
        }
    }
    Ok(false)
}

/// Returns true when the effect of migration `version` is already present in
/// the live schema — used to decide whether to backfill its bookkeeping row.
fn migration_effect_present(conn: &Connection, version: i64) -> Result<bool, rusqlite::Error> {
    Ok(match version {
        // Initial schema — every install that got anywhere has `barcodes`.
        1 => table_exists(conn, "barcodes")?,
        // Rebuild of docmentPayments; shipped in the same release as v1, so its
        // presence tracks v1 (there is no released build with only v1).
        2 => table_exists(conn, "barcodes")?,
        // ALTER … ADD `position`. Re-running this errors ("duplicate column"),
        // so detect it precisely by the column it adds.
        3 => column_exists(conn, "customers", "position")?,
        // LAN sync tables.
        4 => table_exists(conn, "sync_queue")?,
        // Activity log.
        5 => table_exists(conn, "activity_logs")?,
        _ => false,
    })
}

/// Repairs a `_sqlx_migrations` bookkeeping table that has lost rows while the
/// schema those migrations created still exists. In that state the plugin's
/// migrator re-runs migration 1 and dies with "table `barcodes` already
/// exists" (or, for the ALTER migrations, "duplicate column"). We backfill the
/// missing rows with the exact SHA-384 checksum sqlx computes (see
/// sqlx-core/migrate/migration.rs) so the migrator sees them as already
/// applied and skips them. Runs before the plugin migrates (it's driven from
/// the frontend's `Database.load`), so the fix is in place in time.
///
/// A genuinely fresh database (no `barcodes` table) is left untouched so the
/// plugin creates everything normally; a healthy database (rows already
/// present) is likewise untouched.
fn reconcile_sqlx_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Fresh DB — nothing to reconcile; let the plugin run all migrations.
    if !table_exists(conn, "barcodes")? {
        return Ok(());
    }

    // Legacy builds put sync triggers on `_sqlx_migrations`; they serialize the
    // BLOB `checksum` via json_object() and make the INSERTs below fail with
    // "JSON cannot hold BLOB values". Drop any that survive.
    for suffix in ["insert", "update", "delete"] {
        let _ = conn.execute(
            &format!("DROP TRIGGER IF EXISTS `sync__sqlx_migrations_{suffix}`"),
            [],
        );
    }

    // Ensure the bookkeeping table exists with sqlx's exact schema (no-op if
    // it already does).
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _sqlx_migrations (\
            version BIGINT PRIMARY KEY,\
            description TEXT NOT NULL,\
            installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\
            success BOOLEAN NOT NULL,\
            checksum BLOB NOT NULL,\
            execution_time BIGINT NOT NULL\
        );",
    )?;

    for &(version, description, sql) in MIGRATIONS {
        let already_recorded: Option<i64> = conn
            .query_row(
                "SELECT version FROM _sqlx_migrations WHERE version = ?1",
                [version],
                |r| r.get(0),
            )
            .optional()?;
        if already_recorded.is_some() {
            continue;
        }
        if !migration_effect_present(conn, version)? {
            continue;
        }
        let checksum = Sha384::digest(sql.as_bytes());
        conn.execute(
            "INSERT INTO _sqlx_migrations \
                (version, description, success, checksum, execution_time) \
             VALUES (?1, ?2, 1, ?3, -1)",
            rusqlite::params![version, description, checksum.as_slice()],
        )?;
        println!("[migration-repair] backfilled _sqlx_migrations version {version}");
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations: Vec<Migration> = MIGRATIONS
        .iter()
        .map(|&(version, description, sql)| Migration {
            version,
            description,
            sql,
            kind: MigrationKind::Up,
        })
        .collect();

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app: &mut tauri::App| {
            if let Ok(app_data) = app.path().app_data_dir() {
                let db_path: std::path::PathBuf = app_data.join("data.db");
                if let Ok(conn) = Connection::open(&db_path) {
                    // Repair a wiped `_sqlx_migrations` BEFORE the plugin tries
                    // to migrate (which happens later, from the frontend's
                    // Database.load) so it doesn't re-run migration 1 and die
                    // with "table `barcodes` already exists".
                    if let Err(e) = reconcile_sqlx_migrations(&conn) {
                        eprintln!("[migration-repair] failed: {e}");
                    }
                    // Ensure DB triggers exist on every instance (admin and cashier)
                    let _ = sync_server::setup_database_triggers(&conn);
                }
            }
            Ok(())
        })
        .manage(std::sync::Arc::new(sync_server::SyncServerManager::new()))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:data.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            // ── SQL Server / Aronium .bak import ──────────────────────────
            check_sql_server_installation,
            install_sql_server_localdb,
            import_aronium_bak,
            ensure_sqlcmd_available,
            export_database,
            // ── LAN Sync ──────────────────────────────────────────────────
            sync_server::start_sync_server,
            sync_server::stop_sync_server,
            sync_server::discover_sync_servers,
            sync_server::get_sync_server_status,
            sync_server::apply_sync_changes,
            sync_server::apply_sync_snapshot,
            sync_server::sync_register,
            sync_server::sync_pull,
            sync_server::sync_push,
            sync_server::sync_fetch_snapshot,
            sync_server::sync_push_snapshot,
            sync_server::connect_sync_ws,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}