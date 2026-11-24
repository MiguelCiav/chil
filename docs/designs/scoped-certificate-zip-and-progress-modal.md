# Scoped Certificate ZIP Export & Shared ZIP Progress Modal

*   **Author:** Miguel Ciavato
*   **Status:** Implemented
*   **Date:** 2026-11-16

> [!NOTE]
> **Historical Evolution:** Follow-up UI cleanups subsequently retired `SuccessPage.tsx` (`/lotes/exito`) from `src/features/batches/` (leaving `BatchDetail` and `BatchList` as the consumers of `useCertificateZipDownload` / `CertificateZipProgressModal`) and standardized `BatchDetailHeader`'s ZIP `ScopedExportSplitButton` to `variant="primary"` (removing custom `bg-[#5c371d]`).

--------------------------------------------------------------------------------

## Overview

This design introduces two client-side improvements to certificate ZIP exports across Chil's batch workflows:

1.  **Per-group certificate ZIP downloads on Batch Detail:** Converts both `"Descargar lista (PDF)"` and `"Descargar Reconocimientos (ZIP)"` inside [`BatchDetailHeader`](../../src/features/batches/components/detail/BatchDetailHeader.tsx) into matching split buttons so coordinators can download all certificates in one click or select an individual bucket (Scout group, `"Miembros no scout"`, or eligible institutional/`exceptional` members under `"Sin grupo asignado"`) from the attached chevron menu.
2.  **Shared ZIP generation progress and cancellation modal:** Connects the existing `onProgress` and `AbortSignal` hooks in [`generateBatchCertificatesZip`](../../src/features/recognitions/services/certificatePdfGenerator.ts) to a shared modal and React hook reused by [`BatchDetail`](../../src/features/batches/components/BatchDetail.tsx), [`BatchList`](../../src/features/batches/components/BatchList.tsx), and `SuccessPage` *(since retired)*, showing `"Generando certificados"`, completed certificate counts (`current / total` and `percentage%`), and a `"Cancelar"` control.

## The Problem

Two workflow gaps slow down and complicate batch certificate distribution:

1.  **Full-batch-only ZIP export:** Although PDF member lists already support `"Por grupo"` downloads, certificate ZIP generation on Batch Detail exports every eligible member in one archive. Coordinators handling multi-group batches cannot download certificates for a single Scout group, `"Miembros no scout"`, or `"Sin grupo asignado"` without manually filtering the extracted files. Adding a second standalone `"Por grupo"` button next to `"Descargar Reconocimientos (ZIP)"` would also crowd the header toolbar with five buttons.
2.  **Opaque latency during 30+ certificate ZIP generation:** When generating ZIP archives for batches with `30+` members, callers (`BatchDetail`, `BatchList`, and `SuccessPage`) only disable the action button with static text (`"Generando ZIP..."` or `"Descargando..."`). None of the three pages wire `onProgress` or `AbortSignal`, leaving users without progress counts, feedback during pre-download Firestore reads or final JSZip compression, or a way to abort in-flight work. Additionally, `BatchList`'s row menu leaves `"Descargar reconocimientos (ZIP)"` enabled on batches with zero eligible (`active` or `exceptional`) members, triggering avoidable error alerts.

## Goals

*   Apply a unified split-button interaction model to both `"Descargar lista (PDF)"` (`BatchReportControls`) and `"Descargar Reconocimientos (ZIP)"` (`BatchDetailHeader`), using distinct chevron `aria-label`s so primary button queries remain unambiguous.
*   Derive ZIP menu buckets strictly from eligible members (`status === 'active' || status === 'exceptional'`) using memoized `reportBuckets`, preventing `pending` unregistered members from receiving certificates, keeping eligible `"Miembros no scout"` and institutional/`exceptional` `"Sin grupo asignado"` entries selectable, hiding `0`-eligible buckets, and displaying the ZIP chevron only when `> 1` eligible bucket exists.
*   Disable `"Descargar reconocimientos (ZIP)"` inside [`batchListColumns.tsx`](../../src/features/batches/components/list/batchListColumns.tsx) row menus whenever a batch has `eligibleCount === 0`, matching `BatchDetail` and `SuccessPage`.
*   Append `_${bucketSlug}` to scoped ZIP filenames (`Reconocimientos_Lote_<batchId>_<slug>_<bucketSlug>.zip`) inside `generateBatchCertificatesZip` without importing `batches/` modules into `src/features/recognitions/`.
*   Display a shared progress modal across `BatchDetail`, `BatchList`, and `SuccessPage` showing `"Generando certificados"`, `"Preparando lote..."` during metadata fetches, `current / total` (`percentage%`) while rendering PDFs, `"Comprimiendo archivo ZIP..."` at `total / total (100%)` during `JSZip.generateAsync`, and `"Cancelando..."` while awaiting `AbortError` cleanup.
*   Update Step 1 walkthrough copy in [`batchDetailTour.ts`](../../src/features/batches/components/detail/batchDetailTour.ts) to document per-group downloads for both lists and certificate ZIPs.

## Non-Goals

*   Changing `JSZip` compression settings (`DEFLATE` level `6`), `chunkSize` (`5`), font loading inside the certificate loop, or offloading PDF/ZIP generation to Web Workers.
*   Adding per-group ZIP selection inside `BatchList` row menus or `SuccessPage` (scoped group selection lives only on `BatchDetailHeader`, while the progress modal is shared by all three callers).
*   Displaying recipient names or estimated time remaining inside the progress modal, or modifying `generateBatchCertificatesPdf` (multi-page combined PDF, unused in UI).

## Open Questions

None. Header control layout, bucket eligibility filtering, `BatchList` row gating, modal phases, and `"Cancelando..."` abort behavior were resolved prior to drafting.

## Critical User Journeys (CUJs)

### CUJ 1: Scoped Per-Group Certificate ZIP Export on Batch Detail

*   **Given**: A batch on Batch Detail whose members span multiple Scout groups, one eligible `"Miembros no scout"` member, and two institutional (`active`) members in `"Sin grupo asignado"`.
*   **When**: The coordinator clicks the chevron segment next to `"Descargar Reconocimientos (ZIP)"` and selects a specific bucket (for example, `"Grupo San Luis"`, `"Miembros no scout"`, or `"Sin grupo asignado"`).
*   **Then**: The modal opens showing `"Generando certificados"` and `current / total` (`percentage%`) strictly for that bucket's eligible members, downloads `Reconocimientos_Lote_<batchId>_<slug>_<bucketSlug>.zip`, and never includes any `pending` members.

### CUJ 2: Mixed Eligibility Hides Empty ZIP Buckets and Prevents Invalid Downloads

*   **Given**: A batch with two list buckets—`Grupo San Luis` (`3 active`) and `"Sin grupo asignado"` (`4 pending` only)—and another batch on `BatchList` whose members are all `pending`.
*   **When**: The coordinator views Batch Detail on the first batch, or opens the row action menu on `BatchList` for the second batch.
*   **Then**: On Batch Detail, `"Descargar lista (PDF)"` keeps its split chevron (`2` list buckets) while `"Descargar Reconocimientos (ZIP)"` renders without a split chevron (`1` eligible bucket, `"Sin grupo asignado"` hidden); on `BatchList`, `"Descargar reconocimientos (ZIP)"` is disabled on the `0`-eligible row.

### CUJ 3: Shared Progress Modal Across Pre-Fetch and Compression (`30+` Members)

*   **Given**: A batch with `30+` eligible members initiated from `BatchDetail`, `BatchList`, or `SuccessPage`.
*   **When**: The coordinator triggers ZIP generation.
*   **Then**: The modal opens immediately (`"Preparando lote..."` while `BatchList` or `SuccessPage` fetches metadata), updates `current / total` and `percentage%` across chunks under `"Generando certificados"`, holds at `total / total (100%)` with `"Comprimiendo archivo ZIP..."` during `JSZip.generateAsync`, closes upon completion, and shows the page's success toast.

### CUJ 4: Clean Cancellation Mid-Generation or During Packaging

*   **Given**: An active ZIP download open in the progress modal on `BatchDetail`, `BatchList`, or `SuccessPage`.
*   **When**: The coordinator clicks `"Cancelar"` (during pre-fetch, chunked PDF generation, or final compression).
*   **Then**: The modal disables `"Cancelar"` and displays `"Cancelando..."` until the current step yields and rejects with `AbortError`, closes cleanly without triggering a file download or `window.alert`, and re-enables the page controls.

## Technical Plan (Architecture)

### Architecture & Data Flow

```text
  BatchDetail.tsx                           BatchList.tsx / SuccessPage.tsx
   |- useMemo: reportBuckets                 |- pre-fetch missing batch / recType / hierarchy
   |- filterEligibleReportBuckets(...)       '- full-batch ZIP task
   v                                               |
  BatchDetailHeader                                |
   |- BatchReportControls                          |
   |   '-- ScopedExportSplitButton (PDF List)      |
   '- Certificate ZIP                              |
       '-- ScopedExportSplitButton (ZIP)           |
           (chevron shown iff eligible > 1)        |
           |                                       |
           +-------------------+-------------------+
                               |
                               v
                 useCertificateZipDownload
                  |- Opens modal immediately ("Preparando lote...")
                  |- Tracks runIdRef, AbortController, isCancelling ("Cancelando...")
                  |- Passes { ...params, bucketSlug?, onProgress, signal }
                  v
           generateBatchCertificatesZip (certificatePdfGenerator.ts)
            |- Loops chunkSize=5 -> emits onProgress({ current, total, percentage })
            |- At 100%, calls JSZip.generateAsync (modal shows "Comprimiendo archivo ZIP...")
            '- Checks throwIfAborted(signal) before triggerBlobDownload
```

### 1. Eligible Bucket Filtering (`src/features/batches/api/batchReports.ts`)

Add `filterEligibleReportBuckets(buckets: BatchReportBucket[]): BatchReportBucket[]` (re-exported via `src/features/batches/api/index.ts`). It iterates over already-resolved `BatchReportBucket[]` items, filters each bucket's `members` array to `m.status === 'active' || m.status === 'exceptional'`, and omits any bucket whose eligible `members.length === 0`.

*   Filtering `BatchDetail`'s memoized `reportBuckets` avoids running `resolveBatchReportBuckets` twice, keeping hierarchy lookups single-pass and preventing duplicate `console.warn` messages for unresolved `pending` members.
*   Because `"Miembros no scout"` forces `status: 'active'` and `"Sin grupo asignado"` mixes eligible institutional/`exceptional` members with `pending` unregistered members, `filterEligibleReportBuckets` preserves `"Miembros no scout"` and any `"Sin grupo asignado"` bucket containing `>= 1` eligible member while hiding all-`pending` buckets from the ZIP dropdown.
*   `BatchDetailHeader` receives both `reportBuckets` (for PDF lists) and `eligibleBuckets` (derived via `filterEligibleReportBuckets(reportBuckets)`), showing the ZIP chevron only when `eligibleBuckets.length > 1`.

### 2. Unified Split-Button Component (`src/features/batches/components/detail/`)

Create `ScopedExportSplitButton.tsx` (internal/re-exported via `detail/index.ts`) wrapping `Button` from `src/components/Button.tsx` to render both `"Descargar lista (PDF)"` (`BatchReportControls`) and `"Descargar Reconocimientos (ZIP)"` (`BatchDetailHeader`):

*   **Joined segments & focus styling:** When `buckets.length > 1`, renders an `inline-flex items-stretch` group containing the primary `Button` (`rounded-l-xl !rounded-r-none focus:z-10`) and an attached chevron `Button` (`!rounded-l-none rounded-r-xl !px-2.5 focus:z-10`). Outline controls (`BatchReportControls`) apply `border-l-0` on the chevron segment to avoid a doubled middle border; primary dark brown ZIP controls (`bg-[#5c371d] hover:bg-[#4b2c17] text-white`) add `border-l border-white/25` on the chevron segment. When `buckets.length <= 1`, only the standard single `Button` renders.
*   **Unambiguous accessible labels:** Primary buttons keep `"Descargar lista (PDF)"` / `"Descargar Reconocimientos (ZIP)"`. Chevron triggers use distinct `aria-label` strings (`"Opciones de lista por grupo"` and `"Opciones de certificados por grupo"`) plus `aria-haspopup="menu"` and `aria-expanded={menuOpen}` so existing RTL `getByRole('button', ...)` queries remain unique.
*   **Popover lifecycle & responsive bounds:** Each `ScopedExportSplitButton` owns an independent `containerRef` with `document` `mousedown` and `keydown` (`Escape`) listeners while `menuOpen` is `true`, so opening either menu closes the other. Dropdown menus retain `max-w-[calc(100vw-2rem)]` alongside `right-0 w-72` to prevent left-edge clipping when flex action bars wrap on small screens, and `BatchDetailHeader` preserves its `justify-end` / `xl:ml-auto` wrapper classes.
*   **Walkthrough tour copy:** Update `BATCH_DETAIL_TOUR_STEPS[0].content` in `src/features/batches/components/detail/batchDetailTour.ts` to `'Consulta la información completa del lote. Desde la cabecera puedes descargar los reconocimientos oficiales en ZIP (completo o por grupo), generar el reporte de lista en PDF (completo o por grupo) o eliminar el lote si es necesario.'`.

### 3. `BatchList` Eligibility Row Gating (`batchTerritorial.ts`, `list/types.ts`, `batchListColumns.tsx`)

Extend `BatchTerritorialProjection` (`src/features/batches/utils/batchTerritorial.ts`) and `BatchRowData` (`src/features/batches/components/list/types.ts`) with `eligibleCount: number`, computed from `batchMembers.filter(m => m.status === 'active' || m.status === 'exceptional').length` inside `deriveBatchTerritorialProjection` (populated in `BatchList.tsx`). In `batchListColumns.tsx:renderBatchActionsCell`, disable `"Descargar reconocimientos (ZIP)"` when `downloadingId === rowData.id || rowData.eligibleCount === 0`, applying a matching disabled tooltip.

### 4. Scoped ZIP Filename Suffix (`src/features/recognitions/services/certificatePdfGenerator.ts`)

Add optional `bucketSlug?: string` to `BatchCertificatesParams` and `BatchGenerationOptions` without importing any `batches/` types into `src/features/recognitions/`. Inside `generateBatchCertificatesZip`, resolve `rawBucketSlug = options?.bucketSlug?.trim() || params.bucketSlug?.trim()`. When non-empty, compute `cleanBucketSlug = slugify(rawBucketSlug) || 'grupo'` and output `Reconocimientos_Lote_${batch.id}_${slug}_${cleanBucketSlug}.zip`; otherwise keep `Reconocimientos_Lote_${batch.id}_${slug}.zip`. Inner PDF entry filenames remain unchanged.

### 5. Shared Progress & Cancellation Lifecycle (`useCertificateZipDownload` & `CertificateZipProgressModal`)

Create `src/features/batches/hooks/useCertificateZipDownload.ts` and `src/features/batches/components/shared/CertificateZipProgressModal.tsx` (re-exported from `shared/index.ts`), and adopt them across `BatchDetail.tsx`, `BatchList.tsx`, and `SuccessPage.tsx`:

*   **Task-factory hook (`useCertificateZipDownload`):** Returns `{ isOpen, isDownloading, isCancelling, phase, scopeLabel, progress, startDownload, cancelDownload }`. `startDownload(task, options)` checks synchronous `abortControllerRef.current !== null`, initializes `AbortController`, increments `runIdRef`, sets `phase = 'preparing'`, `progress = { current: 0, total: options?.initialTotal ?? 0, percentage: 0 }`, `scopeLabel = options?.scopeLabel`, and `isCancelling = false`, then awaits `task({ onProgress, signal })`. Inside `onProgress`, `phase` transitions to `'compressing'` when `next.total > 0 && next.current === next.total`, else `'rendering'`. Passing `onProgress`, `signal`, and optional `bucketSlug` inside the single `params` object of `generateBatchCertificatesZip(params)` preserves existing 1-argument unit test expectations across all three pages.
*   **Modal UI (`CertificateZipProgressModal`):** Uses `<Modal className="max-w-md">`, `ModalHeader`, `ModalBody`, `<ModalFooter className="!justify-end">`, and `Button` from `src/components/`. Passes a no-op `onClose={() => {}}` and omits `ModalHeader`'s `X` button so backdrop clicks do not dismiss active downloads. Renders title `"Generando certificados"`, optional `scopeLabel` subtitle, an accessible progress bar (`role="progressbar"`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-valuenow={progress.percentage}`, `aria-valuetext`), numeric counter `${progress.current} / ${progress.total} (${progress.percentage}%)` when `progress.total > 0`, status text driven by `phase` (`"Preparando lote..."`, `"Generando PDFs individuales..."`, `"Comprimiendo archivo ZIP..."`, and `"Cancelando..."`), and a footer `"Cancelar"` button (`disabled={isCancelling}`).
*   **Cancellation & lifecycle safety:** Clicking `"Cancelar"` sets `phase = 'cancelling'` and `isCancelling = true`, calls `abortController.abort()`, and keeps the modal open until the current chunk or `JSZip.generateAsync` settles and `throwIfAborted(signal)` throws `AbortError`. `BatchList` and `SuccessPage` check `if (signal.aborted) throw new DOMException('Aborted', 'AbortError')` right after async Firestore reads so cancelling during `"Preparando lote..."` exits before calling `generateBatchCertificatesZip`. Unmounting aborts the active `AbortController` and bumps `runIdRef`; `AbortError` (`err?.name === 'AbortError'`) suppresses `window.alert`, whereas non-abort errors invoke `options?.onError?.(err)` (defaulting to `console.error` + `window.alert('Error al generar los reconocimientos en ZIP.')`).

## Alternatives Considered

### Alternative A: Separate `"ZIP por grupo"` Text Button (or ZIP-Only Split Button)

*   **Pros:** Leaves `BatchReportControls.tsx` and its existing `"Por grupo"` button selectors in `BatchDetail.test.tsx` untouched.
*   **Cons:** Adding a separate ZIP bucket button creates five independent controls in `BatchDetailHeader` that wrap onto extra lines on medium viewports; converting only ZIP into a split button creates inconsistent interaction patterns side by side.
*   **Reason for Rejection:** Rejected by author: unified split buttons on both PDF list and ZIP keep top-level header controls to three actions with a single interaction model.

### Alternative B: Passing `ReportBucketKey` and Hierarchy Directly Into `generateBatchCertificatesZip`

*   **Pros:** Shifts bucket filtering inside `generateBatchCertificatesZip` alongside PDF rendering.
*   **Cons:** Reverses module dependency direction by forcing `src/features/recognitions/` to import batch report types and hierarchy structures from `src/features/batches/`.
*   **Reason for Rejection:** Rejected as a boundary violation against `chil-elephant` module scoping; passing pre-filtered `members` and an optional `bucketSlug?: string` keeps `recognitions/` decoupled from `batches/`.

### Alternative C: Calling `resolveBatchReportBuckets` Separately for Eligible Members

*   **Pros:** Reuses `resolveBatchReportBuckets` without adding `filterEligibleReportBuckets`.
*   **Cons:** Repeats region/district/group `Map` construction on every render and triggers duplicate `console.warn` logs when unresolved positive `group_id` values belong to `pending` members.
*   **Reason for Rejection:** Filtering `BatchDetail`'s memoized `reportBuckets` via `filterEligibleReportBuckets` gives identical bucket ordering and keys in one pass without duplicate warnings.

### Alternative D: Self-Fetching ZIP Hook Accepting Only `batchId`

*   **Pros:** Moves all Firestore fetch logic out of `BatchDetail`, `BatchList`, and `SuccessPage` into one hook.
*   **Cons:** Forces `BatchDetail` and `SuccessPage` to re-fetch batch, member, recognition, or hierarchy documents they already hold in React state.
*   **Reason for Rejection:** Passing a `task({ onProgress, signal })` factory to `useCertificateZipDownload` lets each caller reuse in-memory state while still sharing `"Preparando lote..."`, progress streaming, and abort cleanup.

### Alternative E: Closing Progress Modal Immediately on `"Cancelar"`

*   **Pros:** Hides the dialog on click even while `JSZip.generateAsync` or the active 5-certificate chunk is running.
*   **Cons:** Masks active main-thread CPU compression work; re-opening another download right away would run concurrently with the unyielding JSZip deflate pass.
*   **Reason for Rejection:** Rejected by author: keeping the modal open with `"Cancelando..."` (and Cancel disabled) until the active step yields gives truthful status before releasing UI controls.

### Alternative F: Keeping `BatchList` Row ZIP Enabled on Zero-Eligible Batches

*   **Pros:** Requires no changes to `BatchTerritorialProjection` or `batchListColumns.tsx`.
*   **Cons:** Lets users open the progress modal on an all-`pending` or empty batch only to fail immediately with an error `alert` inside `generateBatchCertificatesZip`.
*   **Reason for Rejection:** Rejected by author: exposing `eligibleCount` in `deriveBatchTerritorialProjection` disables the `BatchList` row menu item upfront, matching `BatchDetail` and `SuccessPage`.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Client CPU & Responsiveness:** Certificate rendering uses `chunkSize = 5` yields and `JSZip` `DEFLATE` level `6` per Non-Goals. On `30+` member batches, clicks on `"Cancelar"` may take up to one chunk or the final `JSZip.generateAsync` pass to settle before closing; `"Cancelando..."` prevents duplicate clicks and communicates active cleanup.
*   **Accessibility:** Chevron triggers declare unique `aria-label` strings (`"Opciones de lista por grupo"`, `"Opciones de certificados por grupo"`), `aria-haspopup="menu"`, and `aria-expanded`; the progress dialog exposes `role="progressbar"` with `aria-valuemin`/`aria-valuemax`/`aria-valuenow` and `aria-valuetext`.
*   **Backward Compatibility:** Passing `onProgress`, `signal`, and optional `bucketSlug` inside the first `params` object of `generateBatchCertificatesZip` preserves existing 1-argument callers and test assertions across `BatchDetail`, `BatchList`, and `SuccessPage`. Full-batch ZIP exports keep the unsuffixed `Reconocimientos_Lote_<batchId>_<slug>.zip` filename.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify (Phased Execution)

#### Phase 1: Core Bucket Filtering, Eligible Counts & Scoped ZIP Suffix

1.  **`src/features/recognitions/services/certificatePdfGenerator.ts` (Modify)**
    *   **Type / Scope**: Core Certificate & ZIP Generation Service (no changes needed in `src/features/recognitions/index.ts`, which already exports `*`)
    *   **Proposed Changes**: Extend `BatchCertificatesParams` and `BatchGenerationOptions` with `bucketSlug?: string`. Inside `generateBatchCertificatesZip`, compute `const rawBucketSlug = options?.bucketSlug?.trim() || params.bucketSlug?.trim();`. When `rawBucketSlug` is non-empty, compute `const cleanBucketSlug = slugify(rawBucketSlug) || 'grupo'` (non-empty punctuation-only input falls back to `'grupo'`, while omitted or empty/whitespace-only input keeps the unsuffixed filename) and output `` `Reconocimientos_Lote_${batch.id}_${slug}_${cleanBucketSlug}.zip` ``. Inner PDF filenames remain unchanged.

2.  **`src/features/batches/api/batchReports.ts` (Modify)**
    *   **Type / Scope**: Batch Reporting & Bucket Helpers (`src/features/batches/api/index.ts` already exports `*`)
    *   **Proposed Changes**: Add and export `filterEligibleReportBuckets(buckets: BatchReportBucket[]): BatchReportBucket[]`. Map each bucket to `{ ...bucket, members: bucket.members.filter(m => m.status === 'active' || m.status === 'exceptional') }` and filter out buckets where `members.length === 0`.

3.  **`src/features/batches/utils/batchTerritorial.ts` (Modify)**
    *   **Type / Scope**: Batch Projection Utility
    *   **Proposed Changes**: Add `eligibleCount: number` to `BatchTerritorialProjection`. Inside `deriveBatchTerritorialProjection`, compute `const eligibleCount = batchMembers.filter(m => m.status === 'active' || m.status === 'exceptional').length;` and return `eligibleCount` in all three `return` branches (`memberCount === 0` returning `0`, `allNoScout`, and the final return).

4.  **Phase 1 Unit Tests (Modify)**
    *   `src/features/recognitions/services/__tests__/certificatePdfGenerator.test.ts`: Add tests verifying `bucketSlug` appends `_${cleanBucketSlug}` (including `options?.bucketSlug` precedence over `params.bucketSlug`, whitespace-only falling back to unsuffixed, non-empty punctuation-only falling back to `_grupo`, inner PDF filenames unchanged, and unsuffixed full-batch output).
    *   `src/features/batches/api/__tests__/batchReports.test.ts`: Add tests verifying `filterEligibleReportBuckets` strips `pending` members, omits buckets with zero eligible members, and retains eligible `special:no_scout` and `special:ungrouped` entries without mutating input arrays.
    *   `src/features/batches/utils/__tests__/batchTerritorial.test.ts`: Assert `eligibleCount` across `active`, `exceptional`, `pending`, `no_scout`, and empty member arrays.
    *   **Phase 1 Checkpoint**: Run `npm run lint`, `npx tsc --noEmit`, and `npm test -- --run src/features/recognitions/services/__tests__/certificatePdfGenerator.test.ts src/features/batches/api/__tests__/batchReports.test.ts src/features/batches/utils/__tests__/batchTerritorial.test.ts`; target: exit code `0`.

#### Phase 2: Shared Download Hook, Progress Modal & Reusable Split Button

5.  **`src/features/batches/hooks/useCertificateZipDownload.ts` (Create)**
    *   **Type / Scope**: Shared Feature React Hook (imported directly from `../hooks/useCertificateZipDownload`; do not create `hooks/index.ts`)
    *   **Proposed Changes**: Define and export explicit contracts:
        ```ts
        export type CertificateZipPhase = 'preparing' | 'rendering' | 'compressing' | 'cancelling';

        export interface StartCertificateZipOptions {
          scopeLabel?: string;
          initialTotal?: number;
          onSuccess?: (fileName: string) => void;
          onError?: (err: unknown) => void;
        }

        export interface UseCertificateZipDownloadReturn {
          isOpen: boolean;
          isDownloading: boolean;
          isCancelling: boolean;
          phase: CertificateZipPhase;
          scopeLabel?: string;
          progress: BatchGenerationProgress;
          startDownload: (
            task: (ctx: {
              onProgress: (progress: BatchGenerationProgress) => void;
              signal: AbortSignal;
            }) => Promise<string>,
            options?: StartCertificateZipOptions
          ) => Promise<void>;
          cancelDownload: () => void;
        }
        ```
        *   Maintain synchronous concurrency guard using `abortControllerRef.current !== null`: `startDownload` returns early immediately if a run is already active (preventing same-tick double-clicks).
        *   Initialize `const controller = new AbortController();`, assign `abortControllerRef.current = controller`, increment `runIdRef.current += 1`, set `isOpen = true`, `isDownloading = true`, `isCancelling = false`, `phase = 'preparing'`, `scopeLabel = options?.scopeLabel`, and `progress = { current: 0, total: options?.initialTotal ?? 0, percentage: 0 }`.
        *   Inside `onProgress(next)`: ignore updates if `runIdRef.current !== runId || controller.signal.aborted`; otherwise update `progress = next` and set `phase = next.total > 0 && next.current === next.total ? 'compressing' : 'rendering'`.
        *   In `cancelDownload()`: if `!abortControllerRef.current`, return; set `isCancelling = true` and `phase = 'cancelling'`, then call `abortControllerRef.current.abort()` while keeping `isOpen = true` until `task` settles.
        *   In `try`/`catch`/`finally`: on success (when `runIdRef.current === runId && !controller.signal.aborted`), invoke `options?.onSuccess?.(fileName)`. In `catch (err)`: ignore when `(err as Error)?.name === 'AbortError'`; otherwise call `options?.onError?.(err)` if provided, or `console.error('Error generating certificate ZIP:', err)` and `window.alert('Error al generar los reconocimientos en ZIP.')`. In `finally`: when `runIdRef.current === runId`, set `abortControllerRef.current = null`, `isOpen = false`, `isDownloading = false`, and `isCancelling = false`.
        *   In `useEffect` unmount cleanup: increment `runIdRef.current += 1` and call `abortControllerRef.current?.abort(); abortControllerRef.current = null;`.

6.  **`src/features/batches/components/shared/CertificateZipProgressModal.tsx` & `src/features/batches/components/shared/index.ts` (Create / Modify)**
    *   **Type / Scope**: Shared Modal UI & Barrel Export
    *   **Proposed Changes**: Define and export `CertificateZipProgressModalProps`:
        ```ts
        export interface CertificateZipProgressModalProps {
          isOpen: boolean;
          phase: CertificateZipPhase;
          progress: BatchGenerationProgress;
          isCancelling: boolean;
          scopeLabel?: string;
          onCancel: () => void;
        }
        ```
        *   Wrap `<Modal isOpen={isOpen} onClose={() => {}} className="max-w-md">` with `<ModalHeader>` (no `onClose` prop, omitting the `X` button; title `"Generando certificados"` and optional `scopeLabel` subtitle).
        *   Compute `statusText`: `'Cancelando...'` when `isCancelling || phase === 'cancelling'`, `'Preparando lote...'` when `phase === 'preparing'`, `'Comprimiendo archivo ZIP...'` when `phase === 'compressing'`, else `'Generando PDFs individuales...'`.
        *   Render `<ModalBody className="space-y-4">` with `aria-live="polite"` `statusText`, counter `${progress.current} / ${progress.total} (${progress.percentage}%)` whenever `progress.total > 0`, and `` <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage} aria-valuetext={progress.total > 0 ? `${statusText} ${progress.current} / ${progress.total} (${progress.percentage}%)` : statusText} ... /> ``.
        *   Render `<ModalFooter className="!justify-end">` containing `<Button variant="outline" className="ml-auto" onClick={onCancel} disabled={isCancelling}>Cancelar</Button>` (`"Cancelar"` stays the button label while `statusText` displays `"Cancelando..."`).
        *   Re-export `CertificateZipProgressModal` and `CertificateZipProgressModalProps` from `src/features/batches/components/shared/index.ts`.

7.  **`src/features/batches/components/detail/ScopedExportSplitButton.tsx` & `src/features/batches/components/detail/index.ts` (Create / Modify)**
    *   **Type / Scope**: Reusable Header Split Button UI & Barrel Export
    *   **Proposed Changes**: Define and export `ScopedExportSplitButtonProps`:
        ```ts
        export interface ScopedExportSplitButtonProps {
          buckets: BatchReportBucket[];
          onSelectAll: () => void;
          onSelectBucket: (bucketKey: ReportBucketKey) => void;
          primaryLabel: string;
          loadingLabel: string;
          loading: boolean;
          disabled: boolean;
          disabledTitle?: string;
          chevronAriaLabel: string;
          menuAriaLabel: string;
          variant?: 'primary' | 'outline';
          primaryClassName?: string;
          chevronClassName?: string;
          icon?: React.ReactNode;
        }
        ```
        *   Render outer `<div ref={containerRef} className="relative inline-flex items-stretch">` without `gap-2` or `flex-wrap`.
        *   Compute `isInteractionDisabled = loading || disabled`, `hasMultipleBuckets = buckets.length > 1`, and `menuOpen = isOpen && hasMultipleBuckets && !isInteractionDisabled`.
        *   Pass `disabled={isInteractionDisabled}` and `title={disabled ? disabledTitle : undefined}` (so tooltips appear when disabled, matching existing header behavior) on primary `Button`; when `hasMultipleBuckets`, render primary `Button` (`rounded-l-xl !rounded-r-none focus:z-10`, plus `primaryClassName`) and chevron `Button` (`variant={variant}`, `` className={`!rounded-l-none rounded-r-xl !px-2.5 focus:z-10 ${chevronClassName ?? ''}`} ``, `disabled={isInteractionDisabled}`, `aria-label={chevronAriaLabel}`, `aria-haspopup="menu"`, `aria-expanded={menuOpen}`, icon `` <ChevronDown size={16} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} /> ``).
        *   Register `document` `mousedown` and `keydown` (`Escape`) listeners inside `useEffect` while `menuOpen` is `true`. Render popover `<div role="menu" aria-label={menuAriaLabel} className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] max-h-80 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-40">` with separator before the first non-group bucket (`hasGroupBuckets && index === firstSpecialIndex`), optional `districtName` when `!== null && !== 'No aplica'`, and badge count `bucket.members.length`.
        *   Export `ScopedExportSplitButton` and `ScopedExportSplitButtonProps` from `src/features/batches/components/detail/index.ts`.

8.  **Phase 2 Unit Tests (Create)**
    *   `src/features/batches/hooks/__tests__/useCertificateZipDownload.test.ts`: Verify `'preparing'` initial phase (including when `initialTotal > 0`), `'rendering'` -> `'compressing'` transitions on `onProgress`, synchronous double-click guard, `'cancelling'` wait state until promise settles, closing modal and resetting `isDownloading`/`isCancelling` without calling `onError`/`alert` on `AbortError`, `onError`/default `alert` forwarding for non-abort errors, and unmount abort cleanup.
    *   `src/features/batches/components/shared/__tests__/CertificateZipProgressModal.test.tsx`: Verify `role="progressbar"` attributes (`aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`), `"Generando certificados"` header, `"Preparando lote..."` (`total === 0` or `phase === 'preparing'`), `"Generando PDFs individuales..."` with `X / Y (Z%)`, `"Comprimiendo archivo ZIP..."` at `100%`, `"Cancelando..."` text with disabled `"Cancelar"` button, and non-dismissing backdrop click (`waitFor` assertions for modal exit).
    *   **Phase 2 Checkpoint**: Run `npm run lint`, `npx tsc --noEmit`, and `npm test -- --run src/features/batches/hooks/__tests__/useCertificateZipDownload.test.ts src/features/batches/components/shared/__tests__/CertificateZipProgressModal.test.tsx`; target: exit code `0`.

#### Phase 3: Batch Detail, Batch List & Success Page Integrations

9.  **`src/features/batches/components/detail/BatchReportControls.tsx` (Modify)**
    *   **Type / Scope**: Batch Detail PDF List Export Controls
    *   **Proposed Changes**: Refactor `BatchReportControls` to wrap `ScopedExportSplitButton` while preserving `BatchReportControlsProps`, passing `variant="outline"`, `primaryLabel="Descargar lista (PDF)"`, `loadingLabel="Generando PDF..."`, `loading={downloadingReport}`, `disabled={isListEmpty}`, `disabledTitle="No hay miembros en este lote para generar la lista"`, `chevronAriaLabel="Opciones de lista por grupo"`, `menuAriaLabel="Exportar lista por grupo"`, `icon={<Download size={16} />}`, `primaryClassName="border-gray-200 hover:bg-gray-50 text-neutral"`, and `chevronClassName="border-gray-200 hover:bg-gray-50 text-neutral border-l-0"`.

10. **`src/features/batches/components/detail/BatchDetailHeader.tsx` (Modify)**
    *   **Type / Scope**: Batch Detail Header Toolbar
    *   **Proposed Changes**: Add `eligibleBuckets: BatchReportBucket[]` to `BatchDetailHeaderProps`, retain `isEligibleZero`, and update `onDownloadCertificatesZip` signature to `(bucketKey?: ReportBucketKey) => void`. Replace the standalone ZIP `Button` with `ScopedExportSplitButton` passing `buckets={eligibleBuckets}`, `variant="primary"`, `primaryLabel="Descargar Reconocimientos (ZIP)"`, `loadingLabel="Generando ZIP..."`, `loading={downloadingCertificatesZip}`, `disabled={isEligibleZero}`, `disabledTitle="No hay miembros habilitados (activos o con emisión excepcional) en este lote para generar reconocimientos"`, `chevronAriaLabel="Opciones de certificados por grupo"`, `menuAriaLabel="Exportar certificados por grupo"`, `icon={<FileText size={16} />}`, `primaryClassName="bg-[#5c371d] hover:bg-[#4b2c17] text-white"`, and `chevronClassName="bg-[#5c371d] hover:bg-[#4b2c17] text-white border-l border-white/25"`. Preserve the outer `<div className="flex flex-wrap items-center justify-end gap-3 w-full xl:w-auto xl:ml-auto">`.

11. **`src/features/batches/components/detail/batchDetailTour.ts` (Modify)**
    *   **Type / Scope**: Walkthrough Copy
    *   **Proposed Changes**: Update `BATCH_DETAIL_TOUR_STEPS[0].content` to the exact Spanish copy: `'Consulta la información completa del lote. Desde la cabecera puedes descargar los reconocimientos oficiales en ZIP (completo o por grupo), generar el reporte de lista en PDF (completo o por grupo) o eliminar el lote si es necesario.'`

12. **`src/features/batches/components/BatchDetail.tsx` (Modify)**
    *   **Type / Scope**: Batch Detail Page Container
    *   **Proposed Changes**: Memoize `eligibleBuckets = useMemo(() => filterEligibleReportBuckets(reportBuckets), [reportBuckets])`. Replace inline `downloading` state and `handleDownloadPDF` with `useCertificateZipDownload` (imported directly from `../hooks/useCertificateZipDownload`):
        *   In `handleDownloadPDF(bucketKey?: ReportBucketKey)`: if `!batch`, return; if `bucketKey` is supplied, resolve `const targetBucket = eligibleBuckets.find(b => b.key === bucketKey);` and return early if `!targetBucket`.
        *   Call `` zipDownload.startDownload(({ onProgress, signal }) => generateBatchCertificatesZip({ batch, members: targetBucket ? targetBucket.members : members, recognition, hierarchy: { regions, districts, groups }, bucketSlug: targetBucket?.label, onProgress, signal }), { scopeLabel: targetBucket ? targetBucket.label : `Lote #${batch.id}`, initialTotal: targetBucket ? targetBucket.members.length : totals.eligible, onSuccess: (fileName) => triggerToast(`¡Reconocimientos descargados exitosamente en ${fileName}!`, 4000), onError: () => alert('Error al generar los reconocimientos en ZIP.') }) ``.
        *   Pass `eligibleBuckets={eligibleBuckets}` and `downloadingCertificatesZip={zipDownload.isDownloading}` to `BatchDetailHeader`, and render `<CertificateZipProgressModal isOpen={zipDownload.isOpen} phase={zipDownload.phase} progress={zipDownload.progress} isCancelling={zipDownload.isCancelling} scopeLabel={zipDownload.scopeLabel} onCancel={zipDownload.cancelDownload} />`.

13. **`src/features/batches/components/list/types.ts` & `src/features/batches/components/list/batchListColumns.tsx` (Modify)**
    *   **Type / Scope**: Batch List Types & Action Menu
    *   **Proposed Changes**: Add `eligibleCount: number` to `BatchRowData`. In `batchListColumns.tsx:renderBatchActionsCell`, disable `"Descargar reconocimientos (ZIP)"` when `downloadingId === rowData.id || rowData.eligibleCount === 0`, setting `title={rowData.eligibleCount === 0 ? 'No hay miembros habilitados (activos o con emisión excepcional) en este lote para generar reconocimientos' : undefined}` (and `disabled:cursor-not-allowed`).

14. **`src/features/batches/components/BatchList.tsx` (Modify)**
    *   **Type / Scope**: Batch List Page Container
    *   **Proposed Changes**: Populate `eligibleCount: projection.eligibleCount` in `tableData` rows. Replace `handleDownloadPDF` execution with `useCertificateZipDownload`:
        *   Call `` zipDownload.startDownload(async ({ onProgress, signal }) => { ... }, { scopeLabel: `Lote #${batchId}`, initialTotal: 0, onSuccess: ..., onError: () => alert('Error al generar los reconocimientos en ZIP.') }) `` directly without calling `setDownloadingId(batchId)` outside the synchronous `abortControllerRef.current !== null` lock: inside `task`, set `setDownloadingId(batchId)` as the first step, load `targetBatch`, `batchMembers`, `recType`, then check `if (signal.aborted) throw new DOMException('Aborted', 'AbortError');` before calling `generateBatchCertificatesZip({ batch: targetBatch, members: batchMembers, recognition: recType, hierarchy: { regions, districts, groups }, onProgress, signal })`, and clear `setDownloadingId(null)` in `finally` inside `task`.
        *   Render `<CertificateZipProgressModal ... />`.

15. **`src/features/batches/components/SuccessPage.tsx` (Modify)**
    *   **Type / Scope**: Batch Creation Success Page Container
    *   **Proposed Changes**: Replace inline `downloading` state and `handleDownloadPDF` with `useCertificateZipDownload`:
        *   Set `` scopeLabel: `Lote #${batch.id}` `` and `initialTotal: 0` during metadata fetch (`phase: 'preparing'` -> `"Preparando lote..."` while awaiting `getRecognitionTypeById` and `getHierarchyData`), check `if (signal.aborted) throw new DOMException('Aborted', 'AbortError');` before calling `generateBatchCertificatesZip({ batch, members, recognition: recType, hierarchy, onProgress, signal })`, wire `onSuccess` toast and `onError: () => alert('Error al generar los reconocimientos en ZIP.')`, pass `disabled={zipDownload.isDownloading || eligibleCount === 0}` to the button (`zipDownload.isDownloading ? 'Generando ZIP...' : 'Descargar Reconocimientos (ZIP)'`), and render `<CertificateZipProgressModal ... />`.

16. **Phase 3 Component Integration Tests (Modify)**
    *   `src/features/batches/components/__tests__/BatchDetail.test.tsx`:
        *   Update the manual `vi.mock('../../api', ...)` return object (lines 9–22) to forward `filterEligibleReportBuckets: actual.filterEligibleReportBuckets` (preventing `TypeError` across all existing tests).
        *   Update existing `"Por grupo"` assertions to target `aria-label="Opciones de lista por grupo"` and update the Step 1 walkthrough assertion to match the exact Spanish string in `batchDetailTour.ts`.
        *   Add tests verifying ZIP split-button rendering when `eligibleBuckets.length > 1`, chevron hidden when `reportBuckets.length > 1` but `eligibleBuckets.length <= 1`, omission of `0`-eligible buckets, scoped `generateBatchCertificatesZip` 1-arg `params` (`members`, `bucketSlug`, `onProgress`, `signal`), live modal updates (`"Generando certificados"`, `X / Y (Z%)`, `"Comprimiendo archivo ZIP..."` at `100%`), and `"Cancelar"` -> `"Cancelando..."` wait state resolving with modal closed (`waitFor(...)`), controls re-enabled, and zero `alert`/download calls.
    *   `src/features/batches/components/__tests__/BatchList.test.tsx`: Assert `"Descargar reconocimientos (ZIP)"` is disabled when a row has `eligibleCount === 0`; add progress modal assertions (`"Preparando lote..."` during pre-fetch, `onProgress` updates, pre-fetch and mid-generation cancel suppressing `window.alert`, modal closure via `waitFor(...)`, and non-abort error `alert`).
    *   `src/features/batches/components/shared/__tests__/SharedModals.test.tsx`: Add `eligibleCount` to existing `BatchRowData` test fixtures (`lines 21, 52`).
    *   `src/features/batches/components/__tests__/SuccessPage.test.tsx`: Assert `CertificateZipProgressModal` opens in `"Preparando lote..."` during `getRecognitionTypeById`/`getHierarchyData`, updates with `onProgress`, suppresses `alert` on cancel, closes via `waitFor(...)`, and preserves `alert` on non-abort error.
    *   **Phase 3 Checkpoint**: Run `npm run lint`, `npm run build`, and `npm test -- --run src/features/batches/components/__tests__/BatchDetail.test.tsx src/features/batches/components/__tests__/BatchList.test.tsx src/features/batches/components/__tests__/SuccessPage.test.tsx`; target: exit code `0`.

#### Phase 4: Blueprint Documentation Maps & Full Verification Gate

17. **Documentation & Design Maps (Modify)**
    *   `docs/designs/SITEMAP.md`: Update the existing `scoped-certificate-zip-and-progress-modal.md` row (line 12) status from `Proposed` to `Implemented` (and update `Status: Implemented` inside this design document header).
    *   `src/features/batches/README.md`, `src/features/batches/api/README.md`, `src/features/batches/components/README.md`, `src/features/batches/components/detail/README.md`, `src/features/batches/components/list/README.md`, `src/features/batches/components/shared/README.md`, `src/features/batches/hooks/README.md`, and `src/features/batches/utils/README.md`: Update exported symbol lists (`filterEligibleReportBuckets`, `eligibleCount`, `ScopedExportSplitButton`, `BatchDetailHeader`, `BatchReportControls`, `CertificateZipProgressModal`, `useCertificateZipDownload`), modal/abort invariants, and relative links in `src/features/batches/README.md` (`./components/detail/README.md`, `./components/shared/README.md`, `./hooks/README.md`) and `src/features/batches/components/README.md` (`./detail/README.md`, `./shared/README.md`).

### Verification Plan

*   **Static Analysis & Linting**: Run `npm run lint` (`eslint .`); target: exit code `0` with zero warnings or errors.
*   **Compilation/Build**: Run `npm run build` (`tsc && vite build`); target: exit code `0` with zero TypeScript errors across all new and updated modules.
*   **Unit & Component Tests**: Run `npm test -- --run`; target: all existing and new Vitest suites (`certificatePdfGenerator.test.ts`, `batchReports.test.ts`, `batchTerritorial.test.ts`, `useCertificateZipDownload.test.ts`, `CertificateZipProgressModal.test.tsx`, `BatchDetail.test.tsx`, `BatchList.test.tsx`, `SuccessPage.test.tsx`, and the full repository suite) exit `0` with zero failures.
*   **Manual Verification**: Open Batch Detail on a multi-group batch (`30+` members plus one all-`pending` group) to confirm split-button alignment, omitted `0`-eligible groups, live `X / Y (Z%)` + `"Comprimiendo archivo ZIP..."` progress, and `"Cancelando..."` abort across Batch Detail, Batch List, and Success Page.

--------------------------------------------------------------------------------

*Drafted with EGM*
