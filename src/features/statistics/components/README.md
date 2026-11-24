# Statistics Components

## Overview
Top-level statistics dashboard container and core non-chart UI components (`FilterBar`, `StatisticsDashboard`, and `YoYVariationBadge`). `StatisticsDashboard` consumes `useStatisticsData()` and orchestrates loading, error, filter, and chart/table views starting directly with the regional breakdown.

## Interface
- `FilterBar.tsx:FilterBar`: `React.FC<FilterBarProps>` wrapping `<FilterCard>` to render global search, recognition, region, district, demographic, and date/period filters with custom date inputs and reset action.
- `StatisticsDashboard.tsx:StatisticsDashboard`: `React.FC` consuming `useStatisticsData()` and rendering loading skeletons, error state with retry, header with `"Exportar todo"` PDF button, `<FilterBar>`, and section breakdown cards.
- `YoYVariationBadge.tsx:YoYVariationBadge`: `React.FC<YoYVariationBadgeProps>` rendering a directional badge (`↑`, `↓`, or `=`) for year-over-year `diff` and optional `percentChange`.
- Subdirectories:
  - [`./charts/README.md`](./charts/README.md) — SVG charts, segmented breakdown cards, and geographic/unit summary tables.

## Invariants
- `FilterBar.tsx:FilterBar`: Uses `<FilterCard>` (compact search bar, collapsible `"Filtros"` panel with count badge, removable summary chips via `buildCommonFilterBadges` plus an appended `'memberType'` (`Demografía`: `'Solo Jóvenes'` / `'Solo Adultos'`) chip when `filters.memberType && filters.memberType !== 'all'`, custom date inputs `stats-custom-start`/`stats-custom-end` when `filters.period === 'custom'`, and `'Limpiar filtros'` when `hasActiveFilters` is truthy), `<Select size="sm">`, and `<HierarchyFilterSelects showGroup={false} includeNoAplicaAlways>` with no card title or embedded export button. Changing region via `HierarchyFilterSelects` (or clearing `regionId` via `setFilter`) resets `districtId` to `''`; `regions` options filter `r.id !== 0` and prepend static `'nacional'` and `'0'` (`'No aplica'`) before dynamic region options; controlled values fall back via `?? ''` (or `?? 'all'` for `memberType`).
- `StatisticsDashboard.tsx:StatisticsDashboard`: Enforces mutually exclusive render states in order: `loading` (header, filter bar, and table skeleton placeholders) -> `error` (`<ErrorAlert variant="centered">` with retry button) -> dashboard with header `"Exportar todo"` PDF trigger, `<FilterBar>`, and breakdown cards starting at `RegionSummaryTable`.
- `YoYVariationBadge.tsx:YoYVariationBadge`: Branches on `diff > 0` (emerald, `↑`), `diff < 0` (rose, `↓`), or `diff === 0` (slate, `=`, fixed `'0 (0%)'`); percentage text is shown only when `percentChange !== null`.

## Side Effects
- `FilterBar.tsx:FilterBar`: Filter search, dropdowns, dates, and reset button invoke `setFilter` and `resetFilters`.
- `StatisticsDashboard.tsx:StatisticsDashboard`: Calls `useStatisticsData()` for data fetching and filter state; `"Exportar todo"` calls `getFilterSummaryLabels()` and `exportStatisticsPdf(stats, summary)` to download the PDF; error retry button invokes `refresh`.
- `YoYVariationBadge.tsx:YoYVariationBadge`: None.

## Verification
- Run: `npm test -- --run`
