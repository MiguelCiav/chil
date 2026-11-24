# Shared Utilities (`src/utils/`)

## Overview

Cross-feature pure utility modules shared across `batches`, `statistics`, `summary`, and `src/domain/components/` for date-period evaluation (`datePeriod.ts`) and member-first Scout territorial hierarchy resolution and cascading filters (`memberHierarchy.ts`).

## Interface

- `datePeriod.ts:DatePeriodFilter`: Union type `'all' | 'this-year' | 'this-month' | 'last-30' | 'last-90' | 'custom'`.
- `datePeriod.ts:DATE_PERIOD_OPTIONS`: Readonly array of `{ value: DatePeriodFilter; label: string }` Spanish filter options.
- `datePeriod.ts:matchesDateRange`: `(createdAt: string, period: string, startDate?: string, endDate?: string) => boolean`.
- `memberHierarchy.ts:NO_APLICA_DISTRICT_NAME`: Constant `'NO APLICA'`.
- `memberHierarchy.ts:HierarchyLookup`: Interface `{ regions?: Region[]; districts?: District[]; groups?: ScoutGroup[] }`.
- `memberHierarchy.ts:ResolvedMemberHierarchy`: Interface `{ regionId: number; districtId: number; groupId: number; isNationalInstitutional: boolean }`.
- `memberHierarchy.ts:HierarchyIdInput`: Type alias `string | number | undefined`.
- `memberHierarchy.ts:isNoAplicaDistrict`: `(district?: { name?: string } | null) => boolean`.
- `memberHierarchy.ts:resolveMemberHierarchy`: `(member: ScoutMember, batch?: Batch | null, hierarchy?: HierarchyLookup) => ResolvedMemberHierarchy`.
- `memberHierarchy.ts:getAvailableDistricts`: `(districts: readonly District[], regionId: HierarchyIdInput, options?: { includeNoAplicaDistrict?: boolean; allowAllWhenUnset?: boolean }) => District[]`.
- `memberHierarchy.ts:getAvailableGroups`: `(groups: readonly ScoutGroup[], districts: readonly District[], regionId: HierarchyIdInput, districtId: HierarchyIdInput, options?: { allowAllWhenUnset?: boolean }) => ScoutGroup[]`.
- `memberHierarchy.ts:resolveParentHierarchyForSelection`: `(level: 'district' | 'group', selectedId: number, hierarchy: { regions: readonly Region[]; districts: readonly District[]; groups: readonly ScoutGroup[] }) => { region_id: number; region_name: string; district_id: number; district_name: string; group_id?: number; group_name?: string }`.

## Invariants

- `datePeriod.ts:matchesDateRange`: Returns `true` immediately when `period === 'all'`, `false` when `createdAt` is empty or parses to `NaN`, bounds `'custom'` endpoints with local `T00:00:00.000` / `T23:59:59.999` limits, and treats unrecognized non-custom period strings as matching.
- `memberHierarchy.ts:resolveMemberHierarchy`: Forces `{ regionId: 0, districtId: 0, groupId: 0, isNationalInstitutional: false }` for `member.unit === 'no_scout'` ignoring any legacy `batch` IDs; resolves `group -> district -> region` upward when `groupId > 0` matches `hierarchy.groups`; normalizes positive-ID `"NO APLICA"` districts (`isNoAplicaDistrict`) to `districtId: 0` while preserving parent region; falls back to `batch` scalars per field only when `member` IDs are `null`/`undefined`/`NaN`; and marks `isNationalInstitutional: true` strictly when `member.unit === 'institucional'` with `0, 0, 0`.
- `memberHierarchy.ts:getAvailableDistricts & getAvailableGroups`: Exclude sentinel `id === 0` entries, return `[]` for `'nacional'` or `'0'`, filter out `"NO APLICA"` districts by default, and return all valid entries when unset only if `options?.allowAllWhenUnset` is `true`.

## Side Effects

- None (pure helpers; `datePeriod.ts` reads `new Date()` for relative periods `'this-year'`, `'this-month'`, `'last-30'`, and `'last-90'`).

## Verification

- Run: `npm test -- --run`
