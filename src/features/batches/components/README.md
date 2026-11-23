# Batches Components

## Overview
Top-level page and workflow components for the batches feature (`BatchList`, `BatchDetail`, `NewBatchWizard`), orchestrating subcomponents, modals, API calls, certificate exports, and interactive walkthrough tours.

## Interface
- `BatchDetail.tsx:BatchDetail` (named and default export)
- `BatchList.tsx:BatchList` (named and default export)
- `NewBatchWizard.tsx:NewBatchWizard` (named and default export)
- Subdirectories:
  - `./detail/README.md`
  - `./list/README.md`
  - `./shared/README.md`
  - `./wizard/README.md`

## Invariants
- `BatchDetail.tsx:BatchDetail` skips data loading when `batchId` is `NaN`, memoizes `reportBuckets` via `resolveBatchReportBuckets`, `eligibleBuckets` via `filterEligibleReportBuckets(reportBuckets)`, and `territorialBreakdown` via `calculateBatchTerritorialBreakdown`, renders `BatchTerritorialCard` below `BatchSummaryCards`, forwards optional scoped `bucketKey` PDF/ZIP downloads (looking up `targetBucket` in `eligibleBuckets`, returning early if an invalid `bucketKey` is passed, passing `scopeLabel` and `initialTotal` to `useCertificateZipDownload.startDownload`, and forwarding `bucketSlug: targetBucket?.label`, `onProgress`, and `signal` to `generateBatchCertificatesZip`), passes `batch` to `MemberQuickViewModal`, renders `ErrorAlert variant="centered"` on load error or missing batch, and clears any pending toast timeout (`toastTimeoutRef`) on unmount.
- `BatchList.tsx:BatchList` manages inline `filters` (`BatchListFilterValues`, defaulting to `selectedDatePeriod: 'all'`) inside shared `<FilterCard>` (compact search row + collapsible `"Filtros"` panel with `<Select>`s for recognition, cascading `<HierarchyFilterSelects showGroup includeNoAplicaAlways includeNoScoutInGroup>`, completeness, period/custom dates, reset action, and removable summary chips via `buildCommonFilterBadges`), indexes `members` by `batch_id` once in `tableData` `useMemo` and projects each row via `deriveBatchTerritorialProjection` (including `eligibleCount`), renders `<ErrorAlert variant="inline">`, `<Card>`, `<DataTable bordered={false}>`, and `<Pagination mode="summary" counterFormat="count" itemLabel="lotes">`, executes row ZIP downloads via `useCertificateZipDownload` (falling back to `getBatchById` and `getMembersByBatchId` when local state lacks data, fetching `getRecognitionTypeById(targetBatch.recognition_type)` whenever `targetBatch.recognition_type` is truthy, checking `signal.aborted` after metadata fetches, and guarding `downloadingId` inside the active task), derives `selectedBatches` (`BatchMergeOption[]`) with `groupTokens` and `consolidateMergedGroupTokens([row.groupTokens])`, clears any pending `toastTimeoutRef` on unmount, and only shows the merge button when `selectedBatches.length >= 2`.
- `NewBatchWizard.tsx:NewBatchWizard` reuses `sessionStatus` from `ScraperSettingsContext` (falling back to `refreshSessionStatus` / `getScraperSessionStatus` only when `null`), scrapes only newly added delta cedulas on Step 2 -> Step 1 back-navigation using a 1-request probe followed by a 4-worker concurrency pool with a shared mid-batch `sessionExpired` circuit breaker, keeps Step 1 and Step 2 drafts in memory with 0 Firestore writes, renders `Step2ReviewConfirm` whenever `currentStep === 2`, and commits the batch and members atomically via `createBatchWithMembers` in `handleFinalizeBatch` before navigating to `/lotes/${batch.id}`.

## Side Effects
- `BatchDetail.tsx:BatchDetail`, `BatchList.tsx:BatchList`, and `NewBatchWizard.tsx:NewBatchWizard` fetch and mutate batch/member/hierarchy/recognition data via `../api` and `../../recognitions` (with `BatchDetail` and `BatchList` surfacing `<ErrorAlert>` retry banners on initial load failure), generate PDF/ZIP downloads (with `BatchDetail` and `BatchList` coordinating progress/cancellation in `CertificateZipProgressModal` and suppressing `window.alert` on `AbortError`), navigate via `useNavigate()`, manage auto-dismiss toast timers (`3000ms` default in `BatchDetail` single/list/edit and `BatchList` delete; `4000ms` in `BatchDetail` ZIP, `BatchList` ZIP/merge, and `NewBatchWizard`, with cleanup via `toastTimeoutRef`), log errors to `console.error`, and show `window.alert` on non-abort failures.
- `BatchDetail.tsx:BatchDetail`, `BatchList.tsx:BatchList`, and `NewBatchWizard.tsx:NewBatchWizard` initialize `useWalkthrough` tours persisted per `user?.uid`.

## Verification
- Run: `npm test`
