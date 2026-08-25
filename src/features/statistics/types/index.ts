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
  validationRate: number;
  exceptionalRate: number;
  pendingRate: number;
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
  adultPercentage: number;
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

export interface StatisticsDataset {
  kpis: KpiMetrics;
  monthlyTrends: MonthlyTrendData[];
  recognitionRankings: RecognitionRankingData[];
  demographics: DemographicsData;
  geographic: GeographicBreakdownData;
  statusBreakdown: StatusBreakdownData;
  filteredMembersCount: number;
  filteredBatchesCount: number;
}
