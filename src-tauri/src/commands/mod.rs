use crate::models::AppState;
use crate::services;

pub mod batch;
pub mod member;
pub mod pdf;
pub mod scraper;

/// Example command: verifies that the database connection is alive by delegating
/// to the pure service layer.
#[tauri::command]
pub async fn ping_db(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let db = state.db.lock().await;
    services::system::check_db_connection(&db).await
}
