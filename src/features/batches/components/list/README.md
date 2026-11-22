# Batch List Components

## Overview
Table columns, inline filter matching/formatting utilities, tour steps, and `MergeBatchesModal` used by `BatchList` to browse, filter, and merge recognition batches (with `DeleteBatchModal` imported from `../shared`).

## Interface
- `index.ts: *` (re-exports `./types`, `./batchListTour`, `./batchListFilters`, `./batchListColumns`, `./MergeBatchesModal`)
- `types.ts:BatchRowData`, `types.ts:BatchActionsCellProps`, `types.ts:BatchListColumnsParams`
- `batchListTour.ts:BATCH_LIST_TOUR_STEPS`
- `batchListFilters.ts:DatePeriodFilter`, `batchListFilters.ts:BatchListFilterValues`, `batchListFilters.ts:INITIAL_BATCH_LIST_FILTER_VALUES`, `batchListFilters.ts:hasActiveBatchListFilters`, `batchListFilters.ts:formatBatchDate`, `batchListFilters.ts:matchesRegionFilter`, `batchListFilters.ts:matchesDistrictFilter`, `batchListFilters.ts:matchesGroupFilter`, `batchListFilters.ts:matchesCompletenessFilter`, `batchListFilters.ts:matchesRecognitionFilter`, `batchListFilters.ts:matchesBatchSearchTerm`, `batchListFilters.ts:matchesBatchListFilters`, `batchListFilters.ts:getFilteredBatchRows`
- `batchListColumns.tsx:renderBatchDateCell`, `batchListColumns.tsx:renderTerritorialTokensCell`, `batchListColumns.tsx:renderBatchRegionCell`, `batchListColumns.tsx:renderBatchDistrictCell`, `batchListColumns.tsx:renderBatchGroupCell`, `batchListColumns.tsx:renderBatchCompletenessCell`, `batchListColumns.tsx:renderBatchRecognitionCell`, `batchListColumns.tsx:renderBatchMembersCell`, `batchListColumns.tsx:renderBatchActionsCell`, `batchListColumns.tsx:createBatchListColumns`
- `MergeBatchesModal.tsx:MergeBatchesModal`, `MergeBatchesModal.tsx:MergeBatchesModalProps`, `MergeBatchesModal.tsx:BatchMergeOption`, `MergeBatchesModal.tsx:default` (`export default MergeBatchesModal`)

## Invariants
- `types.ts:BatchRowData` includes `eligibleCount` (number of `'active'` or `'exceptional'` members in the batch) alongside `memberCount`, `pendingCount`, and territorial token projections.
- `batchListColumns.tsx:renderTerritorialTokensCell` renders up to 3 territorial pills per cell and a `+N` overflow badge (`title` listing hidden token labels) when `tokens.length > 3`.
- `batchListColumns.tsx:renderBatchActionsCell` disables `"Descargar reconocimientos (ZIP)"` when `downloadingId === rowData.id || rowData.eligibleCount === 0`.
- `batchListFilters.ts:matchesBatchListFilters` evaluates search text, recognition, territorial filters (`toTerritorialTokenKey` normalizing numeric IDs to `'id:<n>'` alongside `'nacional'`, `'0'`, `'no_scout'`), completeness, and date ranges (`matchesDateRange` from `src/utils/datePeriod.ts`).
- `MergeBatchesModal.tsx:MergeBatchesModal` uses `<ErrorAlert variant="compact">` and `<Field multiline>` primitives, computes its consolidated group preview via `consolidateMergedGroupTokens`, prevents submission and disables the merge button when `selectedBatches.length < 2` or `merging` is true, and blocks closing the modal while `merging` is true.

## Side Effects
- `MergeBatchesModal.tsx:MergeBatchesModal` invokes `mergeBatches` from `../../api` on form submit, mutating backend batch records and logging errors to `console.error` on failure.
- `batchListColumns.tsx:renderBatchActionsCell` closes the row action menu (`setOpenActionMenuId(null)`), triggers client-side navigation via `navigate(\`/lotes/${rowData.id}\`)`, and invokes parent callbacks `handleDownloadPDF(rowData.id)` (ZIP export + progress modal) and `handleDeleteClick(rowData)` (delete confirmation modal).

## Verification
- Run: `npm test`
