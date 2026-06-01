use crate::models::AppState;
use crate::services::scraper_service::{self, MemberDetails};
use tauri::State;
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperCredentials {
    pub email: String,
    pub password: String,
}

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

#[tauri::command]
pub async fn save_scraper_credentials(
    app: tauri::AppHandle,
    credentials: ScraperCredentials,
) -> Result<(), String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    let file_path = config_dir.join("scraper_settings.json");
    let content = serde_json::to_string(&credentials).map_err(|e| e.to_string())?;
    fs::write(file_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_scraper_credentials(
    app: tauri::AppHandle,
) -> Result<Option<ScraperCredentials>, String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let file_path = config_dir.join("scraper_settings.json");
    if !file_path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let credentials: ScraperCredentials = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(Some(credentials))
}

