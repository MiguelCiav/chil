use crate::models::AppState;
use crate::entities::scout_member::Model as ScoutMemberModel;
use crate::services::member_service;
use tauri::State;

#[tauri::command]
pub async fn create_member(state: State<'_, AppState>, member_data: ScoutMemberModel) -> Result<ScoutMemberModel, String> {
    let db = state.db.lock().await;
    member_service::create_member(&db, member_data).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_member(state: State<'_, AppState>, identity: String) -> Result<Option<ScoutMemberModel>, String> {
    let db = state.db.lock().await;
    member_service::get_member(&db, &identity).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_members(state: State<'_, AppState>) -> Result<Vec<ScoutMemberModel>, String> {
    let db = state.db.lock().await;
    member_service::get_all_members(&db).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_member(state: State<'_, AppState>, member_data: ScoutMemberModel) -> Result<ScoutMemberModel, String> {
    let db = state.db.lock().await;
    member_service::update_member(&db, member_data).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_member(state: State<'_, AppState>, identity: String) -> Result<u64, String> {
    let db = state.db.lock().await;
    let result = member_service::delete_member(&db, &identity).await.map_err(|e| e.to_string())?;
    Ok(result.rows_affected)
}
