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
      topRecognitionName: 'Insignia de Madera',
      topRecognitionCount: 10,
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
    unitDistribution: {
      items: [
        { unit: 'manada', label: 'Manada', count: 4, percentage: 20, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
        { unit: 'tropa', label: 'Tropa', count: 8, percentage: 40, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { unit: 'caminantes', label: 'Caminantes', count: 2, percentage: 10, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
        { unit: 'clan', label: 'Clan', count: 2, percentage: 10, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
        { unit: 'institucional', label: 'Institucional', count: 2, percentage: 10, badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
        { unit: 'no_scout', label: 'No scout', count: 2, percentage: 10, badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' }
      ],
      totalCount: 20
    },
    filteredMembersCount: 20,
    filteredBatchesCount: 5
  };

  it('generates PDF executive report with header, KPI boxes, and 5 sections', () => {
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
      'TOTAL RECONOCIMIENTOS',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '15',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks Section 1: Region table
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '1. Reconocimientos Entregados por Región',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '1. Región Capital',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks Section 2: District table
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '2. Reconocimientos Entregados por Distrito',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '1. Distrito Sucre',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks Section 3: Unit table
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '3. Reconocimientos Entregados por Unidad Scout',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'No scout (Agradecimientos)',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks Section 4: Demographics table
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '4. Resumen Demográfico (Jóvenes y Adultos)',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks Section 5: Monthly table and chart
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '5. Resumen Mensual de Reconocimientos',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Gráfico de Tendencia Mensual de Reconocimientos:',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks footer stamping on pages
    expect(mockDocInstance.setPage).toHaveBeenCalledWith(1);
    expect(mockDocInstance.setPage).toHaveBeenCalledWith(2);
  });

  it('handles empty geographic data gracefully', () => {
    const emptyStats: StatisticsDataset = {
      ...mockStats,
      geographic: { regions: [], districts: [] }
    };

    const filename = exportStatisticsPdf(emptyStats);

    expect(filename).toBeDefined();
    expect(mockDocInstance.save).toHaveBeenCalled();
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      expect.stringContaining('No hay registros disponibles por región.'),
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      expect.stringContaining('No hay registros disponibles por distrito.'),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('generates comparative PDF report when yoyComparison hasPreviousYearData is true', () => {
    const yoyStats: StatisticsDataset = {
      ...mockStats,
      yoyComparison: {
        currentYear: 2025,
        previousYear: 2024,
        hasPreviousYearData: true,
        totalDiplomas: { current: 15, previous: 10, diff: 5, percentChange: 50 },
        totalBatches: { current: 5, previous: 4, diff: 1, percentChange: 25 },
        totalMembers: { current: 15, previous: 10, diff: 5, percentChange: 50 },
        demographics: {
          young: { current: 12, previous: 8, diff: 4, percentChange: 50, currentPercentage: 80, previousPercentage: 80 },
          adult: { current: 3, previous: 2, diff: 1, percentChange: 50, currentPercentage: 20, previousPercentage: 20 },
          total: { current: 15, previous: 10, diff: 5, percentChange: 50 }
        },
        regions: [
          { id: 1, name: 'Región Capital', currentCount: 12, previousCount: 8, diff: 4, percentChange: 50, currentPercentage: 80, previousPercentage: 80 }
        ],
        districts: [
          { id: 10, name: 'Distrito Sucre', parentName: 'Región Capital', currentCount: 8, previousCount: 5, diff: 3, percentChange: 60, currentPercentage: 53.3, previousPercentage: 50 }
        ],
        units: [
          { unit: 'manada', label: 'Manada', currentCount: 4, previousCount: 2, diff: 2, percentChange: 100, currentPercentage: 26.7, previousPercentage: 20, badgeClass: '' }
        ],
        monthly: [
          { monthIndex: 0, label: 'Ene', currentCount: 5, previousCount: 3, diff: 2, percentChange: 66.7 },
          { monthIndex: 1, label: 'Feb', currentCount: 10, previousCount: 7, diff: 3, percentChange: 42.9 }
        ]
      }
    };

    const filename = exportStatisticsPdf(yoyStats);

    expect(filename).toBeDefined();
    expect(mockDocInstance.save).toHaveBeenCalled();

    // Check comparative subtitle in header
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Reporte Comparativo Anual (2024 vs 2025)',
      expect.any(Number),
      expect.any(Number)
    );

    // Check comparative chart title
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Gráfico de Tendencia Mensual y Comparativa:',
      expect.any(Number),
      expect.any(Number)
    );
  });
});

