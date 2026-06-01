use crate::db::entities::scout_member::{
    ActiveModel as ScoutMemberActiveModel, Entity as ScoutMember, Model as ScoutMemberModel,
};
use sea_orm::*;

use sea_orm::ActiveValue::Set;

/// Create a new scout member or update if already exists (upsert)
pub async fn create_member(
    db: &DatabaseConnection,
    member_data: ScoutMemberModel,
) -> Result<ScoutMemberModel, DbErr> {
    let existing = ScoutMember::find_by_id(member_data.identity.clone())
        .one(db)
        .await?;

    let active_model = ScoutMemberActiveModel {
        identity: Set(member_data.identity),
        first_name: Set(member_data.first_name),
        last_name: Set(member_data.last_name),
        birth_date: Set(member_data.birth_date),
        email: Set(member_data.email),
        phone: Set(member_data.phone),
        group_id: Set(member_data.group_id),
        unit_id: Set(member_data.unit_id),
        member_type: Set(member_data.member_type),
        status: Set(member_data.status),
        batch_id: Set(member_data.batch_id),
    };

    if existing.is_some() {
        active_model.update(db).await
    } else {
        active_model.insert(db).await
    }
}

/// Get a scout member by their identity (Cédula)
pub async fn get_member(
    db: &DatabaseConnection,
    identity: &str,
) -> Result<Option<ScoutMemberModel>, DbErr> {
    ScoutMember::find_by_id(identity.to_string()).one(db).await
}

/// Get all scout members
pub async fn get_all_members(db: &DatabaseConnection) -> Result<Vec<ScoutMemberModel>, DbErr> {
    ScoutMember::find().all(db).await
}

/// Update an existing scout member
pub async fn update_member(
    db: &DatabaseConnection,
    member_data: ScoutMemberModel,
) -> Result<ScoutMemberModel, DbErr> {
    // Convert Model to ActiveModel to update it
    // Note: This will update all fields.
    let active_model: ScoutMemberActiveModel = member_data.into_active_model();
    active_model.update(db).await
}

/// Delete a scout member by their identity
pub async fn delete_member(db: &DatabaseConnection, identity: &str) -> Result<DeleteResult, DbErr> {
    ScoutMember::delete_by_id(identity.to_string())
        .exec(db)
        .await
}
