import { Region, District, ScoutGroup } from '../../../types';
import { DatePeriodFilter, matchesDateRange } from '../../../utils/datePeriod';
import { SummaryRowData } from '../types';

export type MemberTypeFilter = 'all' | 'young' | 'adult';
export type RegistryStatusFilter = 'all' | 'active' | 'pending' | 'exceptional';
export type { DatePeriodFilter };
export { matchesDateRange };

export interface SummaryFilterValues {
  searchTerm: string;
  selectedRecognition: string;
  selectedRegion: string;
  selectedDistrict: string;
  selectedGroup: string;
  selectedUnit: string;
  selectedMemberType: MemberTypeFilter;
  selectedStatus: RegistryStatusFilter;
  selectedDatePeriod: DatePeriodFilter;
  customStartDate: string;
  customEndDate: string;
}

export interface SummaryFilterOptions extends SummaryFilterValues {
  regions: Region[];
  districts: District[];
  groups: ScoutGroup[];
}

export const INITIAL_SUMMARY_FILTER_VALUES: SummaryFilterValues = {
  searchTerm: '',
  selectedRecognition: '',
  selectedRegion: '',
  selectedDistrict: '',
  selectedGroup: '',
  selectedUnit: '',
  selectedMemberType: 'all',
  selectedStatus: 'all',
  selectedDatePeriod: 'all',
  customStartDate: '',
  customEndDate: ''
};

export const DEFAULT_SUMMARY_FILTERS: SummaryFilterOptions = {
  ...INITIAL_SUMMARY_FILTER_VALUES,
  regions: [],
  districts: [],
  groups: []
};

export function hasActiveSummaryFilters(filters: SummaryFilterValues): boolean {
  return (
    filters.searchTerm !== '' ||
    filters.selectedRecognition !== '' ||
    filters.selectedRegion !== '' ||
    filters.selectedDistrict !== '' ||
    filters.selectedGroup !== '' ||
    filters.selectedUnit !== '' ||
    filters.selectedMemberType !== 'all' ||
    filters.selectedStatus !== 'all' ||
    filters.selectedDatePeriod !== 'all' ||
    filters.customStartDate !== '' ||
    filters.customEndDate !== ''
  );
}

export function formatBatchDate(dateStr?: string): string {
  if (!dateStr) return 'Fecha no disponible';
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) {
    return 'Fecha no disponible';
  }
  return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatBatchCode(batchId: number, createdAt?: string): string {
  const dateObj = createdAt ? new Date(createdAt) : new Date();
  const year = Number.isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear();
  return `LT-${year}-${String(batchId).padStart(3, '0')}`;
}

export function getMemberStatusLabel(
  status: 'active' | 'pending' | 'exceptional'
): 'Registro Válido' | 'Registro Inválido' | 'Emisión Excepcional' {
  if (status === 'active') return 'Registro Válido';
  if (status === 'exceptional') return 'Emisión Excepcional';
  return 'Registro Inválido';
}

export function getMemberTypeLabel(memberType: 'young' | 'adult'): 'Joven' | 'Adulto' {
  return memberType === 'young' ? 'Joven' : 'Adulto';
}

export function resolveHierarchyName(id?: number, rawName?: string): string {
  if (!id || id === 0) return 'No aplica';
  if (!rawName || rawName.toLowerCase() === 'no aplica') return 'No aplica';
  return rawName;
}

export function matchesSummarySearchTerm(row: SummaryRowData, term: string): boolean {
  if (!term) return true;
  const cleanTerm = term.toLowerCase();
  return (
    row.fullName.toLowerCase().includes(cleanTerm) ||
    row.identity.toLowerCase().includes(cleanTerm) ||
    row.batchCode.toLowerCase().includes(cleanTerm) ||
    String(row.batchId).includes(cleanTerm) ||
    row.recognitionName.toLowerCase().includes(cleanTerm) ||
    row.recognitionCode.toLowerCase().includes(cleanTerm) ||
    row.regionName.toLowerCase().includes(cleanTerm) ||
    row.districtName.toLowerCase().includes(cleanTerm) ||
    row.groupName.toLowerCase().includes(cleanTerm) ||
    row.unitLabel.toLowerCase().includes(cleanTerm) ||
    row.memberTypeLabel.toLowerCase().includes(cleanTerm) ||
    row.statusLabel.toLowerCase().includes(cleanTerm)
  );
}

function matchesRecognitionFilter(row: SummaryRowData, selectedRecognition: string): boolean {
  if (!selectedRecognition) return true;
  return (
    row.recognitionId === selectedRecognition ||
    row.recognitionName.toLowerCase() === selectedRecognition.toLowerCase()
  );
}

function matchesHierarchyFilters(
  row: SummaryRowData,
  filters: Pick<SummaryFilterOptions, 'selectedRegion' | 'selectedDistrict' | 'selectedGroup'>
): boolean {
  const { selectedRegion, selectedDistrict, selectedGroup } = filters;

  if (selectedRegion === 'nacional') {
    if (!row.isNationalInstitutional) return false;
  } else if (selectedRegion === '0') {
    if (row.regionId !== 0 || row.isNationalInstitutional) return false;
  } else if (selectedRegion) {
    if (String(row.regionId) !== selectedRegion) return false;
  }

  if (selectedDistrict === '0') {
    if (row.districtId !== 0) return false;
  } else if (selectedDistrict) {
    if (String(row.districtId) !== selectedDistrict) return false;
  }

  if (selectedGroup === '0') {
    if (row.groupId !== 0) return false;
  } else if (selectedGroup) {
    if (String(row.groupId) !== selectedGroup) return false;
  }

  return true;
}

export function matchesSummaryFilters(
  row: SummaryRowData,
  options: SummaryFilterOptions
): boolean {
  if (!matchesSummarySearchTerm(row, options.searchTerm.trim())) {
    return false;
  }
  if (!matchesRecognitionFilter(row, options.selectedRecognition)) {
    return false;
  }
  if (!matchesHierarchyFilters(row, options)) {
    return false;
  }
  if (options.selectedUnit && row.unit !== options.selectedUnit) {
    return false;
  }
  if (options.selectedMemberType !== 'all' && row.memberType !== options.selectedMemberType) {
    return false;
  }
  if (options.selectedStatus !== 'all' && row.status !== options.selectedStatus) {
    return false;
  }
  if (options.selectedDatePeriod !== 'all') {
    if (!matchesDateRange(row.rawDate, options.selectedDatePeriod, options.customStartDate, options.customEndDate)) {
      return false;
    }
  }
  return true;
}

export function getFilteredSummaryRows(
  rows: SummaryRowData[],
  options: SummaryFilterOptions = DEFAULT_SUMMARY_FILTERS
): SummaryRowData[] {
  return rows.filter(row => matchesSummaryFilters(row, options));
}
