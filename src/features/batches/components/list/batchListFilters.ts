import type { CompletenessStatus, TerritorialToken } from '../../utils/batchTerritorial';
import { DatePeriodFilter, matchesDateRange } from '../../../../utils/datePeriod';
import { BatchRowData } from './types';

export type { DatePeriodFilter };

export interface BatchListFilterValues {
  searchTerm: string;
  selectedRecognition: string;
  selectedRegion: string;
  selectedDistrict: string;
  selectedGroup: string;
  selectedCompleteness: '' | CompletenessStatus;
  selectedDatePeriod: DatePeriodFilter;
  customStartDate: string;
  customEndDate: string;
}

export const INITIAL_BATCH_LIST_FILTER_VALUES: BatchListFilterValues = {
  searchTerm: '',
  selectedRecognition: '',
  selectedRegion: '',
  selectedDistrict: '',
  selectedGroup: '',
  selectedCompleteness: '',
  selectedDatePeriod: 'all',
  customStartDate: '',
  customEndDate: ''
};

export function hasActiveBatchListFilters(filters: BatchListFilterValues): boolean {
  return (
    filters.searchTerm.trim() !== '' ||
    filters.selectedRecognition !== '' ||
    filters.selectedRegion !== '' ||
    filters.selectedDistrict !== '' ||
    filters.selectedGroup !== '' ||
    filters.selectedCompleteness !== '' ||
    filters.selectedDatePeriod !== 'all' ||
    filters.customStartDate !== '' ||
    filters.customEndDate !== ''
  );
}

export function formatBatchDate(dateStr: string): string {
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) {
    return 'Fecha no disponible';
  }
  return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toTerritorialTokenKey(filterValue: string): string {
  if (!filterValue) return '';
  if (
    filterValue === 'nacional' ||
    filterValue === '0' ||
    filterValue === 'no_scout' ||
    filterValue.startsWith('id:')
  ) {
    return filterValue;
  }
  return `id:${filterValue}`;
}

function matchesTerritorialTokens(tokens: TerritorialToken[], filterValue: string): boolean {
  if (!filterValue) return true;
  const targetKey = toTerritorialTokenKey(filterValue);
  return tokens.some(token => token.key === targetKey);
}

export function matchesRegionFilter(tokens: TerritorialToken[], filterValue: string): boolean {
  return matchesTerritorialTokens(tokens, filterValue);
}

export function matchesDistrictFilter(tokens: TerritorialToken[], filterValue: string): boolean {
  return matchesTerritorialTokens(tokens, filterValue);
}

export function matchesGroupFilter(tokens: TerritorialToken[], filterValue: string): boolean {
  return matchesTerritorialTokens(tokens, filterValue);
}

export function matchesCompletenessFilter(
  status: CompletenessStatus,
  filterValue: string
): boolean {
  if (!filterValue) return true;
  return status === filterValue;
}

export function matchesRecognitionFilter(
  rowRecognitionName: string,
  rowRecognitionType: string,
  filterValue: string
): boolean {
  if (!filterValue) return true;
  return (
    rowRecognitionType === filterValue ||
    rowRecognitionName === filterValue ||
    rowRecognitionName.toLowerCase() === filterValue.toLowerCase()
  );
}

export function matchesBatchSearchTerm(row: BatchRowData, term: string): boolean {
  const cleanTerm = term.trim().toLowerCase();
  if (!cleanTerm) return true;

  return [
    String(row.id),
    `#${row.id}`,
    row.batch.comment ?? '',
    row.formattedDate,
    row.recognitionName,
    row.recognitionType,
    row.completenessLabel,
    ...row.regionTokens.map(t => t.label),
    ...row.districtTokens.map(t => t.label),
    ...row.groupTokens.map(t => t.label)
  ].some(val => val.toLowerCase().includes(cleanTerm));
}

export function matchesBatchListFilters(
  row: BatchRowData,
  filters: BatchListFilterValues
): boolean {
  if (!matchesBatchSearchTerm(row, filters.searchTerm)) {
    return false;
  }
  if (!matchesRecognitionFilter(row.recognitionName, row.recognitionType, filters.selectedRecognition)) {
    return false;
  }
  if (!matchesRegionFilter(row.regionTokens, filters.selectedRegion)) {
    return false;
  }
  if (!matchesDistrictFilter(row.districtTokens, filters.selectedDistrict)) {
    return false;
  }
  if (!matchesGroupFilter(row.groupTokens, filters.selectedGroup)) {
    return false;
  }
  if (!matchesCompletenessFilter(row.completenessStatus, filters.selectedCompleteness)) {
    return false;
  }
  if (filters.selectedDatePeriod !== 'all') {
    if (!matchesDateRange(row.created_at, filters.selectedDatePeriod, filters.customStartDate, filters.customEndDate)) {
      return false;
    }
  }
  return true;
}

export function getFilteredBatchRows(
  rows: BatchRowData[],
  filters: BatchListFilterValues
): BatchRowData[] {
  return rows.filter(row => matchesBatchListFilters(row, filters));
}
