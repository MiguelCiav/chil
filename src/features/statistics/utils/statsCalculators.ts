import { Batch, ScoutMember, Region, District, ScoutUnit, SCOUT_UNITS } from '../../batches/types';
import { getRecognitionBadgeStyle, getRecognitionName, RecognitionTypeInfo } from '../../batches/api';
import {
  KpiMetrics,
  MonthlyTrendData,
  RecognitionRankingData,
  DemographicsData,
  GeographicBreakdownData,
  GeographicItem,
  StatusBreakdownData,
  UnitDistributionData,
  UnitDistributionItem,
  StatisticsDataset,
  YoYComparisonData,
  YoYCountMetric,
  YoYRegionItem,
  YoYDistrictItem,
  YoYUnitItem,
  YoYDemographics,
  YoYMonthlyItem,
  CalculateYoYOptions
} from '../types';

export const MONTH_LABELS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

/**
 * Calculates percentage variation between current and previous values
 */
export function calculatePercentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/**
 * Partitions batches and members into currentYear and previousYear datasets
 */
export function partitionDataByYear(
  members: ScoutMember[],
  batches: Batch[],
  targetYear?: number
): {
  currentYear: number;
  previousYear: number;
  currentBatches: Batch[];
  previousBatches: Batch[];
  currentMembers: ScoutMember[];
  previousMembers: ScoutMember[];
} {
  let currentYear = targetYear;
  if (!currentYear) {
    if (batches.length > 0) {
      const years = batches
        .map(b => (b.created_at ? new Date(b.created_at).getFullYear() : null))
        .filter((y): y is number => y !== null && !Number.isNaN(y));
      if (years.length > 0) {
        currentYear = Math.max(...years);
      }
    }
    currentYear ??= new Date().getFullYear();
  }

  const previousYear = currentYear - 1;

  const currentBatches = batches.filter(b => {
    if (!b.created_at) return false;
    const d = new Date(b.created_at);
    return !Number.isNaN(d.getTime()) && d.getFullYear() === currentYear;
  });

  const previousBatches = batches.filter(b => {
    if (!b.created_at) return false;
    const d = new Date(b.created_at);
    return !Number.isNaN(d.getTime()) && d.getFullYear() === previousYear;
  });

  const currentBatchIds = new Set<number>(currentBatches.map(b => b.id));
  const previousBatchIds = new Set<number>(previousBatches.map(b => b.id));

  const currentMembers = members.filter(m => {
    if (m.batch_id && currentBatchIds.has(m.batch_id)) return true;
    if (!m.batch_id && !targetYear) return true;
    return false;
  });

  const previousMembers = members.filter(m => {
    if (m.batch_id && previousBatchIds.has(m.batch_id)) return true;
    return false;
  });

  return {
    currentYear,
    previousYear,
    currentBatches,
    previousBatches,
    currentMembers,
    previousMembers
  };
}

function calculateYoYCountMetric(current: number, previous: number): YoYCountMetric {
  return {
    current,
    previous,
    diff: current - previous,
    percentChange: calculatePercentChange(current, previous)
  };
}

function buildYoYRegionComparison(
  currentMembers: ScoutMember[],
  previousMembers: ScoutMember[],
  currentBatchMap: Map<number, Batch>,
  previousBatchMap: Map<number, Batch>,
  regions: Region[],
  currentMembersCount: number,
  previousMembersCount: number
): YoYRegionItem[] {
  const currentRegionCounts = new Map<number, number>();
  currentMembers.forEach(m => {
    if (m.batch_id && currentBatchMap.has(m.batch_id)) {
      const b = currentBatchMap.get(m.batch_id);
      if (b?.region_id) {
        currentRegionCounts.set(b.region_id, (currentRegionCounts.get(b.region_id) ?? 0) + 1);
      }
    }
  });

  const previousRegionCounts = new Map<number, number>();
  previousMembers.forEach(m => {
    if (m.batch_id && previousBatchMap.has(m.batch_id)) {
      const b = previousBatchMap.get(m.batch_id);
      if (b?.region_id) {
        previousRegionCounts.set(b.region_id, (previousRegionCounts.get(b.region_id) ?? 0) + 1);
      }
    }
  });

  const allRegionIds = new Set<number>([
    ...currentRegionCounts.keys(),
    ...previousRegionCounts.keys()
  ]);

  const yoyRegions: YoYRegionItem[] = Array.from(allRegionIds).map(regId => {
    const regObj = regions.find(r => r.id === regId);
    const name = regObj?.name ?? `Región ${regId}`;
    const currentCount = currentRegionCounts.get(regId) ?? 0;
    const previousCount = previousRegionCounts.get(regId) ?? 0;
    const diff = currentCount - previousCount;
    const percentChange = calculatePercentChange(currentCount, previousCount);
    const currentPercentage = currentMembersCount > 0 ? Number(((currentCount / currentMembersCount) * 100).toFixed(1)) : 0;
    const previousPercentage = previousMembersCount > 0 ? Number(((previousCount / previousMembersCount) * 100).toFixed(1)) : 0;

    return {
      id: regId,
      name,
      currentCount,
      previousCount,
      diff,
      percentChange,
      currentPercentage,
      previousPercentage
    };
  });

  return yoyRegions.sort((a, b) => {
    if (b.currentCount !== a.currentCount) return b.currentCount - a.currentCount;
    if (b.previousCount !== a.previousCount) return b.previousCount - a.previousCount;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });
}

export interface BuildYoYDistrictComparisonOptions {
  currentMembers: ScoutMember[];
  previousMembers: ScoutMember[];
  currentBatchMap: Map<number, Batch>;
  previousBatchMap: Map<number, Batch>;
  regions: Region[];
  districts: District[];
  currentMembersCount: number;
  previousMembersCount: number;
}

function buildYoYDistrictComparison(
  options: BuildYoYDistrictComparisonOptions
): YoYDistrictItem[] {
  const {
    currentMembers,
    previousMembers,
    currentBatchMap,
    previousBatchMap,
    regions,
    districts,
    currentMembersCount,
    previousMembersCount
  } = options;
  const currentDistrictCounts = new Map<number, number>();
  currentMembers.forEach(m => {
    if (m.batch_id && currentBatchMap.has(m.batch_id)) {
      const b = currentBatchMap.get(m.batch_id);
      if (b?.district_id) {
        currentDistrictCounts.set(b.district_id, (currentDistrictCounts.get(b.district_id) ?? 0) + 1);
      }
    }
  });

  const previousDistrictCounts = new Map<number, number>();
  previousMembers.forEach(m => {
    if (m.batch_id && previousBatchMap.has(m.batch_id)) {
      const b = previousBatchMap.get(m.batch_id);
      if (b?.district_id) {
        previousDistrictCounts.set(b.district_id, (previousDistrictCounts.get(b.district_id) ?? 0) + 1);
      }
    }
  });

  const allDistrictIds = new Set<number>([
    ...currentDistrictCounts.keys(),
    ...previousDistrictCounts.keys()
  ]);

  const yoyDistricts: YoYDistrictItem[] = Array.from(allDistrictIds).map(distId => {
    const distObj = districts.find(d => d.id === distId);
    const regObj = distObj ? regions.find(r => r.id === distObj.region_id) : undefined;
    const name = distObj?.name ?? `Distrito ${distId}`;
    const parentName = regObj?.name ?? undefined;
    const currentCount = currentDistrictCounts.get(distId) ?? 0;
    const previousCount = previousDistrictCounts.get(distId) ?? 0;
    const diff = currentCount - previousCount;
    const percentChange = calculatePercentChange(currentCount, previousCount);
    const currentPercentage = currentMembersCount > 0 ? Number(((currentCount / currentMembersCount) * 100).toFixed(1)) : 0;
    const previousPercentage = previousMembersCount > 0 ? Number(((previousCount / previousMembersCount) * 100).toFixed(1)) : 0;

    return {
      id: distId,
      name,
      parentName,
      currentCount,
      previousCount,
      diff,
      percentChange,
      currentPercentage,
      previousPercentage
    };
  });

  return yoyDistricts.sort((a, b) => {
    if (b.currentCount !== a.currentCount) return b.currentCount - a.currentCount;
    if (b.previousCount !== a.previousCount) return b.previousCount - a.previousCount;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });
}

function buildYoYUnitComparison(
  currentMembers: ScoutMember[],
  previousMembers: ScoutMember[],
  currentMembersCount: number,
  previousMembersCount: number
): YoYUnitItem[] {
  const unitOrder: ScoutUnit[] = ['manada', 'tropa', 'caminantes', 'clan', 'institucional', 'no_scout'];
  const currentUnitCounts = new Map<ScoutUnit, number>();
  const previousUnitCounts = new Map<ScoutUnit, number>();
  unitOrder.forEach(u => {
    currentUnitCounts.set(u, 0);
    previousUnitCounts.set(u, 0);
  });

  currentMembers.forEach(m => {
    const fallbackUnit: ScoutUnit = m.member_type === 'young' ? 'tropa' : 'institucional';
    const u: ScoutUnit = m.unit ?? fallbackUnit;
    currentUnitCounts.set(u, (currentUnitCounts.get(u) ?? 0) + 1);
  });

  previousMembers.forEach(m => {
    const fallbackUnit: ScoutUnit = m.member_type === 'young' ? 'tropa' : 'institucional';
    const u: ScoutUnit = m.unit ?? fallbackUnit;
    previousUnitCounts.set(u, (previousUnitCounts.get(u) ?? 0) + 1);
  });

  return unitOrder.map(u => {
    const currentCount = currentUnitCounts.get(u) ?? 0;
    const previousCount = previousUnitCounts.get(u) ?? 0;
    const diff = currentCount - previousCount;
    const percentChange = calculatePercentChange(currentCount, previousCount);
    const currentPercentage = currentMembersCount > 0 ? Number(((currentCount / currentMembersCount) * 100).toFixed(1)) : 0;
    const previousPercentage = previousMembersCount > 0 ? Number(((previousCount / previousMembersCount) * 100).toFixed(1)) : 0;

    return {
      unit: u,
      label: SCOUT_UNITS[u].label,
      badgeClass: SCOUT_UNITS[u].badgeClass,
      currentCount,
      previousCount,
      diff,
      percentChange,
      currentPercentage,
      previousPercentage
    };
  });
}

function buildYoYDemographicsComparison(
  currentMembers: ScoutMember[],
  previousMembers: ScoutMember[],
  currentMembersCount: number,
  previousMembersCount: number
): YoYDemographics {
  const currentYoung = currentMembers.filter(m => m.member_type === 'young').length;
  const previousYoung = previousMembers.filter(m => m.member_type === 'young').length;
  const currentAdult = currentMembers.filter(m => m.member_type === 'adult').length;
  const previousAdult = previousMembers.filter(m => m.member_type === 'adult').length;

  const youngPercentChange = calculatePercentChange(currentYoung, previousYoung);
  const adultPercentChange = calculatePercentChange(currentAdult, previousAdult);

  return {
    young: {
      current: currentYoung,
      previous: previousYoung,
      diff: currentYoung - previousYoung,
      percentChange: youngPercentChange,
      currentPercentage: currentMembersCount > 0 ? Number(((currentYoung / currentMembersCount) * 100).toFixed(1)) : 0,
      previousPercentage: previousMembersCount > 0 ? Number(((previousYoung / previousMembersCount) * 100).toFixed(1)) : 0
    },
    adult: {
      current: currentAdult,
      previous: previousAdult,
      diff: currentAdult - previousAdult,
      percentChange: adultPercentChange,
      currentPercentage: currentMembersCount > 0 ? Number(((currentAdult / currentMembersCount) * 100).toFixed(1)) : 0,
      previousPercentage: previousMembersCount > 0 ? Number(((previousAdult / previousMembersCount) * 100).toFixed(1)) : 0
    },
    total: {
      current: currentMembersCount,
      previous: previousMembersCount,
      diff: currentMembersCount - previousMembersCount,
      percentChange: calculatePercentChange(currentMembersCount, previousMembersCount)
    }
  };
}

function buildYoYMonthlyComparison(
  currentMembers: ScoutMember[],
  previousMembers: ScoutMember[],
  currentBatchMap: Map<number, Batch>,
  previousBatchMap: Map<number, Batch>,
  cYear: number,
  pYear: number
): YoYMonthlyItem[] {
  const currentMonthCounts = new Array(12).fill(0);
  const previousMonthCounts = new Array(12).fill(0);

  currentMembers.forEach(m => {
    let dateStr = '';
    if (m.batch_id && currentBatchMap.has(m.batch_id)) {
      dateStr = currentBatchMap.get(m.batch_id)?.created_at ?? '';
    }
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() === cYear) {
      const monthIdx = d.getMonth();
      if (monthIdx >= 0 && monthIdx < 12) currentMonthCounts[monthIdx]++;
    }
  });

  previousMembers.forEach(m => {
    let dateStr = '';
    if (m.batch_id && previousBatchMap.has(m.batch_id)) {
      dateStr = previousBatchMap.get(m.batch_id)?.created_at ?? '';
    }
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() === pYear) {
      const monthIdx = d.getMonth();
      if (monthIdx >= 0 && monthIdx < 12) previousMonthCounts[monthIdx]++;
    }
  });

  return Array.from({ length: 12 }, (_, i) => {
    const currentCount = currentMonthCounts[i];
    const previousCount = previousMonthCounts[i];
    const diff = currentCount - previousCount;
    const percentChange = calculatePercentChange(currentCount, previousCount);
    return {
      monthIndex: i,
      label: MONTH_LABELS_ES[i],
      currentCount,
      previousCount,
      diff,
      percentChange
    };
  });
}

/**
 * Calculates Year-over-Year (YoY) comparison across all statistical dimensions
 */
export function calculateYoYComparison(options: CalculateYoYOptions): YoYComparisonData {
  const {
    currentMembers,
    previousMembers,
    currentBatches = [],
    previousBatches = [],
    regions = [],
    districts = [],
    currentYear,
    previousYear
  } = options;

  const cYear = currentYear ?? new Date().getFullYear();
  const pYear = previousYear ?? cYear - 1;
  const hasPreviousYearData = previousMembers.length > 0;

  // 1. KPI Diplomas
  const currentTotalDiplomas = currentMembers.filter(m => m.status === 'active' || m.status === 'exceptional').length;
  const previousTotalDiplomas = previousMembers.filter(m => m.status === 'active' || m.status === 'exceptional').length;
  const totalDiplomas = calculateYoYCountMetric(currentTotalDiplomas, previousTotalDiplomas);

  // 2. KPI Batches
  const totalBatches = calculateYoYCountMetric(currentBatches.length, previousBatches.length);

  // 3. KPI Total Members
  const currentMembersCount = currentMembers.length;
  const previousMembersCount = previousMembers.length;
  const totalMembers = calculateYoYCountMetric(currentMembersCount, previousMembersCount);

  // Batch Maps
  const currentBatchMap = new Map<number, Batch>();
  currentBatches.forEach(b => currentBatchMap.set(b.id, b));
  const previousBatchMap = new Map<number, Batch>();
  previousBatches.forEach(b => previousBatchMap.set(b.id, b));

  // 4. Region Comparison
  const yoyRegions = buildYoYRegionComparison(
    currentMembers,
    previousMembers,
    currentBatchMap,
    previousBatchMap,
    regions,
    currentMembersCount,
    previousMembersCount
  );

  // 5. District Comparison
  const yoyDistricts = buildYoYDistrictComparison({
    currentMembers,
    previousMembers,
    currentBatchMap,
    previousBatchMap,
    regions,
    districts,
    currentMembersCount,
    previousMembersCount
  });

  // 6. Unit Comparison
  const yoyUnits = buildYoYUnitComparison(
    currentMembers,
    previousMembers,
    currentMembersCount,
    previousMembersCount
  );

  // 7. Demographics Comparison
  const demographics = buildYoYDemographicsComparison(
    currentMembers,
    previousMembers,
    currentMembersCount,
    previousMembersCount
  );

  // 8. Monthly Comparison (1..12)
  const monthly = buildYoYMonthlyComparison(
    currentMembers,
    previousMembers,
    currentBatchMap,
    previousBatchMap,
    cYear,
    pYear
  );

  return {
    hasPreviousYearData,
    currentYear: cYear,
    previousYear: pYear,
    totalDiplomas,
    totalBatches,
    totalMembers,
    regions: yoyRegions,
    districts: yoyDistricts,
    units: yoyUnits,
    demographics,
    monthly
  };
}

/**
 * Consolidates all metrics calculations into a complete dataset
 */
export function buildStatisticsDataset(
  members: ScoutMember[],
  batches: Batch[],
  regions: Region[],
  districts: District[],
  recognitionTypes: RecognitionTypeInfo[] = [],
  yoyComparison?: YoYComparisonData
): StatisticsDataset {
  return {
    kpis: calculateKpiMetrics(members, batches, recognitionTypes),
    monthlyTrends: calculateMonthlyTrends(members, batches),
    recognitionRankings: calculateRecognitionRankings(members, batches, recognitionTypes),
    demographics: calculateDemographics(members),
    geographic: calculateGeographicBreakdown(batches, members, regions, districts),
    statusBreakdown: calculateStatusBreakdown(members),
    unitDistribution: calculateUnitDistribution(members),
    filteredMembersCount: members.length,
    filteredBatchesCount: batches.length,
    yoyComparison
  };
}


/**
 * Calculates overall KPI metrics for the statistics dashboard
 */
export function calculateKpiMetrics(
  members: ScoutMember[],
  batches: Batch[],
  recognitionTypes: RecognitionTypeInfo[] = []
): KpiMetrics {
  const totalMembers = members.length;
  const totalBatches = batches.length;
  const avgMembersPerBatch = totalBatches > 0 ? Number((totalMembers / totalBatches).toFixed(1)) : 0;

  let activeCount = 0;
  let exceptionalCount = 0;
  let pendingCount = 0;
  let youngCount = 0;
  let adultCount = 0;

  const activeRegionIds = new Set<number>();
  const activeDistrictIds = new Set<number>();
  const activeGroupIds = new Set<number>();

  const batchMap = new Map<number, Batch>();
  batches.forEach(b => batchMap.set(b.id, b));

  const countsByRec = new Map<string, number>();

  members.forEach(m => {
    if (m.status === 'active') activeCount++;
    else if (m.status === 'exceptional') exceptionalCount++;
    else pendingCount++;

    if (m.member_type === 'young') youngCount++;
    else if (m.member_type === 'adult') adultCount++;

    let recType = 'general';
    if (m.batch_id && batchMap.has(m.batch_id)) {
      const b = batchMap.get(m.batch_id);
      if (b?.region_id) activeRegionIds.add(b.region_id);
      if (b?.district_id) activeDistrictIds.add(b.district_id);
      if (b?.group_id) activeGroupIds.add(b.group_id);
      if (b?.recognition_type) recType = b.recognition_type;
    }
    countsByRec.set(recType, (countsByRec.get(recType) ?? 0) + 1);
  });

  // Also include batch IDs from batches list directly if not covered
  batches.forEach(b => {
    if (b.region_id) activeRegionIds.add(b.region_id);
    if (b.district_id) activeDistrictIds.add(b.district_id);
    if (b.group_id) activeGroupIds.add(b.group_id);
  });

  let topRecId = '';
  let topRecCount = 0;
  countsByRec.forEach((count, recId) => {
    if (count > topRecCount) {
      topRecCount = count;
      topRecId = recId;
    }
  });

  let topRecognitionName = '-';
  if (topRecId) {
    const matchedType = recognitionTypes.find(
      r => r.id === topRecId || r.name.toLowerCase() === topRecId.toLowerCase()
    );
    topRecognitionName = matchedType?.name ?? getRecognitionName(topRecId);
  }

  const totalDiplomas = activeCount + exceptionalCount;
  const youngPercentage = totalMembers > 0 ? Number(((youngCount / totalMembers) * 100).toFixed(1)) : 0;
  const adultPercentage = totalMembers > 0 ? Number(((adultCount / totalMembers) * 100).toFixed(1)) : 0;
  const validationRate = totalMembers > 0 ? Number(((activeCount / totalMembers) * 100).toFixed(1)) : 0;
  const exceptionalRate = totalMembers > 0 ? Number(((exceptionalCount / totalMembers) * 100).toFixed(1)) : 0;
  const pendingRate = totalMembers > 0 ? Number(((pendingCount / totalMembers) * 100).toFixed(1)) : 0;

  return {
    totalDiplomas,
    totalMembers,
    totalBatches,
    avgMembersPerBatch,
    youngCount,
    adultCount,
    youngPercentage,
    adultPercentage,
    activeRegionsCount: activeRegionIds.size,
    activeDistrictsCount: activeDistrictIds.size,
    activeGroupsCount: activeGroupIds.size,
    topRecognitionName,
    topRecognitionCount: topRecCount,
    validationRate,
    exceptionalRate,
    pendingRate,
    activeCount,
    exceptionalCount,
    pendingCount
  };
}

/**
 * Calculates monthly trend data for the selected year or dataset range
 */
export function calculateMonthlyTrends(
  members: ScoutMember[],
  batches: Batch[],
  targetYear?: number
): MonthlyTrendData[] {
  const batchMap = new Map<number, Batch>();
  batches.forEach(b => batchMap.set(b.id, b));

  // Determine active year: if provided, use targetYear; otherwise pick the most common/latest batch year or current year
  let year = targetYear;
  if (!year) {
    if (batches.length > 0) {
      const years = batches
        .map(b => (b.created_at ? new Date(b.created_at).getFullYear() : null))
        .filter((y): y is number => y !== null && !Number.isNaN(y));
      if (years.length > 0) {
        year = Math.max(...years);
      }
    }
    year ??= new Date().getFullYear();
  }

  // Initialize 12 months for the year
  const monthlyBuckets: MonthlyTrendData[] = Array.from({ length: 12 }, (_, index) => {
    const monthStr = String(index + 1).padStart(2, '0');
    return {
      monthKey: `${year}-${monthStr}`,
      label: MONTH_LABELS_ES[index],
      year: year!,
      monthIndex: index,
      totalCount: 0,
      activeCount: 0,
      exceptionalCount: 0,
      pendingCount: 0
    };
  });

  members.forEach(m => {
    let dateStr = '';
    if (m.batch_id && batchMap.has(m.batch_id)) {
      dateStr = batchMap.get(m.batch_id)?.created_at ?? '';
    }

    if (!dateStr) return;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return;

    if (d.getFullYear() === year) {
      const monthIdx = d.getMonth();
      if (monthIdx >= 0 && monthIdx < 12) {
        const bucket = monthlyBuckets[monthIdx];
        bucket.totalCount++;
        if (m.status === 'active') bucket.activeCount++;
        else if (m.status === 'exceptional') bucket.exceptionalCount++;
        else bucket.pendingCount++;
      }
    }
  });

  return monthlyBuckets;
}

/**
 * Calculates top recognition rankings sorted descending by count
 */
export function calculateRecognitionRankings(
  members: ScoutMember[],
  batches: Batch[],
  recognitionTypes: RecognitionTypeInfo[] = []
): RecognitionRankingData[] {
  const batchMap = new Map<number, Batch>();
  batches.forEach(b => batchMap.set(b.id, b));

  const countsByRec = new Map<string, number>();

  members.forEach(m => {
    let recType = 'general';
    if (m.batch_id && batchMap.has(m.batch_id)) {
      recType = batchMap.get(m.batch_id)?.recognition_type ?? 'general';
    }
    countsByRec.set(recType, (countsByRec.get(recType) ?? 0) + 1);
  });

  const totalMembers = members.length;

  const results: RecognitionRankingData[] = [];
  countsByRec.forEach((count, recId) => {
    const matchedType = recognitionTypes.find(
      r => r.id === recId || r.name.toLowerCase() === recId.toLowerCase()
    );
    const name = matchedType?.name ?? getRecognitionName(recId);
    const percentage = totalMembers > 0 ? Number(((count / totalMembers) * 100).toFixed(1)) : 0;
    const badgeStyle = getRecognitionBadgeStyle(name ?? recId);

    results.push({
      id: recId,
      name,
      count,
      percentage,
      badgeStyle
    });
  });

  // Sort descending by count, then by name
  return results.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });
}

/**
 * Calculates young vs adult demographic distribution and sub-breakdowns
 */
export function calculateDemographics(members: ScoutMember[]): DemographicsData {
  let youngCount = 0;
  let adultCount = 0;
  let youngActive = 0;
  let youngExceptional = 0;
  let youngPending = 0;
  let adultActive = 0;
  let adultExceptional = 0;
  let adultPending = 0;

  members.forEach(m => {
    if (m.member_type === 'young') {
      youngCount++;
      if (m.status === 'active') youngActive++;
      else if (m.status === 'exceptional') youngExceptional++;
      else youngPending++;
    } else {
      adultCount++;
      if (m.status === 'active') adultActive++;
      else if (m.status === 'exceptional') adultExceptional++;
      else adultPending++;
    }
  });

  const totalCount = members.length;
  const youngPercentage = totalCount > 0 ? Number(((youngCount / totalCount) * 100).toFixed(1)) : 0;
  const adultPercentage = totalCount > 0 ? Number(((adultCount / totalCount) * 100).toFixed(1)) : 0;

  return {
    youngCount,
    adultCount,
    totalCount,
    youngPercentage,
    adultPercentage,
    youngActive,
    youngExceptional,
    youngPending,
    adultActive,
    adultExceptional,
    adultPending
  };
}

/**
 * Calculates geographic distribution by Region and District
 */
export function calculateGeographicBreakdown(
  batches: Batch[],
  members: ScoutMember[],
  regions: Region[],
  districts: District[]
): GeographicBreakdownData {
  const batchMap = new Map<number, Batch>();
  batches.forEach(b => batchMap.set(b.id, b));

  const regionCounts = new Map<number, number>();
  const districtCounts = new Map<number, number>();

  members.forEach(m => {
    if (m.batch_id && batchMap.has(m.batch_id)) {
      const b = batchMap.get(m.batch_id);
      if (b?.region_id) {
        regionCounts.set(b.region_id, (regionCounts.get(b.region_id) ?? 0) + 1);
      }
      if (b?.district_id) {
        districtCounts.set(b.district_id, (districtCounts.get(b.district_id) ?? 0) + 1);
      }
    }
  });

  const totalMembers = members.length;

  // Build Regions breakdown
  const regionsResult: GeographicItem[] = [];
  regionCounts.forEach((count, regionId) => {
    const regionObj = regions.find(r => r.id === regionId);
    const name = regionObj?.name ?? `Región ${regionId}`;
    const percentage = totalMembers > 0 ? Number(((count / totalMembers) * 100).toFixed(1)) : 0;
    regionsResult.push({ id: regionId, name, count, percentage });
  });

  // Build Districts breakdown
  const districtsResult: GeographicItem[] = [];
  districtCounts.forEach((count, districtId) => {
    const districtObj = districts.find(d => d.id === districtId);
    const regionObj = districtObj ? regions.find(r => r.id === districtObj.region_id) : undefined;
    const name = districtObj?.name ?? `Distrito ${districtId}`;
    const parentName = regionObj?.name ?? undefined;
    const percentage = totalMembers > 0 ? Number(((count / totalMembers) * 100).toFixed(1)) : 0;
    districtsResult.push({ id: districtId, name, count, percentage, parentName });
  });

  // Sort descending by count
  regionsResult.sort((a, b) => b.count - a.count);
  districtsResult.sort((a, b) => b.count - a.count);

  return {
    regions: regionsResult,
    districts: districtsResult
  };
}

/**
 * Calculates status and data quality breakdown
 */
export function calculateStatusBreakdown(members: ScoutMember[]): StatusBreakdownData {
  let activeCount = 0;
  let exceptionalCount = 0;
  let pendingCount = 0;

  members.forEach(m => {
    if (m.status === 'active') activeCount++;
    else if (m.status === 'exceptional') exceptionalCount++;
    else pendingCount++;
  });

  const totalCount = members.length;
  const activePercentage = totalCount > 0 ? Number(((activeCount / totalCount) * 100).toFixed(1)) : 0;
  const exceptionalPercentage = totalCount > 0 ? Number(((exceptionalCount / totalCount) * 100).toFixed(1)) : 0;
  const pendingPercentage = totalCount > 0 ? Number(((pendingCount / totalCount) * 100).toFixed(1)) : 0;

  return {
    activeCount,
    exceptionalCount,
    pendingCount,
    totalCount,
    activePercentage,
    exceptionalPercentage,
    pendingPercentage
  };
}

/**
 * Calculates member distribution across Scout Units
 */
export function calculateUnitDistribution(members: ScoutMember[]): UnitDistributionData {
  const totalCount = members.length;
  const unitOrder: ScoutUnit[] = ['manada', 'tropa', 'caminantes', 'clan', 'institucional', 'no_scout'];
  const counts = new Map<ScoutUnit, number>();
  unitOrder.forEach(u => counts.set(u, 0));

  members.forEach(m => {
    const fallbackUnit: ScoutUnit = m.member_type === 'young' ? 'tropa' : 'institucional';
    const u: ScoutUnit = m.unit ?? fallbackUnit;
    counts.set(u, (counts.get(u) ?? 0) + 1);
  });

  const items: UnitDistributionItem[] = unitOrder.map(u => {
    const count = counts.get(u) ?? 0;
    const percentage = totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0;
    return {
      unit: u,
      label: SCOUT_UNITS[u].label,
      count,
      percentage,
      badgeClass: SCOUT_UNITS[u].badgeClass
    };
  });

  return {
    items,
    totalCount
  };
}

export const getUnitDistribution = calculateUnitDistribution;

