# Statistics Charts Components

## Overview
Implements the data visualization cards, SVG charts, and geographic/unit summary tables for the statistics dashboard, supporting standard and Year-over-Year (YoY) comparison views.

## Interface
- `DemographicsDonut.tsx:DemographicsDonut`: `React.FC<{ data: DemographicsData; yoy?: YoYComparisonData }>` rendering an SVG donut chart and breakdown for young vs. adult recipients.
- `DistrictSummaryTable.tsx:DistrictSummaryTable`: `React.FC<{ districts: GeographicItem[]; yoy?: YoYComparisonData }>` rendering a district breakdown table with parent region and progress bars.
- `GeographicBarChart.tsx:GeographicBarChart`: `React.FC<{ data: GeographicBreakdownData }>` rendering a tabbed horizontal bar chart (`'regions'` / `'districts'`).
- `GroupSummaryTable.tsx:GroupSummaryTable`: `React.FC<{ groups?: GeographicItem[] }>` rendering a Scout group breakdown table with parent district and progress bars.
- `MonthlyTrendChart.tsx:TrendBarMetricsParams`: Interface for monthly bar geometry calculations.
- `MonthlyTrendChart.tsx:MonthlyTrendChart`: `React.FC<{ data: MonthlyTrendData[]; year?: number; yoy?: YoYComparisonData }>` rendering a 12-month SVG bar chart with interactive hover tooltip and monthly summary table.
- `RecognitionRankingChart.tsx:RecognitionRankingChart`: `React.FC<{ data: RecognitionRankingData[] }>` rendering ranked recognition type horizontal bars.
- `RegionSummaryTable.tsx:RegionSummaryTable`: `React.FC<{ regions: GeographicItem[]; yoy?: YoYComparisonData }>` rendering a regional breakdown table with progress bars.
- `StatusBreakdownCard.tsx:StatusBreakdownCard`: `React.FC<{ data: StatusBreakdownData }>` rendering a segmented progress bar and 3 status cards (`active`, `exceptional`, `pending`).
- `UnitDistributionCard.tsx:UnitDistributionCard`: `React.FC<{ data: UnitDistributionData; yoy?: YoYComparisonData }>` rendering a segmented unit distribution bar and unit breakdown table.

## Invariants
- **No Memoization or Sorting**: None of the 9 chart/table components use `React.memo`, `useMemo`, or `useCallback`, and none sort input arrays (rendering items in the exact order received).
- **YoY Gating**: `DemographicsDonut`, `DistrictSummaryTable`, `MonthlyTrendChart`, `RegionSummaryTable`, and `UnitDistributionCard` activate YoY mode strictly when `Boolean(yoy?.hasPreviousYearData)` is `true`.
- **Top-5 Truncation & Tab Reset**: `DistrictSummaryTable`, `GeographicBarChart`, `GroupSummaryTable`, `RecognitionRankingChart`, and `RegionSummaryTable` default `showAll` to `false`, slice to `5` items when `!showAll`, and render the toggle button (`type="button"`) only when length `> 5`. `GeographicBarChart` defaults `activeTab` to `'regions'` and resets `showAll` to `false` on tab switch. `GroupSummaryTable` defaults `groups` to `[]`.
- **Empty States & Missing Parent Fallbacks**: `DistrictSummaryTable`, `GeographicBarChart`, `GroupSummaryTable`, `RecognitionRankingChart`, and `RegionSummaryTable` render Spanish empty-state messages when item length is `0`; `DistrictSummaryTable` and `GroupSummaryTable` render `'-'` when `item.parentName` is nullish. `DemographicsDonut` omits young/adult SVG arcs when count `<= 0` (radius `38`, hardcoded `'100%'` Total row); `StatusBreakdownCard` and `UnitDistributionCard` skip zero-count segments in their segmented tracks.
- **Progress, Bar & Tooltip Guards**: Bar/table progress calculations floor `maxCount` at `1` (`Math.max(..., 1)`), with 3-tier color thresholds (`> 0.75`, `> 0.4`, else; `bg-emerald-{600,500,400}` in `DistrictSummaryTable`/`RegionSummaryTable`, `bg-indigo-{600,500,400}` in `GroupSummaryTable`). `MonthlyTrendChart` resolves `displayYear` as `yoy?.currentYear ?? year ?? data[0]?.year ?? new Date().getFullYear()` and `prevYear` as `yoy?.previousYear ?? displayYear - 1`, floors `maxVal` at `5`, renders in a `760×232` SVG viewBox with dashed vertical month dividers (`idx > 0`) in YoY `MonthlyTrendDualBar`, generous inter-month slot padding (`Math.min(slotWidth * 0.24, 15)` separating grouped YoY pairs), bounded bar widths (`7 <= dualBarWidth <= 15`, `14 <= singleBarWidth <= 26`), displays `previousCount` above the previous-year bar on hover, mounts `MonthlyTrendTooltip` (`pointer-events-none`) only when `hoveredIdx !== null`, and guards `percentChange !== null` and `pendingCount > 0`.
- **Accessibility**: `DemographicsDonut` and `MonthlyTrendChart` SVGs set `role="img"` and `aria-label`; `MonthlyTrendChart` bar `<g>` elements include `tabIndex={0}`, `role="graphics-symbol"`, `aria-label`, and mouse hover handlers.

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
