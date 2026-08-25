import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    expect(screen.getByText('Región Capital')).toBeInTheDocument();
    expect(screen.getByText('Distrito Sucre')).toBeInTheDocument();
    expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
    expect(screen.getByText('2 Miembros')).toBeInTheDocument();
    expect(screen.getByText('1 Miembros')).toBeInTheDocument();
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
      expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /Descargar diplomas \(PDF\)/i })).toBeInTheDocument();
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
      expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
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
    expect(screen.queryByText('Grupo San Luis')).not.toBeInTheDocument();
    // Batch 102 should still be present
    expect(screen.getByText('Grupo Scouts 45')).toBeInTheDocument();
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
      expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
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
    expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
  });

  it('triggers PDF download and detail navigation from 3-dots dropdown menu', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);
    vi.mocked(recognitions.generateBatchCertificatesPdf).mockResolvedValueOnce('Diplomas_Lote_101_go_solar.pdf');

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
    const downloadBtn = screen.getByRole('button', { name: /^Descargar diplomas \(PDF\)$/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(recognitions.generateBatchCertificatesPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          batch: expect.objectContaining({ id: 101 }),
          members: expect.any(Array)
        })
      );
      expect(screen.getByText(/Diplomas descargados: Diplomas_Lote_101_go_solar\.pdf/i)).toBeInTheDocument();
    });
  });

  it('loads dynamic recognition types and populates options in the filter modal', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
    });

    // Click Añadir Filtro
    fireEvent.click(screen.getByText(/Añadir Filtro/i));

    await waitFor(() => {
      expect(screen.getByText('Añadir Filtro al Listado')).toBeInTheDocument();
    });

    // Change filter type to recognition
    fireEvent.change(screen.getByLabelText(/Tipo de Filtro/i), { target: { value: 'recognition' } });

    // Verify dynamic recognition options are present
    expect(screen.getByRole('option', { name: 'Reconocimiento Personalizado' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Go Solar' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Insignia de Madera' })).toBeInTheDocument();

    // Select custom recognition and apply
    fireEvent.change(screen.getByLabelText(/Valor del Filtro/i), { target: { value: 'sct-custom' } });
    fireEvent.click(screen.getByText('Aplicar Filtro'));

    await waitFor(() => {
      expect(screen.getByText(/Reconocimiento: Reconocimiento Personalizado/i)).toBeInTheDocument();
    });
  });

  it('filters by date range mode with chip format Fecha: DD/MM/YYYY - DD/MM/YYYY', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
    });

    // Remove existing default date filter
    fireEvent.click(screen.getByLabelText(/Eliminar filtro Fecha/i));

    // Open add filter modal
    fireEvent.click(screen.getByText(/Añadir Filtro/i));

    await waitFor(() => {
      expect(screen.getByText('Añadir Filtro al Listado')).toBeInTheDocument();
    });

    // Change filter type to date
    fireEvent.change(screen.getByLabelText(/Tipo de Filtro/i), { target: { value: 'date' } });

    // Select mode "Rango de fechas"
    fireEvent.change(screen.getByLabelText(/Modalidad/i), { target: { value: 'range' } });

    // Enter start and end dates
    fireEvent.change(screen.getByLabelText(/Fecha Inicio/i), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText(/Fecha Fin/i), { target: { value: '2026-08-20' } });

    fireEvent.click(screen.getByText('Aplicar Filtro'));

    await waitFor(() => {
      expect(screen.getByText(/Fecha: 01\/08\/2026 - 20\/08\/2026/i)).toBeInTheDocument();
    });

    // Batch 101 (2026-08-20) should be included, batch 102 (2026-08-21) should be excluded
    expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
    expect(screen.queryByText('Grupo Scouts 45')).not.toBeInTheDocument();
  });

  it('filters by specific date mode with chip format Fecha: DD/MM/YYYY', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
    });

    // Remove existing default date filter
    fireEvent.click(screen.getByLabelText(/Eliminar filtro Fecha/i));

    // Open add filter modal
    fireEvent.click(screen.getByText(/Añadir Filtro/i));

    await waitFor(() => {
      expect(screen.getByText('Añadir Filtro al Listado')).toBeInTheDocument();
    });

    // Change filter type to date
    fireEvent.change(screen.getByLabelText(/Tipo de Filtro/i), { target: { value: 'date' } });

    // Select mode "Fecha específica"
    fireEvent.change(screen.getByLabelText(/Modalidad/i), { target: { value: 'specific' } });

    // Enter specific date
    fireEvent.change(screen.getByLabelText(/^Fecha$/i), { target: { value: '2026-08-21' } });

    fireEvent.click(screen.getByText('Aplicar Filtro'));

    await waitFor(() => {
      expect(screen.getByText(/Fecha: 21\/08\/2026/i)).toBeInTheDocument();
    });

    // Batch 102 (2026-08-21) should be included, batch 101 (2026-08-20) excluded
    expect(screen.getByText('Grupo Scouts 45')).toBeInTheDocument();
    expect(screen.queryByText('Grupo San Luis')).not.toBeInTheDocument();
  });

  it('handles filtering by district, group and predefined date periods', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValue(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValue(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValue(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
    });

    // 1. Add District filter
    fireEvent.click(screen.getByText(/Añadir Filtro/i));
    fireEvent.change(screen.getByLabelText(/Tipo de Filtro/i), { target: { value: 'district' } });
    fireEvent.change(screen.getByLabelText(/Valor del Filtro/i), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Aplicar Filtro'));

    await waitFor(() => {
      expect(screen.getByText(/Distrito: Distrito Sucre/i)).toBeInTheDocument();
    });

    // 2. Add Group filter
    fireEvent.click(screen.getByText(/Añadir Filtro/i));
    fireEvent.change(screen.getByLabelText(/Tipo de Filtro/i), { target: { value: 'group' } });
    fireEvent.change(screen.getByLabelText(/Valor del Filtro/i), { target: { value: '100' } });
    fireEvent.click(screen.getByText('Aplicar Filtro'));

    await waitFor(() => {
      expect(screen.getByText(/Grupo: Grupo San Luis/i)).toBeInTheDocument();
    });

    // 3. Add Predefined Date filter (Últimos 30 días)
    fireEvent.click(screen.getByText(/Añadir Filtro/i));
    fireEvent.change(screen.getByLabelText(/Tipo de Filtro/i), { target: { value: 'date' } });
    fireEvent.change(screen.getByLabelText(/Período/i), { target: { value: 'Últimos 30 días' } });
    fireEvent.click(screen.getByText('Aplicar Filtro'));

    await waitFor(() => {
      expect(screen.getByText(/Fecha: Últimos 30 días/i)).toBeInTheDocument();
    });
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
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);
    vi.mocked(recognitions.generateBatchCertificatesPdf).mockRejectedValueOnce(new Error('PDF generation failure'));
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
    const downloadBtn = screen.getByRole('button', { name: /^Descargar diplomas \(PDF\)$/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al generar los diplomas en PDF.');
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
});
