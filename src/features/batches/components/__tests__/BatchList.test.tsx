import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BatchList } from '../BatchList';
import * as api from '../../api';
import { ScoutMember } from '../../types';

import * as recognitions from '../../../recognitions';

vi.mock('../../api', () => ({
  getAllBatches: vi.fn(),
  getBatchById: vi.fn(),
  getAllMembers: vi.fn(),
  getMembersByBatchId: vi.fn(),
  getHierarchyData: vi.fn(),
  deleteBatch: vi.fn(),
  mergeBatches: vi.fn(),
  getRecognitionBadgeStyle: vi.fn(() => ({
    bg: 'bg-sky-100',
    text: 'text-sky-800',
    border: 'border-sky-200',
    pillClass: 'bg-sky-100 text-sky-800 border border-sky-200'
  })),
  getRecognitionName: vi.fn((val) => {
    if (val === 'sct-go-solar' || val === 'Go Solar') return 'Go Solar';
    if (val === 'sct-wood-badge' || val === 'Insignia de Madera') return 'Insignia de Madera';
    if (val === 'sct-custom') return 'Reconocimiento Personalizado';
    return val || 'Go Solar';
  }),
  RECOGNITION_TYPES: [
    { id: 'sct-wood-badge', name: 'Insignia de Madera' },
    { id: 'sct-go-solar', name: 'Go Solar' }
  ]
}));

vi.mock('../../../recognitions', () => ({
  generateBatchCertificatesZip: vi.fn(),
  generateBatchCertificatesPdf: vi.fn(),
  getRecognitionTypeById: vi.fn(() => Promise.resolve(null)),
  getAllRecognitionTypes: vi.fn(() => Promise.resolve([
    { id: 'sct-wood-badge', name: 'Insignia de Madera' },
    { id: 'sct-go-solar', name: 'Go Solar' },
    { id: 'sct-custom', name: 'Reconocimiento Personalizado' }
  ]))
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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('BatchList component', () => {
  const mockBatches = [
    {
      id: 101,
      comment: 'Lote 1',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'sct-go-solar',
      created_at: '2026-08-20T10:00:00.000Z'
    },
    {
      id: 102,
      comment: 'Lote 2',
      region_id: 2,
      district_id: 20,
      group_id: 200,
      recognition_type: 'sct-wood-badge',
      created_at: '2026-08-21T11:00:00.000Z'
    }
  ];

  const mockMembers: ScoutMember[] = [
    { identity: 'V-1', status: 'active', batch_id: 101, first_names: 'A', last_names: 'B', birth_date: '2000-01-01', member_type: 'young' },
    { identity: 'V-2', status: 'active', batch_id: 101, first_names: 'C', last_names: 'D', birth_date: '2000-01-01', member_type: 'adult' },
    { identity: 'V-3', status: 'active', batch_id: 102, first_names: 'E', last_names: 'F', birth_date: '2000-01-01', member_type: 'young' }
  ];

  const mockHierarchy = {
    regions: [{ id: 1, name: 'Región Capital' }, { id: 2, name: 'Región Andina' }],
    districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }, { id: 20, name: 'Distrito Norte', region_id: 2 }],
    groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }, { id: 200, name: 'Grupo Scouts 45', district_id: 20 }]
  };

  const mockRecTypes: recognitions.RecognitionType[] = [
    { id: 'sct-wood-badge', name: 'Insignia de Madera', created_at: '2026-01-01T00:00:00.000Z' },
    { id: 'sct-go-solar', name: 'Go Solar', created_at: '2026-01-01T00:00:00.000Z' },
    { id: 'sct-custom', name: 'Reconocimiento Personalizado', created_at: '2026-01-01T00:00:00.000Z' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('chil_tour_batch-list-tour_test-user-id', 'true');
    vi.mocked(recognitions.getAllRecognitionTypes).mockResolvedValue(mockRecTypes);
  });

  it('renders table with batches data, and verifies storage path is not rendered', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('FECHA DE EMISIÓN')).toBeInTheDocument();
    });

    // Verify storage path banner is no longer rendered
    expect(screen.queryByText('RUTA DE GUARDADO LOCAL')).not.toBeInTheDocument();
    expect(screen.queryByText(/Cambiar ubicación/i)).not.toBeInTheDocument();

    // Check table headers and rows
    expect(screen.getByText('FECHA DE EMISIÓN')).toBeInTheDocument();
    expect(screen.getByText('REGIÓN')).toBeInTheDocument();
    expect(screen.getByText('DISTRITO')).toBeInTheDocument();
    expect(screen.getByText('GRUPO')).toBeInTheDocument();
    expect(screen.getByText('RECONOCIMIENTO')).toBeInTheDocument();
    expect(screen.getByText('CANTIDAD')).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Región Capital')).toBeInTheDocument();
    expect(within(table).getByText('Distrito Sucre')).toBeInTheDocument();
    expect(within(table).getByText('Grupo San Luis')).toBeInTheDocument();
    expect(within(table).getByText('2 Miembros')).toBeInTheDocument();
    expect(within(table).getByText('1 Miembros')).toBeInTheDocument();
  });

  it('renders only single 3-dots actions button per row and no loose action icon buttons', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(within(screen.getByRole('table')).getByText('Grupo San Luis')).toBeInTheDocument();
    });

    // Verify single 3-dots action button exists
    expect(screen.getByLabelText('Acciones del lote 101')).toBeInTheDocument();
    expect(screen.getByLabelText('Acciones del lote 102')).toBeInTheDocument();

    // Verify loose action buttons do NOT exist in the DOM
    expect(screen.queryByLabelText('Ver detalle del lote 101')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Descargar PDF del lote 101')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Eliminar lote 101')).not.toBeInTheDocument();

    // Open dropdown for row 101
    fireEvent.click(screen.getByLabelText('Acciones del lote 101'));

    // Verify actions inside dropdown
    expect(screen.getByRole('button', { name: /Ver detalle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar reconocimientos \(ZIP\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Eliminar lote/i })).toBeInTheDocument();
  });

  it('opens delete confirmation modal via 3-dots dropdown, confirms deletion, calls deleteBatch API, removes row and shows toast', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);
    vi.mocked(api.deleteBatch).mockResolvedValueOnce();

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(within(screen.getByRole('table')).getByText('Grupo San Luis')).toBeInTheDocument();
    });

    // Open 3-dots dropdown menu for batch 101
    fireEvent.click(screen.getByLabelText('Acciones del lote 101'));

    // Click Eliminar lote inside dropdown
    const deleteOption = screen.getByRole('button', { name: /^Eliminar lote$/i });
    fireEvent.click(deleteOption);

    await waitFor(() => {
      expect(screen.getByText(/¿Está seguro de que desea eliminar el lote/i)).toBeInTheDocument();
    });

    // Confirm deletion inside the modal
    const confirmBtn = screen.getByRole('button', { name: /^Eliminar Lote$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.deleteBatch).toHaveBeenCalledWith(101);
      expect(screen.getByText('Lote eliminado exitosamente')).toBeInTheDocument();
    });

    // Batch 101 should now be removed from table
    const table = screen.getByRole('table');
    expect(within(table).queryByText('Grupo San Luis')).not.toBeInTheDocument();
    // Batch 102 should still be present
    expect(within(table).getByText('Grupo Scouts 45')).toBeInTheDocument();
  });

  it('opens delete confirmation modal via 3-dots dropdown and can be cancelled', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(within(screen.getByRole('table')).getByText('Grupo San Luis')).toBeInTheDocument();
    });

    // Open dropdown for first row
    fireEvent.click(screen.getByLabelText('Acciones del lote 101'));

    // Click Eliminar lote inside dropdown
    const deleteDropdownItem = screen.getByRole('button', { name: /^Eliminar lote$/i });
    fireEvent.click(deleteDropdownItem);

    await waitFor(() => {
      expect(screen.getByText(/¿Está seguro de que desea eliminar el lote/i)).toBeInTheDocument();
    });

    // Cancel deletion
    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(api.deleteBatch).not.toHaveBeenCalled();
    expect(within(screen.getByRole('table')).getByText('Grupo San Luis')).toBeInTheDocument();
  });

  it('triggers PDF download and detail navigation from 3-dots dropdown menu', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);
    vi.mocked(recognitions.generateBatchCertificatesZip).mockResolvedValueOnce('Reconocimientos_Lote_101_go_solar.zip');

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Acciones del lote 101')).toBeInTheDocument();
    });

    // 1. Test Detail navigation
    fireEvent.click(screen.getByLabelText('Acciones del lote 101'));
    const detailBtn = screen.getByRole('button', { name: /^Ver detalle$/i });
    fireEvent.click(detailBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/lotes/101');

    // 2. Test Download PDF from dropdown
    fireEvent.click(screen.getByLabelText('Acciones del lote 101'));
    const downloadBtn = screen.getByRole('button', { name: /^Descargar reconocimientos \(ZIP\)$/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(recognitions.generateBatchCertificatesZip).toHaveBeenCalledWith(
        expect.objectContaining({
          batch: expect.objectContaining({ id: 101 }),
          members: expect.any(Array)
        })
      );
      expect(screen.getByText(/Reconocimientos descargados: Reconocimientos_Lote_101_go_solar\.zip/i)).toBeInTheDocument();
    });
  });

  it('loads dynamic recognition types in inline filter card and filters rows accordingly', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(within(screen.getByRole('table')).getByText('Grupo San Luis')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Filtros/i }));
    const recSelect = screen.getByLabelText('Filtrar por reconocimiento');
    expect(screen.getByRole('option', { name: 'Reconocimiento Personalizado' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Go Solar' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Insignia de Madera' })).toBeInTheDocument();

    fireEvent.change(recSelect, { target: { value: 'sct-wood-badge' } });

    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(within(table).queryByText('Grupo San Luis')).not.toBeInTheDocument();
      expect(within(table).getByText('Grupo Scouts 45')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(within(screen.getByRole('table')).getByText('Grupo San Luis')).toBeInTheDocument();
  });

  it('filters by custom date range inline without modal', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(within(screen.getByRole('table')).getByText('Grupo San Luis')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Filtros/i }));
    fireEvent.change(screen.getByLabelText('Filtrar por período'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Fecha inicio personalizado'), {
      target: { value: '2026-08-01' }
    });
    fireEvent.change(screen.getByLabelText('Fecha fin personalizado'), {
      target: { value: '2026-08-20' }
    });

    // Batch 101 (2026-08-20) should be included, batch 102 (2026-08-21) should be excluded
    const table = screen.getByRole('table');
    expect(within(table).getByText('Grupo San Luis')).toBeInTheDocument();
    expect(within(table).queryByText('Grupo Scouts 45')).not.toBeInTheDocument();
  });

  it('filters by single custom day range inline without modal', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(within(screen.getByRole('table')).getByText('Grupo San Luis')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Filtros/i }));
    fireEvent.change(screen.getByLabelText('Filtrar por período'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Fecha inicio personalizado'), {
      target: { value: '2026-08-21' }
    });
    fireEvent.change(screen.getByLabelText('Fecha fin personalizado'), {
      target: { value: '2026-08-21' }
    });

    // Batch 102 (2026-08-21) should be included, batch 101 (2026-08-20) excluded
    const table = screen.getByRole('table');
    expect(within(table).getByText('Grupo Scouts 45')).toBeInTheDocument();
    expect(within(table).queryByText('Grupo San Luis')).not.toBeInTheDocument();
  });

  it('handles inline filtering by search term, district, group, and predefined date period', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(within(screen.getByRole('table')).getByText('Grupo San Luis')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');

    // 1. Search by group / comment
    fireEvent.change(screen.getByLabelText('Búsqueda de lotes'), { target: { value: 'Scouts 45' } });
    expect(within(table).queryByText('Grupo San Luis')).not.toBeInTheDocument();
    expect(within(table).getByText('Grupo Scouts 45')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Limpiar búsqueda'));
    expect(within(table).getByText('Grupo San Luis')).toBeInTheDocument();

    // 2. District & Group filters
    fireEvent.click(screen.getByRole('button', { name: /Filtros/i }));
    fireEvent.change(screen.getByLabelText('Filtrar por distrito'), { target: { value: '10' } });
    expect(within(table).getByText('Grupo San Luis')).toBeInTheDocument();
    expect(within(table).queryByText('Grupo Scouts 45')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filtrar por grupo'), { target: { value: '100' } });
    expect(within(table).getByText('Grupo San Luis')).toBeInTheDocument();

    // 3. Predefined Date period
    fireEvent.change(screen.getByLabelText('Filtrar por período'), { target: { value: 'this-year' } });
    expect(within(table).getByText('Grupo San Luis')).toBeInTheDocument();
  });

  it('handles pagination next and previous buttons correctly', async () => {
    const manyBatches = Array.from({ length: 15 }, (_, i) => ({
      id: 200 + i,
      comment: `Lote ${i + 1}`,
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'sct-go-solar',
      created_at: '2026-08-20T10:00:00.000Z'
    }));

    vi.mocked(api.getAllBatches).mockResolvedValueOnce(manyBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce([]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mostrando 10 de 15 lotes')).toBeInTheDocument();
    });

    const nextBtn = screen.getByLabelText(/Página siguiente/i);
    const prevBtn = screen.getByLabelText(/Página anterior/i);

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // Click Next
    fireEvent.click(nextBtn);
    expect(screen.getByText('Mostrando 5 de 15 lotes')).toBeInTheDocument();
    expect(nextBtn).toBeDisabled();
    expect(prevBtn).toBeEnabled();

    // Click Previous
    fireEvent.click(prevBtn);
    expect(screen.getByText('Mostrando 10 de 15 lotes')).toBeInTheDocument();
    expect(prevBtn).toBeDisabled();
  });

  it('handles PDF download error and deletion error gracefully with alerts', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);
    vi.mocked(recognitions.generateBatchCertificatesZip).mockRejectedValueOnce(new Error('ZIP generation failure'));
    vi.mocked(api.deleteBatch).mockRejectedValueOnce(new Error('Delete failure'));

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Acciones del lote 101')).toBeInTheDocument();
    });

    // Test download PDF error via 3-dots dropdown
    fireEvent.click(screen.getByLabelText('Acciones del lote 101'));
    const downloadBtn = screen.getByRole('button', { name: /^Descargar reconocimientos \(ZIP\)$/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al generar los reconocimientos en ZIP.');
    });

    // Test delete error via 3-dots dropdown
    fireEvent.click(screen.getByLabelText('Acciones del lote 101'));
    const deleteBtn = screen.getByRole('button', { name: /^Eliminar lote$/i });
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: /^Eliminar Lote$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al eliminar el lote.');
    });

    alertSpy.mockRestore();
  });

  it('displays empty state message when no batches match', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce([]);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce([]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({ regions: [], districts: [], groups: [] });

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No se encontraron lotes registrados.')).toBeInTheDocument();
    });
  });

  it('renders header with Nuevo Lote button without Emisión Rápida and handles navigation', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce([]);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce([]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({ regions: [], districts: [], groups: [] });

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No se encontraron lotes registrados.')).toBeInTheDocument();
    });

    const nuevoBtn = screen.getByRole('button', { name: /Nuevo Lote/i });

    expect(screen.queryByRole('button', { name: /Emisión Rápida/i })).not.toBeInTheDocument();
    expect(nuevoBtn).toBeInTheDocument();

    fireEvent.click(nuevoBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/lotes/nuevo');
  });

  it('renders interactive walkthrough attributes and WalkthroughHelpButton', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    const { container } = render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Listado de Lotes')).toBeInTheDocument();
    });

    // Check data-walkthrough attributes on DOM elements
    expect(container.querySelector('[data-walkthrough="batch-list-header"]')).toBeInTheDocument();
    expect(container.querySelector('[data-walkthrough="batch-list-actions"]')).toBeInTheDocument();
    expect(container.querySelector('[data-walkthrough="batch-list-filters"]')).toBeInTheDocument();
    expect(container.querySelector('[data-walkthrough="batch-list-table"]')).toBeInTheDocument();

    // Check WalkthroughHelpButton is rendered
    const helpBtn = screen.getByRole('button', { name: 'Ver guía interactiva' });
    expect(helpBtn).toBeInTheDocument();
  });

  it('starts and steps through the 4-step walkthrough tour upon clicking the help button', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Listado de Lotes')).toBeInTheDocument();
    });

    const helpBtn = screen.getByRole('button', { name: 'Ver guía interactiva' });
    fireEvent.click(helpBtn);

    // Step 1: Bienvenido al Listado de Lotes
    await waitFor(() => {
      expect(screen.getByText('Bienvenido al Listado de Lotes')).toBeInTheDocument();
    });
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
    expect(screen.getByText('Aquí puedes consultar todos los lotes de reconocimientos emitidos y su estado.')).toBeInTheDocument();

    // Click Siguiente -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

    // Step 2: Crear Nuevos Lotes
    expect(screen.getByText('Crear Nuevos Lotes')).toBeInTheDocument();
    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
    expect(
      screen.getByText("Usa '+ Nuevo Lote' para procesar listas masivas con el asistente paso a paso.")
    ).toBeInTheDocument();

    // Click Siguiente -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

    // Step 3: Búsqueda y Filtros Avanzados
    expect(screen.getByText('Búsqueda y Filtros Avanzados')).toBeInTheDocument();
    expect(screen.getByText('Paso 3 de 4')).toBeInTheDocument();
    expect(screen.getByText(/Filtra tus lotes por fecha, rango de días/i)).toBeInTheDocument();

    // Click Siguiente -> Step 4
    fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

    // Step 4: Gestión de Lotes
    expect(screen.getByText('Gestión de Lotes')).toBeInTheDocument();
    expect(screen.getByText('Paso 4 de 4')).toBeInTheDocument();
    expect(screen.getByText(/Haz clic en cualquier lote para ver sus miembros/i)).toBeInTheDocument();

    // Last step button is "¡Entendido!"
    const finishBtn = screen.getByRole('button', { name: /¡Entendido!/i });
    expect(finishBtn).toBeInTheDocument();

    // Finish tour
    fireEvent.click(finishBtn);

    // Overlay is closed
    expect(screen.queryByText('Gestión de Lotes')).not.toBeInTheDocument();
    expect(localStorage.getItem('chil_tour_batch-list-tour_test-user-id')).toBe('true');
  });

  it('handles row selection, displays Fusionar lotes button when >= 2 batches are selected, opens modal, and executes merge', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValue(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    const mergedBatch = {
      id: 9999,
      comment: 'Lotes combinados',
      region_id: 1,
      district_id: 10,
      group_id: 0,
      recognition_type: 'sct-go-solar',
      created_at: '2026-08-21T11:00:00.000Z'
    };
    vi.mocked(api.mergeBatches).mockResolvedValueOnce(mergedBatch);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('FECHA DE EMISIÓN')).toBeInTheDocument();
    });

    // Verify merge button is NOT visible initially
    expect(screen.queryByRole('button', { name: /Fusionar lotes/i })).not.toBeInTheDocument();

    // Select row 101
    const checkbox101 = screen.getByLabelText('Seleccionar lote 101');
    fireEvent.click(checkbox101);

    // Still not visible with 1 selection
    expect(screen.queryByRole('button', { name: /Fusionar lotes/i })).not.toBeInTheDocument();

    // Select row 102
    const checkbox102 = screen.getByLabelText('Seleccionar lote 102');
    fireEvent.click(checkbox102);

    // Button should now be visible: "Fusionar lotes (2)"
    const mergeBtn = await screen.findByRole('button', { name: 'Fusionar lotes (2)' });
    expect(mergeBtn).toBeInTheDocument();

    // Click merge button to open modal
    fireEvent.click(mergeBtn);

    // Modal is open
    expect(screen.getByText('Fusionar Lotes Seleccionados')).toBeInTheDocument();

    // Confirm merge
    const confirmBtn = screen.getByRole('button', { name: 'Fusionar lotes' });
    fireEvent.click(confirmBtn);

    // Check merge success toast and modal closed
    await waitFor(() => {
      expect(api.mergeBatches).toHaveBeenCalledWith(
        expect.objectContaining({
          batchIds: expect.arrayContaining([101, 102])
        }),
        'test-user-id'
      );
      expect(screen.getByText('¡Lotes fusionados exitosamente en el Lote #9999!')).toBeInTheDocument();
    });

    // Merge button disappears as selection is reset
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Fusionar lotes/i })).not.toBeInTheDocument();
    });
  });

  it('renders multi-territory pills, +N overflow for >3 groups, and Completitud badges across batches', async () => {
    const multiBatches = [
      {
        id: 501,
        comment: 'Lote Multi',
        region_id: 0,
        district_id: 0,
        group_id: 0,
        recognition_type: 'sct-go-solar',
        created_at: '2026-08-21T11:00:00.000Z'
      },
      {
        id: 502,
        comment: 'Lote Vacío',
        region_id: 0,
        district_id: 0,
        group_id: 0,
        recognition_type: 'sct-go-solar',
        created_at: '2026-08-21T12:00:00.000Z'
      }
    ];
    const multiHierarchy = {
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [
        { id: 10, name: 'Distrito Sucre', region_id: 1 },
        { id: 16, name: 'No aplica', region_id: 1 }
      ],
      groups: [
        { id: 1, name: 'Grupo 1', district_id: 10 },
        { id: 2, name: 'Grupo 2', district_id: 10 },
        { id: 3, name: 'Grupo 3', district_id: 10 },
        { id: 10, name: 'Grupo 10', district_id: 10 }
      ]
    };
    const multiMembers: ScoutMember[] = [
      { identity: 'V-1', status: 'active', batch_id: 501, first_names: 'A', last_names: 'B', birth_date: '2000-01-01', member_type: 'young', region_id: 1, district_id: 10, group_id: 1 },
      { identity: 'V-2', status: 'active', batch_id: 501, first_names: 'C', last_names: 'D', birth_date: '2000-01-01', member_type: 'young', region_id: 1, district_id: 10, group_id: 2 },
      { identity: 'V-3', status: 'active', batch_id: 501, first_names: 'E', last_names: 'F', birth_date: '2000-01-01', member_type: 'young', region_id: 1, district_id: 10, group_id: 3 },
      { identity: 'V-4', status: 'active', batch_id: 501, first_names: 'G', last_names: 'H', birth_date: '2000-01-01', member_type: 'young', region_id: 1, district_id: 10, group_id: 10 },
      { identity: 'V-5', status: 'pending', batch_id: 501, first_names: 'I', last_names: 'J', birth_date: '2000-01-01', member_type: 'young', region_id: 0, district_id: 0, group_id: 0 }
    ];

    vi.mocked(api.getAllBatches).mockResolvedValueOnce(multiBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(multiMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(multiHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('COMPLETITUD')).toBeInTheDocument();
    });

    // 4 positive groups -> 3 pills + "+1" overflow badge ("No aplica" suppressed when positive groups exist)
    const table = screen.getByRole('table');
    expect(within(table).getByText('Grupo 1')).toBeInTheDocument();
    expect(within(table).getByText('Grupo 2')).toBeInTheDocument();
    expect(within(table).getByText('Grupo 3')).toBeInTheDocument();
    const overflowBadge = within(table).getByText('+1');
    expect(overflowBadge).toBeInTheDocument();
    expect(overflowBadge).toHaveAttribute('title', 'Grupo 10');

    // Completeness statuses
    expect(within(table).getByText('Registros pendientes (1)')).toBeInTheDocument();
    expect(within(table).getByText('Sin miembros')).toBeInTheDocument();
  });

  it('filters accurately by exact group token (id:1 vs id:10), Nacional, No scout, No aplica, and Completitud', async () => {
    const filterBatches = [
      {
        id: 601,
        comment: 'Lote Grupo 1',
        region_id: 0,
        district_id: 0,
        group_id: 0,
        recognition_type: 'sct-go-solar',
        created_at: '2026-08-21T11:00:00.000Z'
      },
      {
        id: 602,
        comment: 'Lote Grupo 10 y Nacional',
        region_id: 0,
        district_id: 0,
        group_id: 0,
        recognition_type: 'sct-wood-badge',
        created_at: '2026-08-21T12:00:00.000Z'
      },
      {
        id: 603,
        comment: 'Lote No Scout',
        region_id: 0,
        district_id: 0,
        group_id: 0,
        recognition_type: 'sct-custom',
        created_at: '2026-08-21T13:00:00.000Z'
      }
    ];
    const filterHierarchy = {
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [
        { id: 10, name: 'Distrito Sucre', region_id: 1 },
        { id: 16, name: 'No aplica', region_id: 1 }
      ],
      groups: [
        { id: 1, name: 'Grupo 1', district_id: 10 },
        { id: 10, name: 'Grupo 10', district_id: 10 }
      ]
    };
    const filterMembers: ScoutMember[] = [
      { identity: 'V-1', status: 'active', batch_id: 601, first_names: 'A', last_names: 'B', birth_date: '2000-01-01', member_type: 'young', region_id: 1, district_id: 10, group_id: 1 },
      { identity: 'V-2', status: 'active', batch_id: 602, first_names: 'C', last_names: 'D', birth_date: '2000-01-01', member_type: 'young', region_id: 1, district_id: 10, group_id: 10 },
      { identity: 'V-3', status: 'active', batch_id: 602, first_names: 'E', last_names: 'F', birth_date: '2000-01-01', member_type: 'adult', region_id: 0, district_id: 0, group_id: 0, unit: 'institucional' },
      { identity: 'V-4', status: 'active', batch_id: 603, first_names: 'G', last_names: 'H', birth_date: '2000-01-01', member_type: 'adult', region_id: 0, district_id: 0, group_id: 0, unit: 'no_scout' }
    ];

    vi.mocked(api.getAllBatches).mockResolvedValueOnce(filterBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(filterMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(filterHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    const table = screen.getByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Grupo 1')).toBeInTheDocument();
      expect(within(table).getByText('Grupo 10')).toBeInTheDocument();
    });

    // 1. Filter by Grupo 1 (value "1") — should NOT match Grupo 10 ("10")
    const filtersToggle = screen.getByRole('button', { name: /Filtros/i });
    fireEvent.click(filtersToggle);
    fireEvent.change(screen.getByLabelText('Filtrar por grupo'), { target: { value: '1' } });
    await waitFor(() => {
      expect(within(table).getByText('Grupo 1')).toBeInTheDocument();
      expect(within(table).queryByText('Grupo 10')).not.toBeInTheDocument();
    });

    // Collapse panel and remove Grupo 1 chip directly
    fireEvent.click(filtersToggle);
    expect(screen.getByText('Filtros activos:')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Quitar filtro Grupo Scout'));
    expect(within(table).getByText('Grupo 10')).toBeInTheDocument();

    // Re-open panel for remaining filter assertions
    fireEvent.click(filtersToggle);

    // 2. Filter by Region = Nacional
    fireEvent.change(screen.getByLabelText('Filtrar por región'), { target: { value: 'nacional' } });
    await waitFor(() => {
      expect(within(table).getByText('Grupo 10')).toBeInTheDocument();
      expect(within(table).queryByText('Grupo 1')).not.toBeInTheDocument();
    });

    // Clear region filter
    fireEvent.change(screen.getByLabelText('Filtrar por región'), { target: { value: '' } });

    // 3. Filter by Grupo = No scout
    fireEvent.change(screen.getByLabelText('Filtrar por grupo'), { target: { value: 'no_scout' } });
    await waitFor(() => {
      expect(within(table).getByText('No scout')).toBeInTheDocument();
      expect(within(table).queryByText('Grupo 1')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Filtrar por grupo'), { target: { value: '' } });

    // 4. Filter by Completitud = Todos registrados (all 3 fixture batches are active -> complete)
    fireEvent.change(screen.getByLabelText('Filtrar por completitud'), { target: { value: 'complete' } });
    await waitFor(() => {
      expect(within(table).getByText('Grupo 1')).toBeInTheDocument();
      expect(within(table).getByText('No scout')).toBeInTheDocument();
    });

    // Filtering by 'empty' hides complete batches
    fireEvent.change(screen.getByLabelText('Filtrar por completitud'), { target: { value: 'empty' } });
    await waitFor(() => {
      expect(within(table).queryByText('Grupo 1')).not.toBeInTheDocument();
    });
  });

  it('disables row ZIP download when batch has 0 eligible members, and supports modal pre-fetch cancellation', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const batchesFixture = [
      ...mockBatches,
      {
        id: 103,
        comment: 'Lote Solo Pendientes',
        region_id: 1,
        district_id: 10,
        group_id: 100,
        recognition_type: 'sct-go-solar',
        created_at: '2026-08-22T10:00:00.000Z'
      }
    ];
    const membersFixture: ScoutMember[] = [
      ...mockMembers,
      { identity: 'V-P1', status: 'pending', batch_id: 103, first_names: 'P', last_names: 'User', birth_date: '2000-01-01', member_type: 'young' }
    ];

    vi.mocked(api.getAllBatches).mockResolvedValueOnce(batchesFixture);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(membersFixture);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    let resolveRecType!: (val: recognitions.RecognitionType | null) => void;
    vi.mocked(recognitions.getRecognitionTypeById).mockImplementationOnce(
      () => new Promise((res) => { resolveRecType = res; })
    );

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Acciones del lote 103')).toBeInTheDocument();
    });

    // Batch 103 has only pending members -> disabled row ZIP menu item
    fireEvent.click(screen.getByLabelText('Acciones del lote 103'));
    const disabledZipItem = screen.getByRole('button', { name: /^Descargar reconocimientos \(ZIP\)$/i });
    expect(disabledZipItem).toBeDisabled();

    // Batch 101 -> open modal in "Preparando lote..." while pre-fetching and cancel mid-fetch
    fireEvent.click(screen.getByLabelText('Acciones del lote 101'));
    fireEvent.click(screen.getByRole('button', { name: /^Descargar reconocimientos \(ZIP\)$/i }));

    expect(screen.getByText('Generando certificados')).toBeInTheDocument();
    expect(screen.getByText('Preparando lote...')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Cancelando...')).toBeInTheDocument();

    resolveRecType(null);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(recognitions.generateBatchCertificatesZip).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

