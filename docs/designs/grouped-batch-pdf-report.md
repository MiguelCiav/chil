# Grouped PDF "Lista" Report & Selective Group Export

*   **Author:** Miguel Ciavato
*   **Status:** Implemented
*   **Date:** 2026-11-13

--------------------------------------------------------------------------------

## Overview

General Scout recognition batches can contain members from multiple Scout groups, districts, regions, non-scout recipients, and ungrouped or unregistered individuals. Today, the downloadable member PDF report (`generateBatchReport`) prints a single batch-level Region, District, and Group in its top header and renders all members in one flat alphabetical table. This design restructures the PDF "Lista" report so members flow continuously under group section headers showing each group's District and Region, and adds a single-group PDF export menu on Batch Detail alongside the existing one-click full-batch download.

## The Problem

The current PDF report in `src/features/batches/api/batchReports.ts` was built for single-group batches (`batch.region_id`, `batch.district_id`, `batch.group_id`). For general multi-group batches created by the batch wizard:

1.  **Invalid top-level territory metadata:** The top `"Información del Lote"` block prints `Región: No aplica`, `Distrito: No aplica`, and `Grupo: No aplica` because multi-group batches store `0` on the batch record while individual members carry their own `group_id`.
2.  **Unstructured flat table:** Every member appears in a single alphabetical list with a narrow `Grupo` column (18-character limit) and a truncated `Nombre Completo` column (26-character limit), making it hard to distribute or review lists per Scout group.
3.  **Incomplete summary and broken pagination:** `Resumen de Miembros` counts only `active` and `pending` members, omitting `exceptional` (`Emisión Excepcional`) recipients so the breakdown does not add up to `Total Miembros`. On multi-page reports, `generateBatchReport` only writes `"Lista de Miembros (Continuación)"` without repeating table column headers.
4.  **No single-group export on Batch Detail:** Coordinators who need to hand a group leader only their group's member list must download and manually split the full batch PDF.

To fix this without complicating the Batch Detail member table or breaking `SuccessPage`, the PDF report must group members deterministically into continuous sections (`"Miembros no scout"`, canonical Scout groups with District and Region, and `"Sin grupo asignado"`), use one uniform top header, and expose a scoped `"Por grupo"` download menu on `BatchDetailHeader` only when a batch contains more than one bucket.

## Goals

*   Group members in `generateBatchReport` into continuous sections ordered deterministically: canonical Scout groups (each displaying its District and Region), `"Miembros no scout"` (`unit === 'no_scout'`), and `"Sin grupo asignado"` (remaining ungrouped members).
*   Replace the invalid batch-level `Región`, `Distrito`, and `Grupo` header fields with one uniform `"Información del Lote"` header (`ID`, `Fecha`, wrapped `Comentario`, and `Alcance`) across both full-batch and single-group exports.
*   Include `Emisión Excepcional` in `Resumen de Miembros` (computed from the exported member slice so `Activos + Excepcionales + Pendientes === Total`), drop the redundant per-row `Grupo` column, and widen `Nombre Completo` to remove the 26-character cutoff.
*   Prevent orphaned group section headers at page bottoms and repeat the active section banner plus table column headers on continuation pages.
*   Provide a one-click `"Descargar lista (PDF)"` full-batch button alongside a `"Por grupo"` export menu in `BatchDetailHeader` (hidden when the batch resolves to 0 or 1 bucket), and fix `EditMemberModal` to store `group_id: 0` when clearing a member's group so cleared members are not re-attached via `batch.group_id`.
*   Keep `SuccessPage` `"Descargar Lista"` exporting all groups by default without breaking existing 3-argument callers or tests.

## Non-Goals

*   Grouping, filtering, or changing table columns inside `BatchMembersTable` or `MemberQuickViewModal` (a follow-up UI cleanup removed `"Detalles del Lote"` from `BatchSummaryCards` and right-aligned action and pagination controls on Batch Detail).
*   Adding Region-wide or District-wide PDF export dropdowns or filters.
*   Removing or altering the `/emision-rapida` (`QuickRecognition`) workflow or batch wizard hierarchy behavior.
*   Modifying `exportMembersToCSV` or certificate ZIP export (`generateBatchCertificatesZip`).

## Open Questions

None. All scope, routing precedence, layout, and UI interaction questions were resolved during ideation and context review.

## Critical User Journeys (CUJs)

### CUJ 1: Full-Batch Grouped PDF Export from Batch Detail or Success Page

*   **Given**: A multi-group batch containing Scout members across two or more groups, one `unit === 'no_scout'` recipient, and one `pending` member with no assigned group.
*   **When**: The user clicks `"Descargar lista (PDF)"` on Batch Detail (or `"Descargar Lista"` on `SuccessPage`).
*   **Then**: The browser downloads `Reporte_Lote_<batchId>.pdf` containing a uniform top header (`Alcance: Todos los grupos (<N>)`), full-batch summary metrics including `Emisión Excepcional`, and continuous sections for each Scout group (with District and Region in the section header), `"Miembros no scout"`, and `"Sin grupo asignado"`, with widened member names and repeated headers across page breaks.

### CUJ 2: Single-Group Scoped PDF Export from Batch Detail

*   **Given**: A batch on Batch Detail whose members resolve into two or more buckets (for example, two Scout groups, or one Scout group plus `"Sin grupo asignado"`).
*   **When**: The user opens the `"Por grupo"` menu next to `"Descargar lista (PDF)"` and selects a specific Scout group (or special bucket).
*   **Then**: The browser immediately downloads `Reporte_Lote_<batchId>_<slug>.pdf` scoped strictly to that bucket's members, with `Alcance` showing the chosen bucket, `Resumen de Miembros` matching only those members, and the Batch Detail members table on screen remaining unchanged.

### CUJ 3: Single-Bucket Batch Hides Group Selector

*   **Given**: A batch whose members all resolve into a single bucket (for example, all members belong to one Scout group, or all members are `"Miembros no scout"`).
*   **When**: The user opens Batch Detail.
*   **Then**: Only the one-click `"Descargar lista (PDF)"` button is shown in `BatchDetailHeader`; the `"Por grupo"` menu is hidden.

### CUJ 4: Preserving Explicitly Cleared Groups on Legacy or Quick-Emission Batches

*   **Given**: A legacy or quick-emission batch with `batch.group_id > 0` where a coordinator opens `EditMemberModal` for one member and clears their group (`"Sin grupo asignado / No aplica"`).
*   **When**: The coordinator saves the member edit and downloads the PDF report.
*   **Then**: `EditMemberModal` persists `group_id: 0` instead of `undefined`, so the cleared member routes into `"Sin grupo asignado"` rather than falling back to `batch.group_id`, and the `"Por grupo"` menu updates automatically if the batch now has multiple buckets.

## Technical Plan (Architecture)

### Architecture & Data Flow

```text
  BatchDetail.tsx (members, batch, hierarchy)       SuccessPage.tsx (3-arg call)
         |                                                |
         | useMemo: resolveBatchReportBuckets(...)        |
         v                                                v
  BatchDetailHeader                               generateBatchReport(batch, members, hierarchy, { bucketKey? })
   |- "Descargar lista (PDF)" (all buckets)               |
   '- "Por grupo" menu (only if buckets.length > 1) ------+--> resolveBatchReportBuckets(...)
                                                          |--> Optional filter by options.bucketKey
                                                          |--> Uniform Header + Scoped Resumen de Miembros
                                                          '--> Continuous Group Sections + Page-Break Guards
```

### 1. Shared Bucketing Helper (`src/features/batches/api/batchReports.ts`)

Both the Batch Detail UI and PDF generator consume a single pure function `resolveBatchReportBuckets(batch, members, hierarchy)` exported from `batchReports.ts` (and re-exported via `src/features/batches/api/index.ts`):

*   **Typed Bucket Contract:**
    *   `ReportBucketKind`: `'group' | 'no_scout' | 'ungrouped'`
    *   `ReportBucketKey`: `` `group:${number}` | 'special:no_scout' | 'special:ungrouped' `` (avoids numeric `0` collisions with the synthetic `{ id: 0, name: 'No aplica' }` entry injected by `hierarchyApi.ts`).
    *   `BatchReportBucket`: `{ key, kind, label, districtName, regionName, members }`, where `members` is sorted alphabetically by `last_names`, `first_names` (`es`, `sensitivity: 'base'`), tie-broken by `identity`.
*   **Routing Precedence per Member:**
    1.  If `member.unit === 'no_scout'` -> route to `special:no_scout` (`"Miembros no scout"`, `districtName: null`, `regionName: null`), ignoring `member.group_id` and `batch.group_id`.
    2.  Otherwise compute `candidateGroupId = member.group_id ?? batch.group_id`.
    3.  If `candidateGroupId && candidateGroupId !== 0`, look up `group` in `hierarchy.groups` (excluding `id === 0`). If found, resolve `district` via `group.district_id` and `region` via `district.region_id` (falling back to `'No aplica'` only if a parent record is missing), and route to `` `group:${group.id}` ``.
    4.  Otherwise (including `candidateGroupId === 0` or an unresolved positive `group_id` absent from `hierarchy.groups`, logging `console.warn` on unresolved positive IDs), route to `special:ungrouped` (`"Sin grupo asignado"`).
*   **Bucket Ordering:** Canonical Scout groups sorted alphabetically by `label` (`es`, tie-broken by `key`), followed by `"Miembros no scout"` and `"Sin grupo asignado"` at the end when non-empty.

### 2. Cleared-Group Persistence Fix (`EditMemberModal.tsx`)

In `src/features/batches/components/shared/EditMemberModal.tsx`, selecting `"Sin grupo asignado / No aplica"` (`val === 0`) or invalidating a member's group after changing `#member-region-select` / `#member-district-select` currently writes `group_id: undefined`. Because `sanitizeMemberForSave` (`src/features/batches/api/membersCrud.ts`) preserves numeric `0` while omitting `undefined`, updating `EditMemberModal.tsx` to assign `group_id: 0` when cleared ensures `m.group_id ?? batch.group_id` distinguishes explicitly cleared members (`0`) from legacy or quick-emission members (`undefined`).

### 3. Backward-Compatible `generateBatchReport` & Composable PDF Layout

*   **Signature & Scoped Resolution:** Extend `generateBatchReport` to accept an optional 4th argument `options?: { bucketKey?: ReportBucketKey }`, keeping 3-argument callers (`SuccessPage.tsx`, `SuccessPage.test.tsx`) unchanged. When `options?.bucketKey` is supplied, filter `buckets` to that matching bucket (throwing an explicit error if the key matches no bucket so silent empty PDFs cannot occur).
*   **Uniform Top Header (`Información del Lote`):** Remove `Región`, `Distrito`, and `Grupo` from the top block across all exports. Render `ID del Lote`, `Fecha de Creación`, `Alcance` (`"Todos los grupos (${buckets.length})"` for multi-bucket full exports, or `bucket.label` for single-bucket / scoped exports), and wrapped `Comentario` text via `docPdf.splitTextToSize(...)` so long comments advance `y` cleanly without overlapping adjacent columns.
*   **Scoped `Resumen de Miembros`:** Compute `Total`, `Activos (Válidos)`, `Excepcionales`, and `Pendientes` strictly from the exported members slice and lay them out within `14..196mm` (two balanced rows or a 4-column metric row) so status counts always sum to `Total`.
*   **Continuous Group Sections & Pagination:**
    *   Before each section header, call a cursor guard `ensureSpace(requiredHeight)` requiring room for `sectionHeaderHeight + tableHeaderHeight + 1 row`; if insufficient, call `docPdf.addPage()`.
    *   Draw the section header (`"${bucket.label} (${bucket.members.length})"` plus `"Distrito: ${bucket.districtName}  |  Región: ${bucket.regionName}"` for `'group'` buckets).
    *   Draw table column headers (`Cédula`, `Nombre Completo`, `Tipo`, `Estado`), removing the redundant `Grupo` column and widening `Nombre Completo` to span the freed width (`x = 46..130`, wrapping or fitting full names cleanly while shifting `Tipo` to `x = 132` and `Estado` to `x = 156` so `"Emisión Excepcional"` stays inside `196mm`).
    *   On mid-section page overflow, add a page and redraw `"${bucket.label} (Continuación)"` (with District/Region for Scout groups) plus the table column headers before continuing member rows.
*   **Scoped Filename:** Full-batch exports continue saving `Reporte_Lote_${batch.id}.pdf`; single-bucket scoped exports save `Reporte_Lote_${batch.id}_${sanitizeFilenameSlug(selectedBucket.label)}.pdf` using a local NFD-normalizing slug helper in `batchReports.ts` (matching the pattern in `certificatePdfGenerator.ts` without modifying `recognitions/`).

### 4. Batch Detail Header Export Controls (`BatchDetail.tsx`, `BatchDetailHeader.tsx`)

*   `BatchDetail.tsx` computes `reportBuckets` with `useMemo` from `batch`, `members`, and `{ regions, districts, groups }`, passing `reportBuckets` and `onDownloadMemberList(bucketKey?: ReportBucketKey)` to `BatchDetailHeader`.
*   `BatchDetailHeader` places its action bar right-aligned on the header's right edge (`flex-col xl:flex-row xl:items-center xl:justify-between`, actions `justify-end w-full xl:w-auto xl:ml-auto`) and renders a compact `BatchReportControls` group (`inline-flex flex-wrap items-center justify-end gap-2`, extracted in `src/features/batches/components/detail/BatchReportControls.tsx` to keep `BatchDetailHeader` thin):
    *   `"Descargar lista (PDF)"` button (`disabled={downloadingReport || members.length === 0}`) for one-click full-batch export.
    *   `"Por grupo"` dropdown menu button rendered **only** when `reportBuckets.length > 1`. Clicking `"Por grupo"` opens an accessible menu listing each bucket (showing group name, District sublabel for Scout groups, member count, and a divider before special buckets); selecting an item closes the menu and triggers `onDownloadMemberList(bucket.key)` immediately. Outside-click and `Escape` close the menu.
*   `BATCH_DETAIL_TOUR_STEPS[0]` in `batchDetailTour.ts` is updated to reflect full-batch or per-group PDF list export (and Step 2 omits `"estructura geográfica"` following the 3-card `BatchSummaryCards` cleanup; `BatchMembersTable` right-aligns pagination controls via `justify-end w-full sm:w-auto`).

## Alternatives Considered

### Alternative A: Cascading Region, District, and Group Dropdowns in `BatchDetailHeader`

*   **Pros**: Supports Region-wide or District-wide filtered PDFs from mixed batches without adding a separate export page.
*   **Cons**: Crowds `BatchDetailHeader` alongside `Eliminar Lote`, `Descargar lista (PDF)`, and `Descargar Reconocimientos (ZIP)`, and invites user confusion over whether Region/District dropdowns filter `BatchMembersTable` or ZIP exports.
*   **Reason for Rejection**: Rejected by author: Region and District exports are only needed in rare national cases; displaying each group's District and Region in its PDF section header gives full geographic context without multi-dropdown clutter.

### Alternative B: Page Break Per Group Section

*   **Pros**: Removes the need for mid-section continuation headers because every group begins on a fresh page.
*   **Cons**: Wastes paper and vertical space by generating sparse pages whenever batches include many groups with only 1–3 members.
*   **Reason for Rejection**: Rejected by author: Continuous group sections with orphan-prevention checks keep multi-group PDFs compact while preserving readability.

### Alternative C: Grouped Full-Batch PDF Only (Defer Single-Group Export)

*   **Pros**: Keeps all changes isolated inside `batchReports.ts` with zero UI additions or bucketing props in `BatchDetailHeader`.
*   **Cons**: Forces coordinators to download and manually extract pages from the full batch PDF when handing a single group's list to a group leader.
*   **Reason for Rejection**: Rejected by author: Generating a standalone PDF for a selected group on Batch Detail is a core requirement.

### Alternative D: Dual Top-Header Layout for Single-Group Exports

*   **Pros**: Preserves the legacy `Región / Distrito / Grupo` rows in `Información del Lote` when a single Scout group is selected.
*   **Cons**: Duplicates the exact same District and Region already displayed on the group section header immediately below it (or requires branching to suppress the section header in single-group mode).
*   **Reason for Rejection**: Rejected by author: Using one uniform top header (`Alcance`) and always letting the section header carry `Grupo`, `Distrito`, and `Región` eliminates conditional header layouts.

### Alternative E: Passive `<select>` Next to `"Descargar lista"`

*   **Pros**: Uses a native `<select>` element without custom popover open/close or `Escape`-key management.
*   **Cons**: Creates trigger ambiguity—users who select a group in the dropdown and click `"Descargar lista"` expect a filtered export, breaking the one-click full-batch guarantee—while adding a separate `"Descargar grupo"` button adds extra header controls.
*   **Reason for Rejection**: Rejected by author: Pairing `"Descargar lista (PDF)"` (always full batch) with an action-bound `"Por grupo"` menu keeps one-click full export unmistakable.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Backward Compatibility**: `generateBatchReport(batchOrId, membersParam?, hierarchyParam?, options?)` retains its 3-argument positional signature so `SuccessPage.tsx` and existing test mocks continue functioning without changes. Legacy single-group and `/emision-rapida` batches where `member.group_id` is `undefined` still inherit `batch.group_id` when `batch.group_id > 0` and `unit !== 'no_scout'`.
*   **Cross-Platform Filename Safety**: Scoped PDF filenames sanitize group names via NFD diacritic stripping and `[a-z0-9_]` slugification so downloads succeed cleanly across web browsers and the Tauri desktop runtime.
*   **Client-Side Performance**: `resolveBatchReportBuckets` runs in a single linear pass over `members` using `Map`-indexed hierarchy lookups and is memoized via `useMemo` in `BatchDetail.tsx`.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

The implementation is partitioned into three incremental phases; each phase leaves the repository buildable and verified before advancing.

### Phase 1: Reporting Core, Cleared-Group Fix & Unit Tests

#### 1. `src/features/batches/api/batchReports.ts` (Modify)

*   **Type / Scope**: Batch reporting API and PDF layout module.
*   **Proposed Changes**:
    *   Export types:
        *   `ReportBucketKind = 'group' | 'no_scout' | 'ungrouped'`
        *   `ReportBucketKey = \`group:${number}\` | 'special:no_scout' | 'special:ungrouped'`
        *   `BatchReportBucket = { key: ReportBucketKey; kind: ReportBucketKind; label: string; districtName: string | null; regionName: string | null; members: ScoutMember[] }`
        *   `GenerateBatchReportOptions = { bucketKey?: ReportBucketKey }`
    *   Export pure function `resolveBatchReportBuckets(batch: Batch, members: ScoutMember[], hierarchy: { regions: Region[]; districts: District[]; groups: ScoutGroup[] }): BatchReportBucket[]`:
        *   Index non-zero `regions`, `districts`, and `groups` (`id !== 0`) in `Map`s so synthetic `{ id: 0, name: 'No aplica' }` entries from `hierarchyApi.ts` never match as real groups.
        *   Route each member in strict order: (1) `m.unit === 'no_scout'` -> `'special:no_scout'` (`"Miembros no scout"`, `districtName: null`, `regionName: null`, ignoring `m.group_id` and `batch.group_id`); (2) `candidateGroupId = m.group_id ?? batch.group_id` matched against non-zero `groups` -> `` `group:${group.id}` `` with `districtName` resolved via `group.district_id` and `regionName` resolved via `district.region_id` (falling back to `'No aplica'` if a parent record is missing); (3) all others—including `candidateGroupId === 0` (no warning) or an unresolved positive `group_id` absent from `hierarchy.groups` (logging `console.warn`)—route to `'special:ungrouped'` (`"Sin grupo asignado"`, `districtName: null`, `regionName: null`).
        *   Sort members inside each bucket by `${m.last_names ?? ''} ${m.first_names ?? ''}`.trim() (`es`, `sensitivity: 'base'`), tie-broken by `(a.identity ?? '').localeCompare(b.identity ?? '', 'es', { sensitivity: 'base' })`.
        *   Sort Scout group buckets alphabetically by `label` (`es`, tie-broken by `key`), and append non-empty `"Miembros no scout"` then `"Sin grupo asignado"` at the end.
    *   Add a local `sanitizeFilenameSlug(text: string): string` helper: NFD normalization, strip diacritics, `.toLowerCase()`, replace non-`[a-z0-9_]` with `_`, collapse/trim underscores, fallback `'grupo'`.
    *   Define explicit A4 layout and pagination constants: `PAGE_TOP_Y = 20`, `PAGE_BOTTOM_Y = 275`, `CONTENT_LEFT_X = 14`, `CONTENT_RIGHT_X = 196`, `CONTENT_WIDTH = 182`, `LINE_HEIGHT = 5`, `SECTION_HEADER_HEIGHT_GROUP = 13`, `SECTION_HEADER_HEIGHT_SPECIAL = 8`, `TABLE_HEADER_HEIGHT = 8`, `MIN_ROW_HEIGHT = 8`.
    *   Extend `generateBatchReport(batchOrId, membersParam?, hierarchyParam?, options?: GenerateBatchReportOptions): Promise<string>`:
        *   Keep default full-batch behavior when `options?.bucketKey` is omitted (preserving 1-, 2-, and 3-argument callers such as `SuccessPage.tsx`).
        *   Throw `new Error('No hay miembros en este lote para generar el reporte.')` before instantiating `jsPDF` whenever resolved `members.length === 0`.
        *   Compute `buckets = resolveBatchReportBuckets(batch, members, hierarchy)`. When `options?.bucketKey` is supplied, find `selectedBucket` in `buckets` or throw `new Error('El grupo seleccionado no tiene miembros en este lote.')` if absent, and set `activeBuckets = selectedBucket ? [selectedBucket] : buckets`.
        *   Set `"Alcance"` text to `"Todos los grupos (${activeBuckets.length})"` when `activeBuckets.length > 1`, or `activeBuckets[0].label` when `activeBuckets.length === 1`.
        *   Render `"Información del Lote"` (`y = 42` heading; fields starting at `y = 50`) without batch-level `"Región"`, `"Distrito"`, or `"Grupo"` rows: left column at `x = 14` (`"ID del Lote: ${batch.id}"` at `y = 50`, `"Fecha de Creación: ..."` at `y = 56`), right column at `x = 110, y = 50` (`scopeLines = docPdf.splitTextToSize("Alcance: ...", 86)`), then advance `y = Math.max(62, 50 + scopeLines.length * LINE_HEIGHT + 2)` and render `commentLines = docPdf.splitTextToSize("Comentario: ${batch.comment?.trim() || 'Ninguno'}", 182)` at `(14, y)`, advancing `y += commentLines.length * LINE_HEIGHT + 2` before drawing the separator line.
        *   Advance `y += 8` for the `"Resumen de Miembros"` heading, `y += 8` for the 4-column horizontal metrics row (`fontSize = 10`, inside `14..196mm`: `"Total: ${total}"` at `x = 14`, `"Activos (Válidos): ${active}"` at `x = 56`, `"Excepcionales: ${exceptional}"` (`status === 'exceptional'`) at `x = 110`, and `"Pendientes: ${pending}"` (`status === 'pending'`, shortened to fit `44mm`) at `x = 152`), `y += 6` for the separator line, and `y += 8` before starting the first group section.
        *   Render continuous group sections using an explicit `y`-cursor and `ensureSpace(requiredHeight)` helper (`if (y + requiredHeight > PAGE_BOTTOM_Y)` -> `docPdf.addPage()`, `y = PAGE_TOP_Y`):
            *   Before each section header, call `ensureSpace(sectionHeaderHeight + TABLE_HEADER_HEIGHT + MIN_ROW_HEIGHT)` so no section header renders without at least one row beneath it.
            *   Draw the section header (`"${bucket.label} (${bucket.members.length})"` plus `"Distrito: ${bucket.districtName}  |  Región: ${bucket.regionName}"` for `'group'` buckets).
            *   Draw table column headers (`"Cédula"` at `x = 16`, `"Nombre Completo"` at `x = 46`, `"Tipo"` at `x = 132`, `"Estado"` at `x = 156`), omitting the per-row `"Grupo"` column.
            *   For each member row, wrap `fullName` (`${m.first_names ?? ''} ${m.last_names ?? ''}`.trim() || `'-'`) via `docPdf.splitTextToSize(fullName, 82)`, compute `rowHeight = Math.max(MIN_ROW_HEIGHT, nameLines.length * LINE_HEIGHT + 3)`, call `ensureSpace(rowHeight)`, and on page break redraw `"${bucket.label} (Continuación)"` (plus the District/Region sub-line for `'group'` buckets) and the table column headers before drawing the row (`m.identity ?? ''` at `x = 16`, `nameLines` at `x = 46`, `typeStr` at `x = 132`, `statusStr` `"Registro Válido"` / `"Emisión Excepcional"` / `"No registrado"` at `x = 156`).
        *   Save `Reporte_Lote_${batch.id}.pdf` when `options?.bucketKey` is omitted, or `Reporte_Lote_${batch.id}_${sanitizeFilenameSlug(selectedBucket.label)}.pdf` when scoped.

#### 2. `src/features/batches/components/shared/EditMemberModal.tsx` (Modify)

*   **Type / Scope**: Shared member editing modal.
*   **Proposed Changes**:
    *   In `#member-group-select` `onChange`, persist `group_id: val` directly (storing `0` when `"Sin grupo asignado / No aplica"` is selected rather than `undefined`).
    *   In `#member-region-select` (`if (!isValidDist)`) and `#member-district-select` (`if (!isValidGrp)`) cascade invalidation branches, assign `updated.group_id = 0` unconditionally instead of `undefined` so `sanitizeMemberForSave` (`src/features/batches/api/membersCrud.ts`) persists `0` to Firestore and `resolveBatchReportBuckets` does not fall back to `batch.group_id`.

#### 3. `src/features/batches/api/__tests__/batchReports.test.ts` (Create)

*   **Type / Scope**: Unit tests for `batchReports.ts`.
*   **Proposed Changes**:
    *   Mock `jsPDF` following `src/features/recognitions/services/__tests__/certificatePdfGenerator.test.ts` **and** stub `splitTextToSize: vi.fn((text: string) => [text])` (with width-aware line-array mocks in wrapping test cases).
    *   Verify `resolveBatchReportBuckets` precedence: `no_scout` overriding `member.group_id` and `batch.group_id`; `m.group_id ?? batch.group_id`; `group_id: 0` routing to `"Sin grupo asignado"` without `console.warn`; unresolved positive `group_id` routing to `"Sin grupo asignado"` with `console.warn`; canonical `group -> district -> region` lookup; `active`, `exceptional`, and `pending` members kept in assigned groups; alphabetical group ordering with special buckets pinned last; and null-safe `identity` tie-breaking.
    *   Verify `generateBatchReport`: empty-batch error guard when `members.length === 0`; missing `bucketKey` error guard; uniform `"Información del Lote"` header with `"Alcance"` and wrapped `"Comentario"`; 4-metric `"Resumen de Miembros"` (`"Total"`, `"Activos (Válidos)"`, `"Excepcionales"`, `"Pendientes"`); continuous section headers with District/Region; wrapped `"Nombre Completo"` without `"Grupo"` column; scoped single-bucket export + sanitized lowercase filename; and `ensureSpace` page-break orphan prevention + continuation section header + repeated table column headers.

*   **Phase 1 Checkpoint**: Run `npm run lint && npm run build && npm test -- --run`.

### Phase 2: Batch Detail Export Controls, Tour & Integration Tests

#### 4. `src/features/batches/components/detail/BatchReportControls.tsx` (Create)

*   **Type / Scope**: Presentational PDF list export controls for Batch Detail.
*   **Proposed Changes**:
    *   Export `BatchReportControlsProps = { buckets: BatchReportBucket[]; downloadingReport: boolean; isListEmpty: boolean; onDownloadMemberList: (bucketKey?: ReportBucketKey) => void }` and `BatchReportControls`.
    *   Render `"Descargar lista (PDF)"` using shared `Button` (`variant="outline"`, `Download` icon), displaying `downloadingReport ? 'Generando PDF...' : 'Descargar lista (PDF)'`, disabled when `downloadingReport || isListEmpty`, with `title={isListEmpty ? 'No hay miembros en este lote para generar la lista' : undefined}`, invoking `onDownloadMemberList()`.
    *   When `buckets.length > 1`, render an adjacent `"Por grupo"` menu trigger button (`ChevronDown` icon, `aria-haspopup="menu"`, `aria-expanded={isOpen}`, disabled when `downloadingReport || isListEmpty`, keeping its accessible name `"Por grupo"` free of `"lista"` so `/Descargar lista/i` queries remain unique) that toggles a popover menu listing each bucket (`role="menu"` / `role="menuitem"`).
    *   Display each bucket's `label`, its `districtName` sublabel (suppressed when `districtName` is `null` or `'No aplica'`), and member count badge; render a visual divider before special buckets (`"Miembros no scout"`, `"Sin grupo asignado"`) only when at least one `'group'` bucket precedes them.
    *   Close menu on item click (calling `onDownloadMemberList(bucket.key)` immediately), `Escape` key, or outside pointer click.

#### 5. `src/features/batches/components/detail/BatchDetailHeader.tsx` (Modify)

*   **Type / Scope**: Batch Detail header bar component.
*   **Proposed Changes**:
    *   Update `BatchDetailHeaderProps` to accept `reportBuckets: BatchReportBucket[]`, `isListEmpty: boolean`, and `onDownloadMemberList: (bucketKey?: ReportBucketKey) => void`.
    *   Replace the single `"Descargar lista"` `<Button>` with `<BatchReportControls buckets={reportBuckets} downloadingReport={downloadingReport} isListEmpty={isListEmpty} onDownloadMemberList={onDownloadMemberList} />`, remove the unused `Download` icon import, keep `"Eliminar Lote"` and `"Descargar Reconocimientos (ZIP)"`, and right-align the header action bar (`xl:flex-row`, `justify-end`, `xl:ml-auto`).

#### 6. `src/features/batches/components/detail/index.ts` (Modify)

*   **Type / Scope**: Barrel export for Batch Detail subcomponents.
*   **Proposed Changes**:
    *   Export `BatchReportControls` and `BatchReportControlsProps` from `./BatchReportControls`.

#### 7. `src/features/batches/components/detail/batchDetailTour.ts` (Modify)

*   **Type / Scope**: Interactive walkthrough step copy.
*   **Proposed Changes**:
    *   Update `BATCH_DETAIL_TOUR_STEPS[0].content` to: `'Consulta la información completa del lote. Desde la cabecera puedes descargar todos los reconocimientos oficiales en PDF, generar el reporte de lista (completo o por grupo) o eliminar el lote si es necesario.'` (and Step 2 omits `"estructura geográfica"` to match the 3-card `BatchSummaryCards` layout).

#### 8. `src/features/batches/components/BatchDetail.tsx` (Modify)

*   **Type / Scope**: Batch Detail page container.
*   **Proposed Changes**:
    *   Import `resolveBatchReportBuckets`, `ReportBucketKey` from `../api`.
    *   Compute `reportBuckets` via `useMemo` with an explicit `if (!batch) return [];` guard from `batch`, `members`, and `{ regions, districts, groups }`.
    *   Update `handleDownloadMemberListPDF` to accept optional `bucketKey?: ReportBucketKey`, calling `generateBatchReport(batch, members, { regions, districts, groups }, { bucketKey })` when `bucketKey` is present and 3-argument `generateBatchReport(batch, members, { regions, districts, groups })` when omitted.
    *   Pass `reportBuckets` and `isListEmpty={members.length === 0}` to `BatchDetailHeader` without modifying `BatchMembersTable` columns or `MemberQuickViewModal` (while a follow-up UI pass simplified `BatchSummaryCards` to 3 cards without `regions`/`districts`/`groups` and right-aligned `BatchMembersTable` pagination controls).

#### 9. `src/features/batches/components/__tests__/BatchDetail.test.tsx` (Modify)

*   **Type / Scope**: Integration component tests for `BatchDetail` and `EditMemberModal`.
*   **Proposed Changes**:
    *   Update the `vi.mock('../../api', async (importOriginal) => ...)` factory so `resolveBatchReportBuckets` resolves to the real implementation from `importOriginal` (existing fixture tests with `batch.group_id: 100` and `groups: []` will emit expected `console.warn` logs and require no assertion changes).
    *   Update the `BATCH_DETAIL_TOUR_STEPS[0].content` assertion to match the exact Spanish copy in Item 7.
    *   Add tests verifying: `"Por grupo"` is hidden for 0-bucket and single-bucket batches (both 1 Scout group and 1 special bucket); `"Por grupo"` appears for 2+ buckets (including 1 Scout group + 1 special bucket); clicking `"Descargar lista (PDF)"` calls `generateBatchReport` with 3 arguments (no `bucketKey`); clicking a group in `"Por grupo"` calls `generateBatchReport` with `{ bucketKey }`; controls disable with tooltip when `members.length === 0`; and clearing a member's group in `EditMemberModal` saves `group_id: 0`.

*   **Phase 2 Checkpoint**: Run `npm run lint && npm run build && npm test -- --run`.

### Phase 3: Documentation Context Maps

#### 10. Documentation Context Maps (Modify)

*   **Files**: `src/features/batches/api/README.md`, `src/features/batches/components/detail/README.md`, `src/features/batches/components/shared/README.md`.
*   **Proposed Changes**:
    *   Update `api/README.md` with `resolveBatchReportBuckets`, new exported types, `generateBatchReport`'s optional 4th `options` parameter, `"Excepcionales"` summary metric (`status === 'exceptional'`), empty-batch error guard, and pagination invariants.
    *   Update `components/detail/README.md` with `BatchReportControls`, `BatchReportControlsProps`, updated `BatchDetailHeaderProps`, and empty-list disabled guard.
    *   Update `components/shared/README.md` to document `EditMemberModal` persisting `group_id: 0` when clearing a member's group.

### Verification Plan

*   **Static Analysis & Linting**: Run `npm run lint` from the repository root (`eslint.config.js` across `**/*.{ts,tsx}`) and verify zero errors or warnings.
*   **Compilation/Build**: Run `npm run build` (`tsc && vite build`) and verify zero-error TypeScript compilation and Vite bundle output.
*   **Unit & Component Tests**: Run `npm test -- --run` (covering `batchReports.test.ts`, `BatchDetail.test.tsx`, `SuccessPage.test.tsx`, and the full Vitest suite) and verify all tests pass with no skipped assertions.
*   **Coverage Check**: Optionally run `npx vitest run --coverage src/features/batches/api/__tests__/batchReports.test.ts src/features/batches/components/__tests__/BatchDetail.test.tsx` to inspect branch coverage on `batchReports.ts` pagination and bucket routing paths.

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
