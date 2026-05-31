use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "unit")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    pub group_id: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::scout_group::Entity",
        from = "Column::GroupId",
        to = "super::scout_group::Column::Id"
    )]
    ScoutGroup,
    #[sea_orm(has_many = "super::scout_member::Entity")]
    ScoutMember,
}

impl Related<super::scout_group::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ScoutGroup.def()
    }
}

impl Related<super::scout_member::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ScoutMember.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
