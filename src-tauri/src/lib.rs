// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
use tauri_plugin_sql::{ Migration, MigrationKind};
use crate::commands::{greet,};


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations  = vec![
Migration {
    version: 1,
    description: "create_initial_tables",
    sql: include_str!("../migrations/0000_cynical_otto_octavius.sql"),
    kind: MigrationKind::Up,
}
    ];
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::new().add_migrations("sqlite:file:data.db", migrations).build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
