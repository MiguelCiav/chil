import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatisticsDashboard } from '../StatisticsDashboard';
import * as batchApi from '../../../batches/api';
import * as recognitionApi from '../../../recognitions/api';
import * as statsPdfExport from '../../utils/statsPdfExport';
import { Batch, ScoutMember, Region, District, ScoutGroup } from '../../../../types';
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

vi.mock('../../utils/statsPdfExport', () => ({
  exportStatisticsPdf: vi.fn(() => 'Reporte_Estadistico_Chil_20260824.pdf')
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
describe('StatisticsDashboard Component', () => {
  const mockBatches: Batch[] = [
    {
      id: 101,
      comment: 'Lote Scouts 101',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'sct-wood-badge',
      created_at: '2026-04-10T10:00:00.000Z'
    },
    {
      id: 102,
      comment: 'Lote Scouts 102',
      region_id: 2,
      district_id: 20,
      group_id: 200,
      recognition_type: 'sct-promesa',
      created_at: '2026-06-15T12:00:00.000Z'
    }
  ];

  const mockMembers: ScoutMember[] = [
    {
      identity: 'V-1111',
      first_names: 'Gabriel',
      last_names: 'Mendoza',
      birth_date: '2010-02-14',
      member_type: 'young',
      status: 'active',
      batch_id: 101
    },
    {
      identity: 'V-2222',
      first_names: 'Elena',
      last_names: 'Torres',
      birth_date: '1988-11-23',
      member_type: 'adult',
      status: 'exceptional',
      batch_id: 101
    },
    {
      identity: 'V-3333',
      first_names: 'Diego',
      last_names: 'Ramirez',
      birth_date: '2012-07-09',
      member_type: 'young',
      status: 'active',
      batch_id: 102
    }
  ];

  const mockRegions: Region[] = [
    { id: 1, name: 'Región Capital' },
    { id: 2, name: 'Región Zulia' }
  ];

  const mockDistricts: District[] = [
    { id: 10, name: 'Distrito Libertador', region_id: 1 },
    { id: 20, name: 'Distrito Maracaibo', region_id: 2 }
  ];

  const mockGroups: ScoutGroup[] = [
    { id: 100, name: 'Grupo La Salle', district_id: 10 },
    { id: 200, name: 'Grupo San Sebastian', district_id: 20 }
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

  it('renders main dashboard layout starting with region breakdown and without KPI summary or card subtitles', async () => {
    render(<StatisticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Estadísticas y Análisis')).toBeInTheDocument();
    });

    // Filter card renders search input and inline controls without a card title
    expect(screen.queryByText('Filtros y Segmentación de Datos')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Buscar en estadísticas')).toBeInTheDocument();

    // Top KPI summary cards removed
    expect(screen.queryByText('Total Lotes')).not.toBeInTheDocument();
    expect(screen.queryByText('Más Entregado')).not.toBeInTheDocument();
    expect(screen.queryByText('Regiones y Distritos')).not.toBeInTheDocument();

    // Verify section headings and absence of card subtitles
    expect(screen.getByText('Reconocimientos entregados por Región')).toBeInTheDocument();
    expect(screen.getByText('Reconocimientos entregados por Distrito')).toBeInTheDocument();
    expect(screen.getByText('Reconocimientos entregados por Grupo Scout')).toBeInTheDocument();
    expect(screen.getByText('Reconocimientos entregados por Unidad')).toBeInTheDocument();
    expect(screen.getByText('Resumen de reconocimientos entregados a Jóvenes y Adultos')).toBeInTheDocument();
    expect(screen.getByText('Resumen Mensual de Reconocimientos')).toBeInTheDocument();

    expect(screen.queryByText(/Distribución territorial consolidada por región scout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Distribución territorial por distrito y región scout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Distribución territorial por grupo scout y distrito correspondiente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Distribución de reconocimientos según la unidad scout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Distribución demográfica entre scouts jóvenes y dirigentes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Distribución de reconocimientos otorgados a lo largo del año/i)).not.toBeInTheDocument();

    // Verify bottom-right descriptive totals
    expect(screen.getByText('Total de regiones')).toBeInTheDocument();
    expect(screen.getByText('Total de distritos')).toBeInTheDocument();
    expect(screen.getByText('Total de grupos')).toBeInTheDocument();
    expect(screen.getByText('Total de reconocimientos')).toBeInTheDocument();

    // Verify validation status card is removed
    expect(screen.queryByText('Calidad y Estatus de Validación')).not.toBeInTheDocument();
  });

  it('filters data when using search input or changing region and allows resetting filters', async () => {
    render(<StatisticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Estadísticas y Análisis')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Buscar en estadísticas');
    fireEvent.change(searchInput, { target: { value: 'Zulia' } });

    await waitFor(() => {
      expect(screen.getByText('Limpiar filtros')).toBeInTheDocument();
      const regionTable = screen.getAllByRole('table')[0];
      expect(within(regionTable).queryByText('Región Capital')).not.toBeInTheDocument();
      expect(within(regionTable).getByText('Región Zulia')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Limpiar filtros'));
    expect(within(screen.getAllByRole('table')[0]).getByText('Región Capital')).toBeInTheDocument();

    // Open collapsible filters panel
    const toggleBtn = screen.getByRole('button', { name: /Filtros/i });
    fireEvent.click(toggleBtn);

    const regionSelect = screen.getByLabelText('Filtrar por región');
    fireEvent.change(regionSelect, { target: { value: '1' } });

    // Collapse filters panel and verify active filter chip summary appears
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Filtros activos:')).toBeInTheDocument();
    expect(screen.getByLabelText('Quitar filtro Región')).toBeInTheDocument();

    // "Limpiar filtros" button appears
    await waitFor(() => {
      expect(screen.getByText('Limpiar filtros')).toBeInTheDocument();
    });

    const resetBtn = screen.getByText('Limpiar filtros');
    fireEvent.click(resetBtn);

    expect(screen.queryByText('Limpiar filtros')).not.toBeInTheDocument();
  });

  it('triggers PDF export when clicking Exportar todo button in module header', async () => {
    render(<StatisticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Estadísticas y Análisis')).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: 'Exportar todo' });
    expect(exportBtn).toHaveTextContent('Exportar todo');
    fireEvent.click(exportBtn);

    expect(statsPdfExport.exportStatisticsPdf).toHaveBeenCalledTimes(1);
  });

  it('renders error state and handles retry', async () => {
    vi.mocked(batchApi.getAllBatches).mockRejectedValueOnce(new Error('Network connectivity lost'));

    render(<StatisticsDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Error al cargar estadísticas');
      expect(screen.getByRole('alert')).toHaveTextContent('Network connectivity lost');
    });

    vi.mocked(batchApi.getAllBatches).mockResolvedValue(mockBatches);
    const retryBtn = screen.getByText('Reintentar');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Estadísticas y Análisis')).toBeInTheDocument();
    });
  });

  it('renders comparative columns when data spans across multiple years', async () => {
    const multiYearBatches: Batch[] = [
      {
        id: 101,
        comment: 'Lote 2026',
        region_id: 1,
        district_id: 10,
        group_id: 100,
        recognition_type: 'sct-wood-badge',
        created_at: '2026-04-10T10:00:00.000Z'
      },
      {
        id: 201,
        comment: 'Lote 2025',
        region_id: 1,
        district_id: 10,
        group_id: 100,
        recognition_type: 'sct-wood-badge',
        created_at: '2025-04-10T10:00:00.000Z'
      }
    ];

    const multiYearMembers: ScoutMember[] = [
      {
        identity: 'V-1111',
        first_names: 'Gabriel',
        last_names: 'Mendoza',
        birth_date: '2010-02-14',
        member_type: 'young',
        status: 'active',
        batch_id: 101
      },
      {
        identity: 'V-2222',
        first_names: 'Elena',
        last_names: 'Torres',
        birth_date: '1988-11-23',
        member_type: 'adult',
        status: 'exceptional',
        batch_id: 201
      }
    ];

    vi.mocked(batchApi.getAllBatches).mockResolvedValue(multiYearBatches);
    vi.mocked(batchApi.getAllMembers).mockResolvedValue(multiYearMembers);

    render(<StatisticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Estadísticas y Análisis')).toBeInTheDocument();
    });

    // Check comparative column headers & bottom-right year totals on Region, District, Group, and Monthly sections
    expect(screen.getAllByText('Total (2026)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Año Anterior (2025)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Variación').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Año 2026')).toHaveLength(4);
    expect(screen.getAllByText('Año 2025')).toHaveLength(4);
  });

  it('excludes pending members from demographics and matches total verified recognitions', async () => {
    const membersWithPending: ScoutMember[] = [
      ...mockMembers,
      {
        identity: 'V-4444',
        first_names: 'Carlos',
        last_names: 'Pendiente',
        birth_date: '2011-03-10',
        member_type: 'young',
        status: 'pending',
        batch_id: 101
      },
      {
        identity: 'V-5555',
        first_names: 'Marta',
        last_names: 'Pendiente',
        birth_date: '1982-06-15',
        member_type: 'adult',
        status: 'pending',
        batch_id: 102
      }
    ];

    vi.mocked(batchApi.getAllMembers).mockResolvedValue(membersWithPending);

    render(<StatisticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Estadísticas y Análisis')).toBeInTheDocument();
    });

    // Demographics table (index 4: Region, District, Group, Unit, Demographics, Monthly)
    const demographicsTable = screen.getAllByRole('table')[4];
    const totalRow = within(demographicsTable).getByText('Total').closest('tr');
    expect(totalRow).not.toBeNull();
    // Only the 3 verified members (2 active + 1 exceptional) should be counted, not 5
    expect(within(totalRow!).getByText('3')).toBeInTheDocument();
  });

  it('renders loading skeletons without the removed KPI skeleton grid while loading', () => {
    vi.mocked(batchApi.getAllBatches).mockReturnValue(new Promise(() => {}));

    render(<StatisticsDashboard />);

    const status = screen.getByRole('status', { name: 'Cargando estadísticas' });
    expect(status).toBeInTheDocument();
    expect(screen.queryByTestId('kpi-skeleton-grid')).not.toBeInTheDocument();
  });
});

