import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SummaryView } from '../SummaryView';
import * as batchApi from '../../../batches/api';
import * as recognitionApi from '../../../recognitions';
import * as excelExportModule from '../../utils/excelExport';
import { Batch, ScoutMember } from '../../../batches/types';
import { RecognitionType } from '../../../recognitions';

vi.mock('../../../batches/api', () => ({
  getAllBatches: vi.fn(),
  getAllMembers: vi.fn(),
  getHierarchyData: vi.fn(),
  getRecognitionBadgeStyle: vi.fn(() => ({
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
    pillClass: 'bg-amber-100 text-amber-800 border border-amber-200'
  })),
  getRecognitionName: vi.fn((val) => {
    if (val === 'sct-go-solar' || val === 'Go Solar') return 'Go Solar';
    if (val === 'sct-wood-badge' || val === 'Insignia de Madera') return 'Insignia de Madera';
    if (val === 'sct-custom') return 'Reconocimiento Personalizado';
    return val || '-';
  })
}));

vi.mock('../../../recognitions', () => ({
  getAllRecognitionTypes: vi.fn()
}));

vi.mock('../../utils/excelExport', () => ({
  exportToExcel: vi.fn()
}));

vi.mock('../../../auth', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'test-user-id', email: 'test@scouts.org.ve', displayName: 'Test User' },
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn()
  }))
}));

describe('SummaryView component', () => {
  const mockBatches: Batch[] = [
    {
      id: 101,
      comment: 'Lote Go Solar Caracas',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'sct-go-solar',
      created_at: '2026-08-20T10:00:00.000Z'
    },
    {
      id: 102,
      comment: 'Lote Insignia Andes',
      region_id: 2,
      district_id: 20,
      group_id: 200,
      recognition_type: 'sct-wood-badge',
      created_at: '2026-08-21T11:00:00.000Z'
    }
  ];

  const mockMembers: ScoutMember[] = [
    {
      identity: 'V-1001',
      status: 'active',
      batch_id: 101,
      first_names: 'Ana María',
      last_names: 'Pérez Gómez',
      birth_date: '2008-05-10',
      member_type: 'young',
      recognition_code: 'SOL-001'
    },
    {
      identity: 'V-1002',
      status: 'pending',
      batch_id: 101,
      first_names: 'Beatriz',
      last_names: 'López Díaz',
      birth_date: '1985-02-14',
      member_type: 'adult',
      recognition_code: 'SOL-002'
    },
    {
      identity: 'V-1003',
      status: 'exceptional',
      batch_id: 101,
      first_names: 'Diana',
      last_names: 'Excepcional',
      birth_date: '2007-06-15',
      member_type: 'young',
      recognition_code: 'SOL-003'
    },
    {
      identity: 'V-2001',
      status: 'active',
      batch_id: 102,
      first_names: 'Carlos',
      last_names: 'Rodríguez',
      birth_date: '2009-11-20',
      member_type: 'young',
      recognition_code: 'WB-050'
    }
  ];

  const mockHierarchy = {
    regions: [
      { id: 1, name: 'Región Capital' },
      { id: 2, name: 'Región Andina' }
    ],
    districts: [
      { id: 10, name: 'Distrito Sucre', region_id: 1 },
      { id: 20, name: 'Distrito Norte', region_id: 2 }
    ],
    groups: [
      { id: 100, name: 'Grupo San Luis', district_id: 10 },
      { id: 200, name: 'Grupo Scouts 45', district_id: 20 }
    ]
  };

  const mockRecTypes: RecognitionType[] = [
    { id: 'sct-go-solar', name: 'Go Solar', created_at: '2026-01-01T00:00:00.000Z' },
    { id: 'sct-wood-badge', name: 'Insignia de Madera', created_at: '2026-01-01T00:00:00.000Z' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(batchApi.getAllBatches).mockResolvedValue(mockBatches);
    vi.mocked(batchApi.getAllMembers).mockResolvedValue(mockMembers);
    vi.mocked(batchApi.getHierarchyData).mockResolvedValue(mockHierarchy);
    vi.mocked(recognitionApi.getAllRecognitionTypes).mockResolvedValue(mockRecTypes);
  });

  it('renders header, download button, filter controls, and table with 12 columns', async () => {
    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    // Header
    expect(screen.getByText('Resumen General de Reconocimientos')).toBeInTheDocument();
    expect(
      screen.getByText('Consulta y exportación consolidada de todos los reconocimientos emitidos.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar Excel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar todo/i })).toBeInTheDocument();

    // 12 Table Columns
    await waitFor(() => {
      expect(screen.getByText('FECHA')).toBeInTheDocument();
      expect(screen.getByText('LOTE')).toBeInTheDocument();
      expect(screen.getByText('RECONOCIMIENTO')).toBeInTheDocument();
      expect(screen.getByText('CÉDULA')).toBeInTheDocument();
      expect(screen.getByText('NOMBRE')).toBeInTheDocument();
      expect(screen.getByText('APELLIDO')).toBeInTheDocument();
      expect(screen.getByText('TIPO')).toBeInTheDocument();
      expect(screen.getByText('ESTATUS')).toBeInTheDocument();
      expect(screen.getByText('CÓDIGO REC.')).toBeInTheDocument();
      expect(screen.getByText('REGIÓN')).toBeInTheDocument();
      expect(screen.getByText('DISTRITO')).toBeInTheDocument();
      expect(screen.getByText('GRUPO')).toBeInTheDocument();
    });

    // Verify row data populated
    expect(screen.getByText('V-1001')).toBeInTheDocument();
    expect(screen.getByText('Ana María')).toBeInTheDocument();
    expect(screen.getByText('Pérez Gómez')).toBeInTheDocument();
    expect(screen.getByText('SOL-001')).toBeInTheDocument();
    expect(screen.getAllByText('Región Capital').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Distrito Sucre').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Grupo San Luis').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('V-1002')).toBeInTheDocument();
    expect(screen.getByText('Beatriz')).toBeInTheDocument();
    expect(screen.getByText('López Díaz')).toBeInTheDocument();

    expect(screen.getByText('V-1003')).toBeInTheDocument();
    expect(screen.getByText('Diana')).toBeInTheDocument();
    expect(screen.getByText('Excepcional')).toBeInTheDocument();

    expect(screen.getByText('V-2001')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('Rodríguez')).toBeInTheDocument();

    // Verify status badges
    expect(screen.getAllByText(/● Registro Válido/i)).toHaveLength(2);
    expect(screen.getByText(/● Emisión Excepcional/i)).toBeInTheDocument();
    expect(screen.getByText(/● Registro Inválido/i)).toBeInTheDocument();

    // Verify summary counter
    expect(screen.getByText(/Mostrando 4 de 4 registros totales/i)).toBeInTheDocument();
  });

  it('filters data instantaneously using the global search bar across name, cédula, and recognition code', async () => {
    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('V-1001')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/Búsqueda global/i);

    // 1. Search by first name
    fireEvent.change(searchInput, { target: { value: 'Beatriz' } });
    expect(screen.getByText('V-1002')).toBeInTheDocument();
    expect(screen.queryByText('V-1001')).not.toBeInTheDocument();
    expect(screen.queryByText('V-2001')).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 de 1 registros totales/i)).toBeInTheDocument();

    // 2. Search by cédula
    fireEvent.change(searchInput, { target: { value: 'V-2001' } });
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.queryByText('Ana María')).not.toBeInTheDocument();

    // 3. Search by recognition code
    fireEvent.change(searchInput, { target: { value: 'SOL-001' } });
    expect(screen.getByText('Ana María')).toBeInTheDocument();
    expect(screen.queryByText('Carlos')).not.toBeInTheDocument();

    // Clear search with clear button
    const clearBtn = screen.getByLabelText(/Limpiar búsqueda/i);
    fireEvent.click(clearBtn);
    expect(screen.getByText('V-1001')).toBeInTheDocument();
    expect(screen.getByText('V-2001')).toBeInTheDocument();
  });

  it('filters by recognition type dropdown', async () => {
    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('V-1001')).toBeInTheDocument();
    });

    const recSelect = screen.getByLabelText(/Filtrar por reconocimiento/i);

    // Filter by Go Solar
    fireEvent.change(recSelect, { target: { value: 'sct-go-solar' } });
    expect(screen.getByText('V-1001')).toBeInTheDocument();
    expect(screen.getByText('V-1002')).toBeInTheDocument();
    expect(screen.queryByText('V-2001')).not.toBeInTheDocument();

    // Filter by Insignia de Madera
    fireEvent.change(recSelect, { target: { value: 'sct-wood-badge' } });
    expect(screen.getByText('V-2001')).toBeInTheDocument();
    expect(screen.queryByText('V-1001')).not.toBeInTheDocument();
    expect(screen.queryByText('V-1002')).not.toBeInTheDocument();
  });

  it('filters by region, district, and group hierarchy dropdowns', async () => {
    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('V-1001')).toBeInTheDocument();
    });

    const regionSelect = screen.getByLabelText(/Filtrar por región/i);

    // Select Región Andina (id 2)
    fireEvent.change(regionSelect, { target: { value: '2' } });
    expect(screen.getByText('V-2001')).toBeInTheDocument();
    expect(screen.queryByText('V-1001')).not.toBeInTheDocument();

    // Select District Norte (id 20)
    const districtSelect = screen.getByLabelText(/Filtrar por distrito/i);
    fireEvent.change(districtSelect, { target: { value: '20' } });
    expect(screen.getByText('V-2001')).toBeInTheDocument();

    // Select Group Scouts 45 (id 200)
    const groupSelect = screen.getByLabelText(/Filtrar por grupo/i);
    fireEvent.change(groupSelect, { target: { value: '200' } });
    expect(screen.getByText('V-2001')).toBeInTheDocument();
  });

  it('filters by member type (young / adult)', async () => {
    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('V-1001')).toBeInTheDocument();
    });

    const memberTypeSelect = screen.getByLabelText(/Filtrar por tipo de miembro/i);

    // Select Jóvenes
    fireEvent.change(memberTypeSelect, { target: { value: 'young' } });
    expect(screen.getByText('V-1001')).toBeInTheDocument();
    expect(screen.getByText('V-2001')).toBeInTheDocument();
    expect(screen.queryByText('V-1002')).not.toBeInTheDocument();

    // Select Adultos
    fireEvent.change(memberTypeSelect, { target: { value: 'adult' } });
    expect(screen.getByText('V-1002')).toBeInTheDocument();
    expect(screen.queryByText('V-1001')).not.toBeInTheDocument();
    expect(screen.queryByText('V-2001')).not.toBeInTheDocument();
  });

  it('filters by status (active / exceptional / pending)', async () => {
    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('V-1001')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/Filtrar por estatus/i);

    // Select Registro Válido (active)
    fireEvent.change(statusSelect, { target: { value: 'active' } });
    expect(screen.getByText('V-1001')).toBeInTheDocument();
    expect(screen.getByText('V-2001')).toBeInTheDocument();
    expect(screen.queryByText('V-1002')).not.toBeInTheDocument();
    expect(screen.queryByText('V-1003')).not.toBeInTheDocument();

    // Select Emisión Excepcional (exceptional)
    fireEvent.change(statusSelect, { target: { value: 'exceptional' } });
    expect(screen.getByText('V-1003')).toBeInTheDocument();
    expect(screen.queryByText('V-1001')).not.toBeInTheDocument();
    expect(screen.queryByText('V-1002')).not.toBeInTheDocument();
    expect(screen.queryByText('V-2001')).not.toBeInTheDocument();

    // Select Registro Inválido (pending)
    fireEvent.change(statusSelect, { target: { value: 'pending' } });
    expect(screen.getByText('V-1002')).toBeInTheDocument();
    expect(screen.queryByText('V-1001')).not.toBeInTheDocument();
    expect(screen.queryByText('V-1003')).not.toBeInTheDocument();
    expect(screen.queryByText('V-2001')).not.toBeInTheDocument();
  });

  it('filters by date period and custom date range', async () => {
    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('V-1001')).toBeInTheDocument();
    });

    const periodSelect = screen.getByLabelText(/Filtrar por período/i);

    // Predefined period: Este Año
    fireEvent.change(periodSelect, { target: { value: 'this-year' } });
    expect(screen.getByText('V-1001')).toBeInTheDocument();

    // Custom date range
    fireEvent.change(periodSelect, { target: { value: 'custom' } });
    const startInput = screen.getByLabelText(/Fecha inicio personalizado/i);
    const endInput = screen.getByLabelText(/Fecha fin personalizado/i);

    fireEvent.change(startInput, { target: { value: '2026-08-20' } });
    fireEvent.change(endInput, { target: { value: '2026-08-20' } });

    // Batch 101 is on 2026-08-20 (V-1001, V-1002), batch 102 is on 2026-08-21 (V-2001)
    expect(screen.getByText('V-1001')).toBeInTheDocument();
    expect(screen.getByText('V-1002')).toBeInTheDocument();
    expect(screen.queryByText('V-2001')).not.toBeInTheDocument();
  });

  it('resets all filters when clicking Limpiar filtros', async () => {
    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('V-1001')).toBeInTheDocument();
    });

    // Apply a search term
    const searchInput = screen.getByLabelText(/Búsqueda global/i);
    fireEvent.change(searchInput, { target: { value: 'Beatriz' } });
    expect(screen.queryByText('V-1001')).not.toBeInTheDocument();

    // Click Limpiar filtros
    const resetBtn = screen.getByLabelText(/Limpiar todos los filtros/i);
    fireEvent.click(resetBtn);

    // All rows should be back
    expect(screen.getByText('V-1001')).toBeInTheDocument();
    expect(screen.getByText('V-1002')).toBeInTheDocument();
    expect(screen.getByText('V-2001')).toBeInTheDocument();
  });

  it('calls exportToExcel with filtered rows when clicking Descargar Excel button', async () => {
    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('V-1001')).toBeInTheDocument();
    });

    // Filter to young members only
    const memberTypeSelect = screen.getByLabelText(/Filtrar por tipo de miembro/i);
    fireEvent.change(memberTypeSelect, { target: { value: 'young' } });

    // Click Export Excel (now showing Descargar filtrados)
    const exportBtn = screen.getByRole('button', { name: /Descargar Excel/i });
    fireEvent.click(exportBtn);

    expect(excelExportModule.exportToExcel).toHaveBeenCalledTimes(1);
    expect(excelExportModule.exportToExcel).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ identity: 'V-1001' }),
        expect.objectContaining({ identity: 'V-2001' }),
        expect.objectContaining({ identity: 'V-1003' })
      ])
    );
    expect(screen.getByText(/¡Registros exportados exitosamente \(3\)!/i)).toBeInTheDocument();
  });

  it('calls exportToExcel with ALL rows when clicking Descargar todo button even when filters are active', async () => {
    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('V-1001')).toBeInTheDocument();
    });

    // Filter to young members only
    const memberTypeSelect = screen.getByLabelText(/Filtrar por tipo de miembro/i);
    fireEvent.change(memberTypeSelect, { target: { value: 'young' } });

    // Click "Descargar todo"
    const exportAllBtn = screen.getByRole('button', { name: /Descargar todo/i });
    fireEvent.click(exportAllBtn);

    expect(excelExportModule.exportToExcel).toHaveBeenCalledTimes(1);
    expect(excelExportModule.exportToExcel).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ identity: 'V-1001' }),
        expect.objectContaining({ identity: 'V-1002' }),
        expect.objectContaining({ identity: 'V-1003' }),
        expect.objectContaining({ identity: 'V-2001' })
      ])
    );
    expect(screen.getByText(/¡Todos los registros \(4\) han sido exportados exitosamente!/i)).toBeInTheDocument();
  });

  it('displays empty state when no records match filter criteria', async () => {
    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('V-1001')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/Búsqueda global/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentPersonXYZ' } });

    expect(screen.getByText('No se encontraron registros de reconocimientos.')).toBeInTheDocument();
    expect(
      screen.getByText('Ajuste el término de búsqueda o modifique los filtros activos.')
    ).toBeInTheDocument();
  });

  it('supports pagination controls and changing page size', async () => {
    const manyMembers: ScoutMember[] = Array.from({ length: 30 }, (_, i) => ({
      identity: `V-30${String(i).padStart(2, '0')}`,
      status: 'active',
      batch_id: 101,
      first_names: `Persona ${i + 1}`,
      last_names: 'Prueba',
      birth_date: '2000-01-01',
      member_type: 'young',
      recognition_code: `REC-${i + 1}`
    }));

    vi.mocked(batchApi.getAllMembers).mockResolvedValueOnce(manyMembers);

    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Persona 1')).toBeInTheDocument();
    });

    // Change page size to 10
    const pageSizeSelect = screen.getByLabelText(/Selector de filas por página/i);
    fireEvent.change(pageSizeSelect, { target: { value: '10' } });

    expect(screen.getByText(/Mostrando 10 de 30 registros totales/i)).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();

    // Navigate to next page
    const nextBtn = screen.getByLabelText(/Página siguiente/i);
    fireEvent.click(nextBtn);

    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    expect(screen.getByText('Persona 11')).toBeInTheDocument();

    // Navigate back to previous page
    const prevBtn = screen.getByLabelText(/Página anterior/i);
    fireEvent.click(prevBtn);

    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByText('Persona 1')).toBeInTheDocument();
  });

  it('renders UNIDAD column with badges and filters members by Scout Unit', async () => {
    const unitMembers: ScoutMember[] = [
      {
        identity: 'V-1001',
        status: 'active',
        batch_id: 101,
        first_names: 'Ana María',
        last_names: 'Pérez Gómez',
        birth_date: '2008-05-10',
        member_type: 'young',
        unit: 'manada',
        recognition_code: 'SOL-001'
      },
      {
        identity: 'V-2001',
        status: 'active',
        batch_id: 102,
        first_names: 'Carlos',
        last_names: 'Rodríguez',
        birth_date: '2009-11-20',
        member_type: 'young',
        unit: 'tropa',
        recognition_code: 'WB-050'
      },
      {
        identity: 'V-3001',
        status: 'active',
        batch_id: 101,
        first_names: 'Pedro',
        last_names: 'Externo',
        birth_date: '1980-01-01',
        member_type: 'adult',
        unit: 'no_scout',
        recognition_code: 'EXT-001'
      }
    ];

    vi.mocked(batchApi.getAllMembers).mockResolvedValueOnce(unitMembers);
    vi.mocked(batchApi.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(batchApi.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <SummaryView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('UNIDAD')).toBeInTheDocument();
      expect(screen.getByText('Manada')).toBeInTheDocument();
      expect(screen.getByText('Tropa')).toBeInTheDocument();
      expect(screen.getByText('No scout')).toBeInTheDocument();
    });

    // Filter by Manada
    const unitFilter = screen.getByLabelText(/Filtrar por unidad/i);
    fireEvent.change(unitFilter, { target: { value: 'manada' } });

    expect(screen.getByText('Ana María')).toBeInTheDocument();
    expect(screen.queryByText('Carlos')).not.toBeInTheDocument();
    expect(screen.queryByText('Pedro')).not.toBeInTheDocument();

    // Filter by No Scout
    fireEvent.change(unitFilter, { target: { value: 'no_scout' } });

    expect(screen.getByText('Pedro')).toBeInTheDocument();
    expect(screen.queryByText('Ana María')).not.toBeInTheDocument();
    expect(screen.queryByText('Carlos')).not.toBeInTheDocument();
  });
});
