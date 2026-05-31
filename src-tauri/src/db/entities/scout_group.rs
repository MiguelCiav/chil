use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "scout_group")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    pub district_id: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::district::Entity",
        from = "Column::DistrictId",
        to = "super::district::Column::Id"
    )]
    District,
    #[sea_orm(has_many = "super::unit::Entity")]
    Unit,
}

impl Related<super::district::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::District.def()
    }
}

impl Related<super::unit::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Unit.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
