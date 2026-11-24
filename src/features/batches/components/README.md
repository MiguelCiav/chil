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
- `BatchDetail.tsx:BatchDetail` skips data loading when `batchId` is `NaN`, wires `useScraperSessionGuard` and `useBatchReverification` (post-emission Impeesa re-verification, `isReverifying` global mutation lock, and two-phase `ManualCodeAssignmentModal`), passes `lifecycle="emitted"` locks to `EditMemberModal`, supports atomic member edits via `saveBatchMemberUpdates`, individual deletion via `DeleteMemberModal`/`deleteBatchMember` (blocked when `members.length <= 1`), 2-step single-member addition via `AddSingleMemberCard`/`createMember`, pagination clamping (`autoResetPageIndex: false` + clamp `useEffect`), typed toast variants (`ToastVariant`), `BatchTerritorialCard`, and scoped PDF/ZIP exports via `useCertificateZipDownload`.
- `BatchList.tsx:BatchList` manages inline `filters` (`BatchListFilterValues`, defaulting to `selectedDatePeriod: 'all'`) inside shared `<FilterCard>`, hoists `membersByBatchId` into its own `useMemo` shared by `tableData` (`deriveBatchTerritorialProjection`) and `selectedBatches` (`BatchMergeOption.members` for 0-read deduplicated merge previews), executes row ZIP downloads via `useCertificateZipDownload`, clears any pending `toastTimeoutRef` on unmount, and only shows the merge button when `selectedBatches.length >= 2`.
- `NewBatchWizard.tsx:NewBatchWizard` uses `useScraperSessionGuard` and shared `runVerificationPool` (probe-first + 4-worker pool + session circuit breaker), lifts `codeMode` state across Step 1 <-> Step 2 navigation, keeps drafts in memory with 0 Firestore writes, and commits batch + members atomically via `createBatchWithMembers` (persisting defensive `code_mode`) before navigating to `/lotes/${batch.id}`.

## Side Effects
- `BatchDetail.tsx:BatchDetail`, `BatchList.tsx:BatchList`, and `NewBatchWizard.tsx:NewBatchWizard` fetch and mutate batch/member/hierarchy/recognition data via `../api` and `../../recognitions` (with `BatchDetail` and `BatchList` surfacing `<ErrorAlert>` retry banners on initial load failure), generate PDF/ZIP downloads (with `BatchDetail` and `BatchList` coordinating progress/cancellation in `CertificateZipProgressModal` and suppressing `window.alert` on `AbortError`), navigate via `useNavigate()`, manage auto-dismiss toast timers (`3000ms` default in `BatchDetail` single/list/edit and `BatchList` delete; `4000ms` in `BatchDetail` ZIP, `BatchList` ZIP/merge, and `NewBatchWizard`, with cleanup via `toastTimeoutRef`), log errors to `console.error`, and show `window.alert` on non-abort failures.
- `BatchDetail.tsx:BatchDetail`, `BatchList.tsx:BatchList`, and `NewBatchWizard.tsx:NewBatchWizard` initialize `useWalkthrough` tours persisted per `user?.uid`.

## Verification
- Run: `npm test -- --run`
