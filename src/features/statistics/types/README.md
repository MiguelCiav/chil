# Statistics Types

## Overview
Defines TypeScript interfaces for statistics filtering, KPI metrics, monthly trends, recognition rankings, demographics, geographic/status/unit breakdowns, Year-over-Year (YoY) comparison structures, and `StatisticsDataset`.

## Interface
- `index.ts:StatisticsFilterState`: Filter state interface (`period`, `startDate`, `endDate`, `recognitionId`, `regionId`, `districtId`, `memberType`).
- `index.ts:KpiMetrics`: Top-level KPI summary interface.
- `index.ts:MonthlyTrendData`: Monthly series item interface.
- `index.ts:RecognitionRankingData`: Recognition ranking item interface.
- `index.ts:DemographicsData`: Young vs. adult counts and percentages interface.
- `index.ts:GeographicItem`: Region/district/group count item interface.
- `index.ts:GeographicBreakdownData`: Geographic regions, districts, and groups container interface.
- `index.ts:StatusBreakdownData`: Active, exceptional, and pending counts/percentages interface.
- `index.ts:UnitDistributionItem`: Unit count/percentage item interface.
- `index.ts:UnitDistributionData`: Unit distribution container interface.
- `index.ts:YoYCountMetric`: YoY current, previous, diff, and `percentChange` metric interface.
- `index.ts:YoYRegionItem`: YoY region comparison item interface.
- `index.ts:YoYDistrictItem`: YoY district comparison item interface.
- `index.ts:YoYUnitItem`: YoY unit comparison item interface.
- `index.ts:YoYDemographics`: YoY young/adult comparison interface.
- `index.ts:YoYMonthlyItem`: YoY monthly comparison item interface.
- `index.ts:YoYComparisonData`: Full YoY comparison payload interface.
- `index.ts:CalculateYoYOptions`: Options interface for `calculateYoYComparison`.
- `index.ts:StatisticsDataset`: Complete aggregated statistics dataset interface.

## Invariants
- None.

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
