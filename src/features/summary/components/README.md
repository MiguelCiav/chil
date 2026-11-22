# Summary Components

## Overview
Implements `SummaryView`, the consolidated recognition summary table with multi-criteria filtering (search, recognition type, cascading territory, unit, member type, status, and date ranges), pagination, and CSV/Excel export.

## Interface
- `SummaryView.tsx:MemberTypeFilter`: Union type `'all' | 'young' | 'adult'`.
- `SummaryView.tsx:RegistryStatusFilter`: Union type `'all' | 'active' | 'pending' | 'exceptional'`.
- `SummaryView.tsx:DatePeriodFilter`: Union type `'all' | 'this-year' | 'this-month' | 'last-30' | 'last-90' | 'custom'`.
- `SummaryView.tsx:SummaryFilterOptions`: Interface for `getFilteredSummaryRows` filter inputs.
- `SummaryView.tsx:SummaryView`: Named export `React.FC` rendering the consolidated summary page.
- `SummaryView.tsx:default`: Default export of `SummaryView`.

## Invariants
- `SummaryView.tsx:SummaryView`: Aggregates `members` joined with `batches` (`batchMap`), `recognitionTypes` (matched by `id` or case-insensitive `name`, falling back to `getRecognitionName`), and hierarchy resolved via `resolveMemberHierarchy` (`isNationalInstitutional` -> `'Nacional'`, `0`/missing/`'no aplica'` -> `'No aplica'`).
- `SummaryView.tsx:SummaryView`: Wraps filter controls in `<Card>`, renders global search with `<SearchInput size="sm">`, dropdowns with `<Select size="sm">` and `<HierarchyFilterSelects showGroup>`, custom dates with `<Field size="sm">`, reset with `<Button variant="outline" size="sm">`, status pills via `<MemberStatusBadge />`, error banner via `<ErrorAlert variant="inline">`, and table/pagination inside `<Card>` with `<DataTable bordered={false}>` and `<Pagination mode="summary" counterFormat="summary-total" pageSizeOptions={[10, 25, 50, 100]}>`.
- `SummaryView.tsx:SummaryView`: Delegates pure row filtering (`getFilteredSummaryRows`) and formatting (`formatBatchDate`, `formatBatchCode`, `getMemberTypeLabel`, `getMemberStatusLabel`, `resolveHierarchyName`) to `../utils/summaryHelpers.ts`; custom date inputs render only when `selectedDatePeriod === 'custom'`, and `'Limpiar filtros'` renders only when `hasActiveFilters` is `true`.
- `SummaryView.tsx:SummaryView`: Initializes `@tanstack/react-table` with default `pageSize = 25`; disables `"Exportar todo"` when `flatData.length === 0`, and switches `"Exportar todo"` from `variant="primary"` to `variant="outline"` when `hasActiveFilters` is `true` while rendering `"Exportar filtrados"` (`variant="primary"`, disabled when `filteredData.length === 0`).

## Side Effects
- `SummaryView.tsx:SummaryView`: On `[user?.uid]` change (or `Reintentar` action on load error), fetches via `Promise.all([getAllBatches(user?.uid), getAllMembers(user?.uid), getHierarchyData(), getAllRecognitionTypes(user?.uid)])`, renders an `<ErrorAlert variant="inline">` retry banner on failure, and logs failures with `console.error('Error loading summary data:', err)`.
- `SummaryView.tsx:SummaryView`: Triggers CSV downloads via `exportToExcel(flatData)` / `exportToExcel(filteredData)` and schedules and cleans up `4000ms` `setTimeout` timers (`toastTimeoutRef`) for dismissible toast notifications.

## Verification
- Run: `npm test -- --run`
