# Batches Hooks

## Overview
Provides shared React hooks for the `batches` feature: certificate ZIP download progress tracking and cancellation (`useCertificateZipDownload`).

## Interface
- [useCertificateZipDownload.ts:CertificateZipPhase](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/useCertificateZipDownload.ts#L4) — Phase union `'preparing' | 'rendering' | 'compressing' | 'cancelling'`.
- [useCertificateZipDownload.ts:StartCertificateZipOptions](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/useCertificateZipDownload.ts#L6-L11) — Options (`scopeLabel`, `initialTotal`, `onSuccess`, `onError`) for `startDownload`.
- [useCertificateZipDownload.ts:UseCertificateZipDownloadReturn](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/useCertificateZipDownload.ts#L13-L28) — Hook return contract exposing modal state, `phase`, `scopeLabel`, `progress`, `startDownload`, and `cancelDownload`.
- [useCertificateZipDownload.ts:useCertificateZipDownload](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/useCertificateZipDownload.ts#L40-L145) — Coordinates live progress tracking, `'preparing' -> 'rendering' -> 'compressing' -> 'cancelling'` phase transitions, synchronous re-entry locking, `AbortController` cancellation, and unmount abort.

## Invariants
- `[useCertificateZipDownload.ts:useCertificateZipDownload]`: Synchronously guards concurrent `startDownload` calls via `abortControllerRef`, ignores stale callbacks via `runIdRef`, maintains `'preparing'` phase until the first `onProgress` tick (`'rendering'` while `current < total`, `'compressing'` when `total > 0 && current === total`, `'cancelling'` on cancel), suppresses `AbortError` alerts, and aborts active work on unmount.

## Side Effects
- `[useCertificateZipDownload.ts:useCertificateZipDownload]`: Triggers browser download tasks, aborts active `AbortController` on cancel or unmount, and logs/alerts via `console.error` and `window.alert` when a non-abort error occurs without `options.onError`.

## Verification
- Run: `npm test`
