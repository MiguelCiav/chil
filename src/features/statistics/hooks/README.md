# Statistics Hooks

## Overview
Provides `useStatisticsData` for loading and reactively filtering batches, members, hierarchy, and recognition types, along with pure helpers for date/territory/member filtering, available district derivation, YoY target-year calculation, and filter summary labels.

## Interface
- `useStatisticsData.ts:initialFilterState`: Constant `StatisticsFilterState` default object.
- `useStatisticsData.ts:buildAvailableDistricts`: `(districts: District[], regionId?: string) => District[]`.
- `useStatisticsData.ts:filterBatchesByCriteria`: `(batches: Batch[], filters: StatisticsFilterState, filteredMembers?: ScoutMember[]) => Batch[]`.
- `useStatisticsData.ts:filterMembersByCriteria`: `(members: ScoutMember[], batchMap: Map<number, Batch>, filters: StatisticsFilterState, groups?: ScoutGroup[], districts?: District[], regions?: Region[]) => ScoutMember[]`.
- `useStatisticsData.ts:determineTargetYears`: `(batches: Batch[], filters: StatisticsFilterState) => { currentYear: number; previousYear: number }`.
- `useStatisticsData.ts:extractYearBatches`: `(allBatches: Batch[], year: number, filters?: StatisticsFilterState, members?: ScoutMember[], groups?: ScoutGroup[], districts?: District[], regions?: Region[]) => Batch[]`.
- `useStatisticsData.ts:extractYearMembers`: `(members: ScoutMember[], yearBatchIds: Set<number>, filters?: StatisticsFilterState | string, batchMap?: Map<number, Batch>, groups?: ScoutGroup[], districts?: District[], regions?: Region[]) => ScoutMember[]`.
- `useStatisticsData.ts:buildFilterSummaryLabels`: `(filters: StatisticsFilterState, recognitionTypes: RecognitionType[], regions: Region[], districts: District[]) => FilterSummaryLabels`.
- `useStatisticsData.ts:ComputeFilteredStatisticsParams`: Interface for `computeFilteredStatisticsDataset` inputs.
- `useStatisticsData.ts:computeFilteredStatisticsDataset`: `(params: ComputeFilteredStatisticsParams) => { dataset, yoyComparison }`.
- `useStatisticsData.ts:useStatisticsData`: Hook returning `{ stats, yoyComparison, hasPreviousYearData, filters, setFilter, resetFilters, hasActiveFilters, loading, error, refresh, regions, districts, availableDistricts, groups, recognitionTypes, getFilterSummaryLabels }`.

## Invariants
- `useStatisticsData.ts:initialFilterState & useStatisticsData`: `initialFilterState` sets `period: 'all'`, `startDate: ''`, `endDate: ''`, `recognitionId: ''`, `regionId: ''`, `districtId: ''`, `memberType: 'all'`. `useStatisticsData` initializes arrays to `[]`, `loading` to `true`, `error` to `null`, `reloadTrigger` to `0`, guards async state updates with an `isCancelled` flag on unmount/re-run, falls back resolved arrays via `?? []`, and falls back caught errors to `e.message ?? 'Error al cargar los datos estadísticos'`.
- `useStatisticsData.ts:useStatisticsData`: `setFilter` clears `next.districtId = ''` when `key === 'regionId' && value === ''`; `hasActiveFilters` is true when `period !== 'all'`, any of `startDate`/`endDate`/`recognitionId`/`regionId`/`districtId` is truthy, or `memberType !== undefined && memberType !== 'all'`; memoizes `hasActiveFilters`, `availableDistricts`, `filteredDataset` (`useMemo`), and `refresh`, `setFilter`, `resetFilters`, `getFilterSummaryLabels` (`useCallback`).
- `useStatisticsData.ts:buildAvailableDistricts`: Excludes `d.id === 0` and `isNoAplicaDistrict(d)`; returns all valid districts when `!regionId`; returns `[]` when `regionId === 'nacional' || regionId === '0'`; otherwise filters by `String(d.region_id) === regionId`.
- `useStatisticsData.ts:filterBatchesByCriteria & filterMembersByCriteria`: Invalid or missing `createdAt` fails non-`'all'` period checks; `'last-30'`/`'last-90'` compare from `now - days` at `00:00:00.000` to `now`; `'custom'` uses `T00:00:00.000` to `T23:59:59.999`. Territory filtering resolves via `resolveMemberHierarchy` (`'nacional'` requires `isNationalInstitutional === true`; `'0'` requires `regionId === 0 && !isNationalInstitutional`; `districtId === '0'` requires `districtId === 0`). `filterBatchesByCriteria` intersects with `filteredMembers` batch IDs only when `filteredMembers` is passed and `regionId || districtId` is truthy; `filterMembersByCriteria` also filters by `memberType` when truthy and `!== 'all'`.
- `useStatisticsData.ts:determineTargetYears, extractYearBatches & extractYearMembers`: `determineTargetYears` picks `currentYear` as `new Date().getFullYear()` for `period === 'this-year'`, `new Date(filters.startDate).getFullYear()` for `period === 'custom' && filters.startDate`, or `Math.max(...allBatchYears)` across valid batch years (defaulting to current year if empty), with `previousYear = currentYear - 1`; `extractYearBatches` and `extractYearMembers` apply non-period filters and feed `calculateYoYComparison` and `buildStatisticsDataset`.

## Side Effects
- `useStatisticsData.ts:useStatisticsData`: `useEffect` (deps `[reloadTrigger, user?.uid]`) fetches via `Promise.all([getAllBatches(user?.uid), getAllMembers(user?.uid), getHierarchyData(), getAllRecognitionTypes(user?.uid)])` and logs errors via `console.error('Failed to load statistics data:', err)`.

## Verification
- Run: `npm test -- --run`
