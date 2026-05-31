use sea_orm::{ConnectionTrait, Database, DatabaseConnection, DbErr};
use std::fs;
use std::path::Path;

pub mod entities;

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

    // Create tables if they don't exist
    let builder = db.get_database_backend();
    let schema = sea_orm::Schema::new(builder);

    let mut stmt = schema.create_table_from_entity(crate::db::entities::region::Entity);
    stmt.if_not_exists();
    db.execute(builder.build(&stmt)).await?;

    let mut stmt = schema.create_table_from_entity(crate::db::entities::district::Entity);
    stmt.if_not_exists();
    db.execute(builder.build(&stmt)).await?;

    let mut stmt = schema.create_table_from_entity(crate::db::entities::scout_group::Entity);
    stmt.if_not_exists();
    db.execute(builder.build(&stmt)).await?;

    let mut stmt = schema.create_table_from_entity(crate::db::entities::unit::Entity);
    stmt.if_not_exists();
    db.execute(builder.build(&stmt)).await?;

    let mut stmt = schema.create_table_from_entity(crate::db::entities::batch::Entity);
    stmt.if_not_exists();
    db.execute(builder.build(&stmt)).await?;

    let mut stmt = schema.create_table_from_entity(crate::db::entities::scout_member::Entity);
    stmt.if_not_exists();
    db.execute(builder.build(&stmt)).await?;

    // Alter scout_member to add batch_id column if it doesn't exist
    let _ = db
        .execute(sea_orm::Statement::from_string(
            builder,
            "ALTER TABLE scout_member ADD COLUMN batch_id INTEGER REFERENCES batch(id)".to_string(),
        ))
        .await;

    // Seed database if empty
    seed_database(&db).await?;

    Ok(db)
}

async fn seed_database(db: &DatabaseConnection) -> Result<(), DbErr> {
    use crate::db::entities::{district, region, scout_group, unit};
    use sea_orm::{ActiveModelTrait, EntityTrait, PaginatorTrait};

    let count = region::Entity::find().count(db).await?;
    if count == 0 {
        // Seed region 1: Región Metropolitana
        let r1 = region::ActiveModel {
            id: sea_orm::ActiveValue::Set(1),
            name: sea_orm::ActiveValue::Set("Región Metropolitana".to_string()),
        }
        .insert(db)
        .await?;

        // Distrito Sucre (under region 1)
        let d1 = district::ActiveModel {
            id: sea_orm::ActiveValue::Set(1),
            name: sea_orm::ActiveValue::Set("Distrito Sucre".to_string()),
            region_id: sea_orm::ActiveValue::Set(r1.id),
        }
        .insert(db)
        .await?;

        // Grupo Scouts 45 (under district 1)
        let g1 = scout_group::ActiveModel {
            id: sea_orm::ActiveValue::Set(1),
            name: sea_orm::ActiveValue::Set("Grupo Scouts 45".to_string()),
            district_id: sea_orm::ActiveValue::Set(d1.id),
        }
        .insert(db)
        .await?;

        // Unit for g1
        let _u1 = unit::ActiveModel {
            id: sea_orm::ActiveValue::Set(1),
            name: sea_orm::ActiveValue::Set("Manada".to_string()),
            group_id: sea_orm::ActiveValue::Set(g1.id),
        }
        .insert(db)
        .await?;

        // Seed region 2: Región Andina
        let r2 = region::ActiveModel {
            id: sea_orm::ActiveValue::Set(2),
            name: sea_orm::ActiveValue::Set("Región Andina".to_string()),
        }
        .insert(db)
        .await?;

        // Distrito Norte (under region 2)
        let d2 = district::ActiveModel {
            id: sea_orm::ActiveValue::Set(2),
            name: sea_orm::ActiveValue::Set("Distrito Norte".to_string()),
            region_id: sea_orm::ActiveValue::Set(r2.id),
        }
        .insert(db)
        .await?;

        // Grupo Scouts 12 (under district 2)
        let g2 = scout_group::ActiveModel {
            id: sea_orm::ActiveValue::Set(2),
            name: sea_orm::ActiveValue::Set("Grupo Scouts 12".to_string()),
            district_id: sea_orm::ActiveValue::Set(d2.id),
        }
        .insert(db)
        .await?;

        let _u2 = unit::ActiveModel {
            id: sea_orm::ActiveValue::Set(2),
            name: sea_orm::ActiveValue::Set("Tropa".to_string()),
            group_id: sea_orm::ActiveValue::Set(g2.id),
        }
        .insert(db)
        .await?;
    }
    Ok(())
}
