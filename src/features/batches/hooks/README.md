# Batches Hooks

## Overview
Provides shared React hooks for the `batches` feature: certificate ZIP download progress/cancellation (`useCertificateZipDownload`), Impeesa scraper session guard (`useScraperSessionGuard`), and post-emission batch re-verification orchestration (`useBatchReverification`).

## Interface
- `useCertificateZipDownload.ts`: `CertificateZipPhase`, `StartCertificateZipOptions`, `UseCertificateZipDownloadReturn`, `useCertificateZipDownload`.
- `useScraperSessionGuard.ts`: `UseScraperSessionGuardResult`, `useScraperSessionGuard` — Checks `ScraperSettingsContext` session state, marks expired/unconfigured sessions, and provides `ScraperAlertModalsProps` for `NewBatchWizard` and `BatchDetail`.
- `useBatchReverification.ts`: `StagedManualActivation`, `UseBatchReverificationParams`, `useBatchReverification` — Orchestrates single and batch-wide Impeesa re-verification in `BatchDetail`, `isReverifying` mutation locking, unmount cancellation, immediate `refreshedPending` persistence, auto code assignment, and two-phase `ManualCodeAssignmentModal` staging.

## Invariants
- `[useCertificateZipDownload.ts:useCertificateZipDownload]`: Synchronously guards concurrent `startDownload` calls via `abortControllerRef`, ignores stale callbacks via `runIdRef`, maintains `'preparing'` -> `'rendering'` -> `'compressing'` -> `'cancelling'` transitions, suppresses `AbortError` alerts, and aborts active work on unmount.
- `[useScraperSessionGuard.ts:useScraperSessionGuard]`: Reuses warm `sessionStatus` from `ScraperSettingsContext` before falling back to `refreshSessionStatus` / `getScraperSessionStatus`; classifies `SCRAPER_NOT_CONFIGURED` vs expired session failures into `showAuthAlert` vs `authError`.
- `[useBatchReverification.ts:useBatchReverification]`: Skips `no_scout` and generic-identity members (`isReverifiableMember`), stops dequeuing and state updates via `cancelledRef` on unmount, commits code-free `refreshedPending` updates immediately, never stacks `ManualCodeAssignmentModal` and `ScraperAlertModals` simultaneously, excludes prior exceptional codes on `exceptional -> active`, and emits warning toasts reminding operators to re-download updated PDFs.

## Side Effects
- `[useCertificateZipDownload.ts:useCertificateZipDownload]`: Triggers browser download tasks, aborts active `AbortController` on cancel/unmount, and logs/alerts on non-abort failures.
- `[useScraperSessionGuard.ts:useScraperSessionGuard]`: Updates `ScraperSettingsContext` and invokes `getScraperSessionStatus`.
- `[useBatchReverification.ts:useBatchReverification]`: Invokes `getMemberStatus`, `saveBatchMemberUpdates`, and `getMembersByBatchId`, updates local state, and triggers `Toast` notifications.

## Verification
- Run: `npm test -- --run`
