# Authenticated UI Standardization and Redundancy Removal

*   **Author:** Miguel Ciavato
*   **Status:** Proposed
*   **Date:** 2026-11-22

--------------------------------------------------------------------------------

## Overview

Chil's five authenticated feature areas (`auth`, `batches`, `recognitions`, `statistics`, and `summary`) have accumulated duplicated UI components, hand-rolled wrappers around existing primitives, unused legacy code, and conflicting visual styles across forms, filter bars, status badges, error alerts, tables, cards, and modals. Meanwhile, the marketing landing feature (`landing`) relies on intentionally bespoke scroll-driven visuals and dark-surface links that sit outside the application control system.

This design defines how to eliminate interface inconsistency and component duplication across the authenticated application by rewriting `docs/DESIGN.md` to match the structured `spec.md` (`version: alpha`) format, closing specification gaps for compact vs. standard controls and destructive actions, consolidating domain-agnostic UI primitives in `src/components/`, isolating Scout-coupled cross-feature UI in a dedicated `src/domain/components/` folder, and deleting eight confirmed unused components along with their dead helpers and stale exports.

## The Problem

1. **Bypassed primitives and uneven styling ("interface slop"):** Features routinely hand-roll markup that already exists in `src/components/`. Every card in `statistics` and filter/table cards in `auth`, `batches`, and `summary` re-declare `bg-white border border-primary/20 rounded-2xl` instead of using `Card`; `LoginPage`, `RegisterPage`, `Step1DataLoad`, `MergeBatchesModal`, and `EditMemberModal` hand-roll plain inputs/textareas alongside `Field`; `BackgroundFormatTab`, `FieldPropertiesTab`, `FieldPaletteTab`, `FilterBar`, and `SummaryView` hand-roll red or secondary buttons alongside `Button`; and `Step2ReviewConfirm` renders two stacked empty messages because `Table.tsx` forces a single rigid row layout.
2. **Competing visual patterns and undocumented tokens in `docs/DESIGN.md`:** Existing forms and filter toolbars clash in label casing (`uppercase` vs. sentence case), border contrast (`border-primary/20` `1.34:1` vs. `border-primary/70` `3.32:1`), corner radii (`rounded-lg`, `rounded-xl`, `rounded-field`), error colors (`border-red-300`/`text-red-500` vs. `border-red-600`/`text-red-700`), and muted text floors (`text-neutral/40`/`50`/`60`). Furthermore, `docs/DESIGN.md` lacks machine-readable YAML tokens conforming to `spec.md`, omits specs for `<select>`, `SearchInput`, `ErrorAlert`, `Button` `destructive`, and `'sm'` vs. `'md'` density, and still cites components slated for removal (`FloatingTableScrollbar`, `SearchSelectorModal`, `Navbar`, `StatusBreakdownCard`).
3. **Cross-feature copy-paste without a clean domain boundary:** Error banners with retry buttons are duplicated across five views (`BatchList`, `BatchDetail`, `RecognitionCatalog`, `SummaryView`, `StatisticsDashboard`) and modals lack `role="alert"`; paginated `@tanstack/react-table` headers/footers are duplicated across four views; Scout Region/District/Group cascades are reimplemented five times with inconsistent sentinel keys and upward-sync behavior; and member status badges appear in four conflicting visual formats (hex bullets, dot spans, `ShieldCheck` solvency pills, and §6 `StatusBreakdownCard` tokens). Placing Scout-coupled UI directly in `src/components/` would violate `AGENTS.md` §1's rule against domain logic in shared UI primitives.
4. **Dead code and test/doc drift:** Eight unused components (`Step2Verification`, `Step3Review`, `GeographicBarChart`, `RecognitionRankingChart`, `StatusBreakdownCard`, `SearchSelectorModal`, `FloatingTableScrollbar`, `Navbar`) remain exported in barrels and documented in `README.md` blueprints and `docs/DESIGN.md`, while active `GroupSummaryTable` is missing from `src/features/statistics/index.ts` and `StatisticsDashboard` renders a 5-card skeleton for a 4-card KPI grid. Notably, `Step3Review.test.tsx` currently holds the only unit tests covering `EditMemberModal`'s unit/cascade/exceptional rules.

## Goals

*   Rewrite `docs/DESIGN.md` in `spec.md` (`version: alpha`) format with YAML front matter, single-occurrence typed token blocks (`colors`, `typography`, `spacing`, `rounded`, `motion`, `components`), valid relative paths, and explicit visual rules for `'sm'` vs. `'md'` controls, destructive actions, error alerts, tables, and WCAG AA contrast.
*   Standardize domain-agnostic UI primitives in `src/components/` (`Button` with `forwardRef` and `destructive`, `Card`/`CardBody` padding and overflow control, `Field` with `React.useId()` and `size`, `Select` with `forwardRef`, `SearchInput` with `forwardRef`, `ErrorAlert` with `inline`/`centered`/`compact` variants, and inverted `DataTable`/`Pagination` chrome).
*   Isolate shared Scout-domain UI (`MemberStatusBadge` supporting optional `solventUntil`, `HierarchyFilterSelects`, `MemberHierarchySelects`) inside `src/domain/components/` with pure cascade helpers in `src/utils/memberHierarchy.ts` and strict unidirectional dependencies (never importing `src/features/*`).
*   Consolidate duplicated feature UI across `auth`, `batches`, `recognitions`, `statistics`, and `summary` (including a local `PasswordField` in `auth/`, `Card` + `Field` + `Select` + `SearchInput` + `ErrorAlert` + `DataTable` adoption, `StatisticsDashboard` 5-to-4 skeleton fix, `Step2ReviewConfirm` single empty state, and `Toast` timer/dismiss hygiene).
*   Migrate `EditMemberModal` tests out of `Step3Review.test.tsx`, delete all eight unused components, their dedicated test files, dead `Step2Verification` helpers, thin 1-line modal re-export wrappers, and stale barrel/README/`DESIGN.md` references, and export `GroupSummaryTable` from `src/features/statistics/index.ts`.
*   Land all changes in small, independently verified commits where `npm run lint`, `npm run build`, and `npm test -- --run` pass after each commit, followed by manual UI inspection.

## Non-Goals

*   Modifying visual design, `<Link>` CTAs, or custom showcase components in `src/features/landing/`.
*   Forcing incompatible single-purpose controls into shared abstractions (`AddFilterModal`'s `id:<n>`/`no_scout` single-dimension token picker stays directly on `Select`; `DesignerSidebar`'s range, color, and coordinate controls stay bespoke).
*   Introducing a generic `ConfirmDeleteModal` wrapper for only two delete modals (`DeleteBatchModal` and `RecognitionDeleteModal`) or bloating `Field` with `labelAction`/`endAdornment` slots for auth pages.
*   Introducing external UI component libraries or `tailwind-merge`.
*   Changing Firestore schemas, scraper backend endpoints (`functions/`, `scraper-api/`), or PDF report content/layout.

## Open Questions

*   None remaining; the two architectural questions (`src/components/navigation/` relocation into `src/domain/components/navigation/` and unifying `'sm'` / `'md'` control surfaces onto `bg-primary/5`) were resolved during planning.

## Critical User Journeys (CUJs)

### CUJ 1: Operator filters, inspects, and manages batches or summary records with consistent controls
*   **Given**: An authenticated user navigates across `/lotes`, `/lotes/:id`, `/resumen`, `/estadisticas`, and `/reconocimientos`.
*   **When**: The user filters by recognition type, date period, or cascading Region/District/Group selectors, searches by keyword, paginates tables, or checks member validation statuses (`Registro Válido`, `Emisión Excepcional`, `Registro Inválido`, plus `Solvente hasta ...` in Step 2 batch review).
*   **Then**: All filter controls, search bars, table headers, pagination footers, cards, and status badges render with uniform spacing, border contrast (`>= 3.0:1`), sentence-case labels, and WCAG AA text/icon pairings; wide tables scroll horizontally via native `overflow-x-auto` without clipped row action menus or double empty states.

### CUJ 2: Operator submits forms, triggers destructive actions, or recovers from load/mutation errors
*   **Given**: A user signs in (`/login`), registers (`/registro`), resets a password, creates or edits a batch/member/recognition, or encounters a network/validation error.
*   **When**: Validation fails, an API call errors, or the user confirms deleting a batch or recognition type.
*   **Then**: Form inputs and selects display uniform borders, error states, and screen-reader announcements (`role="alert"`, `aria-invalid`, `aria-describedby`); destructive buttons share one WCAG AA `destructive` style; and load or mutation failures render consistent `ErrorAlert` banners (`inline`, `centered`, or `compact`) with `Reintentar` or dismissal behavior where applicable.

### CUJ 3: Maintainer verifies design tokens and removes dead UI without regressions
*   **Given**: A developer or AI agent checks `docs/DESIGN.md`, `src/components/`, `src/domain/components/`, and feature modules after the staged commits.
*   **When**: The maintainer checks token compliance against `spec.md`, inspects feature barrels (`index.ts`), and runs `npm run lint`, `npm run build`, and `npm test -- --run`.
*   **Then**: `docs/DESIGN.md` parses cleanly under `spec.md` rules without stale component links; none of the eight deleted components or their orphaned helpers/exports remain; `EditMemberModal` retains full test coverage after `Step3Review.test.tsx` removal; and all quality checks pass on every commit.

## Technical Plan (Architecture)

### 1. Three-Tier UI Layering & Dependency Boundaries

To keep `src/components/` strictly domain-agnostic (`AGENTS.md` §1) while eliminating cross-feature duplication, UI modules follow a unidirectional three-tier hierarchy:

```text
+-------------------------------------------------------------------------+
| App Shell & Routes: src/App.tsx, src/layouts/MainLayout.tsx             |
+-----------------------------------+-------------------------------------+
                                    |
        +---------------------------+---------------------------+
        v                                                       v
+-------------------------------+       +---------------------------------+
| Features (Tier 3)             |       | App-Shell Navigation            |
| src/features/{auth,batches,   |       | src/domain/components/          |
|   recognitions,statistics,    |       |   navigation/                   |
|   summary}/                   |       | (Sidebar, ScraperSettingsModal) |
+---------------+---------------+       +---+-------------------------+---+
                |                           |                         |
                v                           v                         |
+-----------------------------------------------+                     |
| Shared Domain UI (Tier 2)                     |                     |
| src/domain/components/                        |                     |
| (MemberStatusBadge, HierarchyFilterSelects,   |                     |
|  MemberHierarchySelects)                      |                     |
| -> imports ONLY Tier 1, src/types/, src/utils/|                     |
+-----------------------+-----------------------+                     |
                        |                                             |
                        v                                             v
+-------------------------------------------------------------------------+
| Domain-Agnostic UI Primitives (Tier 1): src/components/                 |
| Button, Card, Field, Select, SearchInput, ErrorAlert, Modal, Toast,     |
| DataTable, Pagination, walkthrough/*                                    |
| -> ZERO imports from src/features/, src/types/, src/utils/, src/context/|
+-------------------------------------------------------------------------+
```

*   **Tier 1 (`src/components/`)**: Pure visual and accessibility primitives. Relocating `Sidebar` and `ScraperSettingsModal` out of `src/components/navigation/` into `src/domain/components/navigation/` removes all remaining imports from `src/features/*` and `src/context/*` inside `src/components/`.
*   **Tier 2 (`src/domain/components/`)**:
    *   Root domain components (`MemberStatusBadge`, `HierarchyFilterSelects`, `MemberHierarchySelects`) depend strictly on `src/components/`, `src/types/`, and `src/utils/memberHierarchy.ts`—never on `src/features/*`.
    *   `src/domain/components/navigation/` (`Sidebar`, `ScraperSettingsModal`) is the single documented app-shell navigation boundary consuming `features/auth`, `features/batches/api`, and `context/ScraperSettingsContext`.
*   **Tier 3 (`src/features/*`)**: Feature pages, feature-local helpers (`auth/components/PasswordField.tsx`), and direct compositions (`DeleteBatchModal`, `RecognitionDeleteModal`, `AddFilterModal` on `Select`). `src/features/landing/` remains untouched outside this hierarchy.

### 2. Normative Design Specification (`docs/DESIGN.md` via `spec.md`)

Before modifying component code, `docs/DESIGN.md` is rewritten to conform to `spec.md` (`version: alpha`):

*   **Document structure**: YAML front matter (`version: alpha`, `name`, `description`) followed by the 10 standard `##` headings in exact order (`Overview`, `Colors`, `Typography`, `Layout`, `Elevation & Depth`, `Shapes`, `Motion & Micro-interaction`, `Voice & Content Strategy`, `Components`, `Do's and Don'ts`) with no duplicate `##` headings and each top-level YAML key (`colors`, `typography`, `spacing`, `rounded`, `motion`, `components`) defined once.
*   **External reference safety**: Because `spec.md` treats `@`-paths resolving outside `docs/` as errors, references from `docs/DESIGN.md` to `../src/...` use standard markdown links or plain paths instead of backticked `@../` spans.
*   **Resolved visual contracts**:
    *   **Unified input/select surface**: All `'sm'` and `'md'` inputs, selects, and search fields share `bg-primary/5` (`#F9F6F5`), `border-primary/70` (`>= 3.0:1`), `text-neutral`, and `placeholder:text-neutral/75`.
    *   **Two control densities (`size: 'md' | 'sm'`)**: `'md'` (standard forms/modals: `py-2.5 px-4 text-sm rounded-field`) and `'sm'` (compact filter bars/designer sidebars: `py-2 px-3 text-xs rounded-lg`), both respecting the `12px` (`text-xs`) floor and sentence-case labels (replacing `uppercase` drift on form/filter labels).
    *   **Destructive action token**: `Button variant="destructive"` uses `bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700` (WCAG AA `6.47:1` white-on-red contrast).
    *   **Member Validation Status**: Anchored to `MemberStatusBadge` and `batchReports.ts` (replacing `StatusBreakdownCard.tsx`), using `emerald-50`/`emerald-800` (`CheckCircle2`), `purple-50`/`purple-800` (`AlertTriangle`), and `rose-50`/`rose-800` (`XCircle`).
    *   **Stale removals & contrast fixes**: Remove §5/§7 entries for `FloatingTableScrollbar.tsx`, `SearchSelectorModal.tsx`, and `Navbar.tsx`; eliminate `border-red-300`, `text-red-500`, `bg-[#5c371d]`, `text-neutral/40`/`50`/`60`, and sub-`12px` sizes in authenticated views.

### 3. Shared Primitive API Contracts (`src/components/`)

*   **`Button` (`Button.tsx`)**: Wrapped in `React.forwardRef<HTMLButtonElement, ButtonProps>`; adds `'destructive'` to `ButtonVariant` alongside `'primary' | 'secondary' | 'outline' | 'ghost'`.
*   **`Card` (`Card.tsx`)**: Adds `overflow?: 'hidden' | 'visible'` (default `'hidden'`) on `Card` so tables with floating row dropdowns (`BatchList`, `BatchMembersTable`) avoid menu clipping, and `padding?: 'md' | 'sm' | 'none'` (default `'md'`) on `CardBody` instead of relying on CSS class-order overrides.
*   **`Field` (`Field.tsx`)**: Retains `React.forwardRef`, replaces label-derived `id` collisions with `React.useId()` when `id` is omitted, and adds `size?: 'md' | 'sm'`. Keeps `Field` free of `labelAction`/`endAdornment` props.
*   **`Select` (`Select.tsx`, new)**: Uses `React.forwardRef<HTMLSelectElement, SelectProps>` to preserve `react-hook-form` `register()` compatibility (`Step1DataLoad.tsx`). Supports `label?: string`, `aria-label`, `size?: 'md' | 'sm'`, `variant?: 'default' | 'error'`, `errorText?: string`, `React.useId()` fallback, and `border-primary/70` / `bg-primary/5`.
*   **`SearchInput` (`SearchInput.tsx`, new)**: Uses `React.forwardRef<HTMLInputElement, SearchInputProps>` with leading `<Search aria-hidden="true" />`, optional clear button (`aria-label="Limpiar búsqueda"`), `size?: 'sm' | 'md'`, and `aria-label` / `placeholder` forwarding so existing test queries stay valid.
*   **`ErrorAlert` (`ErrorAlert.tsx`, new)**: Renders `role="alert"` with `<AlertCircle aria-hidden="true" />`, `variant: 'inline' | 'centered' | 'compact'`, `title?: string`, `message: string`, and optional `onRetry?: () => void` (`Reintentar` `Button`).
*   **`DataTable` & `Pagination` (`DataTable.tsx`, `Pagination.tsx`, replacing `Table.tsx`)**:
    *   Inverts control so parent views configure `useReactTable` (`getCoreRowModel`, `getFilteredRowModel`, `getPaginationRowModel`, `rowSelection`) and pass `table: Table<TData>` into `<DataTable>`.
    *   `DataTable` renders the `<table>` (`bg-primary/10` header, `divide-y divide-gray-100` rows, `overflow-x-auto` wrapper configurable via `scrollContainerClassName`), optional `loading` state, and single `emptyState` slot (eliminating `Step2ReviewConfirm`'s double empty message).
    *   `Pagination` accepts `table`, total/filtered counts, item label (`lotes`, `miembros`, `registros`), optional `pageSizeOptions` (`[10, 25, 50, 100]` in `SummaryView`), and `mode?: 'summary' | 'numbered'` (`Página X de Y` vs. 5-button numbered slices in `BatchMembersTable`).

### 4. Shared Domain Layer (`src/domain/components/` & `src/utils/memberHierarchy.ts`)

*   **`src/utils/memberHierarchy.ts`**: Add pure option-filtering helpers `getAvailableDistricts(districts, regionId, options?)` and `getAvailableGroups(groups, districts, regionId, districtId, options?)` (filtering `id !== 0` and `!isNoAplicaDistrict(d)` uniformly) plus `resolveParentHierarchyForSelection` for member assignment upward sync.
*   **`HierarchyFilterSelects` (`src/domain/components/HierarchyFilterSelects.tsx`)**: String-keyed cascading filters (`''`, `'nacional'`, `'0'`, numeric string IDs) built on `<Select size="sm">`, supporting `showGroup?: boolean`, `includeAllInDistricts`, and downward resets (`SummaryView`, `statistics/FilterBar`). `AddFilterModal` stays directly on `<Select>` because it uses single-dimension `id:<n>`/`no_scout` keys.
*   **`MemberHierarchySelects` (`src/domain/components/MemberHierarchySelects.tsx`)**: Numeric-ID (`0 | number`) cascading selectors built on `<Select>` for `EditMemberModal` and `ManualMemberModal`, with explicit `size`/`layout` (`stacked` vs. `grid-cols-3`), accessible labels, `isNoAplicaDistrict` normalization to `0`, and optional upward parent hydration (`region_id`/`district_id`/`*_name`).
*   **`MemberStatusBadge` (`src/domain/components/MemberStatusBadge.tsx`)**: Single source of truth for `MemberStatus` (`'active' | 'exceptional' | 'pending'`), rendering `docs/DESIGN.md` §6 colors and Lucide icons (`CheckCircle2`, `AlertTriangle`, `XCircle`), with optional `solventUntil?: string` / `labelOverride?: string` for `Step2ReviewConfirm` (`Solvente hasta ...`).

### 5. Feature Consolidation & Dead-Code Cleanup Architecture

*   **Auth**: Extract `AuthLayout` and `PasswordField` inside `src/features/auth/components/`; migrate `LoginPage` and `RegisterPage` onto `Card`, `Field`, `ErrorAlert` (`compact`), and `PasswordField`, and unify the `"Verificando sesión..."` spinner between `ProtectedRoute.tsx` and `App.tsx`.
*   **Batches, Recognitions, Statistics, Summary**:
    *   Replace hand-rolled card wrappers, error banners/cards, raw `<select>`s, search inputs, destructive buttons, and status badges with Tier 1 & Tier 2 components.
    *   Keep `DeleteBatchModal` and `RecognitionDeleteModal` as direct compositions of `Modal` + `Button variant="destructive"` + `ErrorAlert` (`compact`), removing the 1-line re-export wrappers (`detail/DeleteBatchModal.tsx`, `detail/EditMemberModal.tsx`, `list/DeleteBatchModal.tsx`).
    *   In `statistics`, unify Standard vs. YoY `<table>` trees inside `DemographicsDonut`, `RegionSummaryTable`, `DistrictSummaryTable`, `UnitDistributionCard`, and `MonthlyTrendChart` via conditional YoY columns, share territorial summary table helpers, export `GroupSummaryTable` in `statistics/index.ts`, and fix `StatisticsDashboard`'s 5-card skeleton (`lg:grid-cols-5` → `lg:grid-cols-4`).
    *   In `recognitions`, consolidate duplicated dimension/format text and background upload buttons cleanly, and unify `Toast` dismissal/timer cleanup across `SummaryView`, `BatchList`, `NewBatchWizard`, `SuccessPage`, and `RecognitionCatalog` (matching `BatchDetail`'s `toastTimeoutRef` pattern).
    *   In `batches`, extract shared member cell renderers between `batchDetailColumns.tsx` and `SuccessPage.tsx`, and fix `Step2ReviewConfirm`'s double empty state.
*   **Dead-code removal**: Migrate `EditMemberModal` coverage from `Step3Review.test.tsx` (lines 325–545) to `EditMemberModal.test.tsx`, then delete `Step2Verification`, `Step3Review`, `GeographicBarChart`, `RecognitionRankingChart`, `StatusBreakdownCard`, `SearchSelectorModal`, `FloatingTableScrollbar`, and `Navbar`, their dedicated tests, dead `Step2Verification` helpers (`MemberVerificationResult`, unused `wizardHelpers`), and stale barrel/doc references.

### 6. Staged Commit Rollout

1. **Commit 1**: Rewrite `docs/DESIGN.md` in `spec.md` format (`version: alpha`).
2. **Commit 2**: Add/extend Tier 1 primitives in `src/components/` (`Button`, `Card`, `Field`, `Select`, `SearchInput`, `ErrorAlert`, `DataTable`, `Pagination`) with unit tests.
3. **Commit 3**: Add `src/utils/memberHierarchy.ts` helpers, create `src/domain/components/` (`MemberStatusBadge`, `HierarchyFilterSelects`, `MemberHierarchySelects`, and relocated `navigation/`), delete retired `src/components/navigation/` (`Navbar.tsx`, `Navbar.test.tsx`, `index.ts`), and update `App.tsx`, `MainLayout.tsx`, `AGENTS.md`, and `docs/designs/SITEMAP.md`.
4. **Commit 4**: Migrate unique `EditMemberModal` tests from `Step3Review.test.tsx` into `SharedModals.test.tsx` → delete the remaining unused components, dead helpers, 1-line modal wrappers, and stale barrel/`README.md` entries → export `GroupSummaryTable`.
5. **Commits 5–10**: Migrate features (`Commit 5` `auth` → `Commit 6` `recognitions` → `Commit 7` `statistics` → `Commit 8` `summary` → `Commit 9` `batches` shared/wizard/success → `Commit 10` `batches` list/detail and `Table.tsx` retirement), running `npm run lint`, `npm run build`, and `npm test -- --run` after every commit, followed by manual UI inspection after Commit 10.

--------------------------------------------------------------------------------

## Alternatives Considered

### Alternative A: Keep Pure Cascade & Badge Helpers Only in `src/types/` and `src/utils/` (No `src/domain/components/`)
*   **Pros**: Avoids adding a third UI directory (`src/domain/components/`) between `src/components/` and `src/features/*`; keeps `MemberStatusBadge` data next to `getUnitBadge` in `src/types/member.ts` and cascade filters in `src/utils/memberHierarchy.ts`.
*   **Cons**: Leaves badge JSX, icon accessibility attributes, and cascading Region/District/Group `<Select>` wiring and layout duplicated across `SummaryView`, `FilterBar`, `EditMemberModal`, `ManualMemberModal`, `batchDetailColumns`, `SuccessPage`, and `Step2ReviewConfirm`.
*   **Reason for Rejection**: Rejected by author: a dedicated `src/domain/components/` folder provides a single shared home for Scout-coupled UI components while keeping `src/components/` domain-agnostic.

### Alternative B: Monolithic `<HierarchySelects>` Across All Five Territory-Select Call Sites
*   **Pros**: Exposes one component name for every Region, District, and Group dropdown across the application.
*   **Cons**: Forces one component to reconcile incompatible contracts—string sentinels (`""`, `"nacional"`, `"0"`) in `SummaryView`, Region+District-only filtering in `statistics/FilterBar`, non-cascading `"id:<n>"` / `"no_scout"` token picking in `AddFilterModal`, numeric `0` with upward parent hydration in `EditMemberModal`, and a label-less 3-column grid in `ManualMemberModal`—creating boolean-prop complexity and filter/persistence bug risks.
*   **Reason for Rejection**: Rejected by author: splitting into `HierarchyFilterSelects` and `MemberHierarchySelects` while leaving `AddFilterModal` directly on `Select` keeps each contract explicit and type-safe.

### Alternative C: Keep `Sidebar` and `ScraperSettingsModal` in `src/components/navigation/` as an App-Shell Exception
*   **Pros**: Avoids moving files or updating imports in `App.tsx`, `MainLayout.tsx`, and navigation test files.
*   **Cons**: Leaves `src/components/index.ts` transitively importing `src/features/auth`, `src/features/batches/api`, and `src/context/ScraperSettingsContext`, weakening the rule that `src/components/` never depends on feature modules.
*   **Reason for Rejection**: Rejected by author: moving `Sidebar` and `ScraperSettingsModal` into `src/domain/components/navigation/` keeps `src/components/` 100% domain-agnostic.

### Alternative D: Preserve `#FAF8F5` for `'sm'` Filter Controls Alongside `bg-primary/5` for `'md'` Forms
*   **Pros**: Keeps the exact current background hex on `Statistics` and `SummaryView` filter bars untouched.
*   **Cons**: Retains two nearly identical off-white surface tokens (`#FAF8F5` vs. `#F9F6F5`) across interactive controls and forces size-coupled surface overrides whenever `'sm'` controls appear inside modals or forms.
*   **Reason for Rejection**: Rejected by author: unifying both `'sm'` and `'md'` controls onto `bg-primary/5` (`#F9F6F5`) removes redundant surface tokens.

### Alternative E: Monolithic `DataTable` Owning `useReactTable`
*   **Pros**: Hides `@tanstack/react-table` setup behind a single `<DataTable columns data />` interface.
*   **Cons**: Repeats the exact rigidity that caused `BatchList`, `BatchMembersTable`, `RecognitionCatalog`, and `SummaryView` to bypass `src/components/Table.tsx` (`rowSelection`, `getFilteredRowModel`, `getPaginationRowModel`, custom `pageSize` selectors, and `pb-12` dropdown headroom).
*   **Reason for Rejection**: Rejected by author: inverting control so parent views pass their TanStack `Table<TData>` instance into stateless `DataTable` + `Pagination` chrome preserves feature flexibility without duplicating table markup.

### Alternative F: Generic `ConfirmDeleteModal` and Full `Field` Adornment Expansion (`labelAction` / `endAdornment`)
*   **Pros**: Extracts a wrapper for the two delete modals (`DeleteBatchModal`, `RecognitionDeleteModal`) and allows `LoginPage`/`RegisterPage` password inputs to render directly through `Field`.
*   **Cons**: `ConfirmDeleteModal` abstracts only two ~70-line modals with different async ownership (presentational vs. self-mutating), and `labelAction`/`endAdornment` bloat `Field.tsx` solely for two auth pages.
*   **Reason for Rejection**: Rejected by author: composing `Modal` + `Button variant="destructive"` + `ErrorAlert` directly in both delete modals and keeping a feature-local `PasswordField` in `auth/` avoids unnecessary shared-primitive complexity.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Accessibility & WCAG Contrast**: All authenticated interactive borders (`Field`, `Select`, `SearchInput`, `Button variant="outline"`) must meet `>= 3.0:1` non-text contrast (`border-primary/70` or `border-gray-500`), normal text and muted labels must meet `>= 4.5:1` (`text-neutral/75` floor, eliminating `text-neutral/40`/`50`/`60`), `Button variant="destructive"` must meet `>= 4.5:1` (`bg-red-700 text-white`), error surfaces must declare `role="alert"`, all controls must use `>= 12px` (`text-xs`) text, and tables/modals must reflow cleanly at `200%` browser zoom.
*   **Bundle & Runtime Efficiency**: Removing eight unused components (including `FloatingTableScrollbar`'s `ResizeObserver` and `IntersectionObserver` listeners) and consolidating duplicated JSX reduces client bundle size and removes uncleaned toast `setTimeout` timers on unmount.
*   **Rollout & Verification**: Changes ship as small, atomic, per-layer/per-feature commits (`docs/DESIGN.md` → `src/components/` → `src/domain/components/` → dead-code cleanup → per-feature migrations) where `npm run lint`, `npm run build`, and `npm test -- --run` pass on every commit, followed by manual UI inspection.

--------------------------------------------------------------------------------

### Additional Resources

*   [`docs/DESIGN.md`](../DESIGN.md) — Current design specification to be rewritten in `spec.md` format.
*   [`spec.md`](../../spec.md) — Target `DESIGN.md` schema, section ordering, token reference rules, and external reference directory constraint.
*   [`AGENTS.md`](../../AGENTS.md) — Repository layer rules, quality pipeline commands, and Spanish copy rules.
*   [`docs/designs/SITEMAP.md`](./SITEMAP.md) — Central index of design documents and feature `README.md` blueprints.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

All changes execute sequentially across ten layer- and feature-scoped commits. TypeScript interfaces below specify all new public primitive, domain, utility, and feature-extracted module contracts without embedding implementation code.

### Target Files to Create, Modify, Move, or Delete

#### Commit 1 — Rewrite `docs/DESIGN.md` to `spec.md` (`version: alpha`)

1.  `docs/DESIGN.md` (**[Modify]**)
    *   **Type / Scope**: Normative design specification.
    *   **Proposed Changes**: Rewrite using YAML front matter (`version: alpha`, `name: Chil Design System`, `description`) and the 10 standard `##` headings in `spec.md` order (`Overview`, `Colors`, `Typography`, `Layout`, `Elevation & Depth`, `Shapes`, `Motion & Micro-interaction`, `Voice & Content Strategy`, `Components`, `Do's and Don'ts`) with no duplicate headings and single-occurrence YAML blocks (`colors`, `typography`, `spacing`, `rounded`, `motion`, `components`). Place Scout Units, Member Validation Status, Recognition Type Badges, Statistics Chart Palettes, and Certificate Designer Presets as `###` subsections under `## Colors`, and place Web/PDF congruency rules under `## Components`. Define `'md'` vs. `'sm'` control scales unified on `bg-primary/5` and `border-primary/70`; specify `Button` (`primary`, `secondary`, `outline`, `ghost`, `destructive`), `Card`, `Field`, `Select`, `SearchInput`, `ErrorAlert` (`inline` | `centered` | `compact`), `DataTable`, `Pagination`, `Modal`, and `Toast`; enforce sentence-case form/filter labels and `>= 12px` text floor; update the Member Validation Status section to reference `src/domain/components/MemberStatusBadge.tsx` and `src/features/batches/api/batchReports.ts`; remove references to `FloatingTableScrollbar.tsx`, `SearchSelectorModal.tsx`, `Navbar.tsx`, and `StatusBreakdownCard.tsx`; use standard markdown links for `../src/...` paths instead of backticked `@../` external references.
    *   **Rationale**: Establishes a single `spec.md`-compliant visual contract before modifying component files.

#### Commit 2 — Extend and Add Domain-Agnostic Primitives (`src/components/`)

2.  `src/components/Button.tsx` (**[Modify]**)
    *   **Type / Scope**: Tier 1 UI primitive.
    *   **Proposed Changes**: Wrap in `React.forwardRef<HTMLButtonElement, ButtonProps>`; extend `ButtonVariant` with `'destructive'` (`bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700`).
    *   **Rationale**: Eliminates ad-hoc `bg-red-600` class overrides, mismatched hand-rolled red `<button>` elements, and missing ref forwarding.
3.  `src/components/Card.tsx` (**[Modify]**)
    *   **Type / Scope**: Tier 1 UI primitive.
    *   **Proposed Changes**: Add `overflow?: 'hidden' | 'visible'` (default `'hidden'`) on `Card`, and `padding?: 'md' | 'sm' | 'none'` (default `'md'`, where `'md'` = `p-6`, `'sm'` = `p-4`, `'none'` = `p-0`) on `CardBody`.
    *   **Rationale**: Allows row-menu tables (`BatchList`, `BatchMembersTable`) to adopt `Card` without clipping dropdowns and replaces CSS-order `p-4` overrides on `p-6`.
4.  `src/components/Field.tsx` (**[Modify]**)
    *   **Type / Scope**: Tier 1 UI primitive.
    *   **Proposed Changes**: Replace label-derived fallback `id` generation with `id ?? reactUseId` (preserving caller-supplied `id` props such as `ScraperSettingsModal.tsx`); add `size?: 'md' | 'sm'` (`md`: `py-2.5 px-4 text-sm rounded-field`; `sm`: `py-2 px-3 text-xs rounded-lg`) while preserving `bg-primary/5`, `border-primary/70`, `React.forwardRef`, and `aria-invalid`/`aria-describedby`/`role="alert"` attributes.
    *   **Rationale**: Prevents duplicate DOM IDs across concurrently mounted modals/forms and aligns compact date/form inputs without adding `labelAction`/`endAdornment` slots to `Field`.
5.  `src/components/Select.tsx` (**[Create]**)
    *   **Type / Scope**: Tier 1 UI primitive.
    *   **Proposed Changes**: Export `Select` via `React.forwardRef<HTMLSelectElement, SelectProps>`:
        ```ts
        export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
          label?: string;
          size?: 'md' | 'sm';
          variant?: 'default' | 'error';
          errorText?: string;
        }
        ```
        Uses `id ?? reactUseId` fallback, sentence-case `<label>` when `label` is provided (`text-sm font-semibold` for `'md'`, `text-xs font-semibold` for `'sm'`), `bg-primary/5`, `border-primary/70` (`border-red-600` when `variant === 'error'`), `role="alert"` error text, and `forwardRef` for `react-hook-form` `register()`.
    *   **Rationale**: Replaces ~25 hand-rolled `<select>` elements and fixes `border-primary/20` (`1.34:1`) contrast violations.
6.  `src/components/SearchInput.tsx` (**[Create]**)
    *   **Type / Scope**: Tier 1 UI primitive.
    *   **Proposed Changes**: Export `SearchInput` via `React.forwardRef<HTMLInputElement, SearchInputProps>`:
        ```ts
        export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
          size?: 'sm' | 'md';
          onClear?: () => void;
          clearLabel?: string;
        }
        ```
        Renders leading `<Search aria-hidden="true" />`, `bg-primary/5 border-primary/70`, forwards `value`, `onChange`, `placeholder`, and `aria-label`, and renders the trailing clear `<button type="button">` (`aria-label={clearLabel ?? 'Limpiar búsqueda'}`) strictly when `Boolean(value) && Boolean(onClear)`.
    *   **Rationale**: Deduplicates the 4 search bars across `BatchMembersTable`, `RecognitionCatalog`, `SummaryView`, and `Step2ReviewConfirm` while preserving existing `placeholder` and `aria-label` attributes queried by tests.
7.  `src/components/ErrorAlert.tsx` (**[Create]**)
    *   **Type / Scope**: Tier 1 UI primitive.
    *   **Proposed Changes**: Export `ErrorAlert`:
        ```ts
        export interface ErrorAlertProps {
          variant: 'inline' | 'centered' | 'compact';
          message: string;
          title?: string;
          retryLabel?: string;
          onRetry?: () => void;
          className?: string;
        }
        ```
        Always renders `role="alert"` with `<AlertCircle aria-hidden="true" />`:
        - `'inline'`: full-width horizontal flex banner (`p-4 bg-red-50 border border-red-200 rounded-2xl`), optional `Button variant="outline" size="sm"` calling `onRetry`.
        - `'centered'`: centered card (`max-w-xl mx-auto my-12 p-8 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4`) with optional `<h2>` `title` and `Button variant="primary"` calling `onRetry`.
        - `'compact'`: dense form/modal banner (`p-3 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700`) with no retry button.
    *   **Rationale**: Consolidates ~10 duplicated error banners/cards and adds missing `role="alert"` semantics in modals.
8.  `src/components/DataTable.tsx` & `src/components/Pagination.tsx` (**[Create]**)
    *   **Type / Scope**: Tier 1 UI primitives.
    *   **Proposed Changes**:
        ```ts
        export interface DataTableProps<TData> {
          table: TanStackTable<TData>;
          columnCount: number;
          bordered?: boolean;
          loading?: boolean;
          loadingMessage?: string;
          emptyState?: React.ReactNode;
          scrollContainerClassName?: string;
          className?: string;
        }
        export interface PaginationProps<TData> {
          table: TanStackTable<TData>;
          totalCount: number;
          filteredCount?: number;
          itemLabel: string;
          mode?: 'summary' | 'numbered';
          counterFormat?: 'summary-total' | 'count' | 'range';
          pageSizeOptions?: number[];
          hideWhenEmpty?: boolean;
        }
        ```
        - `DataTable`: renders `<table />` (`bg-primary/10` `<thead>` with `header.isPlaceholder`/`header.colSpan` support, `divide-y divide-gray-100` rows, `overflow-x-auto` wrapper configurable via `scrollContainerClassName`), wraps in `border border-primary/20 rounded-2xl overflow-hidden bg-white` when `bordered !== false` (set `bordered={false}` when nested inside `<Card>`), gives `loading` precedence over `emptyState`, and falls back to `"No hay datos disponibles."` when `emptyState` is omitted.
        - `Pagination`: hides when `hideWhenEmpty && totalCount === 0`; renders `aria-label="Página anterior"` and `aria-label="Página siguiente"` prev/next buttons; renders `counterFormat` (`'summary-total'` → `"Mostrando ${filtered} de ${total} ${itemLabel} totales"`, `'count'` → `"Mostrando ${filtered} de ${total} ${itemLabel}"`, `'range'` → `"Mostrando ${start}-${end} de ${filtered} ${itemLabel}"`); renders optional `<Select size="sm" aria-label="Selector de filas por página">` calling `table.setPageSize(Number(val))`; in `'summary'` mode shows `Página ${pageCount === 0 ? 0 : pageIndex + 1} de ${pageCount}`; in `'numbered'` mode slices `Array.from({ length: pageCount }, (_, i) => i).slice(0, 5)` with `'...'` when `pageCount > 5`.
    *   **Rationale**: Decouples `<table />` markup from `useReactTable` state, preserves bottom padding (`pb-12`) for row dropdown menus, and preserves exact counter/`aria-label` contracts asserted by existing tests.
9.  `src/components/index.ts` (**[Modify]**)
    *   **Type / Scope**: Tier 1 barrel exports.
    *   **Proposed Changes**: Export `*` from `./Select`, `./SearchInput`, `./ErrorAlert`, `./DataTable`, and `./Pagination`. (Keep `./Table` exported until Commit 10 retires `Table.tsx`.)
    *   **Rationale**: Exposes new Tier 1 primitives for Tier 2 and Tier 3 adoption.
10. Tier 1 Unit Tests (**[Create / Modify]**)
    *   `src/components/__tests__/Field.test.tsx` (**[Modify]**): Add tests for `React.useId()` uniqueness across two label-less-ID instances, explicit `id` preservation, and `size="sm"` vs. `size="md"` classes.
    *   `src/components/__tests__/Button.test.tsx` (**[Create]**): Verify `destructive` variant classes and `forwardRef` forwarding.
    *   `src/components/__tests__/Card.test.tsx` (**[Create]**): Verify `Card overflow="visible"` and `CardBody padding="sm" | "none"`.
    *   `src/components/__tests__/Select.test.tsx` (**[Create]**): Verify `forwardRef`, `size` variants, `errorText` `role="alert"` + `aria-invalid` + `aria-describedby`, and `useId()` fallback.
    *   `src/components/__tests__/SearchInput.test.tsx` (**[Create]**): Verify leading icon, `onChange`, clear button hidden when empty or `onClear` omitted, and `aria-label="Limpiar búsqueda"` clear trigger.
    *   `src/components/__tests__/ErrorAlert.test.tsx` (**[Create]**): Verify `inline`, `centered`, and `compact` variants, `role="alert"`, and `onRetry` click handler.
    *   `src/components/__tests__/DataTable.test.tsx` (**[Create]**): Verify header `colSpan`/placeholders, `bordered={false}`, `loading` precedence over `emptyState`, default `"No hay datos disponibles."` fallback, and all `Pagination` modes (`summary-total`, `count`, `range`, `numbered` `.slice(0, 5)` + `...`, `totalCount === 0` `Página 0 de 0`, `hideWhenEmpty`, and `pageSize` change).
    *   **Rationale**: Verifies every Tier 1 API contract and edge case before Tier 2/Tier 3 adoption.

#### Commit 3 — Create `src/domain/components/`, Relocate `navigation/`, Retire `Navbar`, and Add Cascade Helpers

11. `src/utils/memberHierarchy.ts` & `src/utils/__tests__/memberHierarchy.test.ts` (**[Modify]**)
    *   **Type / Scope**: Shared domain utilities and tests.
    *   **Proposed Changes**: Add pure cascade helpers and unit tests:
        ```ts
        export function getAvailableDistricts(
          districts: readonly District[],
          regionId: string | number | undefined,
          options?: { includeNoAplicaDistrict?: boolean }
        ): District[];

        export function getAvailableGroups(
          groups: readonly ScoutGroup[],
          districts: readonly District[],
          regionId: string | number | undefined,
          districtId: string | number | undefined
        ): ScoutGroup[];

        export function resolveParentHierarchyForSelection(
          level: 'district' | 'group',
          selectedId: number,
          hierarchy: { regions: readonly Region[]; districts: readonly District[]; groups: readonly ScoutGroup[] }
        ): { region_id: number; region_name: string; district_id: number; district_name: string; group_id?: number; group_name?: string };
        ```
        - `getAvailableDistricts`: returns `[]` for `''`, `'nacional'`, `'0'`, `0`, or `undefined`; otherwise filters `d.region_id === Number(regionId) && d.id !== 0 && (options?.includeNoAplicaDistrict || !isNoAplicaDistrict(d))`.
        - `getAvailableGroups`: returns `[]` when `regionId` is `'nacional'`/`'0'` or `districtId` is `'0'`; when `districtId` is positive, filters `g.district_id === Number(districtId) && g.id !== 0`; when only `regionId` is positive, filters groups belonging to districts of that region (`g.id !== 0`).
        - `resolveParentHierarchyForSelection`: normalizes `isNoAplicaDistrict` parent districts to `district_id: 0` while resolving parent `region_id` and `*_name` labels. Add unit tests covering `'nacional'`, `'0'`, `NO APLICA` filtering, region-only group filtering, and upward resolution when a group's parent district is `NO APLICA`.
    *   **Rationale**: Centralizes duplicated hierarchy filtering and upward sync logic under one canonical helper name (`resolveParentHierarchyForSelection`).
12. `src/domain/components/MemberStatusBadge.tsx` (**[Create]**)
    *   **Type / Scope**: Shared domain UI (`Tier 2`).
    *   **Proposed Changes**:
        ```ts
        export interface MemberStatusBadgeProps {
          status: MemberStatus;
          solventUntil?: string;
          labelOverride?: string;
          className?: string;
        }
        ```
        Maps `'active'` (`bg-emerald-50 text-emerald-800 border-emerald-200`, `CheckCircle2`, `'Registro Válido'`), `'exceptional'` (`bg-purple-50 text-purple-800 border-purple-200`, `AlertTriangle`, `'Emisión Excepcional'`), and `'pending'` (`bg-rose-50 text-rose-800 border-rose-200`, `XCircle`, `'Registro Inválido'`). When `status === 'active'` and `solventUntil` is non-empty, renders `"Solvente hasta ${solventUntil}"`; `labelOverride` overrides default copy when supplied.
    *   **Rationale**: Consolidates four inconsistent status badge renderers while preserving Step 2 solvency date display.
13. `src/domain/components/HierarchyFilterSelects.tsx` & `src/domain/components/MemberHierarchySelects.tsx` (**[Create]**)
    *   **Type / Scope**: Shared domain UI (`Tier 2`).
    *   **Proposed Changes**:
        ```ts
        export interface HierarchyFilterSelectsProps {
          regions: readonly Region[];
          districts: readonly District[];
          groups?: readonly ScoutGroup[];
          regionId: string;
          districtId: string;
          groupId?: string;
          showGroup?: boolean;
          includeNoAplicaAlways?: boolean;
          onRegionChange: (regionId: string) => void;
          onDistrictChange: (districtId: string) => void;
          onGroupChange?: (groupId: string) => void;
        }

        export interface MemberHierarchySelectsProps {
          regions: readonly Region[];
          districts: readonly District[];
          groups: readonly ScoutGroup[];
          regionId: number;
          districtId: number;
          groupId: number;
          size?: 'md' | 'sm';
          layout?: 'stacked' | 'grid';
          hideWhenEmpty?: boolean;
          onChange: (next: {
            region_id: number;
            region_name: string;
            district_id: number;
            district_name: string;
            group_id: number;
            group_name: string;
          }) => void;
        }
        ```
        - `HierarchyFilterSelects` renders `<Select size="sm">` controls with `aria-label="Filtrar por región"`, `aria-label="Filtrar por distrito"`, and `aria-label="Filtrar por grupo"`, sentence-case `<label>`s (`Región`, `Distrito`, `Grupo Scout`), synthetic `'nacional'` and `'0'` (`No aplica`) options, and downward reset callbacks.
        - `MemberHierarchySelects` renders accessible labeled `<Select>` controls (`Región Scout`, `Distrito Scout`, `Grupo Scout`), `0` `"Sin región / No aplica"` / `"Sin distrito / No aplica"` / `"Sin grupo / No aplica"` options, `hideWhenEmpty` support (`regions.length === 0`), and invokes `resolveParentHierarchyForSelection` on upward selections.
    *   **Rationale**: Eliminates duplicated cascade UI across `SummaryView`, `FilterBar`, `EditMemberModal`, and `ManualMemberModal` with explicit ARIA labels and separated filter vs. entity contracts.
14. `src/domain/components/__tests__/MemberStatusBadge.test.tsx`, `HierarchyFilterSelects.test.tsx`, & `MemberHierarchySelects.test.tsx` (**[Create]**)
    *   **Type / Scope**: Tier 2 unit tests.
    *   **Proposed Changes**: Test all `MemberStatus` variants, `solventUntil`, `labelOverride`, `HierarchyFilterSelects` `showGroup={false}` / downward reset / `aria-label` attributes, and `MemberHierarchySelects` numeric `0` clearing, `hideWhenEmpty`, and upward `district`/`group` parent hydration.
    *   **Rationale**: Guarantees Tier 2 component correctness independently of feature migrations.
15. Move Navigation & Retire `Navbar` Atomically (**[Move & Delete]**)
    *   `src/domain/components/navigation/Sidebar.tsx` (**[Move & Modify]** from `src/components/navigation/Sidebar.tsx`): Update relative imports (`../../../components`, `../../../features/auth`, `../../../context/ScraperSettingsContext`) and replace `text-neutral/70` on inactive icons if below `4.5:1` (`text-neutral/75`).
    *   `src/domain/components/navigation/ScraperSettingsModal.tsx` (**[Move & Modify]** from `src/components/navigation/ScraperSettingsModal.tsx`): Update relative imports (`../../../components`, `../../../context/ScraperSettingsContext`, `../../../features/batches/api`), replace raw error box (`L239`) with `<ErrorAlert variant="compact">`, and replace `text-neutral/60`/`70` (`L146`, `L159`, `L210`) with `text-neutral/75`.
    *   `src/domain/components/navigation/index.ts` (**[Create]**): Export `*` from `./Sidebar` and `./ScraperSettingsModal`.
    *   `src/domain/components/navigation/__tests__/Sidebar.test.tsx` & `ScraperSettingsModal.test.tsx` (**[Move & Modify]** from `src/components/navigation/__tests__/`): Update imports after relocation.
    *   `src/components/navigation/Navbar.tsx`, `src/components/navigation/index.ts`, & `src/components/navigation/__tests__/Navbar.test.tsx` (**[Delete]**): Delete atomically in Commit 3 so `tsc` and Vitest do not fail on dangling `./Sidebar` or `../ScraperSettingsModal` imports.
    *   **Rationale**: Removes all `features/*` and `context/*` imports from `src/components/` without breaking intermediate builds or tests.
16. `src/domain/components/index.ts` & `src/domain/components/README.md` (**[Create]**)
    *   **Type / Scope**: Tier 2 barrel & EGM blueprint.
    *   **Proposed Changes**: Export `MemberStatusBadge`, `HierarchyFilterSelects`, `MemberHierarchySelects`, and `./navigation`; document dependency rules (root widgets import only Tier 1, `src/types/`, `src/utils/`; `navigation/` is the app-shell router/auth/scraper boundary).
    *   **Rationale**: Enforces and documents the Tier 2 layer boundary.
17. `src/App.tsx`, `src/layouts/MainLayout.tsx`, `src/layouts/__tests__/MainLayout.test.tsx`, `src/components/index.ts`, `AGENTS.md`, & `docs/designs/SITEMAP.md` (**[Modify]**)
    *   **Type / Scope**: App-shell wiring & architecture docs.
    *   **Proposed Changes**: Update `Sidebar` and `ScraperSettingsModal` imports in `src/App.tsx` and `src/layouts/MainLayout.tsx` (and `vi.mock` path in `src/layouts/__tests__/MainLayout.test.tsx`) to `src/domain/components/navigation`; remove `export * from './navigation'` from `src/components/index.ts`; update `AGENTS.md` §1 to document `src/domain/components/` and `src/components/` isolation; add a `Shared Layers` table in `docs/designs/SITEMAP.md` linking `src/domain/components/README.md`.
    *   **Rationale**: Keeps app shell and documentation aligned with the three-tier layout.

#### Commit 4 — Migrate `EditMemberModal` Tests & Delete Unused Components / Wrappers

18. `src/features/batches/components/shared/__tests__/SharedModals.test.tsx` (**[Modify]**)
    *   **Type / Scope**: Unit tests.
    *   **Proposed Changes**: Migrate the unique `EditMemberModal` cases from `src/features/batches/components/__tests__/Step3Review.test.tsx` (`L325–545`, specifically `manada -> tropa` unit changes, unverified `no_scout -> pending` transition, and Region/District/Group selection) into `SharedModals.test.tsx`, rendering `<EditMemberModal showContactFields={false} ... />` directly.
    *   **Rationale**: Preserves unique `EditMemberModal` coverage in its existing test file before deleting `Step3Review.test.tsx`.
19. Delete Unused Components, 1-Line Re-Export Wrappers, and Dedicated Tests (**[Delete]**)
    *   **Type / Scope**: Dead-code and unused test removal (`4` dedicated test suites: `FloatingTableScrollbar.test.tsx`, `Step2Verification.test.tsx`, `Step3Review.test.tsx`, plus `Navbar.test.tsx` already deleted in Commit 3).
    *   **Proposed Changes**:
        - `src/components/SearchSelectorModal.tsx` (**[Delete]**)
        - `src/components/FloatingTableScrollbar.tsx` & `src/components/__tests__/FloatingTableScrollbar.test.tsx` (**[Delete]**)
        - `src/features/batches/components/wizard/Step2Verification.tsx` & `src/features/batches/components/__tests__/Step2Verification.test.tsx` (**[Delete]**)
        - `src/features/batches/components/wizard/Step3Review.tsx` & `src/features/batches/components/__tests__/Step3Review.test.tsx` (**[Delete]**)
        - `src/features/batches/components/detail/DeleteBatchModal.tsx`, `src/features/batches/components/detail/EditMemberModal.tsx`, & `src/features/batches/components/list/DeleteBatchModal.tsx` (**[Delete]** — 1-line re-export wrappers)
        - `src/features/statistics/components/charts/GeographicBarChart.tsx`, `src/features/statistics/components/charts/RecognitionRankingChart.tsx`, & `src/features/statistics/components/charts/StatusBreakdownCard.tsx` (**[Delete]**)
    *   **Rationale**: Removes confirmed unused components, dead test suites, and 1-line modal wrappers.
20. Clean Dead Helpers, Barrels, & Feature Blueprints (**[Modify]**)
    *   **Type / Scope**: Dead-helper pruning, barrel repairs, and `README.md` updates.
    *   **Proposed Changes**:
        - `src/types/member.ts`: Remove unused `MemberVerificationResult` interface.
        - `src/features/batches/components/wizard/wizardHelpers.ts`: Remove unused Step 2 symbols (`handleScrapeErrorResult`, `getInitialMemberUnit`, `upsertVerificationItem`, `parseCedulaEntries`, `saveNoScoutMemberToDb`, `syncAndFinalizeStep2Members`).
        - `src/components/index.ts`: Remove `FloatingTableScrollbar` and `SearchSelectorModal` exports.
        - `src/features/batches/components/wizard/index.ts`: Remove `./Step2Verification` and `./Step3Review` exports.
        - `src/features/batches/components/detail/index.ts` & `src/features/batches/components/list/index.ts`: Remove deleted 1-line modal wrapper exports.
        - `src/features/batches/components/BatchDetail.tsx` & `src/features/batches/components/BatchList.tsx`: Import `DeleteBatchModal` (and `EditMemberModal` in `BatchDetail.tsx`) directly from `./shared`.
        - `src/features/statistics/index.ts`: Remove `GeographicBarChart`, `RecognitionRankingChart`, and `StatusBreakdownCard` exports; add `export * from './components/charts/GroupSummaryTable'`. (Keep `GeographicBreakdownData`, `RecognitionRankingData`, and `StatusBreakdownData` in `statistics/types/` and their `statsCalculators.ts` aggregators untouched because `statsPdfExport.ts` and existing calculator tests still consume them.)
        - `src/features/batches/components/wizard/README.md`, `detail/README.md`, `list/README.md`, `src/features/statistics/README.md`, `src/features/statistics/components/charts/README.md`: Remove deleted component/helper entries and add `GroupSummaryTable` export in `statistics/README.md`.
    *   **Rationale**: Eliminates dangling imports, fixes missing `GroupSummaryTable` barrel export, and keeps feature `README.md` maps accurate.

#### Commit 5 — Migrate `auth` Feature

21. `src/features/auth/components/AuthLayout.tsx`, `src/features/auth/components/PasswordField.tsx`, & `src/features/auth/components/SessionLoadingState.tsx` (**[Create]**)
    *   **Type / Scope**: Auth-local shared UI components.
    *   **Proposed Changes**:
        ```ts
        export interface AuthLayoutProps {
          title: string;
          subtitle: string;
          footerPrompt: string;
          footerLinkLabel: string;
          footerLinkTo: string;
          children: React.ReactNode;
        }
        export interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
          label: string;
          labelAction?: React.ReactNode;
          errorText?: string;
        }
        export interface SessionLoadingStateProps {
          label?: string;
        }
        ```
        - `AuthLayout`: centered `<Card>` + `CHIL_LOGO.png` + `Chil` `font-display` header with `<h1>` title (enforcing one `<h1>` per view per `DESIGN.md`), body slot, and footer `<Link>`.
        - `PasswordField`: `React.forwardRef<HTMLInputElement, PasswordFieldProps>` styled with canonical `Field` tokens (`bg-primary/5`, `border-primary/70`, `border-red-600`, `rounded-field`, sentence-case label, `role="alert"` error text) and toggle button (`aria-label="Ver contraseña"` / `"Ocultar contraseña"`).
        - `SessionLoadingState`: `<output aria-live="polite" aria-label={label ?? 'Cargando sesión'}>` spinner with `text-neutral/75`.
    *   **Rationale**: Eliminates duplicated auth chrome, password-toggle wrappers, and duplicate session-loading spinners.
22. `src/features/auth/components/LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordModal.tsx`, `ProtectedRoute.tsx`, `UserProfileMenu.tsx`, `src/features/auth/index.ts`, `src/App.tsx`, `src/features/auth/README.md`, & `src/features/auth/components/README.md` (**[Modify]**)
    *   **Type / Scope**: Auth pages, app shell root route, and blueprints.
    *   **Proposed Changes**: Migrate `LoginPage` and `RegisterPage` onto `AuthLayout`, `Field`, `PasswordField`, and `ErrorAlert variant="compact"` (removing `getFieldClassName`/`getLabelClassName` duplication and `border-red-300`); replace `ForgotPasswordModal` alert box with `ErrorAlert variant="compact"`; replace duplicated spinners in `ProtectedRoute.tsx` and `src/App.tsx:RootRoute` with `SessionLoadingState` (exported via `src/features/auth/index.ts`); fix `text-neutral/50` and `text-[11px] text-neutral/60` (`L130`) in `UserProfileMenu.tsx` to `text-xs text-neutral/75`; update `auth/README.md` and `auth/components/README.md`.
    *   **Rationale**: Aligns auth forms, contrast, heading semantics, and error alerts with `DESIGN.md`.
23. Auth Unit Tests (**[Create / Modify]**)
    *   `src/features/auth/components/__tests__/PasswordField.test.tsx` (**[Create]**): Verify `'Ver contraseña'` / `'Ocultar contraseña'` toggle, `forwardRef`, and `errorText` `role="alert"`.
    *   `src/features/auth/components/__tests__/LoginPage.test.tsx` & `RegisterPage.test.tsx` (**[Modify]**): Update any heading-level queries if `AuthLayout` uses `<h1>` and verify `ErrorAlert` / `Field` error rendering.
    *   **Rationale**: Covers `PasswordField` and validates `AuthLayout` updates.

#### Commit 6 — Migrate `recognitions` Feature

24. `src/features/recognitions/components/RecognitionCatalog.tsx`, `RecognitionFormModal.tsx`, `RecognitionDeleteModal.tsx`, & `CertificateDesigner.tsx` (**[Modify]**)
    *   **Type / Scope**: Recognitions top-level views and modals.
    *   **Proposed Changes**:
        - `RecognitionCatalog.tsx`: Wrap search bar and table in `<Card>`; adopt `<SearchInput size="sm" onClear={...}>`, `<ErrorAlert variant="inline" onRetry={...}>`, `<DataTable bordered={false}>` + `<Pagination hideWhenEmpty mode="summary" counterFormat="count" itemLabel="reconocimientos">`; add `Toast` `onDismiss` + `toastTimerRef` unmount cleanup; fix `text-neutral/40` / `text-[11px]` (`L209`) to `text-xs text-neutral/75`; keep compact row action buttons (`Plantilla`, `Editar`, `Eliminar`) in place.
        - `RecognitionFormModal.tsx`: Guard `Modal` `onClose` with `() => !loading && onClose()` and replace error box with `<ErrorAlert variant="compact">`.
        - `RecognitionDeleteModal.tsx`: Replace error box with `<ErrorAlert variant="compact">` (`role="alert"`) and confirm button with `<Button variant="destructive">`.
        - `CertificateDesigner.tsx`: Add `role="status"` + `text-neutral/75` to loading state (`L486–493`) and render `<ErrorAlert variant="centered">` (or error card with `role="alert"` and `"Volver al Catálogo"` action) on not-found/load error (`L495–513`).
    *   **Rationale**: Standardizes catalog table/search/error chrome, fixes modal close race, and adds `role="alert"`/`role="status"` accessibility.
25. `src/features/recognitions/components/designer/designerUtils.tsx`, `DesignerHeader.tsx`, `DesignerCanvas.tsx`, `CanvasFormatBar.tsx`, `DraggableField.tsx`, `sidebar/DesignerSidebar.tsx`, `sidebar/FieldPaletteTab.tsx`, `sidebar/FieldPropertiesTab.tsx`, & `sidebar/BackgroundFormatTab.tsx` (**[Modify]**)
    *   **Type / Scope**: Certificate designer components and utilities.
    *   **Proposed Changes**:
        - `designerUtils.tsx`: Add `isScoutsPlanarFont(family)` and `roundPercentCoordinate(value, min = 0, max = 100)` helpers; import them in `DraggableField.tsx` and `FieldPropertiesTab.tsx`.
        - `DesignerHeader.tsx` & `CanvasFormatBar.tsx`: Wrap `DesignerHeader` and `CanvasFormatBar` in `<Card>` (`CardBody padding="sm"`), and remove the duplicate `formatBadgeText` line from `DesignerCanvas.tsx` (`L153`) while keeping `CanvasFormatBar`.
        - `FieldPaletteTab.tsx`, `FieldPropertiesTab.tsx`, `BackgroundFormatTab.tsx`: Replace hand-rolled red/ghost buttons (`"Quitar"`, `"Eliminar del Certificado"`, `"Añadir todos los campos"`, `"Restablecer posiciones"`) with `<Button variant="destructive" size="sm">` or `<Button variant="ghost" size="sm">`; replace `border-gray-200`, `text-neutral/40`/`50`/`60`, and `text-[10px]`/`text-[11px]` across `DesignerSidebar.tsx`, `DesignerCanvas.tsx`, `FieldPaletteTab.tsx`, and `FieldPropertiesTab.tsx` with `border-primary/20`, `text-neutral/75`, and `text-xs`.
    *   **Rationale**: Eliminates hand-rolled buttons, duplicate format readouts, duplicated font/rounding logic, and contrast/sub-`12px` violations.
26. Recognitions Tests & Blueprints (**[Modify]**)
    *   Tests: `src/features/recognitions/components/__tests__/RecognitionCatalog.test.tsx`, `RecognitionFormModal.test.tsx` (add loading close-guard assertion), `RecognitionDeleteModal.test.tsx`, `CertificateDesigner.test.tsx`, and `src/features/recognitions/components/designer/__tests__/DesignerSidebar.test.tsx`.
    *   Blueprints: `src/features/recognitions/components/README.md`, `designer/README.md`, and `designer/sidebar/README.md` (document `designerUtils.tsx` new helpers and `Toast` cleanup).
    *   **Rationale**: Keeps recognitions test suites and blueprints aligned.

#### Commit 7 — Migrate `statistics` Feature

27. `src/features/statistics/components/charts/TerritorialSummaryTable.tsx` (**[Create]**)
    *   **Type / Scope**: Statistics-local shared chart table component.
    *   **Proposed Changes**:
        ```ts
        export interface TerritorialSummaryTableProps {
          title: string;
          icon: React.ReactNode;
          items: readonly GeographicItem[];
          yoyItems?: readonly { id: number | string; name: string; parentName?: string; currentCount: number; previousCount: number; diff: number; percentChange: number | null }[];
          yoyYears?: { currentYear: number; previousYear: number };
          entityLabel: string;
          parentLabel?: string;
          countLabelSingular: string;
          countLabelPlural: string;
          showAllLabel: string;
          accentColor: 'emerald' | 'indigo';
          emptyMessage: string;
        }
        ```
        Wraps content in `<Card>`, centralizes `getProgressColor`, conditionally adds YoY columns instead of duplicating two `<table>` trees, and uses `<Button variant="ghost" size="sm">` for `"Ver todos/todas"` / `"Mostrar menos"`.
    *   **Rationale**: Eliminates 3x duplicated territorial table helpers and Standard vs. YoY `<table>` duplication.
28. `src/features/statistics/components/StatisticsDashboard.tsx`, `FilterBar.tsx`, `StatKpiGrid.tsx`, `charts/RegionSummaryTable.tsx`, `charts/DistrictSummaryTable.tsx`, `charts/GroupSummaryTable.tsx`, `charts/UnitDistributionCard.tsx`, `charts/DemographicsDonut.tsx`, `charts/MonthlyTrendChart.tsx`, & `src/features/statistics/hooks/useStatisticsData.ts` (**[Modify]**)
    *   **Type / Scope**: Statistics dashboard, charts, and hook.
    *   **Proposed Changes**:
        - `StatisticsDashboard.tsx`: Adopt `<ErrorAlert variant="centered">` and fix loading skeleton grid from 5 cards (`lg:grid-cols-5`) to 4 cards (`lg:grid-cols-4`).
        - `FilterBar.tsx`: Wrap in `<Card>`; replace raw `<select>`s with `<Select size="sm">` + `<HierarchyFilterSelects showGroup={false} includeNoAplicaAlways>`; replace custom date inputs with `<Field size="sm">`; replace `"Limpiar filtros"` `<button>` with `<Button variant="outline" size="sm" icon={<RotateCcw ... />}>`.
        - `RegionSummaryTable.tsx`, `DistrictSummaryTable.tsx`, `GroupSummaryTable.tsx`: Thin adapters delegating to `TerritorialSummaryTable`.
        - `StatKpiGrid.tsx`, `UnitDistributionCard.tsx`, `DemographicsDonut.tsx`, `MonthlyTrendChart.tsx`: Wrap all cards in `<Card>`; unify Standard vs. YoY `<table>` trees in `UnitDistributionCard`, `DemographicsDonut`, and `MonthlyTrendChart` via conditional YoY columns; replace `text-[10px]`/`text-[11px]` labels in `MonthlyTrendChart.tsx` (`L476`, `L507`) with `text-xs`.
        - `useStatisticsData.ts`: Delegate district filtering to `getAvailableDistricts` from `src/utils/memberHierarchy.ts`.
    *   **Rationale**: Standardizes all 11 active `statistics` cards, removes duplicated table branches, and fixes the 5-vs-4 KPI skeleton bug.
29. Statistics Tests & Blueprints (**[Modify]**)
    *   Tests: `src/features/statistics/components/__tests__/StatisticsDashboard.test.tsx`, `src/features/statistics/components/charts/__tests__/GroupSummaryTable.test.tsx`, `src/features/statistics/components/charts/__tests__/MonthlyTrendChart.test.tsx`.
    *   Blueprints: `src/features/statistics/components/README.md` (update 5 → 4 KPI skeleton invariant) and `src/features/statistics/components/charts/README.md` (document `TerritorialSummaryTable`).
    *   **Rationale**: Aligns tests and docs with the refactored dashboard and chart tables.

#### Commit 8 — Migrate `summary` Feature

30. `src/features/summary/utils/summaryHelpers.ts` & `src/features/summary/utils/__tests__/summaryHelpers.test.ts` (**[Create]**)
    *   **Type / Scope**: Summary pure utilities and tests.
    *   **Proposed Changes**: Extract `formatBatchDate`, `getMemberTypeLabel`, `getMemberStatusLabel`, `getFilteredSummaryRows`, `SummaryFilterOptions`, and filter-reset helpers from `SummaryView.tsx`; add unit tests for period filters, `'nacional'`/`'0'` territory matching, and search matching.
    *   **Rationale**: Separates pure business/filtering logic from `SummaryView.tsx`'s 1,145-line component file.
31. `src/features/summary/components/SummaryView.tsx`, `src/features/summary/components/__tests__/SummaryView.test.tsx`, `src/features/summary/README.md`, & `src/features/summary/components/README.md` (**[Modify]**)
    *   **Type / Scope**: Summary view, tests, and blueprints.
    *   **Proposed Changes**:
        - `SummaryView.tsx`: Wrap filter bar in `<Card>` and table/pagination in `<Card overflow="visible">`; adopt `<SearchInput size="sm" onClear={...}>`, `<Select size="sm">` (for Recognition, Unit, MemberType, Status, Period), `<HierarchyFilterSelects showGroup>`, `<Field size="sm">` for custom dates, `<Button variant="outline" size="sm" aria-label="Limpiar todos los filtros">` for `"Limpiar filtros"`, `<ErrorAlert variant="inline" onRetry={...}>`, `<DataTable bordered={false}>` + `<Pagination mode="summary" counterFormat="summary-total" itemLabel="registros" pageSizeOptions={[10, 25, 50, 100]}>`, `<MemberStatusBadge>`, and `Toast` `onDismiss` + `toastTimeoutRef` unmount cleanup; preserve existing empty-state copy (`SummaryView.test.tsx:487–490`).
        - `SummaryView.test.tsx`: Update status-badge assertions (`L194–196`) from `'● Registro Válido'`/`'● Emisión Excepcional'`/`'● Registro Inválido'` to canonical `MemberStatusBadge` text.
        - `summary/README.md`, `summary/components/README.md`, & `summary/utils/README.md` (**[Create/Modify]**): Document `summaryHelpers.ts` and `SummaryView` dependencies.
    *   **Rationale**: Eliminates duplicated filter/table/badge UI in `SummaryView` and cleans up toast timers.

#### Commit 9 — Migrate `batches` Shared, Wizard, & Success Components

32. `src/features/batches/components/shared/memberColumns.tsx` (**[Create]**)
    *   **Type / Scope**: Batches-local shared TanStack cell helpers.
    *   **Proposed Changes**: Export `renderMemberIdentityCell`, `renderMemberNameCell`, `renderMemberUnitCell`, `renderMemberTypeCell`, `renderMemberStatusCell` (using `<MemberStatusBadge />`), and `renderMemberCodeCell` (`text-primary` mono code styling), shared by `batchDetailColumns.tsx` and `SuccessPage.tsx`.
    *   **Rationale**: Eliminates 5 duplicated column cell renderers between `batchDetailColumns.tsx` and `SuccessPage.tsx`.
33. `src/features/batches/components/shared/DeleteBatchModal.tsx`, `EditMemberModal.tsx`, `ManualMemberModal.tsx`, `wizard/Step1DataLoad.tsx`, `wizard/Step2ReviewConfirm.tsx`, `wizard/ScraperAlertModals.tsx`, `NewBatchWizard.tsx`, & `SuccessPage.tsx` (**[Modify]**)
    *   **Type / Scope**: Batches shared modals, wizard, and post-creation page.
    *   **Proposed Changes**:
        - `DeleteBatchModal.tsx`: Use `<Button variant="destructive">`.
        - `EditMemberModal.tsx` & `ManualMemberModal.tsx`: Replace hand-rolled exceptional-reason `<textarea>` in `EditMemberModal.tsx` (`L424–441`) with `<Field multiline rows={3} className="border-purple-600 ...">`; replace raw `<select>`s with `<Select>` and `<MemberHierarchySelects>` (`hideWhenEmpty`, `Región Scout` / `Distrito Scout` / `Grupo Scout` labels, `0` sentinel); keep existing `window.alert` validation behavior per `SharedModals.test.tsx:226`.
        - `Step1DataLoad.tsx`: Replace comment `<input>` with `<Field>`, recognition `<select>` with `<Select {...register('recognitionType')}>`, fix `border-primary/20` / `text-red-500` to `border-primary/70` / `text-red-700`, and preserve `<CardHeader>` direct-sibling structure (`Step1DataLoad.test.tsx:28–30`).
        - `Step2ReviewConfirm.tsx`: Adopt `<SearchInput size="sm">`, `<DataTable bordered={false} emptyState={...}>` (eliminating the second dashed empty box underneath `<Table>`), `<MemberStatusBadge solventUntil={member.is_solvent || member.status === 'active' ? member.solvent_until : undefined}>` (mapping `active`/`exceptional`/`pending` to canonical §6 labels), and fix `text-neutral/40`/`50`/`60` contrast.
        - `ScraperAlertModals.tsx`: Add `role="alert"` (or `<ErrorAlert variant="compact">`) on `L68`.
        - `NewBatchWizard.tsx`: Add `Toast` `onDismiss` and `toastTimeoutRef` unmount cleanup.
        - `SuccessPage.tsx`: Wrap summary table in `<Card><CardHeader>`, adopt `<DataTable bordered={false}>`, reuse `memberColumns.tsx`, add `Toast` `onDismiss` + `toastTimeoutRef` cleanup, add `role="alert"` on `!batch` state, and fix `text-neutral/50`/`70` contrast.
    *   **Rationale**: Standardizes shared batch modals, wizard steps, and `SuccessPage`, and resolves `Step2ReviewConfirm`'s double empty state.
34. Batches Shared/Wizard/Success Tests & Blueprints (**[Modify]**)
    *   Tests: `src/features/batches/components/__tests__/Step1DataLoad.test.tsx`, `src/features/batches/components/__tests__/Step2ReviewConfirm.test.tsx` (update status-label assertions if normalized to `Registro Válido` / `Emisión Excepcional` / `Registro Inválido` while preserving `Solvente hasta ...`), `src/features/batches/components/__tests__/SuccessPage.test.tsx`, and `src/features/batches/components/shared/__tests__/SharedModals.test.tsx`.
    *   Blueprints: `src/features/batches/components/shared/README.md` (`memberColumns.tsx`) and `src/features/batches/components/wizard/README.md`.
    *   **Rationale**: Keeps tests and blueprints aligned after wizard/modal migration.

#### Commit 10 — Migrate `batches` List & Detail Views and Retire `Table.tsx`

35. `src/features/batches/components/BatchList.tsx`, `BatchDetail.tsx`, `detail/BatchDetailHeader.tsx`, `detail/BatchMembersTable.tsx`, `detail/MemberQuickViewModal.tsx`, `detail/ScopedExportSplitButton.tsx`, `detail/BatchTerritorialCard.tsx`, `detail/batchDetailColumns.tsx`, `list/AddFilterModal.tsx`, & `list/MergeBatchesModal.tsx` (**[Modify]**)
    *   **Type / Scope**: Batches list and detail views.
    *   **Proposed Changes**:
        - `BatchList.tsx`: Wrap table/footer in `<Card overflow="visible">`, adopt `<ErrorAlert variant="inline" onRetry={...}>`, `<DataTable bordered={false} scrollContainerClassName="min-h-[260px] pb-12">`, `<Pagination mode="summary" counterFormat="count" itemLabel="lotes">`, and `Toast` `onDismiss` + `toastTimeoutRef` cleanup.
        - `BatchDetail.tsx` & `detail/BatchDetailHeader.tsx`: Adopt `<ErrorAlert variant="centered" onRetry={...}>` (plus `role="alert"` on `!batch`), replace `bg-[#5c371d]` in `BatchDetailHeader` with `bg-primary`, and use `<Button variant="destructive">` for `"Eliminar Lote"`.
        - `detail/BatchMembersTable.tsx`: Wrap in `<Card overflow="visible">`, adopt `<SearchInput size="sm">`, `<DataTable bordered={false} scrollContainerClassName="min-h-[260px] pb-12">`, and `<Pagination mode="numbered" counterFormat="range" itemLabel="miembros">`.
        - `detail/batchDetailColumns.tsx` & `detail/MemberQuickViewModal.tsx`: Re-export/use `memberColumns.tsx` and `<MemberStatusBadge />` (removing `●` glyphs); fix `text-neutral/60`/`70` in `MemberQuickViewModal`, `ScopedExportSplitButton`, and `BatchTerritorialCard` (`L142`) to `text-neutral/75`.
        - `list/AddFilterModal.tsx` & `list/MergeBatchesModal.tsx`: Adopt `<Select>` in `AddFilterModal` (retaining `id:<n>`/`no_scout` keys and `border-primary/70`), `<Field multiline rows={3}>` and `<ErrorAlert variant="compact">` (`role="alert"`) in `MergeBatchesModal`.
    *   **Rationale**: Completes Tier 1/Tier 2 adoption across `BatchList` and `BatchDetail`.
36. Retire Legacy `Table.tsx` (**[Delete / Modify]**)
    *   `src/components/Table.tsx` (**[Delete]**)
    *   `src/components/__tests__/Table.test.tsx` (**[Delete]**)
    *   `src/components/index.ts` (**[Modify]**): Remove `export * from './Table'`.
    *   **Rationale**: Removes the monolithic `Table.tsx` primitive once zero callers remain.
37. Batches List/Detail Tests & Blueprints (**[Modify]**)
    *   Tests: `src/features/batches/components/__tests__/BatchList.test.tsx`, `src/features/batches/components/__tests__/BatchDetail.test.tsx` (update lines `837` and `969` from `'● Registro Inválido'` / `'● Emisión Excepcional'` to canonical `MemberStatusBadge` text), and `src/features/batches/components/list/__tests__/MergeBatchesModal.test.tsx`.
    *   Blueprints: `src/features/batches/components/README.md`, `detail/README.md`, and `list/README.md`.
    *   **Rationale**: Verifies `BatchList`, `BatchDetail`, and modal updates and keeps docs synchronized.

### Verification Plan

#### 1. Per-Commit Automated Gate (`Commits 1–10`)
Run after every commit and require 0 errors/warnings and 0 skipped or failing tests:
```bash
npm run lint && npm run build && npm test -- --run
```

#### 2. Commit-Specific Automated Audits
*   **Commit 1 (`docs/DESIGN.md`)**: Verify `spec.md` rules—single occurrence of each of the 10 standard `##` headings, single occurrence of each top-level YAML key (`colors`, `typography`, `spacing`, `rounded`, `motion`, `components`), and zero `@../` external references (`grep -n '@\.\./' docs/DESIGN.md` returns no matches).
*   **Commit 3 (`src/components/` isolation)**: Confirm zero imports from features, domain, context, types, or utils inside `src/components/`:
    ```bash
    grep -rnE "from '.*(features|domain|context|types|utils)/" src/components/
    ```
*   **Commit 4 & Commit 10 (Dead-code removal)**: Confirm zero remaining imports/references to deleted components:
    ```bash
    grep -rnE "SearchSelectorModal|FloatingTableScrollbar|Navbar|Step2Verification|Step3Review|GeographicBarChart|RecognitionRankingChart|StatusBreakdownCard" src/ docs/DESIGN.md
    grep -rnE "from '.*components/Table'|from '\./Table'" src/
    ```

#### 3. Post-Migration Manual UI Verification (After Commit 10)
Inspect `/login`, `/registro`, `/lotes`, `/lotes/nuevo`, `/lotes/:id`, `/lotes/exito`, `/reconocimientos`, `/reconocimientos/:id/plantilla`, `/resumen`, and `/estadisticas` at desktop (`1280px`), mobile (`375px`), and `200%` browser zoom:
*   Verify all `'md'` forms/modals and `'sm'` filter bars share `bg-primary/5`, `border-primary/70`, and sentence-case labels with no overflow or clipping at `200%` zoom.
*   Trigger row action dropdowns on the bottom rows of `/lotes` and `/lotes/:id` to verify menus are not clipped by `<Card overflow="visible">` or `pb-12`.
*   Trigger network/validation errors across views and modals to verify `ErrorAlert` (`inline`, `centered`, `compact`) alignment and `Reintentar` recovery.
*   Verify modal scroll behavior on `375px` mobile across `EditMemberModal`, `ManualMemberModal`, `AddFilterModal`, and `DeleteBatchModal`.

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
