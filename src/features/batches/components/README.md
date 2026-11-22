# Batches Components

## Overview
Top-level page and workflow components for the batches feature (`BatchList`, `BatchDetail`, `NewBatchWizard`, and `SuccessPage`), orchestrating subcomponents, modals, API calls, certificate exports, and interactive walkthrough tours.

## Interface
- `BatchDetail.tsx:BatchDetail` (named and default export)
- `BatchList.tsx:BatchList` (named and default export; re-exports `FilterType`, `DateFilterMode`, `PredefinedPeriod`)
- `NewBatchWizard.tsx:NewBatchWizard` (named and default export)
- `SuccessPage.tsx:SuccessPage` (named and default export)
- Subdirectories:
  - `./detail/README.md`
  - `./list/README.md`
  - `./shared/README.md`
  - `./wizard/README.md`

## Invariants
- `BatchDetail.tsx:BatchDetail` skips data loading when `batchId` is `NaN`, memoizes `reportBuckets` via `resolveBatchReportBuckets`, `eligibleBuckets` via `filterEligibleReportBuckets(reportBuckets)`, and `territorialBreakdown` via `calculateBatchTerritorialBreakdown`, renders `BatchTerritorialCard` below `BatchSummaryCards`, forwards optional scoped `bucketKey` PDF/ZIP downloads (looking up `targetBucket` in `eligibleBuckets`, returning early if an invalid `bucketKey` is passed, passing `scopeLabel` and `initialTotal` to `useCertificateZipDownload.startDownload`, and forwarding `bucketSlug: targetBucket?.label`, `onProgress`, and `signal` to `generateBatchCertificatesZip`), passes `batch` to `MemberQuickViewModal`, renders `ErrorAlert variant="centered"` on load error or missing batch, and clears any pending toast timeout (`toastTimeoutRef`) on unmount.
- `BatchList.tsx:BatchList` initializes `activeFilters` with `{ id: 'date-this-year', type: 'date', label: 'Fecha', value: 'Este Año' }`, indexes `members` by `batch_id` once in `tableData` `useMemo` and projects each row via `deriveBatchTerritorialProjection` (including `eligibleCount`), renders `<ErrorAlert variant="inline">`, `<Card>`, `<DataTable bordered={false}>`, and `<Pagination mode="summary" counterFormat="count" itemLabel="lotes">`, executes row ZIP downloads via `useCertificateZipDownload` (falling back to `getBatchById` and `getMembersByBatchId` when local state lacks data, fetching `getRecognitionTypeById(targetBatch.recognition_type)` whenever `targetBatch.recognition_type` is truthy, checking `signal.aborted` after metadata fetches, and guarding `downloadingId` inside the active task), derives `selectedBatches` (`BatchMergeOption[]`) with `groupTokens` and `consolidateMergedGroupTokens([row.groupTokens])`, replaces any existing filter of the same `type` in `handleApplyFilter`, clears any pending `toastTimeoutRef` on unmount, and only shows the merge button when `selectedBatches.length >= 2`.
- `NewBatchWizard.tsx:NewBatchWizard` checks `getScraperSessionStatus` before creating/updating a batch or scraping `cedulas` in `onSubmitStep1`, surfaces `ScraperSessionError` via `ScraperAlertModals`, and renders `Step2ReviewConfirm` only when `currentStep === 2 && batchId !== null`.
- `SuccessPage.tsx:SuccessPage` falls back to the first batch returned by `getAllBatches()` when `location.state?.batchId` is absent, disables ZIP download when `eligibleCount === 0`, disables `"Descargar Lista"` when `downloadingReport || members.length === 0` (`handleDownloadReport` fetches hierarchy and calls `generateBatchReport`), and runs ZIP downloads via `useCertificateZipDownload` (checking `signal.aborted` after metadata fetches and rendering `CertificateZipProgressModal`).

## Side Effects
- `BatchDetail.tsx:BatchDetail`, `BatchList.tsx:BatchList`, `NewBatchWizard.tsx:NewBatchWizard`, and `SuccessPage.tsx:SuccessPage` fetch and mutate batch/member/hierarchy/recognition data via `../api` and `../../recognitions` (with `BatchDetail` and `BatchList` surfacing `<ErrorAlert>` retry banners on initial load failure), generate PDF/ZIP downloads (with `BatchDetail`, `BatchList`, and `SuccessPage` coordinating progress/cancellation in `CertificateZipProgressModal` and suppressing `window.alert` on `AbortError`), navigate via `useNavigate()`, manage auto-dismiss toast timers (`3000ms` default in `BatchDetail` single/list/edit and `BatchList` delete; `4000ms` in `BatchDetail` ZIP, `BatchList` ZIP/merge, `NewBatchWizard`, and `SuccessPage`, where `NewBatchWizard` and `SuccessPage` use uncleaned `setTimeout` calls while `BatchList` and `BatchDetail` clean up via `toastTimeoutRef`), log errors to `console.error`, and show `window.alert` on non-abort failures.
- `BatchDetail.tsx:BatchDetail`, `BatchList.tsx:BatchList`, and `NewBatchWizard.tsx:NewBatchWizard` initialize `useWalkthrough` tours persisted per `user?.uid`.

## Verification
- Run: `npm test`
