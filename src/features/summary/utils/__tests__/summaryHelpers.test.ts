import { describe, it, expect } from 'vitest';
import { SummaryRowData } from '../../types';
import {
  DEFAULT_SUMMARY_FILTERS,
  INITIAL_SUMMARY_FILTER_VALUES,
  formatBatchCode,
  formatBatchDate,
  getFilteredSummaryRows,
  getMemberStatusLabel,
  getMemberTypeLabel,
  hasActiveSummaryFilters,
  resolveHierarchyName
} from '../summaryHelpers';

function buildRow(overrides: Partial<SummaryRowData> = {}): SummaryRowData {
  return {
    id: 'row-1',
    issueDate: '15 Ago 2026',
    rawDate: new Date().toISOString(),
    batchId: 12,
    batchCode: 'LT-2026-012',
    recognitionId: 'sct-go-solar',
    recognitionName: 'Go Solar',
    identity: 'V-12345678',
    firstName: 'Ana',
    lastName: 'Pérez',
    fullName: 'Ana Pérez',
    unit: 'tropa',
    unitLabel: 'Tropa',
    memberType: 'young',
    memberTypeLabel: 'Joven',
    status: 'active',
    statusLabel: 'Registro Válido',
    exceptionalReason: '',
    recognitionCode: 'SOL-001',
    regionId: 1,
    districtId: 10,
    groupId: 100,
    isNationalInstitutional: false,
    regionName: 'Región Capital',
    districtName: 'Distrito Sucre',
    groupName: 'Grupo San Luis',
    ...overrides
  };
}

describe('summaryHelpers', () => {
  it('formats dates, batch codes, status/type labels, and hierarchy fallbacks', () => {
    expect(formatBatchDate()).toBe('Fecha no disponible');
    expect(formatBatchDate('invalid')).toBe('Fecha no disponible');
    expect(formatBatchDate('2026-08-20T12:00:00.000Z')).toMatch(/2026/);
    expect(formatBatchCode(7, '2026-08-20T12:00:00.000Z')).toBe('LT-2026-007');
    expect(getMemberTypeLabel('young')).toBe('Joven');
    expect(getMemberTypeLabel('adult')).toBe('Adulto');
    expect(getMemberStatusLabel('active')).toBe('Registro Válido');
    expect(getMemberStatusLabel('exceptional')).toBe('Emisión Excepcional');
    expect(getMemberStatusLabel('pending')).toBe('Registro Inválido');
    expect(resolveHierarchyName(0, 'Región Capital')).toBe('No aplica');
    expect(resolveHierarchyName(1, 'NO APLICA')).toBe('No aplica');
    expect(resolveHierarchyName(1, 'Región Capital')).toBe('Región Capital');
  });

  it('matches search terms and distinguishes nacional vs 0 territory filters', () => {
    const regional = buildRow({ id: '1' });
    const national = buildRow({
      id: '2',
      fullName: 'Marco Nacional',
      regionId: 0,
      districtId: 0,
      groupId: 0,
      isNationalInstitutional: true
    });
    const noAplica = buildRow({
      id: '3',
      fullName: 'Nora Externa',
      regionId: 0,
      districtId: 0,
      groupId: 0,
      isNationalInstitutional: false
    });

    const rows = [regional, national, noAplica];

    expect(
      getFilteredSummaryRows(rows, { ...DEFAULT_SUMMARY_FILTERS, searchTerm: 'SOL-001' })
    ).toHaveLength(3);

    expect(
      getFilteredSummaryRows(rows, { ...DEFAULT_SUMMARY_FILTERS, selectedRegion: 'nacional' })
    ).toEqual([national]);

    expect(
      getFilteredSummaryRows(rows, { ...DEFAULT_SUMMARY_FILTERS, selectedRegion: '0' })
    ).toEqual([noAplica]);
  });

  it('filters by custom/relative date periods and tracks active filter state', () => {
    const recentRow = buildRow({ id: 'recent', rawDate: new Date().toISOString() });
    const oldRow = buildRow({ id: 'old', rawDate: '2020-02-15T12:00:00.000Z' });

    expect(
      getFilteredSummaryRows([recentRow, oldRow], {
        ...DEFAULT_SUMMARY_FILTERS,
        selectedDatePeriod: 'this-year'
      })
    ).toEqual([recentRow]);

    expect(
      getFilteredSummaryRows([recentRow, oldRow], {
        ...DEFAULT_SUMMARY_FILTERS,
        selectedDatePeriod: 'custom',
        customStartDate: '2020-01-01',
        customEndDate: '2020-12-31'
      })
    ).toEqual([oldRow]);

    expect(hasActiveSummaryFilters(INITIAL_SUMMARY_FILTER_VALUES)).toBe(false);
    expect(hasActiveSummaryFilters({ ...INITIAL_SUMMARY_FILTER_VALUES, selectedUnit: 'manada' })).toBe(true);
  });
});
