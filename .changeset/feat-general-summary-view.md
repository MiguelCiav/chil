---
"chil": minor
---

Implement general summary view ("Resumen") and remove KPI cards from Batch List:
- Removed top KPI metric cards ("Total Generado", "Reconocimiento más común") from `BatchList.tsx`.
- Created dedicated `summary` feature module under `src/features/summary/`:
  - `SummaryView.tsx`: Global summary table built with TanStack Table displaying 12 columns (Fecha, Lote, Reconocimiento, Cédula, Nombre, Apellido, Tipo, Estatus, Código Rec., Región, Distrito, Grupo), instant global search across all fields, multi-dimensional filters (recognition, region/district/group hierarchy, member type, status, and date periods/custom ranges), table pagination, and empty state.
  - `excelExport.ts`: Excel/CSV export utility (`exportToExcel`) with UTF-8 BOM encoding and standard Spanish headers.
  - `types/index.ts`: `SummaryRowData` flat interface and filter types.
  - `index.ts`: Barrel exports for the module.
- Added navigation link for "Resumen" in `Navbar.tsx` (`to="/resumen"`) and route in `App.tsx`.
- Added unit tests in `SummaryView.test.tsx`, `excelExport.test.ts`, and updated `BatchList.test.tsx` and `Navbar.test.tsx`.
