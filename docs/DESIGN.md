---
version: alpha
name: Chil Design System
description: Visual, accessibility, and token specification for Chil (Scout recognition batch-management SPA and generated PDF reports).
---

# Chil Design System

## Overview

Chil is a Scout recognition batch-management web application (`<html lang="es">`) paired with generated PDF reports and certificate exports. The interface balances warm terracotta and parchment Scout identity with high-contrast, utilitarian controls across dense tables, multi-step batch verification, analytics dashboards, and a WYSIWYG certificate designer.

All authenticated surfaces (`auth`, `batches`, `recognitions`, `statistics`, `summary`, and the shared navigation shell) follow flat `1px`-bordered tonal layers over a warm off-white canvas (`bg-primary/5`). The public marketing landing page (`src/features/landing/`) intentionally uses bespoke scroll-driven visuals and dark-surface links outside this authenticated control contract.

## Colors

The palette pairs Scout Terracotta (`primary`) and Warm Parchment (`secondary`) with high-contrast Warm Charcoal (`neutral`) copy on white card surfaces. Interactive boundaries (`border-primary/70`, `border-gray-500`) maintain at least `3.0:1` non-text contrast, while normal copy and muted labels maintain at least `4.5:1` contrast.

```yaml
colors:
  primary: "#8C4E37"
  on-primary: "#FFFFFF"
  primary-surface: "#F9F6F5"
  primary-wash: "#F4EDEA"
  primary-border: "#AF8373"
  primary-hairline: "#E8DCD7"
  secondary: "#F1EAD8"
  on-secondary: "#8C4E37"
  tertiary: "#6CB7DE"
  on-tertiary: "#383836"
  neutral: "#383836"
  neutral-muted: "#6A6A68"
  surface: "#FFFFFF"
  surface-canvas: "#F9F6F5"
  surface-warm: "#FAF8F5"
  border-outline: "#6B7280"
  border-subtle: "#E5E7EB"
  destructive: "#B91C1C"
  destructive-hover: "#991B1B"
  on-destructive: "#FFFFFF"
  error-surface: "#FEF2F2"
  error-border: "#FECACA"
  error-input-border: "#DC2626"
  error-text: "#B91C1C"
  success-surface: "#ECFDF5"
  success-border: "#A7F3D0"
  success-text: "#065F46"
  warning-surface: "#FFFBEB"
  warning-border: "#FDE68A"
  warning-text: "#78350F"
  hero-espresso: "#2E1208"
  hero-badge: "#643425"
  chart:
    sky-fill: "#0284C7"
    sky-text: "#0369A1"
    sky-dark: "#0C4A6E"
    amber-fill: "#F59E0B"
    amber-text: "#78350F"
    slate-fill: "#CBD5E1"
    slate-outline: "#64748B"
    emerald-high: "#059669"
    emerald-mid: "#10B981"
    emerald-low: "#34D399"
    indigo-high: "#4F46E5"
    indigo-mid: "#6366F1"
    indigo-low: "#818CF8"
  status:
    active-surface: "#ECFDF5"
    active-border: "#A7F3D0"
    active-text: "#065F46"
    exceptional-surface: "#FAF5FF"
    exceptional-border: "#E9D5FF"
    exceptional-text: "#6B21A8"
    pending-surface: "#FFF1F2"
    pending-border: "#FECDD3"
    pending-text: "#9F1239"
```

### Brand & Neutral Contrast Rules

- **Primary (`#8C4E37`)**: Primary actions with `#FFFFFF` ink (`6.44:1`), text on white (`6.44:1`), on `bg-primary/5` (`#F9F6F5`, `5.99:1`), on `bg-primary/10` (`#F4EDEA`, `5.57:1`), and on `secondary` (`#F1EAD8`, `5.37:1`).
- **Secondary (`#F1EAD8`)**: Warm Parchment fill paired strictly with `primary` (`5.37:1`) or `neutral` text.
- **Tertiary (`#6CB7DE`)**: Light Scout Sky accent background paired strictly with `neutral` (`5.30:1`), never white text (`2.22:1` fail). For blue text on white, use `text-sky-700` (`#0369A1`, `5.93:1`) rather than `text-sky-600` (`4.10:1`).
- **Muted Text Floor (`>= 4.5:1`)**: Minimum allowed muted copy is `text-neutral/75` (`>= 4.97:1` on `#F9F6F5` and `> 5.0:1` on `#FFFFFF`). `text-neutral/70` (`4.68:1` on white, `4.36:1` on `#F9F6F5`), `text-neutral/60` (`3.55:1`), `text-neutral/50` (`2.75:1`), `text-neutral/40`, and `placeholder-primary/40` (`1.87:1`) are forbidden for normal text; use `placeholder:text-neutral/75`.
- **Interactive Control Surface (`bg-primary/5`)**: All `'sm'` and `'md'` inputs, selects, and search fields unify on `bg-primary/5` (`#F9F6F5`) with `border-primary/70` (`3.32:1`). `#FAF8F5` is reserved for static warm table accents and PDF surfaces.
- **Destructive Actions (`#B91C1C`)**: `Button variant="destructive"` uses `bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700` (`6.47:1` white-on-red contrast).

### Scout Units Palette

Defined in [member.ts](../src/types/member.ts), [UnitDistributionCard.tsx](../src/features/statistics/components/charts/UnitDistributionCard.tsx), and [statsPdfExport.ts](../src/features/statistics/utils/statsPdfExport.ts):

| Unit | Web Pill Classes (AA Text) | Solid / PDF Color |
| :--- | :--- | :--- |
| **Manada** | `bg-amber-50 text-amber-700 border-amber-200` (`4.84:1`) | `amber-500` / `[245, 158, 11]` |
| **Tropa** | `bg-emerald-50 text-emerald-700 border-emerald-200` (`5.21:1`) | `emerald-500` / `[16, 185, 129]` |
| **Caminantes** | `bg-blue-50 text-blue-700 border-blue-200` (`6.16:1`) | `blue-500` / `[59, 130, 246]` |
| **Clan** | `bg-red-50 text-red-700 border-red-200` (`5.91:1`) | `red-500` / `[239, 68, 68]` |
| **Institucional** | `bg-purple-50 text-purple-700 border-purple-200` (`6.51:1`) | `purple-500` / `[168, 85, 247]` |
| **No scout** | `bg-slate-100 text-slate-700 border-slate-300` (`9.45:1`) | `slate-400` / `[148, 163, 184]` |

### Member Validation Status Palette

Canonical domain status styles live in `MemberStatusBadge` (`src/domain/components/MemberStatusBadge.tsx`) and [batchReports.ts](../src/features/batches/api/batchReports.ts):

- **Registro Válido (`active`)**: `bg-emerald-50 text-emerald-800 border-emerald-200` with `CheckCircle2` (`aria-hidden="true"`); Batch PDF `[40, 167, 69]`.
- **Emisión Excepcional (`exceptional`)**: `bg-purple-50 text-purple-800 border-purple-200` with `AlertTriangle` (`aria-hidden="true"`); PDF `[126, 34, 206]`.
- **Registro Inválido (`pending`)**: `bg-rose-50 text-rose-800 border-rose-200` with `XCircle` (`aria-hidden="true"`); Batch PDF `[220, 53, 69]`.

### Recognition Type Badges

Keyword-mapped pills in `recognitionMetadata.ts`: **Plástico/Marea** (`sky-100`/`sky-800`), **Tribu/Tierra** (`#e9e7db`/`#5e5c46`, `5.47:1`), **Campeones/Naturaleza** (`#fee2d8`/`#9a3412`, `5.94:1`), **Go Solar & Servicio** (`amber-100`/`amber-800|amber-900`), **Promesa & Madera** (`blue-100`/`blue-800`), **Mérito** (`emerald-100`/`emerald-800`), and **Default** (`bg-primary/10 text-primary border-primary/20`, `5.57:1`).

### Statistics Chart Palettes

- **Non-Text Chart Contrast & Keyboard Parity**: Because light chart fills (`#CBD5E1` `1.48:1`, `#F59E0B` `2.15:1`, `#34D399` `1.92:1`, `#10B981` `2.54:1`, `#94A3B8` `2.56:1`) fall below `3.0:1` on white surfaces, pair every graphic segment with high-contrast text values (`>= 4.5:1`) and apply `stroke="#64748b"` (`4.76:1`) on `slate-300` comparative bars ([MonthlyTrendChart.tsx](../src/features/statistics/components/charts/MonthlyTrendChart.tsx)). Interactive bar `<g>` groups mirror `onMouseEnter`/`onMouseLeave` with `onFocus`/`onBlur`.
- **Monthly Trend Bars**: Current year `sky-600` (`#0284C7`, hover `#0E7490`) vs. previous year `slate-300` (`#CBD5E1` with `#64748B` outline), gridlines `slate-100` (`#F1F5F9`), YoY vertical dividers `slate-200` (`#E2E8F0`, dashed `3 3`).
- **Demographics Donut**: **Jóvenes** `sky-600` (`#0284C7` / `[2, 132, 199]`) vs. **Adultos** `amber-500` (`#F59E0B` / `[245, 158, 11]`), paired with `sky-900`/`amber-900` tabular percentages.
- **Territory Ranking Bars**: Region/District (`emerald-{600,500,400}`); Scout Group (`indigo-{600,500,400}`).

### Certificate Designer Presets

`PRESET_COLORS` in [designerUtils.tsx](../src/features/recognitions/components/designer/designerUtils.tsx): Verde Scout (`#1B7A37`, `5.40:1`), Terracota (`#8C4E37`, `6.44:1`), Azul Marino (`#1E3A8A`), Rojo Carmesí (`#B91C1C`, `6.47:1`), Negro Carbón (`#111827`), Gris Oscuro (`#4B5563`, `7.56:1`).

## Typography

Headings (`h1`–`h6`) and brand wordmarks use `"Scouts GT Planar"` (`--font-display`), while body copy, forms, and tables use `"Noto Sans"` (`--font-sans`). Generated PDF reports use built-in `helvetica` (`statsPdfExport.ts`, `batchReports.ts`).

```yaml
typography:
  display-hero:
    fontFamily: "Scouts GT Planar"
    fontSize: 72px
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: -0.02em
  page-title:
    fontFamily: "Scouts GT Planar"
    fontSize: 30px
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: -0.02em
  section-heading:
    fontFamily: "Scouts GT Planar"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: -0.01em
  body-md:
    fontFamily: "Noto Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Noto Sans"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: "Noto Sans"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
  label-sm:
    fontFamily: "Noto Sans"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.35
  table-header:
    fontFamily: "Noto Sans"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: 0.05em
  mono-sm:
    fontFamily: "monospace"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
```

### Document Shell, Landmarks & Scale Floor

- **Document Language & Landmarks**: [index.html](../index.html) declares `<html lang="es">`. [MainLayout.tsx](../src/layouts/MainLayout.tsx) renders `<a href="#main-content" className="skip-link">Saltar al contenido principal</a>` before navigation, targeting `<main id="main-content" tabIndex={-1}>`. Each view renders a single `<h1>` without skipped heading levels (`h1` → `h2` → `h3`).
- **Minimum Size Floor (`>= 12px`)**: All readable secondary labels, badges, chart annotations, and controls must use `>= 0.75rem` (`text-xs` / `12px`). Sub-`12px` pixel utilities (`text-[10px]`, `text-[11px]`) are forbidden in authenticated views.
- **200% Zoom Reflow**: Text wrappers must not clip content via fixed pixel heights paired with `overflow-hidden` at `200%` browser zoom. Where `truncate` is used on long strings (KPI titles), preserve full text on detail views or accessible titles.

## Layout

Authenticated routes render inside [MainLayout.tsx](../src/layouts/MainLayout.tsx) over `bg-primary/5`, pairing a collapsible `Sidebar` rail on `md+` (mobile drawer on `< md`) with a scrollable main content area (`p-4 sm:p-6 lg:p-8`). Content grouping uses white `Card` surfaces (`rounded-2xl border-primary/20`) with `24px` (`p-6`) standard padding and `16px` (`p-4`) compact padding.

```yaml
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  card-padding-md: 24px
  card-padding-sm: 16px
  control-pad-y-md: 10px
  control-pad-x-md: 16px
  control-pad-y-sm: 8px
  control-pad-x-sm: 12px
```

### Control Density Scale (`'md' | 'sm'`)

- **Standard Scale (`'md'`)**: Default for auth pages, batch creation/editing forms, and modals (`py-2.5 px-4 text-sm rounded-field` on inputs/selects; `h-10 px-4 text-sm rounded-xl` on buttons; `text-sm font-semibold` labels).
- **Compact Scale (`'sm'`)**: Strictly for dense filter toolbars, table search bars, pagination selectors, and designer sidebars (`py-2 px-3 text-xs rounded-lg` on inputs/selects/search fields; `h-8 px-3 text-xs rounded-lg` on buttons; `text-xs font-semibold` labels). Both scales share `bg-primary/5` and `border-primary/70`.

### Wide-Table Overflow & Dropdown Clearance

- Wide data tables (`BatchList`, `BatchMembersTable`, `SummaryView`) rely on native `overflow-x-auto` containers inside `<Card>` (`overflow-hidden` clips inner corners cleanly to `rounded-2xl`). Tables with inline 3-dot row action menus preserve `min-h-[260px] pb-12` scroll container clearance inside `overflow-x-auto` so bottom-row menus fit without clipping.

## Elevation & Depth

Visual hierarchy relies on **tonal layers and flat `1px` borders** rather than drop shadows. Authenticated content sits on `#FFFFFF` cards over the `#F9F6F5` (`bg-primary/5`) canvas. Shadows (`shadow-lg`, `shadow-xl`) are reserved strictly for floating overlays: dropdown menus (`UserProfileMenu`, `ScopedExportSplitButton`, table row action menus), fixed toasts (`Toast`), and chart hover tooltips (`MonthlyTrendTooltip`).

- **Interactive Control Borders (`>= 3.0:1`)**: All inputs, textareas, selects, search fields, and `outline` buttons must maintain `>= 3.0:1` border contrast against adjacent surfaces (`border-primary/70` `#AF8373` = `3.32:1` on white; `border-gray-500` `#6B7280` = `4.83:1` on white; `border-red-600` on error inputs).
- **Container Hairlines**: `border-primary/20` (`1.34:1`) is permitted only on non-interactive layout containers (`Card`, `DataTable`, `Modal` shells) that rely on `#FFFFFF` separation over `#F9F6F5`, never as the sole border of interactive inputs, selects, or outline buttons.

## Shapes

Corner radii differentiate control densities (`sm` vs. `md`) from enclosing containers (`Card`, `DataTable`, `Modal`) and semantic badges.

```yaml
rounded:
  delta: 6px
  sm: 8px
  md: 12px
  field: 12px
  lg: 16px
  full: 9999px
```

- `rounded-md` (`6px`): YoY variation delta chips (`YoYVariationBadge`).
- `rounded-lg` (`8px`): `'sm'` buttons, `'sm'` `Field`, `'sm'` `Select`, and `'sm'` `SearchInput`.
- `rounded-field` / `rounded-xl` (`12px`): `'md'` `Field`, `'md'` `Select`, `'md'` `SearchInput`, and `'md'`/`'lg'` `Button`.
- `rounded-2xl` (`16px`): `Card`, `DataTable`, `Modal`, and `Toast`.
- `rounded-full` (`9999px`): Status pills (`MemberStatusBadge`), Scout unit pills, and walkthrough help triggers.

## Motion & Micro-interaction

Motion in [index.css](../src/index.css) is utilitarian and short: interactive state changes complete cleanly, modal backdrops and dialogs animate in (`200ms`) and out (`150ms`), and toast alerts slide upward (`240ms`). Ambient landing animations (`topoDrift`, `heroRiseIn`, `cardDeal`, `marqueeLeft`, `marqueeRight`) apply only inside `src/features/landing/`.

```yaml
motion:
  state-change:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.4, 0, 0.2, 1)
  surface-enter:
    duration: 200ms
    delay: 0ms
    timingFunction: cubic-bezier(0.16, 1, 0.3, 1)
  surface-exit:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.4, 0, 1, 1)
  toast-enter:
    duration: 240ms
    delay: 0ms
    timingFunction: cubic-bezier(0.16, 1, 0.3, 1)
```

- **Reduced Motion**: `@media (prefers-reduced-motion: reduce)` in `src/index.css` disables all `.animate-*` classes, sets `scroll-behavior: auto`, and collapses transition durations to `0.01ms`.

## Voice & Content Strategy

- **Language & Tone**: All user-facing labels, validation hints, modals, empty states, and error alerts are written in **Spanish** with clear, direct, administrative phrasing. Avoid vague placeholders or ungrounded filler.
- **Capitalization**: Use natural **sentence case** (or title case on short noun labels) across all headings, buttons, menu items, form `<label>`s, and filter `<label>`s so Spanish accents and word shapes remain clear. Restrict `uppercase tracking-wider` strictly to short table column headers (`<th>`).
- **Terminology**: Use consistent domain terms across every feature: `Lote` (not `Grupo de envío`), `Miembro` (not `Usuario` for Scout recipients), `Reconocimiento`, `Región`, `Distrito`, `Grupo Scout`, and canonical validation labels `Registro Válido`, `Emisión Excepcional`, and `Registro Inválido` (preserving `Solvente hasta <fecha>` in Step 2 batch review when solvency metadata exists).
- **Button & Action Labels**: Use explicit verb-object phrases naming the outcome (`"Crear Reconocimiento"`, `"Guardar Cambios"`, `"Eliminar Lote"`, `"Limpiar filtros"`, `"Reintentar"`), avoiding ambiguous `"OK"` or `"Enviar"`.
- **Mandatory Data-View States (Non-Color Feedback)**: Every data view (`BatchList`, `BatchDetail`, `SummaryView`, `StatisticsDashboard`, `RecognitionCatalog`) must combine text with an icon or recovery action:
  - **Loading**: Spanish status text (`Cargando...`) or skeleton matching the loaded grid (e.g., 4 KPI cards in `StatisticsDashboard`) with `role="status"` and `aria-busy="true"`.
  - **Empty**: Explicit Spanish explanation inside `DataTable`'s single `emptyState` slot distinguishing empty datasets from active filter mismatches, paired with a clear recovery action (`Limpiar filtros` or creation CTA). Never stack a second empty box outside `DataTable`.
  - **Error & Feedback Routing**: Field validation errors render inline via `Field`/`Select` `errorText` (`role="alert"`); in-form/modal mutation failures render `<ErrorAlert variant="compact">`; view-level recoverable failures render `<ErrorAlert variant="inline" onRetry={...}>` when page chrome remains visible or `<ErrorAlert variant="centered" onRetry={...}>` when initial view load fails; transient success/warning outcomes render `Toast` with `onDismiss` and unmount timeout cleanup.
- **Numbers, Dates & Identifiers**: Format batch codes as `LT-YYYY-id` in monospace (`font-mono`), display member identities and recognition codes in `font-mono`, and format display dates in Spanish locale (`es-ES`) or ISO `YYYY-MM-DD` when showing solvency expiration dates.

## Components

Domain-agnostic UI primitives live in `src/components/` with zero imports from `src/features/`, `src/domain/`, `src/types/`, `src/utils/`, or `src/context/`. Cross-feature Scout-domain widgets (`MemberStatusBadge`, `HierarchyFilterSelects`, `MemberHierarchySelects`) and relocated app-shell navigation (`Sidebar`, `ScraperSettingsModal`) live in `src/domain/components/`.

```yaml
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.control-pad-x-md}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.md}"
    padding: "{spacing.control-pad-x-md}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: "{spacing.control-pad-x-md}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.on-destructive}"
    rounded: "{rounded.md}"
    padding: "{spacing.control-pad-x-md}"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding-md}"
  field-md:
    backgroundColor: "{colors.primary-surface}"
    textColor: "{colors.neutral}"
    typography: "{typography.body-md}"
    rounded: "{rounded.field}"
  field-sm:
    backgroundColor: "{colors.primary-surface}"
    textColor: "{colors.neutral}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
  select-md:
    backgroundColor: "{colors.primary-surface}"
    textColor: "{colors.neutral}"
    typography: "{typography.body-md}"
    rounded: "{rounded.field}"
  select-sm:
    backgroundColor: "{colors.primary-surface}"
    textColor: "{colors.neutral}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
  search-input-sm:
    backgroundColor: "{colors.primary-surface}"
    textColor: "{colors.neutral}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
  error-alert-inline:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.error-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
  data-table-header:
    backgroundColor: "{colors.primary-wash}"
    textColor: "{colors.neutral}"
    typography: "{typography.table-header}"
  modal-dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
  toast-success:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
```

### Tier 1 Primitives (`src/components/`)

| Primitive | Visual & Behavioral Contract |
| :--- | :--- |
| [Button.tsx](../src/components/Button.tsx) | `React.forwardRef` `<button>`. Variants: `primary`, `secondary`, `outline` (`border-gray-500`), `ghost`, `destructive` (`bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700`). Sizes `sm` (`h-8 px-3 text-xs rounded-lg`), `md` (`h-10 px-4 text-sm rounded-xl`), `lg` (`h-12 px-6 rounded-xl`). Icons wrapped with `aria-hidden="true"`. |
| [Card.tsx](../src/components/Card.tsx) | `rounded-2xl border border-primary/20 bg-white` with `overflow?: 'hidden' | 'visible'` (defaults to `'hidden'` so `rounded-2xl` clips nested `DataTable` and `Pagination` corners cleanly); `CardHeader` (`border-b border-primary/10`); `CardBody` (`padding?: 'md' | 'sm' | 'none'`); `CardFooter` (`bg-primary/10 border-t border-primary/10`). |
| [Field.tsx](../src/components/Field.tsx) | `React.forwardRef` `<input>` or `<textarea>` (`multiline`). Fallback `id` uses `React.useId()` when `id` is omitted. Supports `size?: 'md' | 'sm'` with `bg-primary/5`, `border-primary/70`, `placeholder:text-neutral/75`, sentence-case `<label>`, `aria-invalid`, `aria-describedby`, and `role="alert"` `errorText`. |
| `Select.tsx` | `React.forwardRef` `<select>` supporting `label?`, `aria-label`, `size?: 'md' | 'sm'`, `variant?: 'default' | 'error'`, `errorText`, `bg-primary/5`, and `border-primary/70` (`border-red-600` on error). Compatible with `react-hook-form` `register()`. |
| `SearchInput.tsx` | `React.forwardRef` search `<input>` with leading `<Search aria-hidden="true" />`, `bg-primary/5 border-primary/70`, `size?: 'sm' | 'md'`, and conditional clear `<button type="button" aria-label="Limpiar búsqueda">` rendered when `Boolean(value) && Boolean(onClear)`. |
| `ErrorAlert.tsx` | Always renders `role="alert"` with `<AlertCircle aria-hidden="true" />` in `text-red-700` over `bg-red-50 border-red-200`. Variants: `inline` (horizontal banner + optional `outline sm` retry button), `centered` (centered state card + optional `primary` retry button), and `compact` (dense form/modal alert). |
| `DataTable.tsx` & `Pagination.tsx` | Inverted stateless table chrome accepting a parent-managed TanStack `Table<TData>` instance, `bordered?: boolean` (`false` when nested in `Card`), `scrollContainerClassName`, `loading` precedence over `emptyState`, and `"No hay datos disponibles."` fallback. `Pagination` supports `mode: 'summary' | 'numbered'`, `counterFormat: 'summary-total' | 'count' | 'range'`, optional `pageSize` `<Select size="sm" aria-label="Selector de filas por página">`, `"Página anterior"`/`"Página siguiente"` buttons, and `hideWhenEmpty`. |
| [Modal.tsx](../src/components/Modal.tsx) | `bg-neutral/50 backdrop-blur-xs` overlay; `<dialog open tabIndex={-1} aria-modal="true">` (`border-primary/20 rounded-2xl`); document-level `Escape`, `Tab`/`Shift+Tab` trap, focus restoration, and `ModalHeader` close icon `aria-hidden="true"`. |
| [Toast.tsx](../src/components/Toast.tsx) | Fixed top-right notification (`success`: `bg-neutral`, `role="status"`, `aria-live="polite"`; `warning`: `bg-amber-900 border-amber-600`; `error`: `bg-red-900 border-red-700`, `role="alert"`, `aria-live="assertive"`). Callers must pass `onDismiss` and clear unmount timeouts. |
| `walkthrough/` | Spotlight overlay (`WalkthroughOverlay`), positioned dialog (`WalkthroughDialog`), and `?` trigger (`WalkthroughHelpButton`). |

### Tier 2 Shared Domain Components (`src/domain/components/`)

- **`MemberStatusBadge`** (`src/domain/components/MemberStatusBadge.tsx`): Renders canonical Member Validation Status pills (`emerald`/`purple`/`rose` + `CheckCircle2`/`AlertTriangle`/`XCircle`) with optional `solventUntil` (`Solvente hasta ...`) and `labelOverride`.
- **`HierarchyFilterSelects`** (`src/domain/components/HierarchyFilterSelects.tsx`): String-keyed Region / District / optional Group cascading filters built on `<Select size="sm">` with `aria-label="Filtrar por región"|"Filtrar por distrito"|"Filtrar por grupo"`.
- **`MemberHierarchySelects`** (`src/domain/components/MemberHierarchySelects.tsx`): Numeric-ID (`0 | number`) Region / District / Group selectors built on `<Select>` with upward parent resolution (`resolveParentHierarchyForSelection`).
- **`navigation/`** (`Sidebar.tsx`, `ScraperSettingsModal.tsx`): App-shell navigation rail (`border-r border-gray-200`, active link `bg-primary/10 text-primary border-primary/20`, mobile `role="dialog"` with focus trap) and server-encrypted Impeesa session settings modal.

### Interaction Affordances & Web-to-PDF Congruency

- **Base Cursor & Focus**: `src/index.css` sets `cursor: pointer` on enabled interactive elements (`cursor: not-allowed` on `:disabled` / `[aria-disabled="true"]`) and global `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }`.
- **Report Branding Parity**: [batchReports.ts](../src/features/batches/api/batchReports.ts) and [statsPdfExport.ts](../src/features/statistics/utils/statsPdfExport.ts) share `--color-primary` (`[140, 78, 55]`), `--color-neutral` (`[56, 56, 54]`), and warm header fills (`[244, 237, 234]`).

## Do's and Don'ts

- **Do** use `Button`, `Card`, `Field`, `Select`, `SearchInput`, `ErrorAlert`, `DataTable`, `Pagination`, `Modal`, and `Toast` from `src/components/` and `MemberStatusBadge` / hierarchy selects from `src/domain/components/` across all authenticated features.
- **Do** keep `src/components/` strictly free of imports from `src/features/`, `src/domain/`, `src/types/`, `src/utils/`, and `src/context/`.
- **Do** use `border-primary/70` (`>= 3.0:1`) and `bg-primary/5` across every `'sm'` and `'md'` input, select, and search field, and keep all text at `>= 12px` (`text-xs`) and `>= 4.5:1` contrast (`text-neutral/75` floor).
- **Do** use `Button variant="destructive"` solely for irreversible delete/remove actions, and `Button variant="outline"` for reversible toolbar resets such as `"Limpiar filtros"`.
- **Don't** use `uppercase tracking-wider` on form or filter `<label>` elements—reserve uppercase styling strictly for table column headers (`<th>`).
- **Don't** render hardcoded hex status pills, literal `●` bullets, `border-primary/20` on interactive inputs/selects, `border-red-300`, `text-red-500`, `text-neutral/40`/`50`/`60`, or sub-`12px` (`text-[10px]`/`text-[11px]`) sizes in authenticated views.
- **Don't** render nested `<button>` elements inside `<Link>`, duplicate empty-state boxes outside `DataTable`, or wrap `DataTable` + `Pagination` inside `overflow="visible"` `Card` containers without corner clipping (square backgrounds will protrude outside `rounded-2xl`).
- **Don't** apply authenticated app-form or `Button` constraints to the public marketing visuals and dark-surface CTAs in `src/features/landing/`.
