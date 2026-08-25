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
  StatisticsDataset
} from '../types';

const MONTH_LABELS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

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
      const b = batchMap.get(m.batch_id)!;
      if (b.region_id) activeRegionIds.add(b.region_id);
      if (b.district_id) activeDistrictIds.add(b.district_id);
      if (b.group_id) activeGroupIds.add(b.group_id);
      if (b.recognition_type) recType = b.recognition_type;
    }
    countsByRec.set(recType, (countsByRec.get(recType) || 0) + 1);
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
    topRecognitionName = matchedType ? matchedType.name : getRecognitionName(topRecId);
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
    if (!year) year = new Date().getFullYear();
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
      dateStr = batchMap.get(m.batch_id)?.created_at || '';
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
      recType = batchMap.get(m.batch_id)?.recognition_type || 'general';
    }
    countsByRec.set(recType, (countsByRec.get(recType) || 0) + 1);
  });

  const totalMembers = members.length;

  const results: RecognitionRankingData[] = [];
  countsByRec.forEach((count, recId) => {
    const matchedType = recognitionTypes.find(
      r => r.id === recId || r.name.toLowerCase() === recId.toLowerCase()
    );
    const name = matchedType ? matchedType.name : getRecognitionName(recId);
    const percentage = totalMembers > 0 ? Number(((count / totalMembers) * 100).toFixed(1)) : 0;
    const badgeStyle = getRecognitionBadgeStyle(name || recId);

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
      const b = batchMap.get(m.batch_id)!;
      if (b.region_id) {
        regionCounts.set(b.region_id, (regionCounts.get(b.region_id) || 0) + 1);
      }
      if (b.district_id) {
        districtCounts.set(b.district_id, (districtCounts.get(b.district_id) || 0) + 1);
      }
    }
  });

  const totalMembers = members.length;

  // Build Regions breakdown
  const regionsResult: GeographicItem[] = [];
  regionCounts.forEach((count, regionId) => {
    const regionObj = regions.find(r => r.id === regionId);
    const name = regionObj ? regionObj.name : `Región ${regionId}`;
    const percentage = totalMembers > 0 ? Number(((count / totalMembers) * 100).toFixed(1)) : 0;
    regionsResult.push({ id: regionId, name, count, percentage });
  });

  // Build Districts breakdown
  const districtsResult: GeographicItem[] = [];
  districtCounts.forEach((count, districtId) => {
    const districtObj = districts.find(d => d.id === districtId);
    const regionObj = districtObj ? regions.find(r => r.id === districtObj.region_id) : undefined;
    const name = districtObj ? districtObj.name : `Distrito ${districtId}`;
    const parentName = regionObj ? regionObj.name : undefined;
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
    const u: ScoutUnit = m.unit || (m.member_type === 'young' ? 'tropa' : 'institucional');
    counts.set(u, (counts.get(u) || 0) + 1);
  });

  const items: UnitDistributionItem[] = unitOrder.map(u => {
    const count = counts.get(u) || 0;
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

/**
 * Consolidates all metrics calculations into a complete dataset
 */
export function buildStatisticsDataset(
  members: ScoutMember[],
  batches: Batch[],
  regions: Region[],
  districts: District[],
  recognitionTypes: RecognitionTypeInfo[] = []
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
    filteredBatchesCount: batches.length
  };
}
