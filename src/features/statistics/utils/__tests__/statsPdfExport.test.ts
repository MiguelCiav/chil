import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportStatisticsPdf } from '../statsPdfExport';
import { StatisticsDataset } from '../../types';

const mockDocInstance = {
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  setDrawColor: vi.fn(),
  line: vi.fn(),
  lines: vi.fn(),
  circle: vi.fn(),
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

function getBodySectionSeparatorLines(): Array<readonly [number, number, number, number]> {
  const events: Array<{ order: number; kind: 'color'; rgb: [number, number, number] } | { order: number; kind: 'line'; args: [number, number, number, number] }> = [];

  mockDocInstance.setDrawColor.mock.calls.forEach((args, idx) => {
    events.push({
      order: mockDocInstance.setDrawColor.mock.invocationCallOrder[idx],
      kind: 'color',
      rgb: [args[0], args[1], args[2]]
    });
  });

  mockDocInstance.line.mock.calls.forEach((args, idx) => {
    events.push({
      order: mockDocInstance.line.mock.invocationCallOrder[idx],
      kind: 'line',
      args: [args[0], args[1], args[2], args[3]]
    });
  });

  events.sort((a, b) => a.order - b.order);

  let activeRgb: [number, number, number] | null = null;
  const separators: Array<readonly [number, number, number, number]> = [];
  for (const event of events) {
    if (event.kind === 'color') {
      activeRgb = event.rgb;
    } else if (
      activeRgb?.[0] === 229 &&
      activeRgb?.[1] === 231 &&
      activeRgb?.[2] === 235 &&
      event.args[0] === 14 &&
      event.args[2] === 196 &&
      event.args[1] === event.args[3] &&
      event.args[1] > 16 &&
      event.args[1] < 285
    ) {
      separators.push(event.args);
    }
  }

  return separators;
}

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
      ],
      groups: [
        { id: 100, name: 'Grupo San Jorge', count: 6, percentage: 30, parentName: 'Distrito Sucre' }
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

  it('generates PDF report starting at regions without KPI summary, subtitles, or bordered section/chart frames', () => {
    const filename = exportStatisticsPdf(mockStats, {
      periodLabel: 'Este Año',
      regionLabel: 'Región Capital',
      recognitionLabel: 'Insignia de Madera'
    });

    expect(filename).toMatch(/^Reporte_Estadistico_Chil_\d{8}\.pdf$/);
    expect(mockDocInstance.save).toHaveBeenCalledWith(filename);

    // Checks header title and institutional metadata without subtitle
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Estadísticas y Análisis',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      expect.stringMatching(/^Asociación de Scouts de Venezuela • Sistema Chil • Emitido el /),
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      'Métricas consolidadas, tendencias temporales y cobertura de reconocimientos emitidos.',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks top KPI summary cards are omitted from PDF
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      'de 20 miembros procesados',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      'MÁS ENTREGADO',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      'REGIONES Y DISTRITOS',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      'DEMOGRAFÍA',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      'TOTAL LOTES',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks only the active filter summary uses 'FD' borders (masthead, section headers, and charts are borderless)
    const borderedRects = mockDocInstance.roundedRect.mock.calls.filter(
      call => call[call.length - 1] === 'FD'
    );
    expect(borderedRects).toHaveLength(1);

    // Checks section headers have no left colored accent bars (1.8x5.4) and titles align at MARGIN (14)
    const sectionAccentBars = mockDocInstance.roundedRect.mock.calls.filter(
      call => call[0] === 14 && call[2] === 1.8 && call[3] === 5.4
    );
    expect(sectionAccentBars).toHaveLength(0);

    // Checks horizontal cardBorder section separators between consecutive same-page sections (4: Region->District, District->Group, Group->Unit, Demographics->Monthly; Unit->Demographics breaks to page 2)
    expect(getBodySectionSeparatorLines()).toHaveLength(4);

    // Checks section titles omit numeric prefixes
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\d+[a-z]?\.\s+(Reconocimientos Entregados|Resumen )/),
      expect.any(Number),
      expect.any(Number)
    );

    // Checks Section: Region table (first section) without number, subtitle, and with descriptive bottom-right total
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Reconocimientos Entregados por Región',
      14,
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Total de regiones',
      expect.any(Number),
      expect.any(Number),
      { align: 'right' }
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Total de distritos',
      expect.any(Number),
      expect.any(Number),
      { align: 'right' }
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Total de grupos',
      expect.any(Number),
      expect.any(Number),
      { align: 'right' }
    );
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      'Distribución de los reconocimientos válidos entregados por región territorial',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '1. Región Capital',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks Section: District table
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Reconocimientos Entregados por Distrito',
      14,
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '1. Distrito Sucre',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks Section: Scout Group table
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Reconocimientos Entregados por Grupo Scout',
      14,
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      '1. Grupo San Jorge',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks Section: Unit table & segmented bar
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Reconocimientos Entregados por Unidad Scout',
      14,
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'No scout (Agradecimientos)',
      expect.any(Number),
      expect.any(Number)
    );

    // Checks Section: Demographics Donut chart & table
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Resumen Demográfico (Jóvenes y Adultos)',
      14,
      expect.any(Number)
    );
    expect(mockDocInstance.circle).toHaveBeenCalled();
    expect(mockDocInstance.lines).toHaveBeenCalled();

    // Top-right entity-count badges are removed
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      '2 regiones',
      expect.any(Number),
      expect.any(Number),
      { align: 'center' }
    );
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      '1 distrito',
      expect.any(Number),
      expect.any(Number),
      { align: 'center' }
    );
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      '1 grupo',
      expect.any(Number),
      expect.any(Number),
      { align: 'center' }
    );

    // Checks Section: Monthly table, Total above chart, and chart below Total
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Resumen Mensual de Reconocimientos',
      14,
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Gráfico de Tendencia Mensual de Reconocimientos:',
      expect.any(Number),
      expect.any(Number)
    );
    const section5TotalCallIdx = mockDocInstance.text.mock.calls.reduce(
      (last, call, idx) =>
        call[0] === 'Total de reconocimientos' && call[3]?.align === 'right' ? idx : last,
      -1
    );
    const monthlyChartHeadingIdx = mockDocInstance.text.mock.calls.findIndex(
      call => call[0] === 'Gráfico de Tendencia Mensual de Reconocimientos:'
    );
    expect(section5TotalCallIdx).toBeGreaterThan(-1);
    expect(monthlyChartHeadingIdx).toBeGreaterThan(section5TotalCallIdx);

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

    // Comparative annual pill badge is omitted in header
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      'Reporte Comparativo Anual (2024 vs 2025)',
      expect.any(Number),
      expect.any(Number),
      { align: 'center' }
    );
    expect(mockDocInstance.text).not.toHaveBeenCalledWith(
      expect.stringContaining('Reporte Comparativo Anual'),
      expect.any(Number),
      expect.any(Number)
    );

    // Zero bordered 'FD' boxes when no filterSummary is provided
    const borderedRects = mockDocInstance.roundedRect.mock.calls.filter(
      call => call[call.length - 1] === 'FD'
    );
    expect(borderedRects).toHaveLength(0);

    // Bottom-right YoY section totals rendered on Region, District, and Monthly (before chart)
    const yoyCurrCalls = mockDocInstance.text.mock.calls.filter(
      call => call[0] === 'Año 2025' && call[3]?.align === 'right'
    );
    const yoyPrevCalls = mockDocInstance.text.mock.calls.filter(
      call => call[0] === 'Año 2024' && call[3]?.align === 'right'
    );
    expect(yoyCurrCalls).toHaveLength(3);
    expect(yoyPrevCalls).toHaveLength(3);

    // Monthly comparative chart renders below the Monthly YoY Total
    const lastYoYTotalIdx = mockDocInstance.text.mock.calls.reduce(
      (last, call, idx) =>
        call[0] === 'Año 2025' && call[3]?.align === 'right' ? idx : last,
      -1
    );
    const yoyChartHeadingIdx = mockDocInstance.text.mock.calls.findIndex(
      call => call[0] === 'Gráfico de Tendencia Mensual y Comparativa:'
    );
    expect(yoyChartHeadingIdx).toBeGreaterThan(lastYoYTotalIdx);

    // Check comparative chart title
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      'Gráfico de Tendencia Mensual y Comparativa:',
      expect.any(Number),
      expect.any(Number)
    );
  });
});

