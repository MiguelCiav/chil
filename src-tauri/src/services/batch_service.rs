use crate::db::entities::{batch, district, region, scout_group, scout_member};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, DbErr, EntityTrait,
    IntoActiveModel, QueryFilter, QueryOrder,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct GroupModel {
    pub id: i32,
    pub name: String,
    pub district_id: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct DistrictModel {
    pub id: i32,
    pub name: String,
    pub region_id: i32,
    pub groups: Vec<GroupModel>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct RegionModel {
    pub id: i32,
    pub name: String,
    pub districts: Vec<DistrictModel>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct HierarchyData {
    pub regions: Vec<RegionModel>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct BatchDetails {
    pub batch: batch::Model,
    pub region: region::Model,
    pub district: district::Model,
    pub group: scout_group::Model,
    pub members: Vec<scout_member::Model>,
}

/// Fetch ASV organizational hierarchy data structured into Region -> District -> Group
pub async fn get_hierarchy_data(db: &DatabaseConnection) -> Result<HierarchyData, DbErr> {
    let regions = region::Entity::find()
        .order_by_asc(region::Column::Name)
        .all(db)
        .await?;
    let districts = district::Entity::find()
        .order_by_asc(district::Column::Name)
        .all(db)
        .await?;
    let groups = scout_group::Entity::find()
        .order_by_asc(scout_group::Column::Name)
        .all(db)
        .await?;

    let mut region_models = Vec::new();

    for r in regions {
        let mut dist_models = Vec::new();
        for d in &districts {
            if d.region_id == r.id {
                let mut gp_models = Vec::new();
                for g in &groups {
                    if g.district_id == d.id {
                        gp_models.push(GroupModel {
                            id: g.id,
                            name: g.name.clone(),
                            district_id: g.district_id,
                        });
                    }
                }
                dist_models.push(DistrictModel {
                    id: d.id,
                    name: d.name.clone(),
                    region_id: d.region_id,
                    groups: gp_models,
                });
            }
        }
        region_models.push(RegionModel {
            id: r.id,
            name: r.name.clone(),
            districts: dist_models,
        });
    }

    Ok(HierarchyData {
        regions: region_models,
    })
}

/// Retrieve all batch records ordered by `created_at` descending
pub async fn get_all_batches(db: &DatabaseConnection) -> Result<Vec<batch::Model>, DbErr> {
    batch::Entity::find()
        .order_by_desc(batch::Column::CreatedAt)
        .all(db)
        .await
}

/// Creates a new batch and links active scout members of that scout group to it
pub async fn create_batch(
    db: &DatabaseConnection,
    name: String,
    region_id: i32,
    district_id: i32,
    group_id: i32,
) -> Result<batch::Model, DbErr> {
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let new_batch = batch::ActiveModel {
        name: Set(name),
        region_id: Set(region_id),
        district_id: Set(district_id),
        group_id: Set(group_id),
        created_at: Set(now),
        ..Default::default()
    };

    let saved_batch = new_batch.insert(db).await?;

    // Automatically associate active members belonging to this scout group to the batch
    let active_members = scout_member::Entity::find()
        .filter(scout_member::Column::GroupId.eq(Some(group_id)))
        .filter(scout_member::Column::Status.eq("active".to_string()))
        .all(db)
        .await?;

    for member in active_members {
        let mut active_member: scout_member::ActiveModel = member.into_active_model();
        active_member.batch_id = Set(Some(saved_batch.id));
        active_member.update(db).await?;
    }

    Ok(saved_batch)
}

/// Fetch batch details along with its geographic context and associated members
pub async fn get_batch_details(
    db: &DatabaseConnection,
    batch_id: i32,
) -> Result<Option<BatchDetails>, DbErr> {
    let batch_opt = batch::Entity::find_by_id(batch_id).one(db).await?;

    if let Some(batch) = batch_opt {
        let region = region::Entity::find_by_id(batch.region_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::Custom("Region not found".to_string()))?;

        let district = district::Entity::find_by_id(batch.district_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::Custom("District not found".to_string()))?;

        let group = scout_group::Entity::find_by_id(batch.group_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::Custom("Group not found".to_string()))?;

        let members = scout_member::Entity::find()
            .filter(scout_member::Column::BatchId.eq(Some(batch.id)))
            .all(db)
            .await?;

        Ok(Some(BatchDetails {
            batch,
            region,
            district,
            group,
            members,
        }))
    } else {
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::MockDatabase;

    #[tokio::test]
    async fn test_get_hierarchy_data() {
        let db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
            .append_query_results([vec![region::Model {
                id: 1,
                name: "Región Metropolitana".to_string(),
            }]])
            .append_query_results([vec![district::Model {
                id: 1,
                name: "Distrito Sucre".to_string(),
                region_id: 1,
            }]])
            .append_query_results([vec![scout_group::Model {
                id: 1,
                name: "Grupo Scouts 45".to_string(),
                district_id: 1,
            }]])
            .into_connection();

        let hierarchy = get_hierarchy_data(&db).await.unwrap();

        assert_eq!(hierarchy.regions.len(), 1);
        assert_eq!(hierarchy.regions[0].name, "Región Metropolitana");
        assert_eq!(hierarchy.regions[0].districts.len(), 1);
        assert_eq!(hierarchy.regions[0].districts[0].name, "Distrito Sucre");
        assert_eq!(hierarchy.regions[0].districts[0].groups.len(), 1);
        assert_eq!(
            hierarchy.regions[0].districts[0].groups[0].name,
            "Grupo Scouts 45"
        );
    }

    #[tokio::test]
    async fn test_create_batch() {
        let db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
            .append_query_results([vec![batch::Model {
                id: 1,
                name: "Lote Inicial".to_string(),
                region_id: 1,
                district_id: 1,
                group_id: 1,
                created_at: "2026-05-31 12:00:00".to_string(),
            }]])
            .append_query_results([vec![scout_member::Model {
                identity: "V-12345678".to_string(),
                first_name: "Juan".to_string(),
                last_name: "Perez".to_string(),
                birth_date: "2010-01-01".to_string(),
                email: None,
                phone: None,
                group_id: Some(1),
                unit_id: Some(1),
                member_type: "young".to_string(),
                status: "active".to_string(),
                batch_id: None,
            }]])
            .append_query_results([vec![scout_member::Model {
                identity: "V-12345678".to_string(),
                first_name: "Juan".to_string(),
                last_name: "Perez".to_string(),
                birth_date: "2010-01-01".to_string(),
                email: None,
                phone: None,
                group_id: Some(1),
                unit_id: Some(1),
                member_type: "young".to_string(),
                status: "active".to_string(),
                batch_id: Some(1),
            }]])
            .append_exec_results([
                sea_orm::MockExecResult {
                    last_insert_id: 1,
                    rows_affected: 1,
                },
                sea_orm::MockExecResult {
                    last_insert_id: 0,
                    rows_affected: 1,
                },
            ])
            .into_connection();

        let res = create_batch(&db, "Lote Inicial".to_string(), 1, 1, 1).await;
        assert!(res.is_ok());
        let batch = res.unwrap();
        assert_eq!(batch.id, 1);
        assert_eq!(batch.name, "Lote Inicial");
    }

    #[tokio::test]
    async fn test_get_batch_details() {
        let db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
            .append_query_results([vec![batch::Model {
                id: 1,
                name: "Lote Inicial".to_string(),
                region_id: 1,
                district_id: 1,
                group_id: 1,
                created_at: "2026-05-31 12:00:00".to_string(),
            }]])
            .append_query_results([vec![region::Model {
                id: 1,
                name: "Región Metropolitana".to_string(),
            }]])
            .append_query_results([vec![district::Model {
                id: 1,
                name: "Distrito Sucre".to_string(),
                region_id: 1,
            }]])
            .append_query_results([vec![scout_group::Model {
                id: 1,
                name: "Grupo Scouts 45".to_string(),
                district_id: 1,
            }]])
            .append_query_results([vec![scout_member::Model {
                identity: "V-12345678".to_string(),
                first_name: "Juan".to_string(),
                last_name: "Perez".to_string(),
                birth_date: "2010-01-01".to_string(),
                email: None,
                phone: None,
                group_id: Some(1),
                unit_id: Some(1),
                member_type: "young".to_string(),
                status: "active".to_string(),
                batch_id: Some(1),
            }]])
            .into_connection();

        let details = get_batch_details(&db, 1).await.unwrap().unwrap();
        assert_eq!(details.batch.name, "Lote Inicial");
        assert_eq!(details.region.name, "Región Metropolitana");
        assert_eq!(details.district.name, "Distrito Sucre");
        assert_eq!(details.group.name, "Grupo Scouts 45");
        assert_eq!(details.members.len(), 1);
        assert_eq!(details.members[0].first_name, "Juan");
    }

    #[tokio::test]
    async fn test_get_all_batches() {
        let db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
            .append_query_results([vec![
                batch::Model {
                    id: 2,
                    name: "Lote Reciente".to_string(),
                    region_id: 1,
                    district_id: 1,
                    group_id: 1,
                    created_at: "2026-05-31 13:00:00".to_string(),
                },
                batch::Model {
                    id: 1,
                    name: "Lote Inicial".to_string(),
                    region_id: 1,
                    district_id: 1,
                    group_id: 1,
                    created_at: "2026-05-31 12:00:00".to_string(),
                },
            ]])
            .into_connection();

        let batches = get_all_batches(&db).await.unwrap();

        assert_eq!(batches.len(), 2);
        assert_eq!(batches[0].id, 2);
        assert_eq!(batches[0].name, "Lote Reciente");
        assert_eq!(batches[1].id, 1);
        assert_eq!(batches[1].name, "Lote Inicial");
    }
}
