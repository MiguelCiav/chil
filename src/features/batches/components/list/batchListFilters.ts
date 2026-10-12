import { ActiveFilterChip, Region, District, ScoutGroup } from '../../types';
import { RecognitionType } from '../../../recognitions';
import { getRecognitionName } from '../../api';
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

export function matchesRegionFilter(rowRegion: string, filterValue: string): boolean {
  return rowRegion === filterValue || filterValue === '-';
}

export function matchesDistrictFilter(rowDistrict: string, filterValue: string): boolean {
  return rowDistrict === filterValue || filterValue === '-';
}

export function matchesGroupFilter(rowGroup: string, filterValue: string): boolean {
  return rowGroup.toLowerCase().includes(filterValue.toLowerCase());
}

export function matchesRecognitionFilter(
  rowRecognitionName: string,
  rowRecognitionType: string,
  filterValue: string
): boolean {
  return rowRecognitionName === filterValue || rowRecognitionType === filterValue;
}

export function matchesSingleFilter(row: BatchRowData, filter: ActiveFilterChip): boolean {
  switch (filter.type) {
    case 'date':
      return matchesDateFilter(row.created_at, filter.value);
    case 'region':
      return matchesRegionFilter(row.regionName, filter.value);
    case 'district':
      return matchesDistrictFilter(row.districtName, filter.value);
    case 'group':
      return matchesGroupFilter(row.groupName, filter.value);
    case 'recognition':
      return matchesRecognitionFilter(row.recognitionName, row.recognitionType, filter.value);
    default:
      return true;
  }
}

export function matchesActiveFilters(row: BatchRowData, activeFilters: ActiveFilterChip[]): boolean {
  return activeFilters.every(filter => matchesSingleFilter(row, filter));
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
        displayValue: hierarchy.regions.find(r => String(r.id) === filterValue)?.name || filterValue
      };
    case 'district':
      return {
        label: 'Distrito',
        displayValue: hierarchy.districts.find(d => String(d.id) === filterValue)?.name || filterValue
      };
    case 'group':
      return {
        label: 'Grupo',
        displayValue: hierarchy.groups.find(g => String(g.id) === filterValue)?.name || filterValue
      };
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
