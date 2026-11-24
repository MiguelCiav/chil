# Summary Feature Blueprint

## System Overview
The `summary` feature subsystem provides a consolidated, searchable, and filterable master table (`SummaryView`) of all issued recognition records across batches, with cascading Scout territory filters, TanStack Table pagination, and UTF-8 CSV/Excel export (`excelExport.ts`).

## Local Interface & Invariants
- **Public Barrel (`index.ts`)**:
  - `index.ts:*` re-exports `./components/SummaryView`, `./utils/excelExport`, and `./types`.
  - **Invariants**: None (pure barrel re-export module).
  - **Side Effects**: None.

## Subdirectories & System Boundaries
- **Components**: [`./components/README.md`](./components/README.md) — `SummaryView` master table, cascading filters, pagination, and export triggers.
- **Types**: [`./types/README.md`](./types/README.md) — `SummaryRowData` row model and legacy unused `SummaryFilterState` interface (active filter state is typed via `SummaryFilterValues` in `utils/summaryHelpers.ts`).
- **Utils**: [`./utils/README.md`](./utils/README.md) — CSV/Excel formatting and download utilities (`excelExport.ts`) and pure filtering, filter-state types (`SummaryFilterValues`), and label helpers (`summaryHelpers.ts`).
- **Shared Cross-Feature Utilities (`../../utils/`) & Domain UI (`../../domain/components/`)**: Canonical member-first hierarchy resolver (`memberHierarchy.ts`), shared date-period helpers (`datePeriod.ts`), and filter/table domain UI (`FilterCard`, `buildCommonFilterBadges`, `HierarchyFilterSelects`, `MemberStatusBadge`).

## Global Invariants
- **Row Aggregation & Territory Rules**: `SummaryView` joins every `ScoutMember` with its `Batch`, resolves hierarchy via `resolveMemberHierarchy` (`isNationalInstitutional` -> `'Nacional'`, `0`/missing/`'no aplica'` -> `'No aplica'`), and delegates cascading filter dropdowns and status pills to `HierarchyFilterSelects` and `MemberStatusBadge`.
- **CSV Export Formatting**: `excelExport.ts` prepends a UTF-8 BOM (`\uFEFF`), quotes all cells with `""` escaping, uses CRLF (`\r\n`) row separators, and defaults to `Resumen_Reconocimientos_${YYYY-MM-DD}.csv`.

## Global Side Effects
- **Firestore / Cross-Feature Reads**: `SummaryView` fetches `getAllBatches`, `getAllMembers`, `getHierarchyData` (from `../batches/api`), and `getAllRecognitionTypes` (from `../recognitions`) via `Promise.all` on `[user?.uid]` change, logging errors with `console.error`.
- **Browser Downloads & Timers**: `exportToExcel` creates a `Blob`, temporary `<a>` element, and `URL.createObjectURL`/`revokeObjectURL` download; `SummaryView` schedules and cleans up `4000ms` `setTimeout` timers (`toastTimeoutRef`) for toast notifications.

## System Verification
- Run: `npm test -- --run`
