use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Shared application state injected into all Tauri commands.
pub struct AppState {
    pub db: Arc<Mutex<DatabaseConnection>>,
}
