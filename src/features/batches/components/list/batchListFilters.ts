import { ActiveFilterChip, Region, District, ScoutGroup } from '../../types';
import { RecognitionType } from '../../../recognitions';
import { getRecognitionName } from '../../api';
import type {
  CompletenessStatus,
  TerritorialToken
} from '../../utils/batchTerritorial';
import { FilterType, DateFilterMode, BatchRowData } from './types';

export function formatBatchDate(dateStr: string): string {
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) {
    return 'Fecha no disponible';
  }
  return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateToDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return isoDate;
}

export function matchesPredefinedPeriod(batchDate: Date, now: Date, filterValue: string): boolean {
  if (filterValue === 'Este Año') {
    return batchDate.getFullYear() === now.getFullYear();
  }
  if (filterValue === 'Este Mes') {
    return (
      batchDate.getFullYear() === now.getFullYear() &&
      batchDate.getMonth() === now.getMonth()
    );
  }
  if (filterValue === 'Últimos 30 días') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    return batchDate >= thirtyDaysAgo && batchDate <= now;
  }
  if (filterValue === 'Últimos 90 días') {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    ninetyDaysAgo.setHours(0, 0, 0, 0);
    return batchDate >= ninetyDaysAgo && batchDate <= now;
  }
  return filterValue === 'Todo el histórico';
}

export function matchesDateRange(batchDate: Date, filterValue: string): boolean {
  if (!filterValue.includes(' - ')) return false;
  const [startStr, endStr] = filterValue.split(' - ');
  const [sDay, sMonth, sYear] = startStr.split('/').map(Number);
  const [eDay, eMonth, eYear] = endStr.split('/').map(Number);
  if (sDay && sMonth && sYear && eDay && eMonth && eYear) {
    const startDate = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
    const endDate = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
    return batchDate >= startDate && batchDate <= endDate;
  }
  return false;
}

export function matchesSpecificDate(batchDate: Date, filterValue: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(filterValue)) return false;
  const [day, month, year] = filterValue.split('/').map(Number);
  if (day && month && year) {
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    return batchDate >= startOfDay && batchDate <= endOfDay;
  }
  return false;
}

export function matchesDateFilter(createdAt: string, filterValue: string): boolean {
  const batchDate = new Date(createdAt);
  if (Number.isNaN(batchDate.getTime())) return false;

  const now = new Date();
  if (matchesPredefinedPeriod(batchDate, now, filterValue)) return true;
  if (filterValue.includes(' - ')) return matchesDateRange(batchDate, filterValue);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(filterValue)) return matchesSpecificDate(batchDate, filterValue);

  return true;
}

function matchesTerritorialTokens(
  tokens: TerritorialToken[],
  filterValue: string
): boolean {
  return tokens.some(token => token.key === filterValue);
}

export function matchesRegionFilter(
  tokens: TerritorialToken[],
  filterValue: string
): boolean {
  return matchesTerritorialTokens(tokens, filterValue);
}

export function matchesDistrictFilter(
  tokens: TerritorialToken[],
  filterValue: string
): boolean {
  return matchesTerritorialTokens(tokens, filterValue);
}

export function matchesGroupFilter(
  tokens: TerritorialToken[],
  filterValue: string
): boolean {
  return matchesTerritorialTokens(tokens, filterValue);
}

export function matchesCompletenessFilter(
  status: CompletenessStatus,
  filterValue: string
): boolean {
  return status === filterValue;
}

export function matchesRecognitionFilter(
  rowRecognitionName: string,
  rowRecognitionType: string,
  filterValue: string
): boolean {
  return rowRecognitionName === filterValue || rowRecognitionType === filterValue;
}

export function matchesSingleFilter(row: BatchRowData, filter: ActiveFilterChip): boolean {
  const rawValue = filter.filterValue ?? filter.value;

  switch (filter.type) {
    case 'date':
      return matchesDateFilter(row.created_at, rawValue);
    case 'region':
      return matchesRegionFilter(row.regionTokens, rawValue);
    case 'district':
      return matchesDistrictFilter(row.districtTokens, rawValue);
    case 'group':
      return matchesGroupFilter(row.groupTokens, rawValue);
    case 'completeness':
      return matchesCompletenessFilter(row.completenessStatus, rawValue);
    case 'recognition':
      return matchesRecognitionFilter(row.recognitionName, row.recognitionType, rawValue);
    default:
      return true;
  }
}

export function matchesActiveFilters(row: BatchRowData, activeFilters: ActiveFilterChip[]): boolean {
  return activeFilters.every(filter => matchesSingleFilter(row, filter));
}

function resolveTerritorialDisplayLabel(
  rawValue: string,
  items: Array<{ id: number; name: string }>
): string {
  if (rawValue === 'nacional') return 'Nacional';
  if (rawValue === '0') return 'No aplica';
  if (rawValue === 'no_scout') return 'No scout';
  const numericKey = rawValue.startsWith('id:') ? rawValue.slice(3) : rawValue;
  return items.find(item => String(item.id) === numericKey)?.name || rawValue;
}

export function getFilterLabelAndValue(
  filterType: FilterType,
  filterValue: string,
  hierarchy: { regions: Region[]; districts: District[]; groups: ScoutGroup[] },
  recognitionTypes: RecognitionType[]
): { label: string; displayValue: string } {
  switch (filterType) {
    case 'date':
      return { label: 'Fecha', displayValue: filterValue };
    case 'region':
      return {
        label: 'Región',
        displayValue: resolveTerritorialDisplayLabel(filterValue, hierarchy.regions)
      };
    case 'district':
      return {
        label: 'Distrito',
        displayValue: resolveTerritorialDisplayLabel(filterValue, hierarchy.districts)
      };
    case 'group':
      return {
        label: 'Grupo',
        displayValue: resolveTerritorialDisplayLabel(filterValue, hierarchy.groups)
      };
    case 'completeness': {
      const completenessLabels: Record<string, string> = {
        complete: 'Todos registrados',
        pending: 'Registros pendientes',
        empty: 'Sin miembros'
      };
      return {
        label: 'Completitud',
        displayValue: completenessLabels[filterValue] || filterValue
      };
    }
    case 'recognition': {
      const rec = recognitionTypes.find(
        r => r.id === filterValue || r.name.toLowerCase() === filterValue.toLowerCase()
      );
      return {
        label: 'Reconocimiento',
        displayValue: rec ? rec.name : getRecognitionName(filterValue)
      };
    }
  }
}

export function isApplyFilterDisabled(
  newFilterType: FilterType,
  dateFilterMode: DateFilterMode,
  datePredefinedValue: string,
  dateRangeStart: string,
  dateRangeEnd: string,
  dateSpecificValue: string,
  newFilterValue: string
): boolean {
  if (newFilterType === 'date') {
    if (dateFilterMode === 'predefined') return !datePredefinedValue;
    if (dateFilterMode === 'range') return !dateRangeStart || !dateRangeEnd;
    return !dateSpecificValue;
  }
  return !newFilterValue;
}
