// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod models;
mod services;

use models::AppState;

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
            db: db_conn,
            http_client: reqwest::Client::builder()
                .cookie_store(true)
                .build()
                .expect("failed to create reqwest client"),
        })
        .invoke_handler(tauri::generate_handler![
            commands::ping_db,
            commands::scraper::login_scraper,
            commands::scraper::get_member_status,
            commands::scraper::save_scraper_credentials,
            commands::scraper::has_scraper_credentials,
            commands::member::create_member,
            commands::member::get_member,
            commands::member::get_all_members,
            commands::member::update_member,
            commands::member::delete_member,
            commands::batch::get_hierarchy_data,
            commands::batch::create_batch,
            commands::batch::get_all_batches,
            commands::batch::get_batch_details,
            commands::pdf::generate_batch_report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
