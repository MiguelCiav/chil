# Statistics Feature Blueprint

## System Overview
The `statistics` feature subsystem aggregates recognition batch and member records into interactive analytics: multi-criteria date, recognition, territory, and demographic filtering (`useStatisticsData`), Year-over-Year (YoY) comparison metrics (`statsCalculators.ts`), interactive SVG charts and summary tables (`components/`), and A4 portrait executive PDF report generation (`statsPdfExport.ts`).

## Local Interface & Invariants
- **Public Barrel (`index.ts`)**:
  - `index.ts:*` re-exports `./types`, `./utils/statsCalculators`, `./utils/statsPdfExport`, `./hooks/useStatisticsData`, `./components/StatisticsDashboard`, `./components/StatKpiGrid`, `./components/FilterBar`, `./components/charts/MonthlyTrendChart`, `./components/charts/DemographicsDonut`, `./components/charts/RegionSummaryTable`, `./components/charts/DistrictSummaryTable`, `./components/charts/GroupSummaryTable`, `./components/charts/UnitDistributionCard`, and `./components/YoYVariationBadge`.
  - **Invariants**: None (pure barrel re-export module).
  - **Side Effects**: None.

## Subdirectories & System Boundaries
- **Components**: [`./components/README.md`](./components/README.md) — Dashboard container (`StatisticsDashboard`), `FilterBar`, `StatKpiGrid`, `YoYVariationBadge`, and nested visualizations ([`./components/charts/README.md`](./components/charts/README.md)).
- **Hooks**: [`./hooks/README.md`](./hooks/README.md) — `useStatisticsData` reactive data loader/filter hook and pure filtering/YoY year helpers.
- **Types**: [`./types/README.md`](./types/README.md) — Filter, KPI, chart, breakdown, YoY, and `StatisticsDataset` TypeScript interfaces.
- **Utils**: [`./utils/README.md`](./utils/README.md) — Statistical/YoY aggregators (`statsCalculators.ts`) and A4 portrait PDF export (`statsPdfExport.ts`).
- **Shared Cross-Feature Resolver (`../../utils/memberHierarchy.ts`)**: Canonical member-first hierarchy resolver (`resolveMemberHierarchy`, `isNoAplicaDistrict`) re-exported by `statsCalculators.ts`.

## Global Invariants
- **Territory & Unit Attribution**: `statsCalculators.ts` and `useStatisticsData.ts` resolve member territory via `resolveMemberHierarchy` (`isNationalInstitutional` -> `'nacional'` / `'Nacional'`; numeric regions/districts/groups require `id > 0`), and `FilterBar`/`buildAvailableDistricts` exclude `id === 0` and `isNoAplicaDistrict(d)` from dynamic lists while exposing `'nacional'` / `'0'` (`'No aplica'`) options where applicable.
- **YoY Gating & Metric Rules**: YoY views across `StatKpiGrid`, `MonthlyTrendChart`, `DemographicsDonut`, `RegionSummaryTable`, `DistrictSummaryTable`, `UnitDistributionCard`, and `statsPdfExport.ts` activate strictly when `Boolean(yoy?.hasPreviousYearData)` is `true` (`previousMembers.length > 0`); `totalDiplomas` counts `'active' | 'exceptional'` members, and `calculatePercentChange` returns `null` when `previous === 0 && current !== 0`.
- **Chart & PDF Presentation Guards**: Chart/table components do not memoize or re-sort input arrays, truncate list views at `5` items behind a `showAll` toggle, and floor `maxCount` at `1` (monthly chart `maxVal` at `5`); `statsPdfExport.ts` truncates long labels to fixed lengths and paginates at `currentY + requiredSpace > 279` mm.

## Global Side Effects
- **Firestore / Cross-Feature Reads**: `useStatisticsData` fetches `getAllBatches`, `getAllMembers`, `getHierarchyData` (from `../../batches/api`), and `getAllRecognitionTypes` (from `../../recognitions`) via `Promise.all` on mount, user change, or `refresh()`.
- **PDF Export & Logging**: `exportStatisticsPdf` instantiates `jsPDF` (A4 portrait) and triggers a file download via `doc.save(fileName)`; `useStatisticsData` logs fetch failures via `console.error`.

## System Verification
- Run: `npm test -- --run`
