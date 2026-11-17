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
- `SummaryView.tsx:SummaryView`: `availableDistricts` excludes `d.id === 0` and `isNoAplicaDistrict(d)`, returning `[]` for `'nacional'` / `'0'` regions; `availableGroups` excludes `g.id === 0`, returning `[]` for `'0'` district or `'nacional'` / `'0'` regions; changing region clears `selectedDistrict` and `selectedGroup`, and changing district clears `selectedGroup`.
- `SummaryView.tsx:SummaryView`: `matchesSummaryFilters` checks trimmed case-insensitive search across 12 fields (`fullName`, `identity`, `batchCode`, `batchId`, `recognitionName`, `recognitionCode`, `regionName`, `districtName`, `groupName`, `unitLabel`, `memberTypeLabel`, `statusLabel`), recognition, hierarchy (`'nacional'` / `'0'` / ID), unit, memberType, status, and date period (`'this-year'`, `'this-month'`, `'last-30'`, `'last-90'`, `'custom'`); custom date inputs render only when `selectedDatePeriod === 'custom'`, and `'Limpiar filtros'` renders only when `hasActiveFilters` is `true`.
- `SummaryView.tsx:SummaryView`: Uses `@tanstack/react-table` with default `pageSize = 25` (`10 | 25 | 50 | 100` selector synced via `useEffect`); disables `"Descargar todo"` when `flatData.length === 0` and `"Descargar Excel"` / `"Descargar filtrados"` when `filteredData.length === 0`.

## Side Effects
- `SummaryView.tsx:SummaryView`: On `[user?.uid]` change, fetches via `Promise.all([getAllBatches(user?.uid), getAllMembers(user?.uid), getHierarchyData(), getAllRecognitionTypes(user?.uid)])` and logs failures with `console.error('Error loading summary data:', err)`.
- `SummaryView.tsx:SummaryView`: Triggers CSV downloads via `exportToExcel(flatData)` / `exportToExcel(filteredData)` and schedules uncleaned `4000ms` `setTimeout` timers for toast dismissal.

## Verification
- Run: `npm test -- --run`
