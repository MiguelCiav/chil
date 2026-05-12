use crate::entities::scout_member::{Entity as ScoutMember, Model as ScoutMemberModel, ActiveModel as ScoutMemberActiveModel};
use sea_orm::*;

/// Create a new scout member
pub async fn create_member(db: &DatabaseConnection, member_data: ScoutMemberModel) -> Result<ScoutMemberModel, DbErr> {
    // Convert Model to ActiveModel to insert it
    let active_model: ScoutMemberActiveModel = member_data.into_active_model();
    active_model.insert(db).await
}

/// Get a scout member by their identity (Cédula)
pub async fn get_member(db: &DatabaseConnection, identity: &str) -> Result<Option<ScoutMemberModel>, DbErr> {
    ScoutMember::find_by_id(identity.to_string()).one(db).await
}

/// Get all scout members
pub async fn get_all_members(db: &DatabaseConnection) -> Result<Vec<ScoutMemberModel>, DbErr> {
    ScoutMember::find().all(db).await
}

/// Update an existing scout member
pub async fn update_member(db: &DatabaseConnection, member_data: ScoutMemberModel) -> Result<ScoutMemberModel, DbErr> {
    // Convert Model to ActiveModel to update it
    // Note: This will update all fields.
    let active_model: ScoutMemberActiveModel = member_data.into_active_model();
    active_model.update(db).await
}

/// Delete a scout member by their identity
pub async fn delete_member(db: &DatabaseConnection, identity: &str) -> Result<DeleteResult, DbErr> {
    ScoutMember::delete_by_id(identity.to_string()).exec(db).await
}
