use sea_orm::{Database, DatabaseConnection, DbErr};
use std::fs;
use std::path::Path;

/// Establishes a connection to the SQLite database.
/// Creates the database file and parent directories if they don't exist.
/// In a real application, you would also run migrations here.
pub async fn establish_connection(db_url: &str) -> Result<DatabaseConnection, DbErr> {
    if db_url.starts_with("sqlite://") {
        let path_str = db_url.strip_prefix("sqlite://").unwrap();
        let file_path = path_str.split('?').next().unwrap_or(path_str);
        if file_path != ":memory:" && !file_path.contains("mode=memory") {
            let path = Path::new(file_path);
            if let Some(parent) = path.parent() {
                if !parent.as_os_str().is_empty() && !parent.exists() {
                    fs::create_dir_all(parent).map_err(|e| DbErr::Custom(e.to_string()))?;
                }
            }
            if !path.exists() {
                fs::File::create(path).map_err(|e| DbErr::Custom(e.to_string()))?;
            }
        }
    }

    let db = Database::connect(db_url).await?;

    // TODO: Run migrations when entities are defined
    // e.g., Migrator::up(&db, None).await?;

    Ok(db)
}
