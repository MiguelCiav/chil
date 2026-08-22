---
"chil": minor
---

Implement US-04 (Visualización de Lotes / Issue #22) and US-05 (Detalle de Lote / Issue #23):
- Created `BatchList` component with TanStack Table, top KPI statistics, dynamic active filter chips bar, row action controls, and batch deletion modal with instant state removal and toast notification.
- Refined `BatchDetail` component with Top 3 KPI cards, member search filter, numbered pagination, CSV list export, client-side PDF generation, quick view modal, member editing modal, and batch deletion capability with redirect to `/lotes`.
- Implemented `deleteBatch(batchId)` in Batches API to atomically delete the batch document and all associated scout members from Firestore via `writeBatch`.
- Removed "Ruta de guardado local" banner, configuration modal, and associated API storage path functions.
- Fixed Navbar active link selection using `end` prop on `/lotes` and `/lotes/nuevo` NavLinks to prevent prefix collisions.
- Added comprehensive unit test suites for `BatchList`, `BatchDetail`, `Navbar`, and API with 100% test coverage.

