use crate::db::entities::batch::Model as BatchModel;
use crate::models::AppState;
use crate::services::batch_service::{self, HierarchyData, BatchDetails};

use tauri::State;

#[tauri::command]
pub async fn get_hierarchy_data(state: State<'_, AppState>) -> Result<HierarchyData, String> {
    batch_service::get_hierarchy_data(&state.db)
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
    batch_service::create_batch(&state.db, name, region_id, district_id, group_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_batches(state: State<'_, AppState>) -> Result<Vec<BatchModel>, String> {
    batch_service::get_all_batches(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_batch_details(
    state: State<'_, AppState>,
    batch_id: i32,
) -> Result<Option<BatchDetails>, String> {
    batch_service::get_batch_details(&state.db, batch_id)
        .await
        .map_err(|e| e.to_string())
}
