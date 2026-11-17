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
- `statsPdfExport.ts:checkPageBreak & exportStatisticsPdf`: Uses fixed A4 portrait geometry (`210x297mm`, `MARGIN = 14`, `CONTENT_WIDTH = 182`); `checkPageBreak` adds a page and calls `drawHeaderSmall(doc, 16)` when `currentY + requiredSpace > 279` (`PAGE_HEIGHT - 18`).
- `statsPdfExport.ts`: YoY layout activates only when `Boolean(stats.yoyComparison?.hasPreviousYearData)` is `true` (omitting parenthetical `%` when `percentChange === null`); Section 3 (Unit table) is skipped if unit data is empty; text truncation limits are hardcoded (`110` filter summary, `18` top recognition, `36`/`55` region, `22`/`30` district parent, `22`/`35` district name, `3` monthly labels); `'no_scout'` is relabeled `'No scout (Agradecimientos)'`; chart `maxMonthlyVal` floors at `5` and `barW` floors at `2.5` (YoY) / `4` (standard). Neither file uses `try/catch` or throws explicit errors.

## Side Effects
- `statsPdfExport.ts:exportStatisticsPdf`: Instantiates `new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })`, mutates pages/graphics (`addPage`, `setPage`, `rect`, `text`, `line`), and triggers a file download via `doc.save(fileName)`.
- `statsCalculators.ts`: None (reads `new Date()` only when year arguments are omitted, plus static `hierarchyData`).

## Verification
- Run: `npm test -- --run`
