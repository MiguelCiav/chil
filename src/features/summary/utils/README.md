# Summary Utils

## Overview
Provides CSV/Excel-compatible export utilities (`excelExport.ts`) for formatting, RFC-style quoting, UTF-8 BOM prepending, and triggering browser downloads of `SummaryRowData[]`, plus pure summary filtering, label formatting, and date matching helpers (`summaryHelpers.ts`).

## Interface
- `excelExport.ts:SUMMARY_EXCEL_HEADERS`: Constant `string[]` of 14 Spanish column headers.
- `excelExport.ts:formatSummaryRowForExport`: `(row: SummaryRowData) => string[]` extracting the 14 column values for a row.
- `excelExport.ts:generateSummaryCsv`: `(data: SummaryRowData[]) => string` serializing headers and rows with CRLF line endings and UTF-8 BOM (`\uFEFF`).
- `excelExport.ts:exportToExcel`: `(data: SummaryRowData[], filename?: string) => void` generating the CSV and triggering a browser download when `document` is defined.
- `summaryHelpers.ts`: Exports `MemberTypeFilter`, `RegistryStatusFilter`, `DatePeriodFilter` (re-exported from `src/utils/datePeriod.ts`), `SummaryFilterValues`, `SummaryFilterOptions`, `INITIAL_SUMMARY_FILTER_VALUES`, `DEFAULT_SUMMARY_FILTERS`, `hasActiveSummaryFilters`, `formatBatchDate`, `formatBatchCode`, `getMemberStatusLabel`, `getMemberTypeLabel`, `resolveHierarchyName`, `matchesDateRange` (re-exported from `src/utils/datePeriod.ts`), `matchesSummarySearchTerm`, `matchesSummaryFilters`, `getFilteredSummaryRows`.

## Invariants
- `excelExport.ts:formatSummaryRowForExport`: Maps missing/falsy string fields to `''`.
- `excelExport.ts:escapeCsvField`: Returns `'""'` for `null`/`undefined`, stringifies primitives, `JSON.stringify`s other values, and wraps in double quotes escaping internal `"` as `""`.
- `excelExport.ts:exportToExcel`: Defaults `filename` to `Resumen_Reconocimientos_${YYYY-MM-DD}.csv` (from `new Date().toISOString().split('T')[0]`), and appends `.csv` if trimmed filename does not end with `.csv` or `.xlsx` (case-insensitive).
- `summaryHelpers.ts:formatBatchDate`: Returns `'Fecha no disponible'` on missing or invalid dates; otherwise formats using the `es-ES` locale (`day: '2-digit'`, `month: 'short'`, `year: 'numeric'`).
- `summaryHelpers.ts:formatBatchCode`: Defaults missing or invalid `createdAt` years to `new Date().getFullYear()` and zero-pads `batchId` to 3 digits (`LT-YYYY-NNN`).
- `summaryHelpers.ts:matchesSummarySearchTerm`: Case-insensitively matches 12 fields (`fullName`, `identity`, `batchCode`, `String(batchId)`, `recognitionName`, `recognitionCode`, `regionName`, `districtName`, `groupName`, `unitLabel`, `memberTypeLabel`, `statusLabel`) while excluding `exceptionalReason` and `issueDate`.
- `summaryHelpers.ts:matchesSummaryFilters`: Differentiates `selectedRegion === 'nacional'` (`row.isNationalInstitutional`) from `'0'` (`row.regionId === 0 && !row.isNationalInstitutional`), while `selectedDistrict`/`selectedGroup` `'0'` checks `actualId === 0`; the `regions`, `districts`, and `groups` arrays declared on `SummaryFilterOptions` (and `DEFAULT_SUMMARY_FILTERS`) are currently unused by `matchesSummaryFilters` / `matchesHierarchyFilters`.

## Side Effects
- `excelExport.ts:exportToExcel`: When `typeof document !== 'undefined'`, creates a `Blob` (`text/csv;charset=utf-8;`), calls `URL.createObjectURL` / `URL.revokeObjectURL`, appends a temporary `<a>` element to `document.body`, calls `link.click()`, and removes it.

## Verification
- Run: `npm test -- --run`
