# Chil Design System (`docs/DESIGN.md`)

Canonical visual and accessibility specification for **Chil** (Scout recognition batch-management SPA and generated PDF reports). Defines the palette, WCAG contrast floors, typography, surface tokens, shared UI primitives, keyboard/focus semantics, domain color systems, and web-to-PDF congruency rules.

---

## 1. Brand & Color Tokens (`src/index.css`)

Defined via Tailwind CSS v4 `@theme` in [`src/index.css`](../src/index.css):

| Token | Hex | RGB | Role & Allowed Pairings | Tailwind Utilities |
| :--- | :--- | :--- | :--- | :--- |
| `--color-primary` | `#8C4E37` | `140, 78, 55` | Scout Terracotta — primary actions (`#FFFFFF` ink = `6.44:1`), text on white (`6.44:1`), on `primary/5` (`5.99:1`), on `primary/10` (`5.57:1`), on `secondary` (`5.37:1`) | `bg-primary`, `text-primary`, `border-primary/70`, `border-primary/20` |
| `--color-secondary` | `#F1EAD8` | `241, 234, 216` | Warm Parchment — secondary button fill paired strictly with `--color-primary` (`5.37:1`) or `--color-neutral` text | `bg-secondary`, `hover:bg-secondary/90` |
| `--color-tertiary` | `#6CB7DE` | `108, 183, 222` | Light Scout Sky — accent background token. Pair strictly with `--color-neutral` (`5.30:1`), **never** white text (`2.22:1` FAIL). For blue text on white, use `sky-700` (`#0369A1`, `5.93:1`) instead of `sky-600` (`#0284C7`, `4.10:1`) | `bg-tertiary`, `text-sky-700` |
| `--color-neutral` | `#383836` | `56, 56, 54` | Warm Charcoal — primary body copy (`11.75:1` on white; `11.09:1` on `#FAF8F5`), headings, dark toast fill | `text-neutral`, `bg-neutral`, `bg-neutral/50` |

### Muted Text Contrast Floor (WCAG AA `4.5:1`)
- **Minimum allowed muted text**: `text-neutral/75` (`>= 4.97:1` on `bg-primary/5` `#F9F6F5` and `> 5.0:1` on `#FFFFFF`). `text-neutral/70` (`4.68:1`) is valid only on pure `#FFFFFF` (it drops to `4.36:1` on `#F9F6F5`).
- **Forbidden for normal text**: `text-neutral/60` (`3.55:1`), `text-neutral/50` (`2.75:1`), and `placeholder-primary/40` (`1.87:1`). Always use `placeholder:text-neutral/75`.

### Extended Surface & Hero Palette
- **App Canvas Background**: `bg-primary/5` (`#F9F6F5`) in [`MainLayout.tsx`](../src/layouts/MainLayout.tsx), paired with `bg-white` elevated cards and sidebars.
- **Warm Table / Filter Surface**: `#FAF8F5` (`250, 248, 245`) used in Statistics tables and `statsPdfExport.ts`; `bg-primary/10` (`#F4EDEA`) used in canonical `Table` headers and `CardFooter`.
- **Hero Surface & Brand Badge (`HeroSection.tsx` & `src/index.css`)**: `HeroSection.tsx` uses Warm Parchment `bg-secondary` (`#F1EAD8`) with terracotta `TopoBackdrop` (`#8C4E37`), a warm radial glow (`rgba(233, 162, 127, 0.34)`), and a soft parchment-to-white atmospheric dissolve at the bottom edge. The negative white World Scouting logo (`WSCT_LOGO_EN_RGB_NEG.svg`) sits inside a rounded `#643425` badge (`10.20:1` contrast) to the left of the native `Chil` emblem (`#643425` wordmark, `8.50:1` on parchment). *(Legacy `.hero-scout-gradient`, `.hero-top-mist`, and `.hero-right-gradient` rules in `src/index.css` are superseded.)*

---

## 2. Typography & Document Semantics

### Document Shell & Landmarks
- **Document Language**: [`index.html`](../index.html) MUST declare `<html lang="es">` to match Spanish UI copy and screen-reader pronunciation rules.
- **Landmarks & Skip Link**: [`MainLayout.tsx`](../src/layouts/MainLayout.tsx) provides `<a href="#main-content" className="skip-link">Saltar al contenido principal</a>` before navigation, targeting `<main id="main-content" tabIndex={-1}>`. Each view uses one `<h1>` without skipped heading levels (`h1` → `h2` → `h3`).

### Font Families
| Token | Stack | Source | Usage |
| :--- | :--- | :--- | :--- |
| `--font-display` | `"Scouts GT Planar", sans-serif` | Local TTF [`public/fonts/Scouts-GT-Planar-Bold.ttf`](../public/fonts/Scouts-GT-Planar-Bold.ttf) (`bold`, `swap`) | Applied in `@layer base` to `h1`–`h6` headings; optional display font in Certificate Designer |
| `--font-sans` | `"Noto Sans", sans-serif` | Google Fonts in [`index.html`](../index.html) (`100..900`) | Applied to `body`, forms, tables, body copy, and default Certificate Designer fields |
| `font-mono` | System monospace | Tailwind default | Codes, dimensions (`mm`), workflow step numbers, aspect ratios |
| `helvetica` | PDF standard Helvetica | `jsPDF` built-in | Executive & Batch PDF reports (`statsPdfExport.ts`, `batchReports.ts`) |

### Type Scale, Zoom (`200%`) & Readability
- **Minimum Size Floor**: Use fluid `rem`-based sizes (`>= 0.75rem` / `text-xs`) for readable secondary text; avoid sub-`12px` pixel sizes (`text-[10px]`, `text-[11px]`).
- **200% Zoom Reflow**: Text wrappers must not clip content via fixed pixel heights + `overflow-hidden` at `200%` browser zoom; when `truncate` is used on long dynamic strings (KPI titles), preserve full text in layout wrap on detail views or accessible titles.
- **Label Casing**: Use natural sentence/title case on multi-word `Field` labels (`text-sm font-semibold`) so Spanish accents and word shapes remain clear; restrict `uppercase tracking-wider` to short table column headers (`<th>`).
- **Page Title (`h1`)**: `text-2xl sm:text-3xl font-black text-neutral tracking-tight` (Hero: `font-display font-black tracking-tight leading-[0.94] text-[clamp(2.35rem,5vw,4.5rem)]`; `DesignerHeader.tsx`: `text-xl sm:text-2xl font-extrabold`).
- **Section Heading (`h2`/`h3`)**: `text-base` to `text-lg font-bold text-neutral tracking-tight`.
- **Copy Language**: All UI labels, validation hints, modals, and errors are in **Spanish**.

---

## 3. Radii, Borders, Elevation & Motion

### Borders & WCAG 1.4.11 Non-Text Contrast (`>= 3.0:1`)
- **Interactive Control Boundaries**: Inputs, textareas, selects, and `outline` buttons MUST achieve `>= 3.0:1` border contrast against adjacent surfaces (`border-primary/70` `#AF8373` = `3.32:1` on white; `border-gray-500` `#6B7280` = `4.83:1` on white).
- **Decorative Container Hairlines**: `border-primary/20` (`1.34:1`) and `border-gray-200` (`1.24:1`) are permitted **only** on non-interactive layout containers (`Card`, `Table`, `Modal` shells) that rely on white background separation over `bg-primary/5`, never as the sole boundary of form inputs or outline buttons.
- **Control Radii**: `--radius-field: 0.75rem` on `Field`, `rounded-lg` (`Button sm`), `rounded-xl` (`Button md/lg`), `rounded-2xl` (`Card`/`Table`/`Modal`), `rounded-full` (status chips), `rounded-md` (variation deltas).
- **Elevation Policy**: Static cards remain flat (`1px` border). Shadows (`shadow-lg`, `shadow-xl`) are reserved strictly for floating overlays (dropdown menus, fixed toasts, `MonthlyTrendTooltip`).

### Reduced Motion
- `@media (prefers-reduced-motion: reduce)` in [`src/index.css`](../src/index.css) disables `.animate-modal-*`, `.animate-pulse`, `.animate-bounce`, `.animate-ping`, `.animate-fade-in`, `.animate-topo-drift`, `.animate-hero-rise`, `.animate-card-deal`, `.animate-marquee-left`, `.animate-marquee-right`, smooth scrolling, and collapses transition durations to `0.01ms`.

---

## 4. Interaction Affordances, Keyboard & Focus

- **Pointer Cursor Base Layer (`src/index.css` `@layer base`)**: Every enabled interactive element (`a[href]`, `button`, `summary`, `select`, `label[for]`, wrapping checkbox/radio labels, `[role="button"|"link"|"tab"|"menuitem"|"option"|"switch"]`, native inputs) sets `cursor: pointer`; `:disabled` and `[aria-disabled="true"]` set `cursor: not-allowed`.
- **Focus Indicators**: Never use `outline: none` without a `>= 3.0:1` visible replacement. [`src/index.css`](../src/index.css) enforces global `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` (`6.44:1` on white), and interactive controls use `focus-visible:ring-2 focus-visible:ring-primary` (or `focus-visible:ring-neutral`).
- **Native Elements & Icon Accessibility**: Actions use `<button type="button">`, links use `<a href>`. Icon-only buttons (`Sidebar`, `ModalHeader`, `DesignerHeader`) MUST provide an accessible `aria-label` (or `.sr-only` text), and decorative SVGs inside buttons/labels MUST carry `aria-hidden="true"`.
- **Dialog Focus Management**: Modals (`Modal.tsx`) and mobile drawers (`Sidebar.tsx` `role="dialog"`) MUST trap `Tab`/`Shift+Tab`, close on `Escape`, and restore focus to the triggering element on close.

---

## 5. Shared Primitives & Mandatory UI States (`src/components/`)

| Primitive | Accessible Visual & Behavioral Spec |
| :--- | :--- |
| [`Button.tsx`](../src/components/Button.tsx) | `primary` (`bg-primary text-white`), `secondary` (`bg-secondary text-primary`, `focus-visible:ring-primary`), `outline` (`border-gray-500 bg-white text-neutral`, `4.83:1`), `ghost` (`text-neutral hover:bg-gray-100`). Sizes `sm`/`md`/`lg`. Icons wrapped with `aria-hidden="true"`. |
| [`Card.tsx`](../src/components/Card.tsx) | `rounded-2xl border border-primary/20 bg-white`; `CardHeader` `border-b border-primary/10`; `CardFooter` `bg-primary/10 border-t border-primary/10`. |
| [`Modal.tsx`](../src/components/Modal.tsx) | `bg-neutral/50 backdrop-blur-xs` overlay; `<dialog open tabIndex={-1} aria-modal="true">` container (`border-primary/20 rounded-2xl`); document-level `Escape`, `Tab`/`Shift+Tab` trap, focus restoration, and `ModalHeader` close icon `aria-hidden="true"`. |
| [`Field.tsx`](../src/components/Field.tsx) | Visible `<label htmlFor>` (sentence/title case); `default` (`bg-primary/5 border-primary/70 text-neutral placeholder:text-neutral/75`); `error` (`border-red-600 text-red-900`, `aria-invalid="true"`, `aria-describedby`, `role="alert"` + `AlertCircle` `aria-hidden="true"` in `text-red-700` `6.47:1`); `success` (`border-green-700 text-green-900`). |
| [`Table.tsx`](../src/components/Table.tsx) | `rounded-2xl border-primary/20 bg-white`; `thead` `bg-primary/10 border-b border-primary/20`; rows `divide-y divide-gray-100 hover:bg-primary/5`. |
| [`FloatingTableScrollbar.tsx`](../src/components/FloatingTableScrollbar.tsx) | Fixed bottom floating horizontal scrollbar synced to wide table containers (`ResizeObserver` + `IntersectionObserver`). |
| [`SearchSelectorModal.tsx`](../src/components/SearchSelectorModal.tsx) | Searchable selection modal for picking a single entity (`title`, `items`, `onSelect`, `onClose`). |
| [`Toast.tsx`](../src/components/Toast.tsx) | Fixed top-right notification banner (`success`: `bg-neutral`, `role="status"`, `aria-live="polite"`; `warning`: `bg-amber-900 border-amber-600`; `error`: `bg-red-900 border-red-700`, `role="alert"`, `aria-live="assertive"`), `aria-hidden` status icon, and optional `onDismiss` button. |
| [`Sidebar.tsx`](../src/components/navigation/Sidebar.tsx) | Collapsible white rail (`border-r border-gray-200`); `font-display` `"Chil"` wordmark; active link `bg-primary/10 text-primary border-primary/20` (`5.57:1`); inactive icons `text-neutral/70` (`aria-hidden="true"`); mobile `role="dialog"` with `Escape` + focus trap + focus restoration. *(Legacy `Navbar.tsx` remains exported in `navigation/index.ts`, though `MainLayout.tsx` renders `Sidebar.tsx` exclusively.)* |

### Mandatory Data-View States (Non-Color Feedback)
Every data view (`BatchList`, `BatchDetail`, `SummaryView`, `StatisticsDashboard`, `RecognitionCatalog`) MUST implement perceivable states combining text + icon/action (never color alone):
- **Loading**: Descriptive Spanish status message (`Cargando...`) or skeleton paired with `aria-busy="true"` / `role="status"`.
- **Empty**: Explicit Spanish explanation of why no items appear (e.g., empty catalog vs. active filter mismatch) plus a recovery CTA (`Limpiar filtros` or `Crear`).
- **Error**: `role="alert"` container with `AlertCircle` (`aria-hidden="true"`), specific Spanish error copy in `text-red-700` / `bg-red-50`, and a `Reintentar` action where applicable.
- **Toast / Live Announcements**: Status toasts use `role="status"` + `aria-live="polite"` (errors/warnings use `role="alert"`) and always render a status icon (`CheckCircle2`, `AlertTriangle`, `AlertCircle`) alongside text.

---

## 6. Domain Semantic Palettes

### Scout Units (`src/types/member.ts`, `UnitDistributionCard.tsx`, `statsPdfExport.ts`)
| Unit | Web Pill Classes (AA Text) | Solid / PDF Color |
| :--- | :--- | :--- |
| **Manada** | `bg-amber-50 text-amber-700 border-amber-200` (`4.84:1`) | `amber-500` / `[245, 158, 11]` |
| **Tropa** | `bg-emerald-50 text-emerald-700 border-emerald-200` (`5.21:1`) | `emerald-500` / `[16, 185, 129]` |
| **Caminantes** | `bg-blue-50 text-blue-700 border-blue-200` (`6.16:1`) | `blue-500` / `[59, 130, 246]` |
| **Clan** | `bg-red-50 text-red-700 border-red-200` (`5.91:1`) | `red-500` / `[239, 68, 68]` |
| **Institucional** | `bg-purple-50 text-purple-700 border-purple-200` (`6.51:1`) | `purple-500` / `[168, 85, 247]` |
| **No scout** | `bg-slate-100 text-slate-700 border-slate-300` (`9.45:1`) | `slate-400` / `[148, 163, 184]` |

### Member Validation Status (`StatusBreakdownCard.tsx`, `batchReports.ts`)
- **Registro Válido (`active`)**: `emerald-50` / `emerald-500` / `emerald-800` text (`CheckCircle2` icon; Batch PDF `[40, 167, 69]`).
- **Emisión Excepcional (`exceptional`)**: `purple-50` / `purple-500` / `purple-800` text (`AlertTriangle` icon; PDF `[126, 34, 206]`).
- **Inválido / Pendiente (`pending`)**: `rose-50` / `rose-500` / `rose-800` text (`XCircle` icon; Batch PDF `[220, 53, 69]`).

### Recognition Type Badges (`recognitionMetadata.ts`)
Keyword-mapped pills: **Plástico/Marea** (`sky-100`/`sky-800`), **Tribu/Tierra** (`#e9e7db`/`#5e5c46`, `5.47:1`), **Campeones/Naturaleza** (`#fee2d8`/`#9a3412`, `5.94:1`), **Go Solar & Servicio** (`amber-100`/`amber-800|amber-900`), **Promesa & Madera** (`blue-100`/`blue-800`), **Mérito** (`emerald-100`/`emerald-800`), **Default** (`bg-primary/10 text-primary border-primary/20`, `5.57:1`).

### Statistics Charts & Executive PDF (`MonthlyTrendChart.tsx`, `DemographicsDonut.tsx`, `statsPdfExport.ts`)
- **Non-Text Chart Contrast & Keyboard Parity**: Because light chart fills (`slate-300` `#CBD5E1` = `1.48:1`, `amber-500` = `2.15:1`, `emerald-400` = `1.92:1`, `emerald-500` = `2.54:1`, `slate-400` = `2.56:1`) fall below `3.0:1` on white surfaces, pair every graphic segment with high-contrast text/values (`>= 4.5:1`) and apply `stroke="#64748b"` (`4.76:1`) on `slate-300` comparative bars (`MonthlyTrendChart.tsx`). Interactive chart bar `<g>` elements mirror `onMouseEnter`/`onMouseLeave` with `onFocus`/`onBlur` so keyboard users see tooltips and previous-year counts.
- **Monthly Trend Bars**: Current year `sky-600` (`#0284c7`, hover `#0e7490`) vs. previous year `slate-300` (`#cbd5e1` with `#64748b` outline), gridlines `slate-100` (`#f1f5f9`), YoY vertical dividers `slate-200` (`#e2e8f0`, dashed `3 3`).
- **Demographics Donut**: **Jóvenes** `sky-600` (`#0284c7` / `[2, 132, 199]`) vs. **Adultos** `amber-500` (`#f59e0b` / `[245, 158, 11]`), paired with `sky-900`/`amber-900` tabular percentages.
- **Territory Ranking Bars**: Region/District (`emerald-{600,500,400}`); Scout Group (`indigo-{600,500,400}`).

### Certificate Designer Presets (`designerUtils.tsx`)
- `PRESET_COLORS`: Verde Scout (`#1b7a37`, `5.40:1`), Terracota (`#8c4e37`, `6.44:1`), Azul Marino (`#1e3a8a`), Rojo Carmesí (`#b91c1c`, `6.47:1`), Negro Carbón (`#111827`), Gris Oscuro (`#4b5563`, `7.56:1`).

---

## 7. Congruency Status

The primary UI surfaces and reports are aligned to the canonical system:

1. **Card, Table & Control Borders**: `Statistics` cards, `SummaryView`, `RecognitionCatalog`, `BackgroundFormatTab`, `BatchSummaryCards`, `BatchTerritorialCard`, and auth cards use `border-primary/20`; Statistics & Summary `<table />` headers share `bg-primary/10 border-b border-primary/20`; interactive search inputs and `<select>` filters use `border-primary/70` (`3.32:1`).
2. **Primary & Neutral Token Alignment**: Hardcoded browns (`#743e1d` in `BatchSummaryCards` / `BatchMembersTable`) replaced with `text-primary`/`bg-primary`; `AVAILABLE_TEMPLATE_FIELDS` neutral defaults standardized to `#383836` (`--color-neutral`) and `#4b5563`; muted labels across Statistics, Summary, Sidebar, and primary Batch/Recognition cards standardized to `text-neutral/75`.
3. **Display Typography on Brand Wordmarks**: `"Chil"` wordmarks across `Sidebar`, `Navbar`, `MainLayout`, `HeroSection`, `LandingFooter`, `LoginPage`, and `RegisterPage` apply `font-display` (`Scouts GT Planar`).
4. **Batch PDF Branding**: `batchReports.ts` applies `--color-primary` (`[140, 78, 55]`), `--color-neutral` (`[56, 56, 54]`), warm table header fills (`[244, 237, 234]`), and terracotta section headers matching `statsPdfExport.ts`.
5. **Unified `Toast` Component**: All 7 toast sites (`CertificateDesigner`, `RecognitionCatalog`, `SummaryView`, `BatchList`, `BatchDetail`, `NewBatchWizard`, `SuccessPage`) share [`Toast.tsx`](../src/components/Toast.tsx).

Any secondary wizard/modal sub-panels retaining legacy `border-gray-200` or `text-neutral/50` should adopt these tokens incrementally when touched.
