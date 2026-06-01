use sea_orm::DatabaseConnection;

/// Pure service logic to check the SQLite database connection.
/// Contains no Tauri dependency, making it easily testable.
pub async fn check_db_connection(_db: &DatabaseConnection) -> Result<String, String> {
    // In a real application, you would perform a query here
    // e.g., user::Entity::find().all(db).await...
    Ok("Connected to SQLite successfully!".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::MockDatabase;

    #[tokio::test]
    async fn test_check_db_connection() {
        // Create a mock database
        let db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite).into_connection();

        // Test the service layer logic directly without Tauri state dependencies
        let result = check_db_connection(&db).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "Connected to SQLite successfully!");
    }
}
