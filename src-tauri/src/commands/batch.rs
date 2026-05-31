use crate::db::entities::batch::Model as BatchModel;
use crate::models::AppState;
use crate::services::batch_service::{self, HierarchyData};

use tauri::State;

#[tauri::command]
pub async fn get_hierarchy_data(state: State<'_, AppState>) -> Result<HierarchyData, String> {
    let db = state.db.lock().await;
    batch_service::get_hierarchy_data(&db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_batch(
    state: State<'_, AppState>,
    name: String,
    region_id: i32,
    district_id: i32,
    group_id: i32,
) -> Result<BatchModel, String> {
    let db = state.db.lock().await;
    batch_service::create_batch(&db, name, region_id, district_id, group_id)
        .await
        .map_err(|e| e.to_string())
}
