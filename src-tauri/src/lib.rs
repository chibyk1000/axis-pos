// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod sync_server;
use crate::commands::greet;
use rusqlite::Connection;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../migrations/0000_rich_daimon_hellstrom.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_paid_and_total_paid_to_documents",
            sql: include_str!("../migrations/0001_gigantic_violations.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_position_to_customers",
            sql: include_str!("../migrations/0002_bright_master_chief.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_sync_tables",
            sql: include_str!("../migrations/0003_sync_system.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .setup(|app: &mut tauri::App| {
            // Ensure DB triggers exist on every instance (admin and cashier)
            if let Ok(app_data) = app.path().app_data_dir() {
                let db_path: std::path::PathBuf = app_data.join("data.db");
                if let Ok(conn) = Connection::open(&db_path) {
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
            sync_server::start_sync_server,
            sync_server::stop_sync_server,
            sync_server::discover_sync_servers,
            sync_server::get_sync_server_status,
            sync_server::apply_sync_changes,
            sync_server::apply_sync_snapshot, // ← NEW
            sync_server::sync_register,
            sync_server::sync_pull,
            sync_server::sync_push,
            sync_server::sync_fetch_snapshot, // ← NEW
            sync_server::sync_push_snapshot,
            sync_server::connect_sync_ws,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}