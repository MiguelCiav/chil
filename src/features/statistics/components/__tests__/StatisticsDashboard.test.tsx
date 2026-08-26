import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatisticsDashboard } from '../StatisticsDashboard';
import * as batchApi from '../../../batches/api';
import * as recognitionApi from '../../../recognitions/api';
import * as statsPdfExport from '../../utils/statsPdfExport';
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

  it('renders main dashboard layout with KPI grid and charts', async () => {
    render(<StatisticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Estadísticas y Análisis')).toBeInTheDocument();
    });

    // Verify Top 5 Executive KPI Cards
    expect(screen.getAllByText('Total Reconocimientos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total Lotes')).toBeInTheDocument();
    expect(screen.getByText('Más Entregado')).toBeInTheDocument();
    expect(screen.getByText('Regiones y Distritos')).toBeInTheDocument();
    expect(screen.getAllByText('Demografía').length).toBeGreaterThanOrEqual(1);

    // Verify 5 Sections
    expect(screen.getByText('Reconocimientos entregados por Región')).toBeInTheDocument();
    expect(screen.getByText('Reconocimientos entregados por Distrito')).toBeInTheDocument();
    expect(screen.getByText('Reconocimientos entregados por Unidad')).toBeInTheDocument();
    expect(screen.getByText('Resumen de reconocimientos entregados a Jóvenes y Adultos')).toBeInTheDocument();
    expect(screen.getByText('Resumen Mensual de Reconocimientos')).toBeInTheDocument();

    // Verify validation status card is removed
    expect(screen.queryByText('Calidad y Estatus de Validación')).not.toBeInTheDocument();
  });

  it('filters data when changing region and allows resetting filters', async () => {
    render(<StatisticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Estadísticas y Análisis')).toBeInTheDocument();
    });

    const regionSelect = screen.getByLabelText('Filtrar por región');
    fireEvent.change(regionSelect, { target: { value: '1' } });

    // "Limpiar filtros" button appears
    await waitFor(() => {
      expect(screen.getByText('Limpiar filtros')).toBeInTheDocument();
    });

    const resetBtn = screen.getByText('Limpiar filtros');
    fireEvent.click(resetBtn);

    expect(screen.queryByText('Limpiar filtros')).not.toBeInTheDocument();
  });

  it('triggers PDF export when clicking export button', async () => {
    render(<StatisticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Estadísticas y Análisis')).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /Exportar Reporte Ejecutivo PDF/i });
    fireEvent.click(exportBtn);

    expect(statsPdfExport.exportStatisticsPdf).toHaveBeenCalledTimes(1);
  });

  it('renders error state and handles retry', async () => {
    vi.mocked(batchApi.getAllBatches).mockRejectedValueOnce(new Error('Network connectivity lost'));

    render(<StatisticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar estadísticas')).toBeInTheDocument();
      expect(screen.getByText('Network connectivity lost')).toBeInTheDocument();
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

    // Check comparative column headers
    expect(screen.getAllByText('Total (2026)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Año Anterior (2025)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Variación').length).toBeGreaterThanOrEqual(1);
  });
});

