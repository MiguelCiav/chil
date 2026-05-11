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
            http_client: reqwest::Client::builder()
                .cookie_store(true)
                .build()
                .expect("failed to create reqwest client"),
        })
        .invoke_handler(tauri::generate_handler![
            commands::ping_db,
            commands::scraper::login,
            commands::scraper::get_member_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
