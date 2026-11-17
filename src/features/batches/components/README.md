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
- `BatchDetail.tsx:BatchDetail` skips data loading when `batchId` is `NaN`, memoizes `reportBuckets` via `resolveBatchReportBuckets`, `eligibleBuckets` via `filterEligibleReportBuckets(reportBuckets)`, and `territorialBreakdown` via `calculateBatchTerritorialBreakdown`, renders `BatchTerritorialCard` below `BatchSummaryCards`, forwards optional scoped `bucketKey` PDF/ZIP downloads (looking up `targetBucket` in `eligibleBuckets`, returning early if an invalid `bucketKey` is passed, and forwarding `bucketSlug: targetBucket?.label`, `scopeLabel`, `initialTotal`, `onProgress`, and `signal` to `generateBatchCertificatesZip` through `useCertificateZipDownload`), passes `batch` to `MemberQuickViewModal`, and clears any pending toast timeout (`toastTimeoutRef`) on unmount.
- `BatchList.tsx:BatchList` initializes `activeFilters` with `{ id: 'date-this-year', type: 'date', label: 'Fecha', value: 'Este Año' }`, indexes `members` by `batch_id` once in `tableData` `useMemo` and projects each row via `deriveBatchTerritorialProjection` (including `eligibleCount`), executes row ZIP downloads via `useCertificateZipDownload` (falling back to `getBatchById`, `getMembersByBatchId`, and `getRecognitionTypeById` when local state lacks data, checking `signal.aborted` after metadata fetches, and guarding `downloadingId` inside the active task), derives `selectedBatches` (`BatchMergeOption[]`) with `groupTokens` and `consolidateMergedGroupTokens([row.groupTokens])`, replaces any existing filter of the same `type` in `handleApplyFilter`, and only shows the merge button when `selectedBatches.length >= 2`.
- `NewBatchWizard.tsx:NewBatchWizard` checks `getScraperSessionStatus` before creating/updating a batch or scraping `cedulas` in `onSubmitStep1`, surfaces `ScraperSessionError` via `ScraperAlertModals`, and renders `Step2ReviewConfirm` only when `currentStep === 2 && batchId !== null`.
- `SuccessPage.tsx:SuccessPage` falls back to the first batch returned by `getAllBatches()` when `location.state?.batchId` is absent, disables ZIP download when `eligibleCount === 0`, disables `"Descargar Lista"` when `downloadingReport || members.length === 0` (`handleDownloadReport` fetches hierarchy and calls `generateBatchReport`), and runs ZIP downloads via `useCertificateZipDownload` (checking `signal.aborted` after metadata fetches and rendering `CertificateZipProgressModal`).

## Side Effects
- `BatchDetail.tsx:BatchDetail`, `BatchList.tsx:BatchList`, `NewBatchWizard.tsx:NewBatchWizard`, and `SuccessPage.tsx:SuccessPage` fetch and mutate batch/member/hierarchy/recognition data via `../api` and `../../recognitions`, generate PDF/ZIP downloads (with `BatchDetail`, `BatchList`, and `SuccessPage` coordinating progress/cancellation in `CertificateZipProgressModal` and suppressing `window.alert` on `AbortError`), navigate via `useNavigate()`, manage auto-dismiss toast timers (`3000ms` default in `BatchDetail` single/list/edit and `BatchList` delete; `4000ms` in `BatchDetail` ZIP, `BatchList` ZIP/merge, `NewBatchWizard`, and `SuccessPage`, where `BatchList` and `SuccessPage` use uncleaned `setTimeout` calls), log errors to `console.error`, and show `window.alert` on non-abort failures.
- `BatchDetail.tsx:BatchDetail`, `BatchList.tsx:BatchList`, and `NewBatchWizard.tsx:NewBatchWizard` initialize `useWalkthrough` tours persisted per `user?.uid`.

## Verification
- Run: `npm test`
