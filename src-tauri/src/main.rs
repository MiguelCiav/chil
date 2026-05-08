// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod models;
mod services;

use models::AppState;
use std::sync::Arc;
use tokio::sync::Mutex;

fn main() {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let db_conn = runtime.block_on(async {
        db::establish_connection("sqlite://sqlite.db?mode=rwc")
            .await
            .expect("Failed to connect to SQLite database")
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            db: Arc::new(Mutex::new(db_conn)),
        })
        .invoke_handler(tauri::generate_handler![
            commands::ping_db,
            // Register new commands here as features are added:
            // commands::your_module::your_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
