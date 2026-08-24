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
  getRecognitionName: vi.fn((val) => val || 'Go Solar'),
  RECOGNITION_TYPES: [
    { id: 'sct-wood-badge', name: 'Insignia de Madera' },
    { id: 'sct-go-solar', name: 'Go Solar' }
  ]
}));

vi.mock('../../../recognitions', () => ({
  generateBatchCertificatesPdf: vi.fn(),
  getRecognitionTypeById: vi.fn(() => Promise.resolve(null))
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBatches = [
    {
      id: 101,
      comment: 'Lote 1',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'Go Solar',
      created_at: '2026-08-20T10:00:00.000Z'
    },
    {
      id: 102,
      comment: 'Lote 2',
      region_id: 2,
      district_id: 20,
      group_id: 200,
      recognition_type: 'Insignia de Madera',
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

  it('renders KPI cards and table with batches data, and verifies storage path is not rendered', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Generado')).toBeInTheDocument();
    });

    // Check KPI metrics
    expect(screen.getByText('Reconocimiento más común')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // 3 active certificates

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

  it('opens delete confirmation modal, confirms deletion, calls deleteBatch API, removes row and shows toast', async () => {
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

    // Open delete confirmation modal via quick delete button
    const deleteBtn = screen.getByLabelText(/Eliminar lote 101/i);
    fireEvent.click(deleteBtn);

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

  it('opens delete confirmation modal via dropdown and can be cancelled', async () => {
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

    // Click Acciones dropdown for first row
    const accionesButtons = screen.getAllByRole('button', { name: /^Acciones$/i });
    fireEvent.click(accionesButtons[0]);

    // Click Eliminar Lote inside dropdown
    const deleteDropdownItem = screen.getByRole('button', { name: /^Eliminar Lote$/i });
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

  it('handles active filters removal and adding new filter', async () => {
    vi.mocked(api.getAllBatches).mockResolvedValueOnce(mockBatches);
    vi.mocked(api.getAllMembers).mockResolvedValueOnce(mockMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockHierarchy);

    render(
      <MemoryRouter>
        <BatchList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Fecha: Este Año/i)).toBeInTheDocument();
    });

    // Remove the default filter
    const removeBtn = screen.getByLabelText(/Eliminar filtro Fecha/i);
    fireEvent.click(removeBtn);

    expect(screen.queryByText(/Fecha: Este Año/i)).not.toBeInTheDocument();

    // Add a new filter
    const addFilterBtn = screen.getByText(/Añadir Filtro/i);
    fireEvent.click(addFilterBtn);

    await waitFor(() => {
      expect(screen.getByText('Añadir Filtro al Listado')).toBeInTheDocument();
    });

    // Select region value
    const valSelect = screen.getByLabelText(/Valor del Filtro/i);
    fireEvent.change(valSelect, { target: { value: '1' } });

    const applyBtn = screen.getByText('Aplicar Filtro');
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Región: Región Capital/i)).toBeInTheDocument();
    });
  });

  it('triggers PDF download and detail navigation from row actions', async () => {
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
      expect(screen.getByLabelText(/Ver detalle del lote 101/i)).toBeInTheDocument();
    });

    // Click detail button
    const detailBtn = screen.getByLabelText(/Ver detalle del lote 101/i);
    fireEvent.click(detailBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/lotes/101');

    // Click download button
    const downloadBtn = screen.getByLabelText(/Descargar PDF del lote 101/i);
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
