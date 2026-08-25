import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStatisticsData } from '../useStatisticsData';
import * as batchApi from '../../../batches/api';
import * as recognitionApi from '../../../recognitions/api';
import { Batch, ScoutMember, Region, District, ScoutGroup } from '../../../batches/types';
import { RecognitionType } from '../../../recognitions';

vi.mock('../../../batches/api', () => ({
  getAllBatches: vi.fn(),
  getAllMembers: vi.fn(),
  getHierarchyData: vi.fn(),
  getRecognitionBadgeStyle: vi.fn(() => ({
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20',
    pillClass: 'bg-primary/10 text-primary border border-primary/20'
  })),
  getRecognitionName: vi.fn((id: string) => id)
}));

vi.mock('../../../recognitions/api', () => ({
  getAllRecognitionTypes: vi.fn()
}));

vi.mock('../../../auth', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'test-user-123', email: 'test@scouts.org.ve', displayName: 'Test User' },
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn()
  }))
}));
describe('useStatisticsData hook', () => {
  const mockBatches: Batch[] = [
    {
      id: 1,
      comment: 'Lote 1',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'sct-wood-badge',
      created_at: '2026-03-10T10:00:00.000Z'
    },
    {
      id: 2,
      comment: 'Lote 2',
      region_id: 2,
      district_id: 20,
      group_id: 200,
      recognition_type: 'sct-promesa',
      created_at: '2025-05-15T12:00:00.000Z'
    }
  ];

  const mockMembers: ScoutMember[] = [
    {
      identity: 'V-1001',
      first_names: 'Juan',
      last_names: 'Perez',
      birth_date: '2010-01-01',
      member_type: 'young',
      status: 'active',
      batch_id: 1
    },
    {
      identity: 'V-1002',
      first_names: 'Luis',
      last_names: 'Gomez',
      birth_date: '1980-05-10',
      member_type: 'adult',
      status: 'exceptional',
      batch_id: 1
    },
    {
      identity: 'V-2001',
      first_names: 'Ana',
      last_names: 'Rodriguez',
      birth_date: '2008-08-20',
      member_type: 'young',
      status: 'active',
      batch_id: 2
    }
  ];

  const mockRegions: Region[] = [
    { id: 1, name: 'Región Capital' },
    { id: 2, name: 'Región Central' }
  ];

  const mockDistricts: District[] = [
    { id: 10, name: 'Distrito Sucre', region_id: 1 },
    { id: 20, name: 'Distrito Valencia', region_id: 2 }
  ];

  const mockGroups: ScoutGroup[] = [
    { id: 100, name: 'Grupo San Luis', district_id: 10 },
    { id: 200, name: 'Grupo Cabriales', district_id: 20 }
  ];

  const mockRecTypes: RecognitionType[] = [
    { id: 'sct-wood-badge', name: 'Insignia de Madera', created_at: '2026-01-01T00:00:00.000Z' },
    { id: 'sct-promesa', name: 'Promesa Scout', created_at: '2026-01-01T00:00:00.000Z' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(batchApi.getAllBatches).mockResolvedValue(mockBatches);
    vi.mocked(batchApi.getAllMembers).mockResolvedValue(mockMembers);
    vi.mocked(batchApi.getHierarchyData).mockResolvedValue({
      regions: mockRegions,
      districts: mockDistricts,
      groups: mockGroups
    });
    vi.mocked(recognitionApi.getAllRecognitionTypes).mockResolvedValue(mockRecTypes);
  });

  it('loads initial data on mount and computes unfiltered stats', async () => {
    const { result } = renderHook(() => useStatisticsData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats.kpis.totalMembers).toBe(3);
    expect(result.current.stats.kpis.totalBatches).toBe(2);
    expect(result.current.stats.kpis.totalDiplomas).toBe(3);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.regions).toHaveLength(2);
  });

  it('filters data reactively by recognition type', async () => {
    const { result } = renderHook(() => useStatisticsData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilter('recognitionId', 'sct-wood-badge');
    });

    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.stats.filteredBatchesCount).toBe(1);
    expect(result.current.stats.filteredMembersCount).toBe(2);
    expect(result.current.stats.kpis.totalDiplomas).toBe(2);
  });

  it('filters data reactively by region and updates availableDistricts', async () => {
    const { result } = renderHook(() => useStatisticsData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilter('regionId', '1');
    });

    expect(result.current.availableDistricts).toHaveLength(1);
    expect(result.current.availableDistricts[0].id).toBe(10);
    expect(result.current.stats.filteredMembersCount).toBe(2);
  });

  it('resets districtId when regionId is cleared', async () => {
    const { result } = renderHook(() => useStatisticsData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilter('regionId', '1');
      result.current.setFilter('districtId', '10');
    });

    expect(result.current.filters.districtId).toBe('10');

    act(() => {
      result.current.setFilter('regionId', '');
    });

    expect(result.current.filters.districtId).toBe('');
  });

  it('filters data by memberType and period', async () => {
    const { result } = renderHook(() => useStatisticsData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilter('memberType', 'young');
    });

    expect(result.current.stats.filteredMembersCount).toBe(2);

    act(() => {
      result.current.setFilter('period', 'custom');
      result.current.setFilter('startDate', '2026-01-01');
      result.current.setFilter('endDate', '2026-12-31');
    });

    // In 2026, there is batch 1 (with 1 young member)
    expect(result.current.stats.filteredMembersCount).toBe(1);
  });

  it('resets all filters on resetFilters', async () => {
    const { result } = renderHook(() => useStatisticsData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilter('recognitionId', 'sct-wood-badge');
      result.current.setFilter('regionId', '1');
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filters.recognitionId).toBe('');
    expect(result.current.filters.regionId).toBe('');
    expect(result.current.stats.filteredMembersCount).toBe(3);
  });

  it('generates accurate filter summary labels', async () => {
    const { result } = renderHook(() => useStatisticsData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilter('period', 'this-year');
      result.current.setFilter('recognitionId', 'sct-wood-badge');
      result.current.setFilter('regionId', '1');
      result.current.setFilter('districtId', '10');
      result.current.setFilter('memberType', 'young');
    });

    const summary = result.current.getFilterSummaryLabels();
    expect(summary.periodLabel).toBe('Este Año');
    expect(summary.recognitionLabel).toBe('Insignia de Madera');
    expect(summary.regionLabel).toBe('Región Capital');
    expect(summary.districtLabel).toBe('Distrito Sucre');
    expect(summary.memberTypeLabel).toBe('Jóvenes');
  });

  it('handles data load error gracefully', async () => {
    vi.mocked(batchApi.getAllBatches).mockRejectedValueOnce(new Error('Firestore network error'));

    const { result } = renderHook(() => useStatisticsData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Firestore network error');
  });
});
