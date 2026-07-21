use std::time::Duration;
use tauri::{AppHandle, Manager};

/// Export a consistent copy of the app's SQLite database to a user-chosen path.
///
/// Done in Rust (rather than the fs plugin's `copyFile`) for two reasons:
///   1. The destination is chosen by the user via a native save dialog and can
///      be anywhere (Documents, a USB drive, …). Expressing "any path" in the
///      fs capability scope is fragile; a Rust command has no such scope.
///   2. `VACUUM INTO` produces a clean, consistent single-file snapshot even
///      while the database is live in WAL mode — a raw file copy of `data.db`
///      can miss committed changes still sitting in the `-wal` sidecar, or
///      capture a torn state mid-checkpoint.
#[tauri::command]
pub fn export_database(app: AppHandle, dest_path: String) -> Result<(), String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data directory: {e}"))?;
    let db_path = app_data.join("data.db");
    if !db_path.exists() {
        return Err("Database file not found.".into());
    }

    // VACUUM INTO refuses to write to an existing file. The native save dialog
    // has already collected the user's overwrite confirmation, so clear any
    // existing file at the chosen path first.
    if std::path::Path::new(&dest_path).exists() {
        std::fs::remove_file(&dest_path)
            .map_err(|e| format!("Cannot overwrite existing file: {e}"))?;
    }

    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Cannot open database: {e}"))?;
    // Wait rather than fail if the app is mid-write when the backup starts.
    let _ = conn.busy_timeout(Duration::from_secs(30));

    // VACUUM INTO takes a string-literal filename, not a bind parameter. Paths
    // are safe as-is except for single quotes, which must be doubled.
    let escaped = dest_path.replace('\'', "''");
    conn.execute(&format!("VACUUM INTO '{escaped}'"), [])
        .map_err(|e| format!("Backup failed: {e}"))?;

    Ok(())
}
