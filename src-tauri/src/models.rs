use sea_orm::DatabaseConnection;

/// Shared application state injected into all Tauri commands.
pub struct AppState {
    pub db: DatabaseConnection,
    pub http_client: reqwest::Client,
}
