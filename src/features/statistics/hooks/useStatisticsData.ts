import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getAllBatches,
  getAllMembers,
  getHierarchyData,
  getRecognitionName
} from '../../batches/api';
import { getAllRecognitionTypes, RecognitionType } from '../../recognitions';
import { Batch, ScoutMember, Region, District, ScoutGroup, getUnitLabel } from '../../../types';
import { StatisticsFilterState } from '../types';
import { buildStatisticsDataset, calculateYoYComparison, resolveMemberHierarchy } from '../utils/statsCalculators';
import { getAvailableDistricts, isNoAplicaDistrict } from '../../../utils/memberHierarchy';
import { matchesDateRange } from '../../../utils/datePeriod';
import { FilterSummaryLabels } from '../utils/statsPdfExport';
import { useAuth } from '../../auth';


export const initialFilterState: StatisticsFilterState = {
  searchTerm: '',
  period: 'all',
  startDate: '',
  endDate: '',
  recognitionId: '',
  regionId: '',
  districtId: '',
  memberType: 'all'
};

export function buildAvailableDistricts(districts: District[], regionId?: string): District[] {
  if (!regionId) return districts.filter(d => d.id !== 0 && !isNoAplicaDistrict(d));
  return getAvailableDistricts(districts, regionId);
}

export function filterBatchesByCriteria(
  batches: Batch[],
  filters: StatisticsFilterState,
  filteredMembers?: ScoutMember[]
): Batch[] {
  const matchingBatchIds = filteredMembers
    ? new Set<number>(
        filteredMembers.map(m => m.batch_id).filter((id): id is number => id !== undefined)
      )
    : null;
  const hasMemberScopedFilter = Boolean(
    filters.regionId || filters.districtId || filters.searchTerm?.trim()
  );

  return batches.filter(b => {
    if (filters.period !== 'all' && !matchesDateRange(b.created_at ?? '', filters.period, filters.startDate, filters.endDate)) {
      return false;
    }
    if (filters.recognitionId && b.recognition_type !== filters.recognitionId) {
      return false;
    }
    if (matchingBatchIds && hasMemberScopedFilter) {
      return matchingBatchIds.has(b.id);
    }
    return true;
  });
}

function matchesResolvedTerritoryFilters(
  regionId: number,
  districtId: number,
  isNationalInstitutional: boolean,
  filterRegionId?: string,
  filterDistrictId?: string
): boolean {
  if (filterRegionId === 'nacional') {
    if (!isNationalInstitutional) return false;
  } else if (filterRegionId === '0') {
    if (regionId !== 0 || isNationalInstitutional) return false;
  } else if (filterRegionId) {
    if (String(regionId) !== filterRegionId) return false;
  }

  if (filterDistrictId === '0') {
    if (districtId !== 0) return false;
  } else if (filterDistrictId) {
    if (String(districtId) !== filterDistrictId) return false;
  }

  return true;
}

function resolveSearchRecognitionName(
  recognitionId: string | undefined,
  recognitionTypes: RecognitionType[] = []
): string {
  if (!recognitionId) return '';
  const match = recognitionTypes.find(
    r => r.id === recognitionId || r.name.toLowerCase() === recognitionId.toLowerCase()
  );
  return match ? match.name : getRecognitionName(recognitionId);
}

function matchesStatisticsSearchTerm(
  m: ScoutMember,
  batch: Batch | undefined,
  cleanTerm: string,
  hierarchy: { regions?: Region[]; districts?: District[]; groups?: ScoutGroup[] },
  resolved: ReturnType<typeof resolveMemberHierarchy>,
  recognitionTypes: RecognitionType[] = []
): boolean {
  if (!cleanTerm) return true;

  const regionName = resolved.isNationalInstitutional
    ? 'nacional'
    : hierarchy.regions?.find(r => r.id === resolved.regionId)?.name ?? '';
  const districtName = hierarchy.districts?.find(d => d.id === resolved.districtId)?.name ?? '';
  const groupName = hierarchy.groups?.find(g => g.id === resolved.groupId)?.name ?? '';
  const recognitionName = resolveSearchRecognitionName(batch?.recognition_type, recognitionTypes);
  const fullName = `${m.first_names ?? ''} ${m.last_names ?? ''}`.trim();
  const unitLabel = m.unit === 'no_scout' ? 'No scout' : getUnitLabel(m.unit);

  return [
    m.identity ?? '',
    fullName,
    m.recognition_code ?? '',
    unitLabel,
    m.member_type === 'young' ? 'jovenes' : 'adultos',
    batch?.id !== undefined ? String(batch.id) : '',
    batch?.comment ?? '',
    batch?.recognition_type ?? '',
    recognitionName,
    regionName,
    districtName,
    groupName
  ].some(val => val.toLowerCase().includes(cleanTerm));
}

function matchesMemberCriteria(
  m: ScoutMember,
  batch: Batch | undefined,
  filters: StatisticsFilterState,
  groups?: ScoutGroup[],
  districts?: District[],
  regions?: Region[],
  recognitionTypes: RecognitionType[] = []
): boolean {
  if (filters.period !== 'all') {
    const batchCreatedAt = batch?.created_at ?? '';
    if (!matchesDateRange(batchCreatedAt, filters.period, filters.startDate, filters.endDate)) {
      return false;
    }
  }
  if (filters.recognitionId && batch?.recognition_type !== filters.recognitionId) {
    return false;
  }
  const hierarchy = { regions, districts, groups };
  const resolved = resolveMemberHierarchy(m, batch, hierarchy);
  if (
    !matchesResolvedTerritoryFilters(
      resolved.regionId,
      resolved.districtId,
      resolved.isNationalInstitutional,
      filters.regionId,
      filters.districtId
    )
  ) {
    return false;
  }
  if (filters.memberType && filters.memberType !== 'all' && m.member_type !== filters.memberType) {
    return false;
  }
  const cleanSearch = filters.searchTerm?.trim().toLowerCase() ?? '';
  if (cleanSearch && !matchesStatisticsSearchTerm(m, batch, cleanSearch, hierarchy, resolved, recognitionTypes)) {
    return false;
  }
  return true;
}

export function filterMembersByCriteria(
  members: ScoutMember[],
  batchMap: Map<number, Batch>,
  filters: StatisticsFilterState,
  groups?: ScoutGroup[],
  districts?: District[],
  regions?: Region[],
  recognitionTypes: RecognitionType[] = []
): ScoutMember[] {
  return members.filter(m =>
    matchesMemberCriteria(
      m,
      m.batch_id ? batchMap.get(m.batch_id) : undefined,
      filters,
      groups,
      districts,
      regions,
      recognitionTypes
    )
  );
}

export function determineTargetYears(
  batches: Batch[],
  filters: StatisticsFilterState
): { currentYear: number; previousYear: number } {
  let currentYear: number;
  if (filters.period === 'this-year') {
    currentYear = new Date().getFullYear();
  } else if (filters.period === 'custom' && filters.startDate) {
    currentYear = new Date(filters.startDate).getFullYear();
  } else {
    const allBatchYears = batches
      .map(b => (b.created_at ? new Date(b.created_at).getFullYear() : null))
      .filter((y): y is number => y !== null && !Number.isNaN(y));
    currentYear = allBatchYears.length > 0 ? Math.max(...allBatchYears) : new Date().getFullYear();
  }
  return { currentYear, previousYear: currentYear - 1 };
}

export interface StatisticsLookupContext {
  groups?: ScoutGroup[];
  districts?: District[];
  regions?: Region[];
  recognitionTypes?: RecognitionType[];
}

export function extractYearBatches(
  allBatches: Batch[],
  year: number,
  filters?: StatisticsFilterState,
  members?: ScoutMember[],
  context: StatisticsLookupContext = {}
): Batch[] {
  const { groups, districts, regions, recognitionTypes = [] } = context;
  const batchMap = new Map<number, Batch>();
  allBatches.forEach(b => batchMap.set(b.id, b));

  const cleanSearch = filters?.searchTerm?.trim().toLowerCase() ?? '';
  const hasMemberFilter = Boolean(
    filters?.regionId ||
      filters?.districtId ||
      cleanSearch ||
      (filters?.memberType && filters.memberType !== 'all')
  );

  let validBatchIdsWithMembers: Set<number> | null = null;
  if (hasMemberFilter && members) {
    validBatchIdsWithMembers = new Set<number>();
    const hierarchy = { regions, districts, groups };
    members.forEach(m => {
      const b = m.batch_id ? batchMap.get(m.batch_id) : undefined;
      if (!b) return;
      if (filters?.memberType && filters.memberType !== 'all' && m.member_type !== filters.memberType) {
        return;
      }
      const resolved = resolveMemberHierarchy(m, b, hierarchy);
      if (
        !matchesResolvedTerritoryFilters(
          resolved.regionId,
          resolved.districtId,
          resolved.isNationalInstitutional,
          filters?.regionId,
          filters?.districtId
        )
      ) {
        return;
      }
      if (cleanSearch && !matchesStatisticsSearchTerm(m, b, cleanSearch, hierarchy, resolved, recognitionTypes)) {
        return;
      }
      validBatchIdsWithMembers?.add(b.id);
    });
  }

  return allBatches.filter(b => {
    if (!b.created_at) return false;
    const d = new Date(b.created_at);
    if (Number.isNaN(d.getTime()) || d.getFullYear() !== year) return false;
    if (filters?.recognitionId && b.recognition_type !== filters.recognitionId) return false;
    if (hasMemberFilter && validBatchIdsWithMembers) {
      return validBatchIdsWithMembers.has(b.id);
    }
    return true;
  });
}

export function extractYearMembers(
  members: ScoutMember[],
  yearBatchIds: Set<number>,
  filters?: StatisticsFilterState | string,
  batchMap?: Map<number, Batch>,
  context: StatisticsLookupContext = {}
): ScoutMember[] {
  const { groups, districts, regions, recognitionTypes = [] } = context;
  const memberType = typeof filters === 'string' ? filters : filters?.memberType;
  const filterState = typeof filters === 'object' ? filters : undefined;
  const cleanSearch = filterState?.searchTerm?.trim().toLowerCase() ?? '';
  const hierarchy = { regions, districts, groups };

  return members.filter(m => {
    if (!m.batch_id || !yearBatchIds.has(m.batch_id)) return false;
    if (memberType && memberType !== 'all' && m.member_type !== memberType) return false;
    if (filterState?.regionId || filterState?.districtId || cleanSearch) {
      const b = batchMap ? batchMap.get(m.batch_id) : undefined;
      const resolved = resolveMemberHierarchy(m, b, hierarchy);
      if (
        !matchesResolvedTerritoryFilters(
          resolved.regionId,
          resolved.districtId,
          resolved.isNationalInstitutional,
          filterState?.regionId,
          filterState?.districtId
        )
      ) {
        return false;
      }
      if (cleanSearch && !matchesStatisticsSearchTerm(m, b, cleanSearch, hierarchy, resolved, recognitionTypes)) {
        return false;
      }
    }
    return true;
  });
}

function getPeriodSummaryLabel(filters: StatisticsFilterState): string | undefined {
  if (filters.period === 'this-year') return 'Este Año';
  if (filters.period === 'this-month') return 'Este Mes';
  if (filters.period === 'last-30') return 'Últimos 30 días';
  if (filters.period === 'last-90') return 'Últimos 90 días';
  if (filters.period === 'custom') {
    return `Desde ${filters.startDate || 'inicio'} hasta ${filters.endDate || 'fin'}`;
  }
  return undefined;
}

function getRecognitionSummaryLabel(recognitionId?: string, recognitionTypes: RecognitionType[] = []): string | undefined {
  if (!recognitionId) return undefined;
  const rec = recognitionTypes.find(r => r.id === recognitionId);
  return rec ? rec.name : recognitionId;
}

function getRegionSummaryLabel(regionId?: string, regions: Region[] = []): string | undefined {
  if (!regionId) return undefined;
  if (regionId === 'nacional') return 'Nacional';
  if (regionId === '0') return 'No aplica';
  const reg = regions.find(r => String(r.id) === regionId);
  return reg ? reg.name : `Región ${regionId}`;
}

function getDistrictSummaryLabel(districtId?: string, districts: District[] = []): string | undefined {
  if (!districtId) return undefined;
  if (districtId === '0') return 'No aplica';
  const dist = districts.find(d => String(d.id) === districtId);
  return dist ? dist.name : `Distrito ${districtId}`;
}

function getMemberTypeSummaryLabel(memberType?: string): string | undefined {
  if (memberType === 'young') return 'Jóvenes';
  if (memberType === 'adult') return 'Adultos';
  return undefined;
}

export function buildFilterSummaryLabels(
  filters: StatisticsFilterState,
  recognitionTypes: RecognitionType[],
  regions: Region[],
  districts: District[]
): FilterSummaryLabels {
  const trimmedSearch = filters.searchTerm?.trim();
  return {
    ...(trimmedSearch ? { searchLabel: trimmedSearch } : {}),
    periodLabel: getPeriodSummaryLabel(filters),
    recognitionLabel: getRecognitionSummaryLabel(filters.recognitionId, recognitionTypes),
    regionLabel: getRegionSummaryLabel(filters.regionId, regions),
    districtLabel: getDistrictSummaryLabel(filters.districtId, districts),
    memberTypeLabel: getMemberTypeSummaryLabel(filters.memberType)
  };
}

export interface ComputeFilteredStatisticsParams {
  batches: Batch[];
  members: ScoutMember[];
  regions: Region[];
  districts: District[];
  groups?: ScoutGroup[];
  recognitionTypes: RecognitionType[];
  filters: StatisticsFilterState;
}

export function computeFilteredStatisticsDataset(params: ComputeFilteredStatisticsParams) {
  const { batches, members, regions, districts, groups, recognitionTypes, filters } = params;
  const batchMap = new Map<number, Batch>();
  batches.forEach(b => batchMap.set(b.id, b));

  // Filter members
  const filteredMembers = filterMembersByCriteria(
    members,
    batchMap,
    filters,
    groups,
    districts,
    regions,
    recognitionTypes
  );

  // Filter batches matching the criteria
  const filteredBatches = filterBatchesByCriteria(batches, filters, filteredMembers);

  // Determine current and previous year for YoY comparison
  const { currentYear, previousYear } = determineTargetYears(batches, filters);

  // Filter current year and previous year batches applying active non-period filters
  const lookupContext: StatisticsLookupContext = {
    groups,
    districts,
    regions,
    recognitionTypes
  };
  const currentYearBatches = extractYearBatches(
    batches,
    currentYear,
    filters,
    members,
    lookupContext
  );
  const previousYearBatches = extractYearBatches(
    batches,
    previousYear,
    filters,
    members,
    lookupContext
  );

  const currentYearBatchIds = new Set<number>(currentYearBatches.map(b => b.id));
  const previousYearBatchIds = new Set<number>(previousYearBatches.map(b => b.id));

  const currentYearMembers = extractYearMembers(
    members,
    currentYearBatchIds,
    filters,
    batchMap,
    lookupContext
  );
  const previousYearMembers = extractYearMembers(
    members,
    previousYearBatchIds,
    filters,
    batchMap,
    lookupContext
  );

  const yoyComparison = calculateYoYComparison({
    currentMembers: currentYearMembers,
    previousMembers: previousYearMembers,
    currentBatches: currentYearBatches,
    previousBatches: previousYearBatches,
    regions,
    districts,
    groups,
    currentYear,
    previousYear
  });

  const dataset = buildStatisticsDataset(
    filteredMembers,
    filteredBatches,
    regions,
    districts,
    recognitionTypes,
    yoyComparison,
    groups
  );

  return { dataset, yoyComparison };
}

export function useStatisticsData() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [recognitionTypes, setRecognitionTypes] = useState<RecognitionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<StatisticsFilterState>(initialFilterState);

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    Promise.all([
      getAllBatches(user?.uid),
      getAllMembers(user?.uid),
      getHierarchyData(),
      getAllRecognitionTypes(user?.uid)
    ])
      .then(([batchList, memberList, hierarchy, recTypes]) => {
        if (!isCancelled) {
          setBatches(batchList ?? []);
          setMembers(memberList ?? []);
          setRegions(hierarchy.regions ?? []);
          setDistricts(hierarchy.districts ?? []);
          setGroups(hierarchy.groups ?? []);
          setRecognitionTypes(recTypes ?? []);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          console.error('Failed to load statistics data:', err);
          const e = err as Error;
          setError(e.message ?? 'Error al cargar los datos estadísticos');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [reloadTrigger, user?.uid]);

  const refresh = useCallback(() => {
    setLoading(true);
    setReloadTrigger(prev => prev + 1);
  }, []);

  const setFilter = useCallback(<K extends keyof StatisticsFilterState>(key: K, value: StatisticsFilterState[K]) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      // Reset district if region changed and district doesn't belong to it
      if (key === 'regionId' && value === '') {
        next.districtId = '';
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilterState);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(filters.searchTerm?.trim()) ||
      filters.period !== 'all' ||
      Boolean(filters.startDate) ||
      Boolean(filters.endDate) ||
      Boolean(filters.recognitionId) ||
      Boolean(filters.regionId) ||
      Boolean(filters.districtId) ||
      (filters.memberType !== undefined && filters.memberType !== 'all')
    );
  }, [filters]);

  const availableDistricts = useMemo(() => {
    return buildAvailableDistricts(districts, filters.regionId);
  }, [districts, filters.regionId]);

  // Reactive filtering of Batches and Members
  const filteredDataset = useMemo(() => {
    return computeFilteredStatisticsDataset({
      batches,
      members,
      regions,
      districts,
      groups,
      recognitionTypes,
      filters
    });
  }, [batches, members, regions, districts, groups, recognitionTypes, filters]);

  const getFilterSummaryLabels = useCallback((): FilterSummaryLabels => {
    return buildFilterSummaryLabels(filters, recognitionTypes, regions, districts);
  }, [filters, recognitionTypes, regions, districts]);

  return {
    stats: filteredDataset.dataset,
    yoyComparison: filteredDataset.yoyComparison,
    hasPreviousYearData: filteredDataset.yoyComparison.hasPreviousYearData,
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters,
    loading,
    error,
    refresh,
    regions,
    districts,
    availableDistricts,
    groups,
    recognitionTypes,
    getFilterSummaryLabels
  };
}
