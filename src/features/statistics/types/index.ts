import { ScoutUnit } from '../../batches/types';

export interface StatisticsFilterState {
  period: 'all' | 'this-year' | 'this-month' | 'last-30' | 'last-90' | 'custom';
  startDate?: string;
  endDate?: string;
  recognitionId?: string;
  regionId?: string;
  districtId?: string;
  memberType?: 'all' | 'young' | 'adult';
}

export interface KpiMetrics {
  totalDiplomas: number;
  totalMembers: number;
  totalBatches: number;
  avgMembersPerBatch: number;
  youngCount: number;
  adultCount: number;
  youngPercentage: number;
  adultPercentage: number;
  activeRegionsCount: number;
  activeDistrictsCount: number;
  activeGroupsCount: number;
  topRecognitionName?: string;
  topRecognitionCount?: number;
  validationRate?: number;
  exceptionalRate?: number;
  pendingRate?: number;
  activeCount: number;
  exceptionalCount: number;
  pendingCount: number;
}

export interface MonthlyTrendData {
  monthKey: string; // "YYYY-MM"
  label: string;    // "Ene", "Feb", etc.
  year: number;
  monthIndex: number; // 0-11
  totalCount: number;
  activeCount: number;
  exceptionalCount: number;
  pendingCount: number;
}

export interface RecognitionRankingData {
  id: string;
  name: string;
  count: number;
  percentage: number;
  badgeStyle: {
    bg: string;
    text: string;
    border: string;
    pillClass: string;
  };
}

export interface DemographicsData {
  youngCount: number;
  adultCount: number;
  totalCount: number;
  youngPercentage: number;
  youngPercentageNumber?: number;
  adultPercentage: number;
  adultPercentageNumber?: number;
  youngActive: number;
  youngExceptional: number;
  youngPending: number;
  adultActive: number;
  adultExceptional: number;
  adultPending: number;
}

export interface GeographicItem {
  id: number;
  name: string;
  count: number;
  percentage: number;
  parentName?: string;
}

export interface GeographicBreakdownData {
  regions: GeographicItem[];
  districts: GeographicItem[];
}

export interface StatusBreakdownData {
  activeCount: number;
  exceptionalCount: number;
  pendingCount: number;
  totalCount: number;
  activePercentage: number;
  exceptionalPercentage: number;
  pendingPercentage: number;
}

export interface UnitDistributionItem {
  unit: ScoutUnit;
  label: string;
  count: number;
  percentage: number;
  badgeClass: string;
}

export interface UnitDistributionData {
  items: UnitDistributionItem[];
  totalCount: number;
}

export interface YoYCountMetric {
  current: number;
  previous: number;
  diff: number;
  percentChange: number | null;
}

export interface YoYRegionItem {
  id: number;
  name: string;
  currentCount: number;
  previousCount: number;
  diff: number;
  percentChange: number | null;
  currentPercentage: number;
  previousPercentage: number;
}

export interface YoYDistrictItem {
  id: number;
  name: string;
  parentName?: string;
  currentCount: number;
  previousCount: number;
  diff: number;
  percentChange: number | null;
  currentPercentage: number;
  previousPercentage: number;
}

export interface YoYUnitItem {
  unit: ScoutUnit;
  label: string;
  badgeClass: string;
  currentCount: number;
  previousCount: number;
  diff: number;
  percentChange: number | null;
  currentPercentage: number;
  previousPercentage: number;
}

export interface YoYDemographics {
  young: YoYCountMetric & { currentPercentage: number; previousPercentage: number };
  adult: YoYCountMetric & { currentPercentage: number; previousPercentage: number };
  total: YoYCountMetric;
}

export interface YoYMonthlyItem {
  monthIndex: number;
  label: string;
  currentCount: number;
  previousCount: number;
  diff: number;
  percentChange: number | null;
}

export interface YoYComparisonData {
  hasPreviousYearData: boolean;
  currentYear: number;
  previousYear: number;
  totalDiplomas: YoYCountMetric;
  totalBatches: YoYCountMetric;
  totalMembers: YoYCountMetric;
  regions: YoYRegionItem[];
  districts: YoYDistrictItem[];
  units: YoYUnitItem[];
  demographics: YoYDemographics;
  monthly: YoYMonthlyItem[];
}

export interface CalculateYoYOptions {
  currentMembers: import('../../batches/types').ScoutMember[];
  previousMembers: import('../../batches/types').ScoutMember[];
  currentBatches?: import('../../batches/types').Batch[];
  previousBatches?: import('../../batches/types').Batch[];
  regions?: import('../../batches/types').Region[];
  districts?: import('../../batches/types').District[];
  currentYear?: number;
  previousYear?: number;
}

export interface StatisticsDataset {
  kpis: KpiMetrics;
  monthlyTrends: MonthlyTrendData[];
  recognitionRankings: RecognitionRankingData[];
  demographics: DemographicsData;
  geographic: GeographicBreakdownData;
  statusBreakdown: StatusBreakdownData;
  unitDistribution: UnitDistributionData;
  filteredMembersCount: number;
  filteredBatchesCount: number;
  yoyComparison?: YoYComparisonData;
}

