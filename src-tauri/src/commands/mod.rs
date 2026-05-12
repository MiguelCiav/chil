use crate::models::AppState;
use sea_orm::DatabaseConnection;

pub mod scraper;
pub mod member;


/// Core logic separated from Tauri's command wrapper.
/// This makes it easily testable with a mock database.
pub async fn check_db_connection(_db: &DatabaseConnection) -> Result<String, String> {
    // In a real app, you would perform a query here
    // e.g., user::Entity::find().all(db).await...
    Ok("Connected to SQLite successfully!".into())
}

/// Example command: verifies that the database connection is alive.
/// Remove this once real commands are added.
#[tauri::command]
pub async fn ping_db(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let db = state.db.lock().await;
    check_db_connection(&db).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::MockDatabase;

    #[tokio::test]
    async fn test_check_db_connection() {
        // Create a mock database
        let db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
            .into_connection();

        // Test the logic directly without needing Tauri State
        let result = check_db_connection(&db).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "Connected to SQLite successfully!");
    }
}
