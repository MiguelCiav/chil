use crate::models::AppState;
use crate::services::scraper_service::{self, MemberDetails};
use tauri::State;

#[tauri::command]
pub async fn login(
    state: State<'_, AppState>,
    email: String,
    password: String,
) -> Result<(), String> {
    scraper_service::login(&state.http_client, &email, &password).await
}

#[tauri::command]
pub async fn get_member_status(
    state: State<'_, AppState>,
    cedula: String,
) -> Result<MemberDetails, String> {
    scraper_service::get_member_status(&state.http_client, &cedula).await
}
