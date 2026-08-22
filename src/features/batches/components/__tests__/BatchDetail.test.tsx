import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BatchDetail } from '../BatchDetail';
import * as api from '../../api';

vi.mock('../../api', () => ({
  getBatchById: vi.fn(),
  getMembersByBatchId: vi.fn(),
  getHierarchyData: vi.fn(),
  updateMember: vi.fn(),
  deleteBatch: vi.fn(),
  generateBatchReport: vi.fn(),
  exportMembersToCSV: vi.fn(),
  getRecognitionName: vi.fn((name) => name || 'Servicio Prolongado')
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});
describe('BatchDetail component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and not-found state when batch does not exist', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce(null);
    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [],
      districts: [],
      groups: []
    });

    render(
      <MemoryRouter initialEntries={['/lotes/999']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Lote no encontrado')).toBeInTheDocument();
      expect(screen.getByText('Volver al listado')).toBeInTheDocument();
    });
  });

  it('renders full batch details, stats, member table, CSV and PDF download buttons', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: 'Lote de Inspección',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'Servicio Prolongado',
      recognition_duration: '5 años',
      created_at: '2026-08-20T10:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
      {
        identity: 'V-11111111',
        first_names: 'Ana',
        last_names: 'Perez',
        birth_date: '2005-01-01',
        member_type: 'young',
        status: 'active',
        batch_id: 101,
        recognition_code: 'SP-5Y-001'
      },
      {
        identity: 'V-22222222',
        first_names: 'Carlos',
        last_names: 'Gomez',
        birth_date: '1990-05-15',
        member_type: 'adult',
        status: 'pending',
        batch_id: 101
      }
    ]);

    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    });

    vi.mocked(api.generateBatchReport).mockResolvedValueOnce('Reporte_Lote_101.pdf');

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Detalle de Lote/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Lote de Inspección/i)).toBeInTheDocument();
    expect(screen.getByText(/Región Capital/i)).toBeInTheDocument();
    expect(screen.getByText(/Distrito Sucre/i)).toBeInTheDocument();
    expect(screen.getByText(/Grupo San Luis/i)).toBeInTheDocument();
    expect(screen.getByText(/Detalles del Lote/i)).toBeInTheDocument();
    expect(screen.getByText(/Tipo de Reconocimiento/i)).toBeInTheDocument();
    expect(screen.getByText(/Resumen de Miembros/i)).toBeInTheDocument();

    // Check table rows
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();

    // Check CSV Export button
    const csvBtn = screen.getByRole('button', { name: /Descargar lista/i });
    fireEvent.click(csvBtn);
    expect(api.exportMembersToCSV).toHaveBeenCalled();

    // Trigger PDF download
    const downloadBtn = screen.getByRole('button', { name: /Descargar todos \(PDF\)/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.generateBatchReport).toHaveBeenCalledWith(101);
      expect(screen.getByText(/Reporte PDF descargado exitosamente/i)).toBeInTheDocument();
    });
  });

  it('opens delete confirmation modal, confirms deletion, calls deleteBatch API and navigates back to /lotes', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: 'Lote a eliminar',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'Go Solar',
      created_at: '2026-08-20T10:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    });
    vi.mocked(api.deleteBatch).mockResolvedValueOnce();

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eliminar Lote/i })).toBeInTheDocument();
    });

    // Click Eliminar Lote header button
    const deleteBtn = screen.getByRole('button', { name: /Eliminar Lote/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/¿Está seguro de que desea eliminar el lote/i)).toBeInTheDocument();
    });

    // Confirm deletion inside the modal
    const confirmBtn = screen.getAllByRole('button', { name: /^Eliminar Lote$/i })[1] || screen.getByRole('button', { name: /^Eliminar Lote$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.deleteBatch).toHaveBeenCalledWith(101);
      expect(mockNavigate).toHaveBeenCalledWith('/lotes');
    });
  });

  it('opens delete confirmation modal and can be cancelled without deleting', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: 'Lote a conservar',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'Go Solar',
      created_at: '2026-08-20T10:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    });

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eliminar Lote/i })).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /Eliminar Lote/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/¿Está seguro de que desea eliminar el lote/i)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(api.deleteBatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('filters member table by search query', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: '',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      created_at: '2026-08-20T10:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
      {
        identity: 'V-11111111',
        first_names: 'Ana',
        last_names: 'Perez',
        birth_date: '2005-01-01',
        member_type: 'young',
        status: 'active',
        batch_id: 101
      },
      {
        identity: 'V-22222222',
        first_names: 'Carlos',
        last_names: 'Gomez',
        birth_date: '1990-05-15',
        member_type: 'adult',
        status: 'pending',
        batch_id: 101
      }
    ]);

    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    });

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar miembro.../i);
    fireEvent.change(searchInput, { target: { value: 'Carlos' } });

    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();
    expect(screen.queryByText('Ana Perez')).not.toBeInTheDocument();
  });

  it('opens member quick view modal when eye icon is clicked', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: '',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      created_at: '2026-08-20T10:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
      {
        identity: 'V-11111111',
        first_names: 'Ana',
        last_names: 'Perez',
        birth_date: '2005-01-01',
        email: 'ana@scouts.org',
        phone: '04141234567',
        member_type: 'young',
        status: 'active',
        batch_id: 101
      }
    ]);

    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    });

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    const viewBtn = screen.getByLabelText(/Ver detalle de Ana Perez/i);
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getByText('Ficha del Miembro Scout')).toBeInTheDocument();
      expect(screen.getByText('ana@scouts.org')).toBeInTheDocument();
    });
  });

  it('opens member edit modal, modifies member data and saves', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: '',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      created_at: '2026-08-20T10:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValue([
      {
        identity: 'V-11111111',
        first_names: 'Ana',
        last_names: 'Perez',
        birth_date: '2005-01-01',
        email: 'ana@scouts.org',
        phone: '04141234567',
        member_type: 'young',
        status: 'active',
        batch_id: 101
      }
    ]);

    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    });

    vi.mocked(api.updateMember).mockResolvedValueOnce({
      identity: 'V-11111111',
      first_names: 'Ana Maria',
      last_names: 'Perez',
      birth_date: '2005-01-01',
      member_type: 'young',
      status: 'active',
      batch_id: 101
    });

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    const menuBtn = screen.getByLabelText(/Opciones de Ana Perez/i);
    fireEvent.click(menuBtn);

    const editBtn = screen.getByText('Editar');
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText('Editar Datos de Miembro')).toBeInTheDocument();
    });

    const namesInput = screen.getByLabelText(/Nombres \*/i);
    fireEvent.change(namesInput, { target: { value: 'Ana Maria' } });

    const saveBtn = screen.getByText('Guardar Cambios');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalledWith(expect.objectContaining({
        first_names: 'Ana Maria'
      }));
      expect(screen.getByText(/Datos del miembro actualizados con éxito/i)).toBeInTheDocument();
    });
  });
});
