# Batch List Components

## Overview
Table columns, filter matching/formatting utilities, tour steps, and modals (`AddFilterModal`, `MergeBatchesModal`, `DeleteBatchModal`) used by `BatchList` to browse, filter, merge, and delete recognition batches.

## Interface
- `index.ts: *` (re-exports `./types`, `./batchListTour`, `./batchListFilters`, `./batchListColumns`, `./AddFilterModal`, `./DeleteBatchModal`, `./MergeBatchesModal`)
- `types.ts:FilterType`, `types.ts:DateFilterMode`, `types.ts:PredefinedPeriod`, `types.ts:BatchRowData`, `types.ts:BatchActionsCellProps`, `types.ts:BatchListColumnsParams`
- `batchListTour.ts:BATCH_LIST_TOUR_STEPS`
- `batchListFilters.ts:formatBatchDate`, `batchListFilters.ts:formatDateToDisplay`, `batchListFilters.ts:matchesPredefinedPeriod`, `batchListFilters.ts:matchesDateRange`, `batchListFilters.ts:matchesSpecificDate`, `batchListFilters.ts:matchesDateFilter`, `batchListFilters.ts:matchesRegionFilter`, `batchListFilters.ts:matchesDistrictFilter`, `batchListFilters.ts:matchesGroupFilter`, `batchListFilters.ts:matchesCompletenessFilter`, `batchListFilters.ts:matchesRecognitionFilter`, `batchListFilters.ts:matchesSingleFilter`, `batchListFilters.ts:matchesActiveFilters`, `batchListFilters.ts:getFilterLabelAndValue`, `batchListFilters.ts:isApplyFilterDisabled`
- `batchListColumns.tsx:renderBatchDateCell`, `batchListColumns.tsx:renderTerritorialTokensCell`, `batchListColumns.tsx:renderBatchRegionCell`, `batchListColumns.tsx:renderBatchDistrictCell`, `batchListColumns.tsx:renderBatchGroupCell`, `batchListColumns.tsx:renderBatchCompletenessCell`, `batchListColumns.tsx:renderBatchRecognitionCell`, `batchListColumns.tsx:renderBatchMembersCell`, `batchListColumns.tsx:renderBatchActionsCell`, `batchListColumns.tsx:renderBatchTableRows`, `batchListColumns.tsx:createBatchListColumns`
- `AddFilterModal.tsx:AddFilterModal`, `AddFilterModal.tsx:AddFilterModalProps`
- `DeleteBatchModal.tsx:DeleteBatchModal`, `DeleteBatchModal.tsx:DeleteBatchModalProps` (re-exported from `../shared/DeleteBatchModal`)
- `MergeBatchesModal.tsx:MergeBatchesModal`, `MergeBatchesModal.tsx:MergeBatchesModalProps`, `MergeBatchesModal.tsx:BatchMergeOption`, `MergeBatchesModal.tsx:default` (`export default MergeBatchesModal`)

## Invariants
- `batchListColumns.tsx:renderTerritorialTokensCell` renders up to 3 territorial pills per cell and a `+N` overflow badge (`title` listing hidden token labels) when `tokens.length > 3`.
- `batchListFilters.ts:matchesActiveFilters` requires every active filter chip in `activeFilters` to match (`every`), matching territorial filters by canonical token `key` (`id:<n>`, `'nacional'`, `'0'`, `'no_scout'`) via `filter.filterValue ?? filter.value`.
- `AddFilterModal.tsx:AddFilterModal` excludes `id === 0` and `isNoAplicaDistrict` entries from base hierarchy loops, emits canonical token keys in `ActiveFilterChip.filterValue`, supports `'completeness'` (`'complete' | 'pending' | 'empty'`), and resets its local filter inputs when closed or after applying a filter via `handleResetAndClose`.
- `MergeBatchesModal.tsx:MergeBatchesModal` computes its consolidated group preview via `consolidateMergedGroupTokens`, prevents submission and disables the merge button when `selectedBatches.length < 2` or `merging` is true, and blocks closing the modal while `merging` is true.

## Side Effects
- `MergeBatchesModal.tsx:MergeBatchesModal` invokes `mergeBatches` from `../../api` on form submit, mutating backend batch records and logging errors to `console.error` on failure.
- `batchListColumns.tsx:renderBatchActionsCell` triggers client-side navigation via `navigate(\`/lotes/${rowData.id}\`)`.

## Verification
- Run: `npm test`
