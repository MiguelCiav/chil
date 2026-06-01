## Summary
El listado y detalle de lotes no se conectan a SQLite en Tauri (Fallback permanente en LocalStorage)

## Environment
- **Product/Service**: Chil Desktop App
- **Version/Milestone**: v0.6.0 (Módulo de Nuevo Lote)
- **Browser/OS**: Tauri Desktop WebView (Todas las plataformas)

## Reproduction Steps
1. Crear un lote en el asistente de creación en la app de escritorio de Tauri.
2. Tras la creación exitosa, navegar a la pestaña "Listado de lotes" o al panel de "Detalle de lote".
3. Observar que el listado de lotes se muestra vacío y el detalle del lote falla.

## Expected Behavior
El listado de lotes debe consultar los registros persistidos en la base de datos local de SQLite a través de comandos IPC de Tauri y mostrar el historial completo de lotes creados.

## Actual Behavior
La pantalla se muestra vacía de forma permanente y no carga los lotes creados, a pesar de que la inserción de cabecera e integrantes en la base de datos de SQLite finaliza con éxito.

## Technical Diagnosis & Root Cause
El problema se encuentra en la capa de API del frontend ([src/features/batches/api/index.ts](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/api/index.ts)). 

Mientras que comandos como `createBatch` y `getHierarchyData` cuentan con bifurcaciones para invocar comandos de Tauri (`isTauri === true`), las funciones encargadas de recuperar el listado e historial de lotes (`getAllBatches` y `getBatchById`) **carecen de implementación de IPC para Tauri**. En su lugar, leen de forma persistente e incondicional de `localStorage`:

```typescript
export async function getAllBatches(): Promise<Batch[]> {
  const batches = JSON.parse(safeGetItem('chil_batches') || '[]');
  return batches;
}
```

Dado que `createBatch` inserta con éxito en la SQLite local cuando corre dentro de Tauri (y no escribe en `localStorage`), al intentar listar los lotes se consulta un almacén de `localStorage` vacío, lo que invisibiliza el historial de base de datos.

Además, el backend de Rust en `commands/batch.rs` carece de comandos expuestos para recuperar todos los lotes (`get_all_batches`) o los detalles estructurados de un lote por su identificador (`get_batch_details`).

## Proposed Solution (Fix)
1.  **Backend (Rust)**:
    *   Implementar una función `get_all_batches(&db) -> Result<Vec<batch::Model>, DbErr>` en `services/batch_service.rs`.
    *   Crear e integrar los comandos de Tauri en `commands/batch.rs`:
        *   `get_all_batches(state: State<'_, AppState>) -> Result<Vec<BatchModel>, String>`
        *   `get_batch_details(state: State<'_, AppState>, batch_id: i32) -> Result<Option<BatchDetails>, String>` (delegando a la función de servicio existente `batch_service::get_batch_details`).
    *   Registrar ambos comandos en `main.rs`.
2.  **Frontend (TypeScript)**:
    *   Actualizar `src/features/batches/api/index.ts` implementando llamadas condicionales a Tauri para `getAllBatches` y `getBatchById` (mapeando a `get_batch_details`).

## Impact
**High** - Bloquea la visualización del historial y auditoría de lotes creados dentro de la aplicación de escritorio nativa de Tauri.
