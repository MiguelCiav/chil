# Batches Components

## Overview
Top-level page and workflow components for the batches feature (`BatchList`, `BatchDetail`, `NewBatchWizard`, `QuickRecognition`, and `SuccessPage`), orchestrating subcomponents, modals, API calls, certificate exports, and interactive walkthrough tours.

## Interface
- `BatchDetail.tsx:BatchDetail` (named and default export)
- `BatchList.tsx:BatchList` (named and default export; re-exports `FilterType`, `DateFilterMode`, `PredefinedPeriod`)
- `NewBatchWizard.tsx:NewBatchWizard` (named and default export)
- `QuickRecognition.tsx:QuickRecognition`
- `SuccessPage.tsx:SuccessPage` (named and default export)
- Subdirectories:
  - `./detail/README.md`
  - `./list/README.md`
  - `./quick/README.md`
  - `./shared/README.md`
  - `./wizard/README.md`

## Invariants
- `BatchDetail.tsx:BatchDetail` skips data loading when `batchId` is `NaN` and clears any pending toast timeout on unmount.
- `BatchList.tsx:BatchList` initializes `activeFilters` with `{ id: 'date-this-year', type: 'date', label: 'Fecha', value: 'Este Año' }`, replaces any existing filter of the same `type` in `handleApplyFilter`, and only shows the merge button when `selectedBatches.length >= 2`.
- `NewBatchWizard.tsx:NewBatchWizard` checks `getScraperSessionStatus` before creating/updating a batch or scraping `cedulas` in `onSubmitStep1`, surfaces `ScraperSessionError` via `ScraperAlertModals`, and renders `Step2ReviewConfirm` only when `currentStep === 2 && batchId !== null`.
- `QuickRecognition.tsx:QuickRecognition` toggles between `QuickRecognitionSuccess` (when `successData` is truthy) and the emission form driven by `useQuickRecognition`.
- `SuccessPage.tsx:SuccessPage` falls back to the first batch returned by `getAllBatches()` when `location.state?.batchId` is absent, and disables ZIP download when `eligibleCount === 0`.

## Side Effects
- `BatchDetail.tsx:BatchDetail`, `BatchList.tsx:BatchList`, `NewBatchWizard.tsx:NewBatchWizard`, and `SuccessPage.tsx:SuccessPage` fetch and mutate batch/member/hierarchy/recognition data via `../api` and `../../recognitions`, generate PDF/ZIP downloads, navigate via `useNavigate()`, log errors to `console.error`, and show `window.alert` on failures.
- `BatchDetail.tsx:BatchDetail`, `BatchList.tsx:BatchList`, `NewBatchWizard.tsx:NewBatchWizard`, and `QuickRecognition.tsx:QuickRecognition` initialize `useWalkthrough` tours persisted per `user?.uid`.

## Verification
- Run: `npm test`
