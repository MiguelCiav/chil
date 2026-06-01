use crate::db::entities::batch::Model as BatchModel;
use crate::models::AppState;
use crate::services::batch_service::{self, HierarchyData, BatchDetails};

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

#[tauri::command]
pub async fn get_all_batches(state: State<'_, AppState>) -> Result<Vec<BatchModel>, String> {
    let db = state.db.lock().await;
    batch_service::get_all_batches(&db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_batch_details(
    state: State<'_, AppState>,
    batch_id: i32,
) -> Result<Option<BatchDetails>, String> {
    let db = state.db.lock().await;
    batch_service::get_batch_details(&db, batch_id)
        .await
        .map_err(|e| e.to_string())
}
