import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportStatisticsPdf } from '../statsPdfExport';
import { StatisticsDataset } from '../../types';

const mockDocInstance = {
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  setDrawColor: vi.fn(),
  line: vi.fn(),
  setFont: vi.fn(),
  setFillColor: vi.fn(),
  rect: vi.fn(),
  roundedRect: vi.fn(),
  addPage: vi.fn(),
  getNumberOfPages: vi.fn(() => 2),
  setPage: vi.fn(),
  save: vi.fn()
};

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation(function () {
      return mockDocInstance;
    })
  };
});

describe('statsPdfExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStats: StatisticsDataset = {
    kpis: {
      totalDiplomas: 15,
      totalMembers: 20,
      totalBatches: 5,
      avgMembersPerBatch: 4,
      youngCount: 16,
      adultCount: 4,
      youngPercentage: 80,
      adultPercentage: 20,
      activeRegionsCount: 3,
      activeDistrictsCount: 4,
      activeGroupsCount: 5,
      validationRate: 75,
      exceptionalRate: 15,
      pendingRate: 10,
      activeCount: 12,
      exceptionalCount: 3,
      pendingCount: 2
    },
    monthlyTrends: [
      {
        monthKey: '2026-01',
        label: 'Ene',
        year: 2026,
        monthIndex: 0,
        totalCount: 5,
        activeCount: 4,
        exceptionalCount: 1,
        pendingCount: 0
      },
      {
        monthKey: '2026-02',
        label: 'Feb',
        year: 2026,
        monthIndex: 1,
        totalCount: 10,
        activeCount: 8,
        exceptionalCount: 2,
        pendingCount: 0
      }
    ],
    recognitionRankings: [
      {
        id: 'sct-wood-badge',
        name: 'Insignia de Madera',
        count: 10,
        percentage: 50,
        badgeStyle: {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          border: 'border-blue-200',
          pillClass: 'bg-blue-100 text-blue-800 border border-blue-200'
        }
      },
      {
        id: 'sct-promesa',
        name: 'Promesa Scout',
        count: 5,
        percentage: 25,
        badgeStyle: {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-200',
          pillClass: 'bg-green-100 text-green-800 border border-green-200'
        }
      }
    ],
    demographics: {
      youngCount: 16,
      adultCount: 4,
      totalCount: 20,
      youngPercentage: 80,
      adultPercentage: 20,
      youngActive: 12,
      youngExceptional: 2,
      youngPending: 2,
      adultActive: 3,
      adultExceptional: 1,
      adultPending: 0
    },
    geographic: {
      regions: [
        { id: 1, name: 'Región Capital', count: 12, percentage: 60 },
        { id: 2, name: 'Región Central', count: 8, percentage: 40 }
      ],
      districts: [
        { id: 10, name: 'Distrito Sucre', count: 8, percentage: 40, parentName: 'Región Capital' }
      ]
    },
    statusBreakdown: {
      activeCount: 15,
      exceptionalCount: 3,
      pendingCount: 2,
      totalCount: 20,
      activePercentage: 75,
      exceptionalPercentage: 15,
      pendingPercentage: 10
    },
    filteredMembersCount: 20,
    filteredBatchesCount: 5
  };

  it('generates PDF executive report with header, KPI boxes, and tables', () => {
    const filename = exportStatisticsPdf(mockStats, {
      periodLabel: 'Este Año',
      regionLabel: 'Región Capital',
      recognitionLabel: 'Insignia de Madera'
    });

    expect(filename).toMatch(/^Reporte_Estadistico_Chil_\d{8}\.pdf$/);
    expect(mockDocInstance.save).toHaveBeenCalledWith(filename);

    // Checks header content
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'INFORME EJECUTIVO Y ANÁLISIS ESTADÍSTICO',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks KPI metrics text
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'TOTAL DIPLOMAS EMITIDOS',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '15',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '75%',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks recognition rankings table
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Insignia de Madera',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks footer stamping on pages
    expect(mockDocInstance.setPage).toHaveBeenCalledWith(1);
    expect(mockDocInstance.setPage).toHaveBeenCalledWith(2);
  });

  it('handles empty rankings and geographic data gracefully', () => {
    const emptyStats: StatisticsDataset = {
      ...mockStats,
      recognitionRankings: [],
      geographic: { regions: [], districts: [] }
    };

    const filename = exportStatisticsPdf(emptyStats);

    expect(filename).toBeDefined();
    expect(mockDocInstance.save).toHaveBeenCalled();
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      expect.stringContaining('No hay datos disponibles de reconocimientos'),
      expect.any(Number),
      expect.any(Number)
    );
  });
});
