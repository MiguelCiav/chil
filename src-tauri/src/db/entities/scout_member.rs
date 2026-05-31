use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "scout_member")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub identity: String, // "Cédula"
    pub first_name: String,
    pub last_name: String,
    pub birth_date: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub group_id: Option<i32>,
    pub unit_id: Option<i32>,
    pub member_type: String, // "young" or "adult"
    pub status: String,      // "active" or "pending"
    pub batch_id: Option<i32>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::scout_group::Entity",
        from = "Column::GroupId",
        to = "super::scout_group::Column::Id"
    )]
    ScoutGroup,
    #[sea_orm(
        belongs_to = "super::unit::Entity",
        from = "Column::UnitId",
        to = "super::unit::Column::Id"
    )]
    Unit,
    #[sea_orm(
        belongs_to = "super::batch::Entity",
        from = "Column::BatchId",
        to = "super::batch::Column::Id"
    )]
    Batch,
}

impl Related<super::scout_group::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ScoutGroup.def()
    }
}

impl Related<super::unit::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Unit.def()
    }
}

impl Related<super::batch::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Batch.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
