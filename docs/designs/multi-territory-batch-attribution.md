# Multi-Territory Batches, Summary/Statistics Decoupling & BatchDetail Breakdown

*   **Author:** Miguel Ciavato
*   **Status:** Implemented
*   **Date:** 2026-11-13

--------------------------------------------------------------------------------

## Overview

In Chil, `Batch` documents (`src/types/batch.ts`) still store single numeric scalar fields (`region_id`, `district_id`, `group_id`). Because mixed-territory batches created in the 2-step batch wizard save `0` on those three batch fields, `BatchList`, `SummaryView`, `Statistics`, and `BatchDetail` drop multi-group visibility or fall back to stale batch-level shortcuts.

Building on the member-level bucketing introduced in [grouped-batch-pdf-report.md](./grouped-batch-pdf-report.md), this design updates four areas using read-time derivation from already-fetched client data without adding Firestore schema duplication, client write-sync hooks, or Firebase Cloud Functions:

1. **Unified member-first hierarchy attribution (`src/utils/memberHierarchy.ts`)**: Consolidate Region, District, and Group resolution into one pure helper shared by `batches`, `summary`, and `statistics`, replacing four-way resolution drift and normalizing member-write defaults.
2. **Read-time multi-territory `BatchList` projection, `"Completitud"` column, and exact filtering**: Compute per-column badge tokens, overflow counts, and batch completion status in memory from `BatchList`'s existing `getAllMembers` load, fixing both historical and new batches immediately while replacing substring filters with exact token matching.
3. **Member-first `SummaryView` and `Statistics` decoupling**: Resolve territorial attribution and filters from members rather than `Batch` scalar fields (`Batch` read only for `id`, `created_at`, and `recognition_type`), represent national institutional members (`unit === 'institucional'`, `0, 0, 0`) as `"Nacional"`, and remove batch-scalar shortcuts without breaking batch KPIs.
4. **`BatchDetail` fourth territorial breakdown card (`BatchTerritorialCard`)**: Display separate count-ordered `Regiones` (including `"Nacional"`), `Distritos`, and `Grupos` lists alongside conditional `"Miembros no scout"` and `"Sin grupo asignado"` bars below `BatchSummaryCards`.

--------------------------------------------------------------------------------

## The Problem

1. **Multi-group batches lose territorial visibility in `BatchList`:** Mixed batches created in `NewBatchWizard` store `region_id: 0`, `district_id: 0`, and `group_id: 0` on `Batch`, even though `BatchList.tsx` already loads all user `scout_members`. Reading only batch scalars renders `"No aplica"` for Region and District and collapses Group to `"Multigrupo"`.
2. **Unregistered `'pending'` members distort batch geography without completion status:** Failed Impeesa lookups save unregistered members (`0, 0, 0`, `status: 'pending'`, with unit inferred from scope/age). Mixing `'none'` (`"No aplica"`) entries into Scout columns pollutes single-group batches, while excluding all `'pending'` members by status erases real groups belonging to insolvent scraped Scouts who do carry valid hierarchy IDs. Coordinators also lack a dedicated `"Completitud"` column to spot batches with remaining `'pending'` records.
3. **String/substring filtering and overloaded `0` IDs break special cases and positive-ID `"NO APLICA"` districts:** `AddFilterModal.tsx` and `batchListFilters.ts` match Group names with `.includes()` (so `"Grupo 1"` matches `"Grupo 10"`), cannot filter `"Nacional"`, `"No scout"`, or `"Completitud"`, and miss multi-group members. Meanwhile, `SummaryView.tsx` maps `0` to `'-'` while filtering against `"No aplica"`, `hierarchyApi.ts` prepends `{ id: 0, name: 'No aplica' }`, cascading `<select>` controls drop `id === 0` when a Region is chosen, and `hierarchy.json` contains 11 positive-ID districts literally named `"NO APLICA"`.
4. **Inconsistent hierarchy resolution across `Summary` and `Statistics`:** `SummaryView.tsx` reads `batch.region_id` and `batch.district_id` directly instead of member hierarchy; `statsCalculators.ts:calculateKpiMetrics` and `useStatisticsData.ts` still inject or short-circuit on `batch.region_id`/`batch.district_id`; `EditMemberModal.tsx`, `ManualMemberModal.tsx`, and `wizardHelpers.ts` write `undefined` instead of explicit `0` (causing silent fallback to legacy `batch` IDs); and none of the views attribute `0, 0, 0` institutional members as `"Nacional"`.
5. **No on-screen territorial count summary on `BatchDetail`:** `BatchSummaryCards.tsx` displays only three cards (`Tipo de Reconocimiento`, `Resumen de Miembros`, `Comentarios / Observaciones`), leaving coordinators without an in-page Region/District/Group count summary.

--------------------------------------------------------------------------------

## Goals

*   Extract one shared member-first hierarchy resolver (`resolveMemberHierarchy`) in `src/utils/memberHierarchy.ts` that handles `unit === 'no_scout'` (`0, 0, 0`), normalizes positive-ID `"NO APLICA"` districts to `0`, aligns upward `group -> district -> region` lookup with `batchReports.ts`, and classifies national institutional members (`0, 0, 0` with `unit === 'institucional'`) as `"Nacional"`.
*   Render up to 3 badges plus a static `+N` count pill per territorial column in `BatchList` using read-time projection from already-loaded `members`, add the `"Completitud"` column (`"Todos registrados"`, `"Registros pendientes (N)"`, `"Sin miembros"`), and switch `AddFilterModal` / `batchListFilters.ts` to exact token matching across full badge lists and special categories (`"Completitud"`, `"Nacional"`, `"No scout"`, `"No aplica"`).
*   Decouple `SummaryView` and `Statistics` from `Batch` territorial shortcuts (retaining member-derived batch sets for KPI counts), standardize `"No aplica"` display/filtering, and attribute `"Nacional"` across `SummaryView`, `Statistics` `FilterBar`, geographic/YoY summary calculators and charts (`RegionSummaryTable`, `GeographicBarChart`, `YoYVariationBadge`), and `activeRegionsCount`.
*   Add `BatchTerritorialCard` below `BatchSummaryCards` on `BatchDetail` showing three lists sorted descending by member count (`Regiones` including `"Nacional"`, `Distritos`, `Grupos`) capped at 3 rows behind one shared `"Ver más"` / `"Ver menos"` toggle, plus `"Miembros no scout"` and `"Sin grupo asignado"` bars rendered only when count `> 0`.

--------------------------------------------------------------------------------

## Non-Goals

*   Persisting denormalized territorial arrays (`region_ids`, `district_ids`, `group_ids`) onto Firestore `batches` documents or adding Firebase Cloud Function triggers (Chil remains on Spark billing, and `BatchList` already fetches `getAllMembers` on mount).
*   Modifying the inactive `QuickRecognition` module (`executeQuickEmission`) or its disabled routes.
*   Introducing negative sentinel IDs in `src/data/hierarchy.json` or running bulk Firestore migrations across production documents.
*   Changing `BatchMembersTable` columns, PDF report grouping/layout (`batchReports.ts`), certificate ZIP exports (`generateBatchCertificatesZip`), or `batchesCrud.ts:mergeBatches` legacy member `region_id`/`district_id` backfill.

--------------------------------------------------------------------------------

## Open Questions

None.

--------------------------------------------------------------------------------

## Critical User Journeys (CUJs)

### CUJ 1: Multi-Group Batch Badges, Overflow & Completeness in `BatchList`

*   **Given**: A multi-group batch containing `'active'` and `'exceptional'` members across 5 Scout groups (`Grupo A` with 8 members, `Grupo B` with 5, `Grupo C` with 3, `Grupo D` with 2, `Grupo E` with 1), 1 `unit === 'no_scout'` recipient, and 2 unregistered `'pending'` members (`0, 0, 0`).
*   **When**: The batch is viewed in `BatchList`.
*   **Then**: The `no_scout` member is excluded from territorial badge tokens alongside Scouts (Rule X), the 2 `'pending'` ungrouped `'none'` tokens are suppressed in columns with positive Groups/Districts/Regions, the `"Grupo"` column displays `"Grupo A"`, `"Grupo B"`, `"Grupo C"`, and `"+2"` (`"Región"` and `"Distrito"` similarly cap at 3 badges sorted descending by member count plus `"+N"`), and `"Completitud"` displays `"Registros pendientes (2)"`.

### CUJ 2: Special Territorial Cases & Exact Filtering in `BatchList`

*   **Given**: `BatchList` contains: (a) a national `institucional`-only batch (`0, 0, 0`), (b) a mixed batch with `"Región Capital"` grouped Scouts (`"Distrito Sucre"`, `"Grupo 12"`) plus 1 national institutional member, (c) a `no_scout`-only batch, (d) a 0-member batch, (e) a batch with `'pending'` members in `"Grupo 1"`, and (f) a batch in `"Grupo 10"`.
*   **When**: A coordinator filters via `AddFilterModal` by `"Región: Nacional"`, `"Grupo: No scout"`, `"Grupo: Grupo 1"`, and `"Completitud: Registros pendientes"`.
*   **Then**: Batch (a) shows `"Nacional"`, `"No aplica"`, `"No aplica"`; batch (b) shows `"Región Capital"` followed by `"Nacional"` on `"Región"` and only grouped Scouts on `"Distrito"`/`"Grupo"`; batch (c) shows `"No aplica"`, `"No aplica"`, `"No scout"`; batch (d) shows `"No aplica"`, `"No aplica"`, `"No aplica"` and `"Sin miembros"` in `"Completitud"`. Filtering by `"Grupo: Grupo 1"` matches batch (e) and excludes batch (f) (`"Grupo 10"`), while `"Completitud: Registros pendientes"` matches batch (e).

### CUJ 3: Member-First Territorial Attribution in `SummaryView` and `Statistics`

*   **Given**: A mixed wizard batch (`batch.region_id = 0`, `batch.district_id = 0`, `batch.group_id = 0`) containing members from `"Grupo 12"` (`"Distrito Sucre"`, `"Región Capital"`), a national institutional member (`unit === 'institucional'`, `0, 0, 0`), and a `no_scout` member, plus a legacy batch (`batch.group_id = 12`) containing a `no_scout` member.
*   **When**: The user opens `SummaryView` or `StatisticsDashboard` and filters by `"Región Capital"`, `"Nacional"`, or `"No aplica"`.
*   **Then**: Grouped Scout members attribute to their member-derived Group, District, and Region; the national institutional member attributes to `"Nacional"` on `"Región"` and `"No aplica"` on `"Distrito"`/`"Grupo"`; the `no_scout` member resolves all three IDs to `0` (`"No aplica"`) ignoring legacy `batch.group_id`; `"No aplica"` Region filtering excludes `"Nacional"`; and `Batch` is read solely for `id`, `created_at`, and `recognition_type` (with filtered batch KPIs derived from matching members' batch IDs).

### CUJ 4: Viewing and Expanding the 4th Territorial Breakdown Card on `BatchDetail`

*   **Given**: A batch on `BatchDetail` with members across 2 positive Regions (plus 1 national `0, 0, 0` institutional member), 4 Districts, 5 Groups, 2 `no_scout` members, and 1 institutional member with `group_id: 0`.
*   **When**: The user views the summary section below the 3 existing cards (`Tipo de Reconocimiento`, `Resumen de Miembros`, `Comentarios / Observaciones`).
*   **Then**: `BatchTerritorialCard` renders three separate lists sorted descending by member count (`Regiones` including `"Nacional"`, `Distritos`, `Grupos`), showing up to 3 rows per list initially alongside `"Miembros no scout (2)"` and `"Sin grupo asignado (1)"` bars (percentages over `members.length`, with institutional `group_id: 0` included in `"Sin grupo asignado"` so `Groups + ungroupedScoutCount + noScoutCount === Total`). Clicking `"Ver más"` expands all three lists simultaneously, toggling back to 3 rows via `"Ver menos"`. Zero-count special bars are hidden.

--------------------------------------------------------------------------------

## Technical Plan (Architecture)

### 1. System & Data-Flow Architecture

The architecture removes client-side write denormalization and evaluates territorial attribution at read boundaries through one shared pure resolver:

```
[Member Write Boundary]
  EditMemberModal / ManualMemberModal / wizardHelpers
   └─ Explicit numeric 0 persisted for unset IDs (no new undefined IDs from wizard/modals)
   └─ membersCrud:sanitizeMemberForSave preserves explicit 0 (retains undefined omission for Non-Goal executeQuickEmission)
   └─ Step2ReviewConfirm deleteMember passes batchId to avoid orphan docs

[Shared Pure Core: src/utils/memberHierarchy.ts]
  └─ resolveMemberHierarchy(member, batch, { regions, districts, groups })
        ├─ no_scout ──────────────────────► (0, 0, 0, isNationalInstitutional: false)
        ├─ groupId > 0 ───────────────────► upward lookup group -> district -> region
        ├─ positive "NO APLICA" district ─► normalized to districtId: 0
        ├─ per-field null/undefined only ─► legacy batch fallback
        └─ unit === 'institucional' 0,0,0 ► isNationalInstitutional: true

[Feature Read Projections: src/features/batches/utils/batchTerritorial.ts]
  ├─ BatchList ─────► Already loads batches + getAllMembers; builds Map<batchId, members>
  │                   -> deriveBatchTerritorialProjection -> typed Column Tokens + Completitud
  ├─ BatchDetail ───► batch members -> calculateBatchTerritorialBreakdown -> 4th Card
  └─ Summary/Stats ─► members + batch(id, created_at, recognition_type) -> shared resolver
```

### 2. Shared Member-First Hierarchy Resolution (`src/utils/memberHierarchy.ts`)

Placing the pure hierarchy resolver under `src/utils/memberHierarchy.ts` allows `batches`, `summary`, and `statistics` to share a downward dependency without pulling `batches` UI logic into analytics modules, while `batches`-exclusive projections (`BatchList` tokens and `BatchDetail` breakdown) remain inside `src/features/batches/utils/batchTerritorial.ts`.

*   **Signature**: Accepts `(member, batch, hierarchy)` where `hierarchy` is `{ regions, districts, groups }` (eliminating swapped positional-parameter bugs present in older `statsCalculators.ts`), returning `{ regionId, districtId, groupId, isNationalInstitutional }`.
*   **Canonical resolution rules**:
    1. **`no_scout` override**: If `member.unit === 'no_scout'`, return `{ regionId: 0, districtId: 0, groupId: 0, isNationalInstitutional: false }`, ignoring any legacy `batch` IDs.
    2. **Group ID**: Use finite `member.group_id` when present; fall back to finite `batch?.group_id` only when `member.group_id == null` (or `NaN`).
    3. **Upward parent consistency**: If `groupId > 0` matches an entry in `hierarchy.groups`, derive `districtId` and `regionId` canonically upward (`group -> district -> region`), matching `batchReports.ts` so UI summaries never drift from PDF exports when `EditMemberModal` updates a member's group.
    4. **Un-grouped District & Region + positive `"NO APLICA"` normalization**: When `groupId === 0` (or unknown), resolve `districtId` from `member.district_id` if finite (else legacy `batch?.district_id` if `member.district_id == null`). Any positive-ID District whose trimmed uppercase name equals `"NO APLICA"` is normalized to `districtId = 0`, preserving parent `regionId` if present on the district or member. Resolve `regionId` upward from positive District when available, else finite `member.region_id`, else legacy `batch?.region_id` when `member.region_id == null` (per-field check ensures legacy institutional rows with `group_id: 0` + `region_id: undefined` still inherit `batch.region_id`).
    5. **National institutional classification**: `isNationalInstitutional = (member.unit === 'institucional' && regionId === 0 && districtId === 0 && groupId === 0)`.
*   **Write-side explicit `0` & delete alignment**:
    *   Interactive member create/edit/wizard save paths persist explicit numeric `0` (never `undefined`) for unset territorial fields and cascade child resets (`region` change/zero clears child district/group; `district` change/zero clears child group; positive `group` syncs parent IDs) so newly saved records never inherit legacy `batch` IDs; shared `sanitizeMemberForSave` (`membersCrud.ts`) already persists explicit `0` and retains `undefined` omission so `executeQuickEmission` stays untouched under `Non-Goals`.
    *   Member-level detail views (`batchDetailColumns` and quick-view modal) resolve displayed `groupId` through shared `resolveMemberHierarchy` rather than inline conditionals, ensuring `no_scout` and explicit `group_id === 0` consistently display `"No aplica"`.
    *   Member deletion from the wizard confirmation step includes `batchId` alongside the member document removal so deleted records do not remain orphaned in `scout_members`.

### 3. `BatchList` In-Memory Projection, `Completitud` Column, & Exact Token Filtering

Instead of duplicating arrays onto `Batch`, `BatchList` indexes its already-fetched `members` array once (`Map<number, ScoutMember[]>`) and runs a pure `deriveBatchTerritorialProjection(batchMembers, batch, hierarchy)` helper per row inside `tableData`.

#### Typed Column Tokens

Each territorial column (`Región`, `Distrito`, `Grupo`) projects to an ordered list of distinct `TerritorialToken` entries, avoiding overloaded `0` sentinels or negation hacks:

*   `kind: 'id'` (`key: "id:<number>"`, positive ID `> 0`)
*   `kind: 'national'` (`key: "nacional"`, label `"Nacional"`, Region column only)
*   `kind: 'no_scout'` (`key: "no_scout"`, label `"No scout"`, Group column only)
*   `kind: 'none'` (`key: "0"`, label `"No aplica"`)

#### Uniform Projection & Display Rules (Cases A–I)

1. **`"Completitud"` metadata**: Computed across all `batchMembers`: `pendingCount = count(status === 'pending')`; `memberCount === 0` -> `"Sin miembros"`; `pendingCount > 0` -> `"Registros pendientes (${pendingCount})"`; `pendingCount === 0` -> `"Todos registrados"`.
2. **Member scope (Rule X)**: If `batchMembers.length === 0`, all three columns return `[{ kind: 'none' }]`. If every member has `unit === 'no_scout'`, Region & District return `[{ kind: 'none' }]` and Group returns `[{ kind: 'no_scout' }]`. Otherwise (any non-`no_scout` member exists, including institutional or `'pending'` members), exclude `unit === 'no_scout'` members from `BatchList` territorial tokens.
3. **Per-column token aggregation**:
   * Do **not** discard `'pending'` members by status alone: insolvent scraped Scouts who carry real hierarchy IDs retain their groups, while ungrouped `0, 0, 0` `'pending'` records yield `'none'` tokens.
   * Map each effective member per column (`isNationalInstitutional` -> `'national'` in Region and skipped in District/Group so national institutional members never leak `"No aplica"` alongside grouped Scouts; `id > 0` -> `'id'`; otherwise `'none'`).
   * **Single zero-suppression invariant**: Whenever a column contains at least one non-`'none'` token (`'id'` or `'national'`), drop all `'none'` tokens in that column (`"No aplica"` appears only when every effective member in that column lacks a territory).
   * **Ordering**: Sort `'id'` tokens descending by member count (tie-break ascending numeric ID), then place special tokens (`'national'`, `'no_scout'`, `'none'`) **last**.

| Case | Batch Composition | `"Región"` | `"Distrito"` | `"Grupo"` | `"Completitud"` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | Grouped Scouts | Positive regions | Positive districts | Positive groups | Status label |
| **B** | Institutional partial (`region > 0, 0, 0`) alone | Region | `"No aplica"` | `"No aplica"` | Status label |
| **C** | National institutional (`0, 0, 0`) alone | `"Nacional"` | `"No aplica"` | `"No aplica"` | Status label |
| **D** | National institutional + grouped/institutional Scouts | Non-national regions, then `"Nacional"` last | Non-national districts (or `"No aplica"` if none) | Non-national groups (or `"No aplica"` if none) | Status label |
| **E** | All `no_scout` | `"No aplica"` | `"No aplica"` | `"No scout"` | Status label |
| **F** | Scouts (grouped/institutional) + `no_scout` | Scouts only | Scouts only | Scouts only | Status label |
| **G** | All ungrouped non-institutional (`0, 0, 0`) | `"No aplica"` | `"No aplica"` | `"No aplica"` | Status label |
| **H** | Active/exceptional + `'pending'` (`0, 0, 0`) | Grouped/institutional regions | Grouped/institutional districts | Grouped/institutional groups | `"Registros pendientes (N)"` |
| **I** | 0 members | `"No aplica"` | `"No aplica"` | `"No aplica"` | `"Sin miembros"` |

4. **Badge Cap & Overflow**: Each territorial column renders up to **3** badges; if `tokens.length > 3`, render the first **3** followed by a static overflow badge `+{tokens.length - 3}` without a popover.
5. **Exact Filtering & `ActiveFilterChip` Contract**:
   * `ActiveFilterChip` adds `'completeness'` to `type` and separates exact `filterValue` (token key `"id:<n>"`, `"nacional"`, `"no_scout"`, `"0"`, or completeness state) from human display `value`.
   * Dropdown options filter out `id === 0` and positive-ID `"NO APLICA"` districts before explicitly appending `"Nacional"` (`"nacional"`), `"No aplica"` (`"0"`), and `"No scout"` (`"no_scout"` on Group).
   * `batchListFilters.ts` checks exact `token.key` membership across the full `tokens` array (including badges hidden past the 3-pill cap), eliminating substring collisions (`"Grupo 1"` vs `"Grupo 10"`).
   * `MergeBatchesModal` formats `consolidatedGroupLabel` across all distinct Group tokens present across selected batches (handling `"No scout"` / `"No aplica"` per Rule X).

### 4. `SummaryView` & `Statistics` Decoupling

1. **`SummaryView.tsx`**:
   * Replace `batch?.region_id` / `batch?.district_id` / `m.group_id ?? batch?.group_id` assembly with shared `resolveMemberHierarchy(m, batch, hierarchy)` using an `O(batches)` `Map` lookup instead of `batches.find`.
   * Read `batch` solely for `id`, `created_at`, and `recognition_type`.
   * Store canonical `"No aplica"` for unresolved `0` (including `no_scout` ignoring legacy `batch.group_id`) and `"Nacional"` for `isNationalInstitutional` in `SummaryRowData`, alongside resolved `regionId`, `districtId`, `groupId`, and `isNationalInstitutional`.
   * `matchesHierarchyFilters` matches exact IDs (`'nacional'` via `isNationalInstitutional`; `'0'` via `regionId === 0 && !isNationalInstitutional`; numeric strings via exact ID equality).
   * Filter `id !== 0` and positive `"NO APLICA"` districts from base `<select>` lists, prepend explicit `"Nacional"` (`"nacional"`) on Region, and retain `"No aplica"` (`"0"`) inside cascading `availableDistricts` / `availableGroups` whenever a Region or District is active.

2. **`Statistics` Module**:
   * Delegate all hierarchy resolution to shared `resolveMemberHierarchy` and remove the legacy scalar batch-ID injection loop inside KPI computation.
   * Preserve member-derived batch filtering (`matchingBatchIds` / `validBatchIdsWithMembers`, including `memberType` parity in YoY extraction) while removing only the `b.region_id`/`b.district_id` scalar short-circuits so `totalBatches`, `avgMembersPerBatch`, `filteredBatchesCount`, and YoY `totalBatches` accurately track filtered members.
   * Widen geographic/YoY item identifiers and active-region sets (`number | string`) so `isNationalInstitutional` members aggregate under `'nacional'` (`name: 'Nacional'`) without colliding with `'0'` (`!isNationalInstitutional`), and deduplicate `"NO APLICA"` dropdown districts while retaining explicit `'nacional'` and `'0'` options.
   * Note on unit demographic charts: retain existing `unit === undefined` fallback behavior for unit distribution metrics while `"Nacional"` attribution triggers strictly on `member.unit === 'institucional'`.

### 5. `BatchDetail` 4th Territorial Breakdown Card (`BatchTerritorialCard`)

Below `BatchSummaryCards` (leaving the 3 existing cards untouched), `BatchDetail.tsx` renders `BatchTerritorialCard` via pure helper `calculateBatchTerritorialBreakdown(members, batch, hierarchy)`:

*   **Scope & reconciliation invariant**: Evaluates all `members` of the batch (`active`, `exceptional`, `pending`, and `no_scout`):
    *   `noScoutCount`: count of `member.unit === 'no_scout'`.
    *   `ungroupedScoutCount`: count of `member.unit !== 'no_scout'` whose resolved `groupId === 0` (including institutional members with `group_id: 0` and ungrouped `'pending'` members).
    *   `groups`: non-`no_scout` members with `groupId > 0`, sorted descending by member count, then `'es'` locale alphabetically.
    *   `districts`: non-`no_scout` members with `districtId > 0`, sorted descending by member count, then `'es'` alphabetically.
    *   `regions`: non-`no_scout` members with `regionId > 0` **plus** `"Nacional"` (`isNationalInstitutional === true`), sorted descending by member count, then `'es'` alphabetically.
    *   Invariants: `sum(groups) + ungroupedScoutCount + noScoutCount === members.length`; all row and bar percentages divide by `members.length` (`Total`).
*   **UI Contract**:
    *   Header displaying `"Distribución Territorial del Lote"`, total member count reference (`${totalMembers} miembros`), and a single shared `"Ver más"` / `"Ver menos"` toggle whenever any of the 3 lists has `> 3` items (expanding/collapsing all 3 lists simultaneously).
    *   Three separate ordered lists (`Regiones`, `Distritos`, `Grupos`), capped at 3 rows when collapsed, displaying `"Ninguna registrada"` / `"Ninguno registrado"` when empty.
    *   Conditional bars below the lists for `"Miembros no scout"` (`noScoutCount`) and `"Sin grupo asignado"` (`ungroupedScoutCount`), rendered strictly when count `> 0`.

--------------------------------------------------------------------------------

## Alternatives Considered

### 1. Client-Persisted `Batch` Territorial Arrays & Sync Hooks vs. Read-Time Projection from Existing `getAllMembers`
*   **Option**: Store derived `region_ids`, `district_ids`, `group_ids`, `has_national_institutional`, `is_no_scout_only`, `pending_count`, and `member_count` onto `batches` docs via client `updateDoc` calls across wizard, detail, and merge mutations.
*   **Rejected because**: `BatchList.tsx` already loads `getAllMembers(user?.uid)` on mount for member counts and ZIP/PDF exports. Persisting 7 derived fields across distributed client hooks eliminates zero Firestore reads, introduces multi-tab write-skew and partial-failure drift, fails on historical unedited multi-group batches (`region_ids === undefined`), and requires special-casing deleted/wizard state transitions. Computing projections once in memory fixes all batches immediately with zero schema duplication.

### 2. Replacing Legacy Scalar IDs with a `"Mixto"` Sentinel
*   **Option**: Store `"Mixto"` on `Batch` whenever a batch spans multiple territories.
*   **Rejected because**: `"Mixto"` erases underlying Group/District/Region visibility in `BatchList` and prevents per-territory filtering.

### 3. Negative Sentinel IDs (`-1`, `-2`) vs. Typed Column Tokens
*   **Option**: Reserve `-1` / `-2` inside `hierarchy.json` and numeric IDs for `"Nacional"` and `"No scout"`.
*   **Rejected because**: Negative numeric IDs leak into `id !== 0` checks across helpers and coupling display categories to integer primary keys invites subtle filter collisions. Typed projection tokens (`kind: 'id' | 'national' | 'no_scout' | 'none'`) keep numeric hierarchy IDs clean while eliminating `'0'` vs `"Nacional"` ambiguity.

### 4. Excluding All `'pending'` Members by Status vs. Column-Level `'none'` Suppression
*   **Option**: Strip all `status === 'pending'` members from territorial derivation whenever active members exist.
*   **Rejected because**: Insolvent scraped Scouts (`status: 'pending'`) carry valid Impeesa Group/District/Region IDs and would be erased from mixed-batch visibility. Keeping `'pending'` strictly in `"Completitud"` and dropping `'none'` tokens whenever a column contains positive or `'national'` entries removes `0, 0, 0` noise without hiding valid non-zero territories.

### 5. Server-Side Firestore Triggers & Literal `"..."` / Nested `BatchDetail` Tree
*   **Option**: Trigger Cloud Functions on `scout_members` writes, render literal `"..."` in `BatchList`, and render a nested tree in `BatchDetail`.
*   **Rejected because**: Automated Cloud Functions require Blaze billing (`docs/designs/SITEMAP.md`), literal `"..."` hides scale (`+N` shows exact count), and a nested tree creates orphan paths for institutional (`region > 0, 0, 0`) and ungrouped members compared to three flat lists plus special bars.

--------------------------------------------------------------------------------

## Non-Functional Requirements

### Scalability & Performance
*   **Single-pass in-memory indexing**: `BatchList.tsx`, `SummaryView.tsx`, and `useStatisticsData.ts` replace quadratic `Array.filter`/`Array.find` batch-member joins with `O(M)` `Map<number, ScoutMember[]>` / `Map<number, Batch>` lookups.
*   **Compact UI rendering**: Capping `BatchList` pills at 3 plus static `+{remaining}` and `BatchDetail` card lists at 3 rows before `"Ver más"` bounds DOM density for large multi-group batches.

### Security & Firestore Constraints
*   `firestore.rules` permits client reads/writes on `batches` and `scout_members` while blocking `/scraper_sessions/{uid}` on the client; user ownership scoping continues to be enforced by client query predicates (`user_id == auth.uid`).
*   Dual scraper backends (`functions/` and `scraper-api/`) remain untouched.

### Maintainability & Localization
*   Consolidating `resolveMemberHierarchy` into `src/utils/memberHierarchy.ts` creates one territorial truth across `BatchList`, `BatchDetail`, `SummaryView`, and `Statistics`.
*   All user-facing labels, filter options, empty states, and error messages adhere to Chil's Spanish conventions (`"Nacional"`, `"No scout"`, `"No aplica"`, `"Completitud"`, `"Todos registrados"`, `"Registros pendientes"`, `"Sin miembros"`, `"Ver más"`, `"Ver menos"`, `"Miembros no scout"`, `"Sin grupo asignado"`).

## Risks & Mitigations

*   **Client memory ceiling on full `getAllBatches` / `getAllMembers` loads**: `BatchList`, `SummaryView`, and `Statistics` load all user-owned batches and members into memory (unchanged from current app architecture). Grouping with `Map` keeps CPU overhead linear `O(B + M)`; if user dataset size ever grows beyond Spark-tier interactive latency, persisted projections + Blaze Cloud Functions `onWrite` aggregation can be layered as an optional cache (see `## Future Improvements`).
*   **Open `firestore.rules` client enforcement**: Client queries must continue passing `userId` filters on all reads/writes; this design adds no new Firestore collections or server endpoints.
*   **Legacy `scout_members` records missing hierarchy fields (`undefined`)**: Older members saved without IDs still fall back per field to `batch` scalars (`region_id`, `district_id`, `group_id`) when non-`no_scout`, whereas all newly created or edited members in interactive wizard and modal flows write explicit numeric `0`s (`EditMemberModal`, `ManualMemberModal`, `wizardHelpers`).
*   **Unit inference drift on legacy adults lacking `member.unit`**: `calculateUnitDistribution` treats `adult` with `unit === undefined` as `'institucional'`, whereas `resolveMemberHierarchy` only sets `"Nacional"` when `member.unit === 'institucional'`; legacy un-migrated records lacking `unit` will resolve as `"No aplica"` under Region unless edited.

--------------------------------------------------------------------------------

## Additional Resources

*   [SITEMAP.md](./SITEMAP.md) — Index of feature designs in Chil.
*   [grouped-batch-pdf-report.md](./grouped-batch-pdf-report.md) — Member-level grouping buckets and `"Miembros no scout"` / `"Sin grupo asignado"` foundation.
*   [src/features/batches/README.md](../../src/features/batches/README.md) — Feature barrel & architecture map for `batches`.
*   [src/features/batches/api/README.md](../../src/features/batches/api/README.md) — `batchesCrud.ts`, `membersCrud.ts`, `hierarchyApi.ts`, and `batchReports.ts` contracts.
*   [src/features/batches/components/list/README.md](../../src/features/batches/components/list/README.md) — `BatchList` table columns, filters, and merge modal map.
*   [src/features/batches/components/detail/README.md](../../src/features/batches/components/detail/README.md) — `BatchDetail` cards, table columns, and member modals map.

--------------------------------------------------------------------------------

## Future Improvements

*   **Server-side `BatchList` projection cache (requires Firebase Blaze)**: If user member counts grow large enough that fetching `getAllMembers` on `/lotes` becomes a measured bottleneck, Cloud Functions `onWrite` triggers can precompute `Batch` token metadata server-side and let `BatchList` load members only on PDF export.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Phased Target Files & Verification Checkpoints

#### Phase 1. Shared Territorial Resolution, Feature Helpers & Explicit-`0` Write Normalization
1. **[Create] `src/utils/memberHierarchy.ts`**:
   * Export `ResolvedMemberHierarchy`, `HierarchyLookup` (`{ regions: Region[]; districts: District[]; groups: ScoutGroup[] }`), `NO_APLICA_DISTRICT_NAME`, `isNoAplicaDistrict(district)`, and `resolveMemberHierarchy(member, batch, hierarchy)` implementing `no_scout -> 0`, group-upward lookup, positive-ID `"NO APLICA"` district normalization to `0` (`hierarchy.json` IDs `34, 51, 53, 56, 58, 60, 62, 65, 66, 68, 70`), per-field `== null` legacy `batch` fallback, and `isNationalInstitutional`.
2. **[Create] `src/features/batches/utils/batchTerritorial.ts`**:
   * Export `TerritorialToken`, `CompletenessStatus`, `BatchTerritorialProjection`, `deriveBatchTerritorialProjection(batchMembers, batch, hierarchy)` (`'id'` tokens sorted count-descending then ascending numeric ID, special tokens `'national'` / `'no_scout'` / `'none'` last; computes `regionTokens`, `districtTokens`, `groupTokens`, `completenessStatus`, `completenessLabel`, `pendingCount`, `memberCount`), and `consolidateMergedGroupTokens(batchGroupTokenLists)` for `MergeBatchesModal` and `DeleteBatchModal`.
   * Export `TerritorialBreakdownItem`, `BatchTerritorialBreakdown`, and `calculateBatchTerritorialBreakdown(members, batch, hierarchy)` (`regions` including `"Nacional"`, `districts`, `groups` sorted count-descending then `'es'` locale alphabetically; computes `noScoutCount`, `ungroupedScoutCount`, `totalMembers = members.length`).
3. **[Verify] `src/features/batches/api/membersCrud.ts`**: Keep `sanitizeMemberForSave` omitting `undefined` hierarchy fields (preserving `executeQuickEmission` untouched under `Non-Goals`) while verifying its existing `!Number.isNaN` guard persists explicit numeric `0` whenever provided by interactive wizard/modal callers.
4. **[Modify] `src/features/batches/components/shared/EditMemberModal.tsx`**:
   * Filter `getFilteredDistricts` via `d.id !== 0 && !isNoAplicaDistrict(d)`.
   * On Region change (including clearing to `0`), set explicit `region_id: newRegId`, reset `district_id = 0` and `group_id = 0` when `newRegId === 0` or incompatible, and update `region_name` (`undefined` when `0`) plus clear `district_name`/`group_name` when reset.
   * On District change (including clearing to `0`), set explicit `district_id: newDistId`, reset `group_id = 0` when `newDistId === 0` or incompatible, and update `district_name`/`group_name` (`undefined` when `0`).
   * On Group selection, set `group_id: val`, sync parent `district_id`/`region_id` and `group_name`/`district_name`/`region_name` upward when `val > 0`, or clear `group_name = undefined` when `val === 0`.
5. **[Modify] `src/features/batches/components/shared/ManualMemberModal.tsx` & `src/features/batches/components/wizard/wizardHelpers.ts`**:
   * In `ManualMemberModal.tsx`, filter `availableDistricts` via `d.id !== 0 && !isNoAplicaDistrict(d)` and save `region_id: regionId ?? 0`, `district_id: districtId ?? 0`, `group_id: groupId ?? 0` (explicit `0` rather than `undefined`).
   * In `wizardHelpers.ts`, store explicit `0` (`?? 0`) for unset `finalRegionId`/`finalDistrictId`/`finalGroupId` and pass `batchId` as the 3rd argument to `deleteMember(m.recognition_code || m.identity, m.identity, batchId)` inside `syncAndFinalizeStep2Members`.
6. **[Modify] `src/features/batches/components/wizard/Step2ReviewConfirm.tsx`**: Pass `batchId` as the 3rd argument to `deleteMember` inside `handleDeleteMember` so deleted members are deleted from Firestore `scout_members` by `batchId` and `memberId`.
7. **[Phase 1 Tests] Create `src/utils/__tests__/memberHierarchy.test.ts` & `src/features/batches/utils/__tests__/batchTerritorial.test.ts`; Modify `src/features/batches/api/__tests__/api.test.ts`, `src/features/batches/components/shared/__tests__/SharedModals.test.tsx`, `src/features/batches/components/__tests__/Step2ReviewConfirm.test.tsx`**:
   * Cover `resolveMemberHierarchy`, `deriveBatchTerritorialProjection` (Cases A–I, Rule X, insolvent `'pending'` retention, zero suppression, ID/count ordering), `consolidateMergedGroupTokens`, and `calculateBatchTerritorialBreakdown`.
   * Verify explicit-`0` persistence in `api.test.ts`; update existing `SharedModals.test.tsx` `EditMemberModal` Region-change assertion from `district_id: undefined` to `district_id: 0` (plus Region-`0` and positive `"NO APLICA"` exclusion coverage); update existing `Step2ReviewConfirm.test.tsx` `deleteMember` assertion to include the 3rd `batchId` argument (`101`).
   * **Phase 1 Checkpoint**: `npm run lint && npm test -- --run src/utils/__tests__/memberHierarchy.test.ts src/features/batches/utils/__tests__/batchTerritorial.test.ts src/features/batches/api/__tests__/api.test.ts src/features/batches/components/shared/__tests__/SharedModals.test.tsx src/features/batches/components/__tests__/Step2ReviewConfirm.test.tsx`

#### Phase 2. `BatchList` In-Memory Multi-Badges, `"Completitud"` Column, Token Filters, & Merge/Delete UI
8. **[Modify] `src/features/batches/types/index.ts`**: Add `'completeness'` to `ActiveFilterChip['type']` and optional `filterValue?: string` for exact token matching alongside display `value`.
9. **[Modify] `src/features/batches/components/list/types.ts`**:
   * Extend `FilterType` with `'completeness'`.
   * Replace scalar `regionName`/`districtName`/`groupName` on `BatchRowData` with `regionTokens: TerritorialToken[]`, `districtTokens: TerritorialToken[]`, `groupTokens: TerritorialToken[]`, `completenessStatus: CompletenessStatus`, `completenessLabel: string`, and `pendingCount: number` (`BatchMergeOption` stays in `MergeBatchesModal.tsx`).
10. **[Modify] `src/features/batches/components/BatchList.tsx`**:
    * Index `members` once into `Map<number, ScoutMember[]>` inside `tableData` `useMemo` and call `deriveBatchTerritorialProjection` per batch.
    * Populate `BatchMergeOption` with `groupTokens: row.groupTokens` and derive its `groupName` subtitle as `consolidateMergedGroupTokens([row.groupTokens])`.
11. **[Modify] `src/features/batches/components/list/batchListColumns.tsx`**:
    * Preserve column order (`select`, `FECHA DE EMISIÓN`, `REGIÓN`, `DISTRITO`, `GRUPO`, `RECONOCIMIENTO`, `CANTIDAD`, `COMPLETITUD` (`id: 'completeness'`), `ACCIONES`).
    * Override cell `whitespace-nowrap` on territorial columns by wrapping up to 3 pills in `<div className="flex flex-wrap gap-1">` plus static `+{tokens.length - 3}` overflow badge (muted neutral pill). Style pills by token `kind` (`'id'`: primary/neutral badge; `'national'`: distinct accent indigo/blue badge; `'no_scout'`: amber/slate badge; `'none'`: muted neutral badge).
    * Render `"Completitud"` column with `"Todos registrados"` (green), `"Registros pendientes (N)"` (amber), or `"Sin miembros"` (muted neutral).
12. **[Modify] `src/features/batches/components/list/AddFilterModal.tsx`**:
    * Add `'completeness'` (`Completitud`) filter option with `<select>` options `complete` (`"Todos registrados"`), `pending` (`"Registros pendientes"`), and `empty` (`"Sin miembros"`).
    * Filter out `id === 0` and positive `"NO APLICA"` districts (`isNoAplicaDistrict`) from hierarchy `<select>` lists; emit canonical `<option value>` token keys (`"id:<number>"` for positive IDs, `"nacional"` for `"Nacional"`, `"0"` for `"No aplica"`, `"no_scout"` for `"No scout"` on Group).
    * Call `getFilterLabelAndValue` with the canonical key and emit `{ id, type, label, value: displayValue, filterValue: computedFilterValue }` on `ActiveFilterChip`.
13. **[Modify] `src/features/batches/components/list/batchListFilters.ts`**:
    * Change `matchesRegionFilter`, `matchesDistrictFilter`, and `matchesGroupFilter` parameter signatures from `string` to `(tokens: TerritorialToken[], filterValue: string): boolean` returning `tokens.some(t => t.key === filterValue)`, and add `matchesCompletenessFilter(status: CompletenessStatus, filterValue: string): boolean` returning `status === filterValue`.
    * In `matchesSingleFilter`, resolve `const rawValue = filter.filterValue ?? filter.value` (preserving legacy chips without `filterValue`, such as the default `'date'` chip in `BatchList.tsx`) before dispatching.
    * Update `getFilterLabelAndValue` to parse `"id:<n>"` / `"nacional"` / `"0"` / `"no_scout"` / `"complete" | "pending" | "empty"` (adding `case 'completeness':` returning `{ label: 'Completitud', displayValue }` mapped to `"Todos registrados"` / `"Registros pendientes"` / `"Sin miembros"`).
14. **[Modify] `src/features/batches/components/list/MergeBatchesModal.tsx` & `src/features/batches/components/shared/DeleteBatchModal.tsx`**:
    * On `BatchMergeOption` (`MergeBatchesModal.tsx`), add `groupTokens: TerritorialToken[]` and compute `consolidatedGroupLabel` via `consolidateMergedGroupTokens(selectedBatches.map(b => b.groupTokens))` (handling `"No scout"` / `"No aplica"` per Rule X).
    * In `DeleteBatchModal.tsx`, replace removed `batch.groupName && batch.groupName !== '-'` with `resolvedDetail` derived from `batch.groupTokens` (via `consolidateMergedGroupTokens([batch.groupTokens])`, omitting `"No aplica"` / `'none'`-only results so only non-`'none'` group labels or `batch.batch.comment` appear).
15. **[Phase 2 Tests] Modify `src/features/batches/components/__tests__/BatchList.test.tsx`, `src/features/batches/components/list/__tests__/MergeBatchesModal.test.tsx`, `src/features/batches/components/shared/__tests__/SharedModals.test.tsx`**:
    * Update existing `BatchList.test.tsx` scalar `regionName`/`districtName`/`groupName` assertions and `members: []` pagination fixtures for pill badges + `"Completitud"`; leave the 4 existing walkthrough tour assertions untouched (`batchListTour.ts` is not modified).
    * Add tests for Cases A–I badges, `+N` overflow, `"Completitud"` column, and `batchListFilters.ts` / `ActiveFilterChip.filterValue` exact matching (`"Nacional"`, `"No aplica"`, `"No scout"`, `"Completitud"`, `"Grupo 1"` vs `"Grupo 10"`, and default `'date'` chip fallback without `filterValue`).
    * Update `MergeBatchesModal.test.tsx` `BatchMergeOption` fixtures with `groupTokens` and update `'Multigrupo'` preview assertions to consolidated `groupTokens` labels; update `SharedModals.test.tsx` `DeleteBatchModal` `BatchRowData` fixtures to `groupTokens`.
    * **Phase 2 Checkpoint**: `npm run lint && npm test -- --run src/features/batches/components/__tests__/BatchList.test.tsx src/features/batches/components/list/__tests__/MergeBatchesModal.test.tsx src/features/batches/components/shared/__tests__/SharedModals.test.tsx`

#### Phase 3. `BatchDetail` 4th Card & Member View Alignment
*(Existing `batchDetailTour.ts` and `batchListTour.ts` remain untouched to preserve the verified 4-step tour flows.)*
16. **[Create] `src/features/batches/components/detail/BatchTerritorialCard.tsx`**: Render the 4th card below `BatchSummaryCards` using responsive 3-column lists (`grid-cols-1 md:grid-cols-3` for `Regiones`, `Distritos`, `Grupos` sorted count-descending then `'es'` locale alphabetically and capped at 3 rows with shared header `"Ver más"` / `"Ver menos"` toggle), row percentages over `members.length`, explicit empty states (`Regiones`: `"Ninguna registrada"`; `Distritos` and `Grupos`: `"Ninguno registrado"`), and conditional `"Miembros no scout"` and `"Sin grupo asignado"` bars rendered strictly when count `> 0`.
17. **[Modify] `src/features/batches/components/BatchDetail.tsx`**: Compute `calculateBatchTerritorialBreakdown` and render `BatchTerritorialCard` below `BatchSummaryCards`; pass `batch={batch}` into `MemberQuickViewModal` (removing `batchGroup`).
18. **[Modify] `src/features/batches/components/detail/index.ts`**: Export `BatchTerritorialCard`.
19. **[Modify] `src/features/batches/components/detail/batchDetailColumns.tsx` & `src/features/batches/components/detail/MemberQuickViewModal.tsx`**: Replace `batchGroup?: string` on `MemberQuickViewModalProps` with `batch?: Batch | null`; delegate group resolution in both components to `resolveMemberHierarchy(member, batch ?? undefined, { regions: [], districts: [], groups }).groupId` (empty `regions`/`districts` arrays are intentional because only `.groupId` is consumed here) and format `groupId === 0 ? 'No aplica' : (groups.find(g => g.id === groupId)?.name ?? \`Grupo \${groupId}\`)` (never rendering `"Multigrupo"`).
20. **[Phase 3 Tests] Modify `src/features/batches/components/__tests__/BatchDetail.test.tsx`**:
    * Reconcile existing negative assertions (where tests previously asserted `Región Capital` / `Distrito Sucre` were absent and `Grupo San Luis` appeared twice) with `BatchTerritorialCard` rendering below `BatchSummaryCards`.
    * Verify `BatchTerritorialCard` row cap, shared `"Ver más"` / `"Ver menos"`, conditional zero-hiding bars, `'es'` locale sort with `"Nacional"`, `members.length` denominator, and `MemberQuickViewModal` `'no_scout'` / `group_id === 0` -> `"No aplica"`.
    * **Phase 3 Checkpoint**: `npm run lint && npm test -- --run src/features/batches/components/__tests__/BatchDetail.test.tsx`

#### Phase 4. `SummaryView` & `Statistics` Member-First Decoupling
21. **[Modify] `src/features/summary/types/index.ts`**: Add `regionId: number`, `districtId: number`, `groupId: number`, `isNationalInstitutional: boolean` to `SummaryRowData`.
22. **[Modify] `src/features/summary/components/SummaryView.tsx`**:
    * Build a `Map<number, Batch>` lookup and call shared `resolveMemberHierarchy(m, batch, hierarchy)` (reading `batch` only for `id`, `created_at`, `recognition_type`).
    * Canonicalize `0` display/export strings to `"No aplica"` and national institutional Region to `"Nacional"`.
    * Filter `id !== 0` and positive `"NO APLICA"` districts (`isNoAplicaDistrict`) from base hierarchy dropdowns; explicitly render `<option value="nacional">Nacional</option>` and `<option value="0">No aplica</option>` in Region `<select>`, and preserve `<option value="0">No aplica</option>` in cascading District `<select>` (when `selectedRegion !== ''`) and Group `<select>` (when `selectedDistrict !== '' || selectedRegion !== ''`).
    * Update `matchesHierarchyFilters`: `'nacional'` -> `row.isNationalInstitutional`; Region `'0'` -> `row.regionId === 0 && !row.isNationalInstitutional`; District `'0'` -> `row.districtId === 0` (without `!isNationalInstitutional` so national institutional rows also match District `"No aplica"`); Group `'0'` -> `row.groupId === 0` (without `!isNationalInstitutional`); positive IDs via exact equality.
23. **[Modify] `src/features/statistics/types/index.ts`**: Widen `GeographicItem.id` and `YoYRegionItem.id` to `number | string` to accommodate `'nacional'`.
24. **[Modify] `src/features/statistics/utils/statsCalculators.ts`**:
    * Remove the local 5-argument `resolveMemberHierarchy` implementation; import and re-export the canonical 3-argument `resolveMemberHierarchy` (and `ResolvedMemberHierarchy`) from `src/utils/memberHierarchy.ts`.
    * Remove legacy `batches.forEach` scalar ID injection inside `calculateKpiMetrics`.
    * Widen `activeRegionIds` to `Set<number | string>` and attribute `isNationalInstitutional` members under `'nacional'` (`"Nacional"`) in `activeRegionsCount`, `calculateGeographicBreakdown`, and `buildYoYRegionComparison`.
25. **[Modify] `src/features/statistics/hooks/useStatisticsData.ts`**:
    * Update all three `resolveMemberHierarchy` call sites (`matchesMemberCriteria`, `extractYearBatches`, and `extractYearMembers`) to pass `{ regions, districts, groups }`.
    * Remove `b.region_id`/`b.district_id` scalar short-circuits in `filterBatchesByCriteria` and `extractYearBatches` while retaining `matchingBatchIds.has(b.id)` / `validBatchIdsWithMembers.has(b.id)` (and applying `filters.memberType` consistently in `extractYearBatches`).
    * Match `'nacional'` (`isNationalInstitutional`) and Region `'0'` (`!isNationalInstitutional`) in `matchesMemberCriteria` and `extractYearMembers`; keep `buildAvailableDistricts` filtering positive non-`"NO APLICA"` districts (`d.id !== 0 && !isNoAplicaDistrict(d)`, returning `[]` for `'nacional'` or `'0'`); map `'nacional'` -> `"Nacional"` and `'0'` -> `"No aplica"` in both `getRegionSummaryLabel` and `getDistrictSummaryLabel`.
26. **[Modify] `src/features/statistics/components/FilterBar.tsx`**: Filter `id !== 0` and positive `"NO APLICA"` districts (`isNoAplicaDistrict`) from base dropdown loops, explicitly offering `"Nacional"` (`'nacional'`) on Region `<select>` and `"No aplica"` (`'0'`) on both Region and District `<select>`.
27. **[Phase 4 Tests] Modify `src/features/summary/components/__tests__/SummaryView.test.tsx`, `src/features/statistics/utils/__tests__/statsCalculators.test.ts`, `src/features/statistics/hooks/__tests__/useStatisticsData.test.ts`**:
    * Verify `SummaryView` `'no_scout'` -> `"No aplica"` ignoring legacy `batch.group_id`, `'nacional'` vs `'0'` Region isolation, and District/Group `'0'` matching.
    * Update `statsCalculators.test.ts` callers from the removed 5-arg `resolveMemberHierarchy` signature to 3-arg `(member, batch, { regions, districts, groups })`, remove expectations tied to legacy batch-scalar KPI injection, and test `"Nacional"` attribution.
    * Verify `useStatisticsData.test.ts` member-derived `totalBatches` / YoY KPIs, `buildAvailableDistricts` positive-only behavior, and `getRegionSummaryLabel` / `getDistrictSummaryLabel` for `'0'` and `'nacional'`.
    * **Phase 4 Checkpoint**: `npm run lint && npm test -- --run src/features/summary/components/__tests__/SummaryView.test.tsx src/features/statistics/utils/__tests__/statsCalculators.test.ts src/features/statistics/hooks/__tests__/useStatisticsData.test.ts`

#### Phase 5. Feature Documentation Maps & Full Quality Gate
28. **[Modify] Affected Feature READMEs & SITEMAP**:
    * `src/features/batches/README.md` — add read-time territorial projection data flow (`batchTerritorial.ts`) and cross-feature link to `src/utils/memberHierarchy.ts`.
    * `src/features/batches/utils/README.md` — document `batchTerritorial.ts` exports (`deriveBatchTerritorialProjection`, `consolidateMergedGroupTokens`, `calculateBatchTerritorialBreakdown`).
    * `src/features/batches/api/README.md` — document `deleteMember` `batchId` usage from wizard steps and explicit-`0` expectations.
    * `src/features/batches/components/README.md` — replace obsolete `batchGroup` invariant on `MemberQuickViewModal` and `BatchList` scalar fields.
    * `src/features/batches/components/list/README.md` — document pill badges, `"Completitud"` column, `AddFilterModal`/`batchListFilters.ts` `filterValue` keys, and `MergeBatchesModal` `groupTokens`.
    * `src/features/batches/components/detail/README.md` — document `BatchTerritorialCard` and `MemberQuickViewModal` `batch` prop delegation.
    * `src/features/batches/components/shared/README.md` — document explicit-`0` writes / `isNoAplicaDistrict` filtering in `EditMemberModal` & `ManualMemberModal` and `DeleteBatchModal` `groupTokens` detail.
    * `src/features/batches/types/README.md` — document `ActiveFilterChip['type']` `'completeness'` and optional `filterValue`.
    * `docs/designs/SITEMAP.md` — update `docs/designs/multi-territory-batch-attribution.md` status from `Proposed` to `Implemented` after implementation and full verification pass.

---

### Verification Plan

#### Automated Verification
Run the full repository quality pipeline from the workspace root after Phase 5:
1. `npm run lint` — Zero TypeScript / ESLint errors across all modified and newly created `.ts`/`.tsx` files.
2. `npm run build` — Clean Vite production bundle and `tsc` typecheck with zero errors (verifying `DeleteBatchModal`, `MemberQuickViewModal`, `GeographicItem.id`, `YoYRegionItem.id`, `SummaryRowData`, and `ActiveFilterChip`).
3. `npm test -- --run` — All Vitest unit and component suites pass, explicitly covering:
   * Shared `resolveMemberHierarchy` (`'no_scout'` -> `0`, group-upward consistency matching `batchReports.ts`, positive `"NO APLICA"` district normalization, per-field legacy fallback, and `"Nacional"` classification).
   * Every Case **A–I** plus mixed combinations (`Case B + A`, `Institutional + no_scout`, insolvent `'pending'` with positive-ID groups, `Pending + no_scout`), Rule X, `> 3` badges `+N`, `"Completitud"`, and `batchListFilters.ts` / `ActiveFilterChip.filterValue` exact matching (`"Grupo 1"` vs `"Grupo 10"`, `"Nacional"`, `"No aplica"`, `"No scout"`, `"Completitud"`, and default `'date'` fallback).
   * `BatchDetail` `BatchTerritorialCard` (`<= 3` row cap, shared `"Ver más"` / `"Ver menos"`, institutional `group_id: 0` counted in `"Sin grupo asignado"`, zero-count hiding, `members.length` percentage denominator) and `MemberQuickViewModal` `groupId === 0` -> `"No aplica"`.
   * `SummaryView` and `Statistics` decoupling (`'no_scout'` -> `0` ignoring `batch.group_id`, `"Nacional"` KPI & breakdown attribution, `'0'` `!isNationalInstitutional` Region isolation vs District/Group `'0'` matching, `getRegionSummaryLabel`/`getDistrictSummaryLabel` for `'0'`/`'nacional'`, and member-derived `totalBatches` / YoY batch KPIs).

#### Manual Smoke Verification
1. Open `/lotes` on existing historical wizard batches (`0, 0, 0` on `Batch` doc) and newly created mixed batches; confirm `BatchList` displays exact Region/District/Group badges (sorted descending by member count + `+N`), `"Completitud"` counts, `"Nacional"` on institutional national batches, and `"No scout"` on `no_scout`-only batches without batch re-save or Firestore migration.
2. Filter `BatchList` by `"Completitud"`, `"Nacional"`, `"No scout"`, `"No aplica"`, and `"Grupo 1"`; confirm exact matches including badges past the 3-pill limit and no substring collision with `"Grupo 10"`.
3. Open `BatchDetail`; confirm the 3 existing cards remain unchanged and `BatchTerritorialCard` displays three separate count-ordered lists (`Regiones`, `Distritos`, `Grupos`) capped at 3 rows before `"Ver más"`, plus conditional `"Miembros no scout"` and `"Sin grupo asignado"` bars.
4. Open `Resumen General` and `Estadísticas` with mixed and legacy (`batch.group_id > 0`) batches; confirm `"Nacional"` aggregates exclusively under `'nacional'` and is excluded when filtering by `"No aplica"` (`'0'`), `'no_scout'` shows `"No aplica"`, and KPI batch counts remain accurate under Region/District filters.

---

*Drafted with EGM*
