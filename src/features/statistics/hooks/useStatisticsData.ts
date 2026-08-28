import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getAllBatches,
  getAllMembers,
  getHierarchyData
} from '../../batches/api';
import { getAllRecognitionTypes, RecognitionType } from '../../recognitions';
import { Batch, ScoutMember, Region, District, ScoutGroup } from '../../batches/types';
import { StatisticsFilterState } from '../types';
import { buildStatisticsDataset, calculateYoYComparison } from '../utils/statsCalculators';
import { FilterSummaryLabels } from '../utils/statsPdfExport';
import { useAuth } from '../../auth';


export const initialFilterState: StatisticsFilterState = {
  period: 'all',
  startDate: '',
  endDate: '',
  recognitionId: '',
  regionId: '',
  districtId: '',
  memberType: 'all'
};

function isWithinCustomRange(itemDate: Date, startDate?: string, endDate?: string): boolean {
  if (startDate && endDate) {
    const sDate = new Date(`${startDate}T00:00:00.000`);
    const eDate = new Date(`${endDate}T23:59:59.999`);
    return itemDate >= sDate && itemDate <= eDate;
  }
  if (startDate) {
    const sDate = new Date(`${startDate}T00:00:00.000`);
    return itemDate >= sDate;
  }
  if (endDate) {
    const eDate = new Date(`${endDate}T23:59:59.999`);
    return itemDate <= eDate;
  }
  return true;
}

function isWithinPastDays(itemDate: Date, now: Date, days: number): boolean {
  const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  pastDate.setHours(0, 0, 0, 0);
  return itemDate >= pastDate && itemDate <= now;
}

function matchesDateRange(createdAt: string, period: string, startDate?: string, endDate?: string): boolean {
  if (!createdAt) return false;
  const itemDate = new Date(createdAt);
  if (Number.isNaN(itemDate.getTime())) return false;

  const now = new Date();

  switch (period) {
    case 'all':
      return true;
    case 'this-year':
      return itemDate.getFullYear() === now.getFullYear();
    case 'this-month':
      return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
    case 'last-30':
      return isWithinPastDays(itemDate, now, 30);
    case 'last-90':
      return isWithinPastDays(itemDate, now, 90);
    case 'custom':
      return isWithinCustomRange(itemDate, startDate, endDate);
    default:
      return true;
  }
}

export function buildAvailableDistricts(districts: District[], regionId?: string): District[] {
  if (!regionId) return districts;
  return districts.filter(d => String(d.region_id) === regionId);
}

function matchesBatchCriteria(b: Batch, filters: StatisticsFilterState): boolean {
  if (filters.period !== 'all' && !matchesDateRange(b.created_at ?? '', filters.period, filters.startDate, filters.endDate)) {
    return false;
  }
  if (filters.recognitionId && b.recognition_type !== filters.recognitionId) {
    return false;
  }
  if (filters.regionId && String(b.region_id) !== filters.regionId) {
    return false;
  }
  if (filters.districtId && String(b.district_id) !== filters.districtId) {
    return false;
  }
  return true;
}

export function filterBatchesByCriteria(batches: Batch[], filters: StatisticsFilterState): Batch[] {
  return batches.filter(b => matchesBatchCriteria(b, filters));
}

function matchesMemberCriteria(m: ScoutMember, batch: Batch | undefined, filters: StatisticsFilterState): boolean {
  if (filters.period !== 'all') {
    const batchCreatedAt = batch?.created_at ?? '';
    if (!matchesDateRange(batchCreatedAt, filters.period, filters.startDate, filters.endDate)) {
      return false;
    }
  }
  if (filters.recognitionId && batch?.recognition_type !== filters.recognitionId) {
    return false;
  }
  if (filters.regionId && String(batch?.region_id) !== filters.regionId) {
    return false;
  }
  if (filters.districtId && String(batch?.district_id) !== filters.districtId) {
    return false;
  }
  if (filters.memberType && filters.memberType !== 'all' && m.member_type !== filters.memberType) {
    return false;
  }
  return true;
}

export function filterMembersByCriteria(
  members: ScoutMember[],
  batchMap: Map<number, Batch>,
  filters: StatisticsFilterState
): ScoutMember[] {
  return members.filter(m => matchesMemberCriteria(m, m.batch_id ? batchMap.get(m.batch_id) : undefined, filters));
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

export function extractYearBatches(
  allBatches: Batch[],
  year: number,
  filters?: StatisticsFilterState
): Batch[] {
  return allBatches.filter(b => {
    if (!b.created_at) return false;
    const d = new Date(b.created_at);
    if (Number.isNaN(d.getTime()) || d.getFullYear() !== year) return false;
    if (filters?.recognitionId && b.recognition_type !== filters.recognitionId) return false;
    if (filters?.regionId && String(b.region_id) !== filters.regionId) return false;
    if (filters?.districtId && String(b.district_id) !== filters.districtId) return false;
    return true;
  });
}

export function extractYearMembers(
  members: ScoutMember[],
  yearBatchIds: Set<number>,
  memberType?: string
): ScoutMember[] {
  return members.filter(m => {
    if (!m.batch_id || !yearBatchIds.has(m.batch_id)) return false;
    if (memberType && memberType !== 'all' && m.member_type !== memberType) return false;
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
  const reg = regions.find(r => String(r.id) === regionId);
  return reg ? reg.name : `Región ${regionId}`;
}

function getDistrictSummaryLabel(districtId?: string, districts: District[] = []): string | undefined {
  if (!districtId) return undefined;
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
  return {
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
  recognitionTypes: RecognitionType[];
  filters: StatisticsFilterState;
}

export function computeFilteredStatisticsDataset(params: ComputeFilteredStatisticsParams) {
  const { batches, members, regions, districts, recognitionTypes, filters } = params;
  const batchMap = new Map<number, Batch>();
  batches.forEach(b => batchMap.set(b.id, b));

  // Filter members
  const filteredMembers = filterMembersByCriteria(members, batchMap, filters);

  // Filter batches matching the criteria
  const filteredBatches = filterBatchesByCriteria(batches, filters);

  // Determine current and previous year for YoY comparison
  const { currentYear, previousYear } = determineTargetYears(batches, filters);

  // Filter current year and previous year batches applying active non-period filters
  const currentYearBatches = extractYearBatches(batches, currentYear, filters);
  const previousYearBatches = extractYearBatches(batches, previousYear, filters);

  const currentYearBatchIds = new Set<number>(currentYearBatches.map(b => b.id));
  const previousYearBatchIds = new Set<number>(previousYearBatches.map(b => b.id));

  const currentYearMembers = extractYearMembers(members, currentYearBatchIds, filters.memberType);
  const previousYearMembers = extractYearMembers(members, previousYearBatchIds, filters.memberType);

  const yoyComparison = calculateYoYComparison({
    currentMembers: currentYearMembers,
    previousMembers: previousYearMembers,
    currentBatches: currentYearBatches,
    previousBatches: previousYearBatches,
    regions,
    districts,
    currentYear,
    previousYear
  });

  const dataset = buildStatisticsDataset(
    filteredMembers,
    filteredBatches,
    regions,
    districts,
    recognitionTypes,
    yoyComparison
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
      recognitionTypes,
      filters
    });
  }, [batches, members, regions, districts, recognitionTypes, filters]);

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
