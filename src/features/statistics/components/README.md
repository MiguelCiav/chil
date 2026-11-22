# Statistics Components

## Overview
Top-level statistics dashboard container and core non-chart UI components (`FilterBar`, `StatKpiGrid`, `StatisticsDashboard`, and `YoYVariationBadge`). `StatisticsDashboard` consumes `useStatisticsData()` and orchestrates loading, error, filter, KPI, and chart/table views.

## Interface
- `FilterBar.tsx:FilterBar`: `React.FC<FilterBarProps>` rendering period, recognition, region, district, and demographic filters, custom date inputs, reset button, and PDF export trigger.
- `StatKpiGrid.tsx:StatKpiGrid`: `React.FC<StatKpiGridProps>` rendering a 4-card KPI grid (`Total Reconocimientos`, `Más Entregado`, `Regiones y Distritos`, `Demografía`) with optional YoY comparisons.
- `StatisticsDashboard.tsx:StatisticsDashboard`: `React.FC` consuming `useStatisticsData()` and rendering loading skeletons, error state with retry, or the full dashboard layout.
- `YoYVariationBadge.tsx:YoYVariationBadge`: `React.FC<YoYVariationBadgeProps>` rendering a directional badge (`↑`, `↓`, or `=`) for year-over-year `diff` and optional `percentChange`.
- Subdirectories:
  - [`./charts/README.md`](./charts/README.md) — SVG charts, segmented breakdown cards, and geographic/unit summary tables.

## Invariants
- `FilterBar.tsx:FilterBar`: Uses `<Card>`, `<Select size="sm">`, `<Field size="sm">`, `<HierarchyFilterSelects showGroup={false} includeNoAplicaAlways>`, and `<Button variant="outline" size="sm">` for `"Limpiar filtros"`. Selecting a `regionId` resets `districtId` to `''`; `regions` options filter `r.id !== 0` and append static `'nacional'` and `'0'` (`'No aplica'`); custom date inputs (`stats-custom-start`, `stats-custom-end`) render only when `filters.period === 'custom'`; `'Limpiar filtros'` renders only when `hasActiveFilters` is truthy; controlled values fall back via `?? ''` (or `?? 'all'` for `memberType`).
- `StatKpiGrid.tsx:StatKpiGrid`: Renders 4 KPI `<Card>` items (`lg:grid-cols-4`); YoY footers on `Total Reconocimientos` and `Demografía` render only when `yoy?.hasPreviousYearData` is truthy; `topRecognitionName` defaults to `'-'` and `topRecognitionCount` to `0`; demographic YoY diffs use `diff >= 0` for emerald styling with `'+'` prefix and rose styling otherwise.
- `StatisticsDashboard.tsx:StatisticsDashboard`: Enforces mutually exclusive render states in order: `loading` (skeletons including 4 KPI skeleton placeholders in `lg:grid-cols-4`) -> `error` (`<ErrorAlert variant="centered">` with retry button) -> full dashboard.
- `YoYVariationBadge.tsx:YoYVariationBadge`: Branches on `diff > 0` (emerald, `↑`), `diff < 0` (rose, `↓`), or `diff === 0` (slate, `=`, fixed `'0 (0%)'`); percentage text is shown only when `percentChange !== null`.

## Side Effects
- `FilterBar.tsx:FilterBar`: `handleExportPdf` calls `getFilterSummaryLabels()` and `exportStatisticsPdf(stats, summary)` to trigger a PDF download; filter inputs and reset button invoke `setFilter` and `resetFilters`.
- `StatisticsDashboard.tsx:StatisticsDashboard`: Calls `useStatisticsData()` for data fetching and filter state; error retry button invokes `refresh`.
- `StatKpiGrid.tsx:StatKpiGrid` & `YoYVariationBadge.tsx:YoYVariationBadge`: None.

## Verification
- Run: `npm test -- --run`
