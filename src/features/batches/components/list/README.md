# Batch List Components

## Overview
Table columns, filter matching/formatting utilities, tour steps, and modals (`AddFilterModal`, `MergeBatchesModal`, `DeleteBatchModal`) used by `BatchList` to browse, filter, merge, and delete recognition batches.

## Interface
- `index.ts: *` (re-exports `./types`, `./batchListTour`, `./batchListFilters`, `./batchListColumns`, `./AddFilterModal`, `./DeleteBatchModal`, `./MergeBatchesModal`)
- `types.ts:FilterType`, `types.ts:DateFilterMode`, `types.ts:PredefinedPeriod`, `types.ts:BatchRowData`, `types.ts:BatchActionsCellProps`, `types.ts:BatchListColumnsParams`
- `batchListTour.ts:BATCH_LIST_TOUR_STEPS`
- `batchListFilters.ts:formatBatchDate`, `batchListFilters.ts:formatDateToDisplay`, `batchListFilters.ts:matchesPredefinedPeriod`, `batchListFilters.ts:matchesDateRange`, `batchListFilters.ts:matchesSpecificDate`, `batchListFilters.ts:matchesDateFilter`, `batchListFilters.ts:matchesRegionFilter`, `batchListFilters.ts:matchesDistrictFilter`, `batchListFilters.ts:matchesGroupFilter`, `batchListFilters.ts:matchesRecognitionFilter`, `batchListFilters.ts:matchesSingleFilter`, `batchListFilters.ts:matchesActiveFilters`, `batchListFilters.ts:getFilterLabelAndValue`, `batchListFilters.ts:isApplyFilterDisabled`
- `batchListColumns.tsx:renderBatchDateCell`, `batchListColumns.tsx:renderBatchRegionCell`, `batchListColumns.tsx:renderBatchDistrictCell`, `batchListColumns.tsx:renderBatchGroupCell`, `batchListColumns.tsx:renderBatchRecognitionCell`, `batchListColumns.tsx:renderBatchMembersCell`, `batchListColumns.tsx:renderBatchActionsCell`, `batchListColumns.tsx:renderBatchTableRows`, `batchListColumns.tsx:createBatchListColumns`
- `AddFilterModal.tsx:AddFilterModal`, `AddFilterModal.tsx:AddFilterModalProps`
- `DeleteBatchModal.tsx:DeleteBatchModal`, `DeleteBatchModal.tsx:DeleteBatchModalProps` (re-exported from `../shared/DeleteBatchModal`)
- `MergeBatchesModal.tsx:MergeBatchesModal`, `MergeBatchesModal.tsx:MergeBatchesModalProps`, `MergeBatchesModal.tsx:BatchMergeOption`, `MergeBatchesModal.tsx:default` (`export default MergeBatchesModal`)

## Invariants
- `batchListFilters.ts:matchesActiveFilters` requires every active filter chip in `activeFilters` to match (`every`).
- `AddFilterModal.tsx:AddFilterModal` resets its local filter inputs when closed or after applying a filter via `handleResetAndClose`.
- `MergeBatchesModal.tsx:MergeBatchesModal` prevents submission and disables the merge button when `selectedBatches.length < 2` or `merging` is true, and blocks closing the modal while `merging` is true.

## Side Effects
- `MergeBatchesModal.tsx:MergeBatchesModal` invokes `mergeBatches` from `../../api` on form submit, mutating backend batch records and logging errors to `console.error` on failure.
- `batchListColumns.tsx:renderBatchActionsCell` triggers client-side navigation via `navigate(\`/lotes/${rowData.id}\`)`.

## Verification
- Run: `npm test`
