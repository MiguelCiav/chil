# Statistics Utils

## Overview
Provides pure statistical aggregation and Year-over-Year (YoY) calculation utilities (`statsCalculators.ts`) and an A4 portrait `jsPDF` executive report generator (`statsPdfExport.ts`).

## Interface
- `statsCalculators.ts:MONTH_LABELS_ES`: Constant `string[]` of Spanish month labels.
- `statsCalculators.ts:ResolvedMemberHierarchy`: Re-exported type from `../../../utils/memberHierarchy`.
- `statsCalculators.ts:EffectiveHierarchy`: Type alias for `ResolvedMemberHierarchy`.
- `statsCalculators.ts:resolveMemberHierarchy`: Re-exported canonical hierarchy resolver from `../../../utils/memberHierarchy`.
- `statsCalculators.ts:calculatePercentChange`: `(current: number, previous: number) => number | null`.
- `statsCalculators.ts:partitionDataByYear`: Partitions batches and members into `currentYear` and `previousYear`.
- `statsCalculators.ts:BuildYoYDistrictComparisonOptions`: Interface (with `BuildYoYDistrictParams` type alias).
- `statsCalculators.ts:calculateYoYComparison`: Computes `YoYComparisonData` across KPIs, regions, districts, units, demographics, and monthly trends.
- `statsCalculators.ts:buildStatisticsDataset`: Assembles a complete `StatisticsDataset`.
- `statsCalculators.ts:calculateKpiMetrics`: Computes `KpiMetrics`.
- `statsCalculators.ts:calculateMonthlyTrends`: Computes 12-month `MonthlyTrendData[]`.
- `statsCalculators.ts:calculateRecognitionRankings`: Computes `RecognitionRankingData[]`.
- `statsCalculators.ts:calculateDemographics`: Computes `DemographicsData`.
- `statsCalculators.ts:calculateGeographicBreakdown`: Computes `GeographicBreakdownData`.
- `statsCalculators.ts:calculateStatusBreakdown`: Computes `StatusBreakdownData`.
- `statsCalculators.ts:calculateUnitDistribution`: Computes `UnitDistributionData` (also aliased as `getUnitDistribution`).
- `statsPdfExport.ts:FilterSummaryLabels`, `PageBreakChecker`, `KpiBoxParams`, `MonthlyBarParams`: Exported types/interfaces for PDF report layout.
- `statsPdfExport.ts:drawHeaderSmall`, `checkPageBreak`, `drawReportHeader`, `drawKpiSummaryBoxes`, `drawGeographicTables`, `drawUnitAndDemographicsTables`, `drawMonthlyTrendSection`, `drawReportFooter`: Exported PDF section rendering helpers.
- `statsPdfExport.ts:exportStatisticsPdf`: `(stats: StatisticsDataset, filterSummary?: FilterSummaryLabels) => string` generating, downloading (`Reporte_Estadistico_Chil_${dateFileTag}.pdf`), and returning the filename of the A4 portrait report.

## Invariants
- `statsCalculators.ts:partitionDataByYear & calculateMonthlyTrends`: When `targetYear` is omitted, `currentYear` defaults to `Math.max(...years)` from valid `batch.created_at` dates (falling back to `new Date().getFullYear()`), and `previousYear = currentYear - 1`. Batches with missing/invalid `created_at` are excluded from year partitions and monthly buckets. `currentMembers` includes unbatched members (`!m.batch_id`) only when `!targetYear`; `previousMembers` strictly requires `m.batch_id` in `previousBatchIds`.
- `statsCalculators.ts:calculatePercentChange & calculateYoYComparison`: Returns `0` when `current === 0 && previous === 0`, `null` when `previous === 0 && current !== 0`, else `Number((((current - previous) / previous) * 100).toFixed(1))`. `hasPreviousYearData` is `previousMembers.length > 0`. `totalDiplomas` counts only `status === 'active' || status === 'exceptional'`.
- `statsCalculators.ts:calculateKpiMetrics, calculateDemographics & calculateStatusBreakdown`: Statuses `'active'` and `'exceptional'` are counted explicitly while others map to `pendingCount`. Percentages round to 1 decimal place (`0` when total is `0`). `calculateDemographics` splits `member_type === 'young'` vs. all others as `adultCount`, whereas `calculateKpiMetrics` checks `'young'` and `'adult'` explicitly.
- `statsCalculators.ts:calculateGeographicBreakdown, calculateKpiMetrics & calculateYoYComparison`: Territory attribution uses `resolveMemberHierarchy`; `isNationalInstitutional` attributes to region `'nacional'` (`'Nacional'`), while numeric regions/districts/groups require `id > 0`. `calculateGeographicBreakdown` falls back to `hierarchyData.groups` when `groups` is omitted/empty. Rankings sort descending by count (YoY: `currentCount`, then `previousCount`) with Spanish base-sensitivity tie-breaking.
- `statsCalculators.ts:calculateUnitDistribution & calculateYoYComparison`: Units are ordered `['manada', 'tropa', 'caminantes', 'clan', 'institucional', 'no_scout']`; missing `m.unit` defaults to `'tropa'` for `member_type === 'young'` and `'institucional'` otherwise.
- `statsCalculators.ts:calculateRecognitionRankings & calculateKpiMetrics`: Reads `batch.recognition_type ?? 'general'` and matches `recognitionTypes` by `id` or case-insensitive `name`, falling back to `getRecognitionName(recId)`.
- `statsPdfExport.ts:checkPageBreak & exportStatisticsPdf`: Uses fixed A4 portrait geometry (`210x297mm`, `MARGIN = 14`, `CONTENT_WIDTH = 182`); `checkPageBreak` adds a page and calls `drawHeaderSmall(doc, 14)` when `currentY + requiredSpace > 279` (`PAGE_HEIGHT - 18`).
- `statsPdfExport.ts`: Mirrors the web `StatisticsDashboard` card layout (white rounded cards with `#8c4e37` / Tailwind accent tints, `bg-primary/10` table headers, row progress bars, 4-card KPI grid matching `StatKpiGrid`, `2b` Scout Groups table when `stats.geographic.groups` is provided, Unit segmented stacked progress bar, vector Demographics Donut chart drawn via `circle`/`lines`, and spaced Monthly double-bar chart with Y-axis gridlines and vertical month dividers); YoY layout activates only when `Boolean(stats.yoyComparison?.hasPreviousYearData)` is `true` (omitting parenthetical `%` when `percentChange === null`); Section 3 (Unit table) is skipped if unit data is empty; text truncation limits apply per column (`110` filter summary, `20` top recognition, `34`/`52` region, `20`/`28` district/group parent, `22`/`32` district/group name, `3` monthly labels); `'no_scout'` is relabeled `'No scout (Agradecimientos)'`; chart `maxMonthlyVal` floors at `5` and `barW` bounds at `[2.2, 3.4]` (YoY) / `[3.5, 6.5]` (standard). Neither file uses `try/catch` or throws explicit errors.

## Side Effects
- `statsPdfExport.ts:exportStatisticsPdf`: Instantiates `new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })`, mutates pages/graphics (`addPage`, `setPage`, `rect`, `roundedRect`, `circle`, `lines`, `text`, `line`), and triggers a file download via `doc.save(fileName)`.
- `statsCalculators.ts`: None (reads `new Date()` only when year arguments are omitted, plus static `hierarchyData`).

## Verification
- Run: `npm test -- --run`
