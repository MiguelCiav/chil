# Architecture & Documentation Drift Report (2026-11-13)

Targets audited:
- `docs/designs/` (`SITEMAP.md`, `batch-wizard-cleanup-and-scraper-session.md`, `grouped-batch-pdf-report.md`)
- `src/features/batches/components/detail/README.md`
- `src/features/batches/api/README.md`
- `src/features/batches/components/README.md`
- `src/features/batches/components/shared/README.md`

---

## docs/designs/SITEMAP.md

No drift detected

## docs/designs/batch-wizard-cleanup-and-scraper-session.md

No drift detected

## docs/designs/grouped-batch-pdf-report.md

- **Non-Goal superseded in `BatchSummaryCards` (`src/features/batches/components/detail/BatchSummaryCards.tsx`, `src/features/batches/components/BatchDetail.tsx`, `src/features/batches/components/detail/batchDetailTour.ts`):** `grouped-batch-pdf-report.md` (line 35) lists changing `BatchSummaryCards` as a Non-Goal, but `BatchSummaryCards.tsx` subsequently removed the `"Detalles del Lote"` card and its `regions`, `districts`, and `groups` props, switched to 3 cards in `grid-cols-1 md:grid-cols-3 gap-6` (`Tipo de Reconocimiento`, `Resumen de Miembros`, `Comentarios / Observaciones`), `BatchDetail.tsx` stopped passing hierarchy props to `BatchSummaryCards`, and `batchDetailTour.ts` Step 2 dropped `"estructura geográfica"` from its copy.
- **Header & pagination layout divergence (`src/features/batches/components/detail/BatchDetailHeader.tsx`, `src/features/batches/components/detail/BatchReportControls.tsx`, `src/features/batches/components/detail/BatchMembersTable.tsx`):** `BatchDetailHeader.tsx` now switches at `xl:` (`flex-col xl:flex-row xl:items-center xl:justify-between`) and right-aligns the action bar (`flex flex-wrap items-center justify-end gap-3 w-full xl:w-auto xl:ml-auto`), `BatchReportControls.tsx` right-aligns its controls (`inline-flex flex-wrap items-center justify-end gap-2`), and `BatchMembersTable.tsx` (line 104) right-aligns pagination buttons (`flex items-center justify-end gap-1 w-full sm:w-auto`).
- **Nullish group fallback detail (`src/features/batches/api/batchReports.ts`):** `grouped-batch-pdf-report.md` (line 97) specifies `member.group_id !== undefined ? member.group_id : batch.group_id`, whereas `batchReports.ts` uses `member.group_id ?? batch.group_id` (falling back on both `null` and `undefined`).

## src/features/batches/components/detail/README.md

- **Inaccurate `Side Effects` statement (`detail/README.md` line 27):** Claims `None (pure presentational and callback-driven UI components; mutations are delegated to parent callbacks)`, omitting that `BatchReportControls.tsx` registers and cleans up `document` `mousedown` and `keydown` event listeners inside `useEffect` while `menuOpen` is `true`.
- **Undocumented group resolution mismatch (`batchDetailColumns.tsx` vs `MemberQuickViewModal.tsx`):** `detail/README.md` omits that `batchDetailColumns.tsx:createBatchDetailColumns` resolves `info.row.original.group_id ?? batch?.group_id` (returning `'No aplica'` for `0`/falsy IDs and `'Grupo ${memberGroupId}'` for unmatched IDs), whereas `MemberQuickViewModal.tsx` falls back to `batchGroup || 'No aplica'` when `!member.group_id || member.group_id === 0` (so an explicitly cleared `group_id: 0` still displays a non-empty `batchGroup` in the quick view modal).
- **Undocumented UI invariants:** `detail/README.md` omits that `BatchReportControls.tsx` suppresses `districtName` when `null` or `'No aplica'`, closes on menu item selection/`Escape`/outside `mousedown`, and inserts a divider before `'special'` buckets only when preceded by `'group'` buckets; that `BatchMembersTable.tsx` right-aligns pagination controls (`justify-end w-full sm:w-auto`); and that `batchDetailColumns.tsx:renderMemberActionsCell` flips dropdown placement (`bottom-full` vs `top-full`) when rows are near the bottom of the table.

## src/features/batches/api/README.md

- **Undocumented `mergeBatches` fallback & backfill rules (`src/features/batches/api/batchesCrud.ts` lines 162–167, 182–184, 226–235):** `api/README.md` (line 19) omits that on `recognition_type` mismatch `mergeBatches` keeps `existingBatches[0].recognition_type` (`firstType ?? ''`), sets `created_at` to `latestCreatedAt` across source batches (falling back to `new Date().toISOString()`), and backfills reassigned members' `group_id` from `sourceBatch.group_id` (or `0`) when `member.group_id` is `undefined` or `NaN`.
- **Undocumented `membersCrud.ts` deletion & sanitization behavior (`src/features/batches/api/membersCrud.ts` lines 76–117, 152–175):** `api/README.md` omits that `deleteMember` silently swallows errors (`catch {}`) when deleting `alternativeKey` and `${batchId}_${alternativeKey || identityOrCode}`, and omits `sanitizeMemberForSave` stripping falsy optional string properties while preserving numeric `0` IDs.
- **Asymmetric `saveScraperSession` error mapping (`src/features/batches/api/scraperApi.ts` lines 196–200, 321–330):** `api/README.md` (line 29) groups all four scraper functions under uniform `ScraperSessionError` normalization, whereas `saveScraperSession`'s Firebase Callable path throws a plain `Error` on `code.includes('unauthenticated')` (invalid Impeesa credentials) and the HTTP path treats `401` with `reason === 'IMPEESA_INVALID_CREDENTIALS'` as a plain `Error` rather than `ScraperSessionError('UNAUTHENTICATED', ...)`.
- **`Side Effects` omission for report warnings (`api/README.md` lines 25–26, 36):** `console.warn` on unresolved positive group IDs is noted under `Invariants`, but omitted from `Side Effects` for `generateBatchReport` / `resolveBatchReportBuckets`.

## src/features/batches/components/README.md

- **Orphaned `QuickRecognition` workflow & redirect button (`src/App.tsx` lines 51–58, `src/features/batches/components/BatchList.tsx` lines 357–365, `src/features/batches/components/QuickRecognition.tsx`):** `components/README.md` (lines 4, 10, 23, 28) documents `QuickRecognition` as a top-level workflow page component, but `App.tsx` redirects both `/lotes/rapido` and `/emision-rapida` to `<Navigate to="/lotes/nuevo" replace />` (so `QuickRecognition` is unmounted from active routes), while `BatchList.tsx` still renders an `"Emisión Rápida"` button calling `navigate('/lotes/rapido')`.
- **Missing `BatchDetail` & toast invariants (`src/features/batches/components/BatchDetail.tsx`):** `components/README.md` (line 20) omits that `BatchDetail.tsx` memoizes `reportBuckets` via `resolveBatchReportBuckets`, supports scoped `bucketKey` PDF downloads, and manages timed auto-dismiss toast notifications (`3000ms` in `BatchDetail.tsx` and `BatchList.tsx` delete, `4000ms` in `BatchList.tsx` ZIP/merge, `NewBatchWizard.tsx`, and `SuccessPage.tsx`).

## src/features/batches/components/shared/README.md

- **Undocumented `EditMemberModal` status transitions, code generation, and `showContactFields` toggle (`src/features/batches/components/shared/EditMemberModal.tsx` lines 16, 43–55, 108–237):** `shared/README.md` (line 14) omits `EditMemberModalProps.showContactFields` (defaults to `true`; hides `Fecha de Nacimiento *` and contact inputs when `false` and moves `Unidad Scout *` inline next to `Tipo de Miembro *`), omits unit-change `status` transitions for unverified members (`'no_scout'` -> `'active'`, or changing off `'no_scout'` while unverified and `'active'` -> `'pending'`, duplicated across both `showContactFields` branches), and omits auto-generation of `REC-${suffix}` (`member.identity.slice(-4) || 'EXC'`) when toggling exceptional status with an empty `recognition_code`.
