use crate::models::AppState;
use crate::services::pdf_service;

use tauri::{AppHandle, State, Manager};

#[tauri::command]
pub async fn generate_batch_report(
    app: AppHandle,
    state: State<'_, AppState>,
    batch_id: i32,
    output_path: Option<String>,
) -> Result<String, String> {
    let resolved_path = match output_path {
        Some(ref path) if !path.trim().is_empty() => std::path::PathBuf::from(path),
        _ => {
            let download_dir = app
                .path()
                .download_dir()
                .map_err(|e| format!("Failed to find download directory: {}", e))?;
            download_dir.join(format!("Reporte_Lote_{}.pdf", batch_id))
        }
    };

    let path_str = resolved_path
        .to_str()
        .ok_or_else(|| "Invalid output path characters".to_string())?;

    pdf_service::generate_batch_report(&state.db, batch_id, path_str).await
}
