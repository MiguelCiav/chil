import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BatchDetail } from '../BatchDetail';
import { ScoutMember, Batch } from '../../types';
import * as api from '../../api';
import * as recognitions from '../../../recognitions';

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

vi.mock('../../../recognitions', () => ({
  generateBatchCertificatesPdf: vi.fn(),
  downloadSingleCertificatePdf: vi.fn(),
  getAllRecognitionTypes: vi.fn(() => Promise.resolve([])),
  getRecognitionTypeById: vi.fn(() => Promise.resolve(null))
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

describe('BatchDetail component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(recognitions.getAllRecognitionTypes).mockResolvedValue([]);
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

  it('renders full batch details, stats, member table, PDF member list report and dynamic PDF batch download', async () => {
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

    vi.mocked(recognitions.generateBatchCertificatesPdf).mockResolvedValueOnce(
      'Reconocimientos_Lote_101_servicio_prolongado.pdf'
    );

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Lote #101')).toBeInTheDocument();
    });

    expect(screen.getByText('Comentarios / Observaciones')).toBeInTheDocument();
    expect(screen.getByText(/Lote de Inspección/i)).toBeInTheDocument();
    expect(screen.getByText(/Región Capital/i)).toBeInTheDocument();
    expect(screen.getByText(/Distrito Sucre/i)).toBeInTheDocument();
    expect(screen.getByText(/Grupo San Luis/i)).toBeInTheDocument();
    expect(screen.getByText(/Detalles del Lote/i)).toBeInTheDocument();
    expect(screen.getByText(/Tipo de Reconocimiento/i)).toBeInTheDocument();
    expect(screen.getByText('Servicio Prolongado')).toBeInTheDocument();
    expect(screen.queryByText('5 años')).not.toBeInTheDocument();
    expect(screen.getByText(/Resumen de Miembros/i)).toBeInTheDocument();

    // Check table rows
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();

    // Check Member List PDF Export button
    const listBtn = screen.getByRole('button', { name: /Descargar lista/i });
    fireEvent.click(listBtn);

    await waitFor(() => {
      expect(api.generateBatchReport).toHaveBeenCalled();
      expect(screen.getByText(/Lista de miembros \(PDF\) generada exitosamente\./i)).toBeInTheDocument();
    });

    // Trigger batch PDF download
    const downloadBtn = screen.getByRole('button', { name: /Descargar (todos|reconocimientos) \(PDF\)/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(recognitions.generateBatchCertificatesPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          batch: expect.objectContaining({ id: 101 }),
          members: expect.any(Array)
        })
      );
      expect(
        screen.getByText(/¡Reconocimientos descargados exitosamente en Reconocimientos_Lote_101_servicio_prolongado\.pdf!/i)
      ).toBeInTheDocument();
    });
  });

  it('downloads single member recognition when clicking option in member dropdown menu', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: 'Lote Conmemorativo',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'Insignia de Madera',
      created_at: '2026-08-20T10:00:00.000Z'
    });

    const activeMember = {
      identity: 'V-11111111',
      first_names: 'Ana',
      last_names: 'Perez',
      birth_date: '2005-01-01',
      member_type: 'young' as const,
      status: 'active' as const,
      batch_id: 101,
      recognition_code: 'REC-001'
    };

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([activeMember]);

    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    });

    vi.mocked(recognitions.downloadSingleCertificatePdf).mockResolvedValueOnce(
      'Reconocimiento_V-11111111_Lote_101_insignia_de_madera.pdf'
    );

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

    // Open row menu
    const menuBtn = screen.getByLabelText(/Opciones de Ana Perez/i);
    fireEvent.click(menuBtn);

    // Click Descargar Reconocimiento (PDF)
    const downloadDiplomaBtn = screen.getByRole('button', { name: /Descargar Reconocimiento \(PDF\)/i });
    fireEvent.click(downloadDiplomaBtn);

    await waitFor(() => {
      expect(recognitions.downloadSingleCertificatePdf).toHaveBeenCalledWith(
        expect.objectContaining({
          member: activeMember,
          batch: expect.objectContaining({ id: 101 })
        })
      );
      expect(screen.getByText(/¡Reconocimiento descargado: Reconocimiento_V-11111111_Lote_101_insignia_de_madera\.pdf!/i)).toBeInTheDocument();
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
        batch_id: 101,
        recognition_code: 'REC-ANA01'
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
      expect(screen.getAllByText('REC-ANA01')).toHaveLength(2);
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

    const lastNamesInput = screen.getByLabelText(/Apellidos \*/i);
    fireEvent.change(lastNamesInput, { target: { value: 'Perez Gomez' } });

    const emailInput = screen.getByLabelText(/Correo Electrónico/i);
    fireEvent.change(emailInput, { target: { value: 'anamaria@scouts.org' } });

    const phoneInput = screen.getByLabelText(/Teléfono de Contacto/i);
    fireEvent.change(phoneInput, { target: { value: '04120000000' } });

    const recCodeInput = screen.getByLabelText(/Código de Reconocimiento/i);
    fireEvent.change(recCodeInput, { target: { value: 'REC-ANAMARIA' } });

    const typeSelect = screen.getByLabelText(/Tipo de Miembro \*/i);
    fireEvent.change(typeSelect, { target: { value: 'adult' } });

    const saveBtn = screen.getByText('Guardar Cambios');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalledWith(expect.objectContaining({
        first_names: 'Ana Maria',
        last_names: 'Perez Gomez',
        email: 'anamaria@scouts.org',
        phone: '04120000000',
        recognition_code: 'REC-ANAMARIA',
        member_type: 'adult'
      }));
      expect(screen.getByText(/Datos del miembro actualizados con éxito/i)).toBeInTheDocument();
    });
  });

  it('handles member edit submission error gracefully with alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

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
      }
    ]);

    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [],
      districts: [],
      groups: []
    });

    vi.mocked(api.updateMember).mockRejectedValueOnce(new Error('Update failed'));

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

    fireEvent.click(screen.getByLabelText(/Opciones de Ana Perez/i));
    fireEvent.click(screen.getByText('Editar'));

    await waitFor(() => {
      expect(screen.getByText('Editar Datos de Miembro')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Guardar Cambios'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al actualizar la información del miembro.');
    });

    alertSpy.mockRestore();
  });

  it('handles single certificate download error and member list PDF generation error gracefully', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    vi.mocked(api.getBatchById).mockResolvedValue({
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
        member_type: 'young',
        status: 'active',
        batch_id: 101
      }
    ]);

    vi.mocked(api.getHierarchyData).mockResolvedValue({
      regions: [],
      districts: [],
      groups: []
    });

    vi.mocked(recognitions.downloadSingleCertificatePdf).mockRejectedValueOnce(new Error('Diploma error'));
    vi.mocked(api.generateBatchReport).mockRejectedValueOnce(new Error('PDF report error'));

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

    // Trigger Single recognition error
    fireEvent.click(screen.getByLabelText(/Opciones de Ana Perez/i));
    fireEvent.click(screen.getByRole('button', { name: /Descargar Reconocimiento \(PDF\)/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al descargar el reconocimiento.');
    });

    // Trigger member list PDF export error
    fireEvent.click(screen.getByRole('button', { name: /Descargar lista/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al generar la lista de miembros en PDF.');
    });

    alertSpy.mockRestore();
  });

  it('supports pagination next and previous buttons in member list', async () => {
    const manyMembers = Array.from({ length: 15 }, (_, i) => ({
      identity: `V-${10000000 + i}`,
      first_names: `Miembro ${i + 1}`,
      last_names: `Scout`,
      birth_date: '2005-01-01',
      member_type: 'young' as const,
      status: 'active' as const,
      batch_id: 101
    }));

    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: '',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      created_at: '2026-08-20T10:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce(manyMembers);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [],
      districts: [],
      groups: []
    });

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Mostrando 1-10 de 15 miembros/i)).toBeInTheDocument();
    });

    const nextBtn = screen.getByLabelText(/Página siguiente/i);
    const prevBtn = screen.getByLabelText(/Página anterior/i);

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // Click Next page
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Mostrando 11-15 de 15 miembros/i)).toBeInTheDocument();
    expect(nextBtn).toBeDisabled();
    expect(prevBtn).toBeEnabled();

    // Click Previous page
    fireEvent.click(prevBtn);
    expect(screen.getByText(/Mostrando 1-10 de 15 miembros/i)).toBeInTheDocument();
  });

  it('allows cancelling member edit modal without saving', async () => {
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
      }
    ]);

    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [],
      districts: [],
      groups: []
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

    fireEvent.click(screen.getByLabelText(/Opciones de Ana Perez/i));
    fireEvent.click(screen.getByText('Editar'));

    await waitFor(() => {
      expect(screen.getByText('Editar Datos de Miembro')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Editar Datos de Miembro')).not.toBeInTheDocument();
    });
    expect(api.updateMember).not.toHaveBeenCalled();
  });

  it('renders quick view modal for pending adult member with empty contact fields and closes it', async () => {
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
        identity: 'V-99999999',
        first_names: 'Roberto',
        last_names: 'Blanco',
        birth_date: '',
        email: '',
        phone: '',
        member_type: 'adult',
        status: 'pending',
        batch_id: 101
      }
    ]);

    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [],
      districts: [],
      groups: []
    });

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Roberto Blanco')).toBeInTheDocument();
    });

    const viewBtn = screen.getByLabelText(/Ver detalle de Roberto Blanco/i);
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getByText('Ficha del Miembro Scout')).toBeInTheDocument();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('● Registro Inválido')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Cerrar$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Ficha del Miembro Scout')).not.toBeInTheDocument();
    });
  });

  it('handles deleteBatch error gracefully with alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: '',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      created_at: '2026-08-20T10:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [],
      districts: [],
      groups: []
    });

    vi.mocked(api.deleteBatch).mockRejectedValueOnce(new Error('Deletion failed'));

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

    fireEvent.click(screen.getByRole('button', { name: /Eliminar Lote/i }));

    await waitFor(() => {
      expect(screen.getByText(/¿Está seguro de que desea eliminar el lote/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getAllByRole('button', { name: /^Eliminar Lote$/i })[1] || screen.getByRole('button', { name: /^Eliminar Lote$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al eliminar el lote.');
    });

    alertSpy.mockRestore();
  });

  it('renders semantic badges for active, exceptional, and pending members in table and quick view modal', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: 'Lote Mixto',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'Go Solar',
      created_at: '2026-08-20T10:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
      {
        identity: 'V-1001',
        first_names: 'Maria',
        last_names: 'Activa',
        birth_date: '2000-01-01',
        member_type: 'young',
        status: 'active',
        batch_id: 101
      },
      {
        identity: 'V-1002',
        first_names: 'Laura',
        last_names: 'Excepcional',
        birth_date: '2000-02-02',
        member_type: 'young',
        status: 'exceptional',
        batch_id: 101,
        recognition_code: 'REC-EXC-02'
      },
      {
        identity: 'V-1003',
        first_names: 'Pedro',
        last_names: 'Pendiente',
        birth_date: '2000-03-03',
        member_type: 'adult',
        status: 'pending',
        batch_id: 101
      }
    ]);

    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [],
      districts: [],
      groups: []
    });

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Maria Activa')).toBeInTheDocument();
    });

    // Check badges in table
    expect(screen.getByText('Registro Válido')).toBeInTheDocument();
    expect(screen.getByText('Emisión Excepcional')).toBeInTheDocument();
    expect(screen.getByText('Registro Inválido')).toBeInTheDocument();

    // Open Quick View for exceptional member
    const viewBtn = screen.getByLabelText(/Ver detalle de Laura Excepcional/i);
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getByText('Ficha del Miembro Scout')).toBeInTheDocument();
      expect(screen.getByText('● Emisión Excepcional')).toBeInTheDocument();
    });
  });

  it('allows authorizing exceptional recognition emission in member edit modal', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: '',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      created_at: '2026-08-20T10:00:00.000Z'
    });

    const pendingMember = {
      identity: 'V-99999999',
      first_names: 'Juan',
      last_names: 'Perez',
      birth_date: '2000-01-01',
      member_type: 'young' as const,
      status: 'pending' as const,
      batch_id: 101
    };

    vi.mocked(api.getMembersByBatchId).mockResolvedValue([pendingMember]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [],
      districts: [],
      groups: []
    });

    vi.mocked(api.updateMember).mockResolvedValueOnce({
      ...pendingMember,
      status: 'exceptional',
      recognition_code: 'REC-9999'
    });

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });

    // Open row menu and click Editar
    fireEvent.click(screen.getByLabelText(/Opciones de Juan Perez/i));
    fireEvent.click(screen.getByText('Editar'));

    await waitFor(() => {
      expect(screen.getByText('Editar Datos de Miembro')).toBeInTheDocument();
      expect(screen.getByLabelText(/Autorizar emisión de reconocimiento \(Caso Excepcional\)/i)).toBeInTheDocument();
    });

    const toggle = screen.getByLabelText(/Autorizar emisión de reconocimiento \(Caso Excepcional\)/i);
    expect(toggle).not.toBeChecked();

    // Toggle ON
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    const reasonInput = screen.getByLabelText(/Justificación de la emisión excepcional/i);
    fireEvent.change(reasonInput, { target: { value: 'Comprobante de inscripción presentado' } });

    // Save Changes
    fireEvent.click(screen.getByText('Guardar Cambios'));

    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: 'V-99999999',
          status: 'exceptional',
          exceptional_reason: 'Comprobante de inscripción presentado',
          recognition_code: expect.stringMatching(/^REC-/)
        })
      );
    });
  });

  it('enables single recognition download for exceptional members in actions dropdown', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: '',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'Insignia de Madera',
      created_at: '2026-08-20T10:00:00.000Z'
    });

    const exceptionalMember = {
      identity: 'V-55555555',
      first_names: 'Rosa',
      last_names: 'Morales',
      birth_date: '2002-05-10',
      member_type: 'young' as const,
      status: 'exceptional' as const,
      batch_id: 101,
      recognition_code: 'REC-5555'
    };

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([exceptionalMember]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [],
      districts: [],
      groups: []
    });

    vi.mocked(recognitions.downloadSingleCertificatePdf).mockResolvedValueOnce(
      'Reconocimiento_V-55555555_Lote_101_insignia_de_madera.pdf'
    );

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Rosa Morales')).toBeInTheDocument();
    });

    // Open row menu
    fireEvent.click(screen.getByLabelText(/Opciones de Rosa Morales/i));

    // Descargar Reconocimiento (PDF) should be present and clickable for exceptional member
    const downloadDiplomaBtn = screen.getByRole('button', { name: /Descargar Reconocimiento \(PDF\)/i });
    expect(downloadDiplomaBtn).toBeInTheDocument();
    fireEvent.click(downloadDiplomaBtn);

    await waitFor(() => {
      expect(recognitions.downloadSingleCertificatePdf).toHaveBeenCalledWith(
        expect.objectContaining({
          member: exceptionalMember,
          batch: expect.objectContaining({ id: 101 })
        })
      );
    });
  });

  it('renders Alcance de Unidad in details card and UNIDAD column with badges', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: 'Lote Manada Especial',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      unit_scope: 'manada',
      recognition_type: 'Servicio Prolongado',
      created_at: '2026-08-20T10:00:00.000Z'
    });

    const member: ScoutMember = {
      identity: 'V-66666666',
      first_names: 'Lucas',
      last_names: 'Lobato',
      birth_date: '2016-01-01',
      member_type: 'young',
      unit: 'manada',
      status: 'active',
      batch_id: 101,
      recognition_code: 'REC-6666'
    };

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([member]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Metropolitano', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Jorge', district_id: 10 }]
    });

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alcance de Unidad')).toBeInTheDocument();
      // "Manada" label in card and table badge
      expect(screen.getAllByText('Manada').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('UNIDAD')).toBeInTheDocument();
    });
  });

  it('allows updating member unit in BatchDetail edit modal and displays in quick view', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 101,
      comment: 'Lote Mixto',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      unit_scope: 'mixed',
      recognition_type: 'Servicio Prolongado',
      created_at: '2026-08-20T10:00:00.000Z'
    });

    const member: ScoutMember = {
      identity: 'V-77777777',
      first_names: 'Sofia',
      last_names: 'Rovers',
      birth_date: '2004-01-01',
      member_type: 'young',
      unit: 'clan',
      status: 'active',
      batch_id: 101,
      recognition_code: 'REC-7777'
    };

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([member]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [],
      districts: [],
      groups: []
    });

    render(
      <MemoryRouter initialEntries={['/lotes/101']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sofia Rovers')).toBeInTheDocument();
    });

    // Open row menu and click edit
    fireEvent.click(screen.getByLabelText(/Opciones de Sofia Rovers/i));
    fireEvent.click(screen.getByText('Editar'));

    await waitFor(() => {
      expect(screen.getByText('Editar Datos de Miembro')).toBeInTheDocument();
    });
    const unitSelect = screen.getByLabelText(/Unidad Scout \*/i);
    expect(unitSelect).toHaveValue('clan');

    fireEvent.change(unitSelect, { target: { value: 'caminantes' } });
    expect(unitSelect).toHaveValue('caminantes');

    vi.mocked(api.updateMember).mockResolvedValueOnce({
      ...member,
      unit: 'caminantes'
    });

    fireEvent.click(screen.getByText('Guardar Cambios'));

    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: 'V-77777777',
          unit: 'caminantes'
        })
      );
    });
  });

  it('renders "No aplica" for region, district, group and "Sin observaciones registradas" when comment is empty', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 202,
      comment: '',
      region_id: 0,
      district_id: 0,
      group_id: 0,
      unit_scope: 'no_scout',
      recognition_type: 'Insignia de Madera',
      created_at: '2026-08-20T10:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [{ id: 0, name: 'No aplica' }],
      districts: [{ id: 0, name: 'No aplica', region_id: 0 }],
      groups: [{ id: 0, name: 'No aplica', district_id: 0 }]
    });

    render(
      <MemoryRouter initialEntries={['/lotes/202']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Lote #202')).toBeInTheDocument();
    });

    expect(screen.getByText('Sin observaciones registradas')).toBeInTheDocument();
    const noAplicaElements = screen.getAllByText('No aplica');
    expect(noAplicaElements.length).toBeGreaterThanOrEqual(3);
  });

  it('changes status to pending when editing an unverified no_scout member to a scout unit in BatchDetail', async () => {
    const unverifiedMember: ScoutMember = {
      identity: 'V-88888888',
      first_names: 'Externo',
      last_names: 'Colaborador',
      birth_date: '1990-01-01',
      member_type: 'adult',
      unit: 'no_scout',
      status: 'active',
      verified_in_registry: false,
      batch_id: 303,
      recognition_code: 'REC-EXT-02'
    };

    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 303,
      comment: 'Lote Especial',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      unit_scope: 'mixed',
      recognition_type: 'Insignia de Madera',
      created_at: '2026-08-20T10:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([unverifiedMember]);
    vi.mocked(api.getHierarchyData).mockResolvedValueOnce({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    });

    render(
      <MemoryRouter initialEntries={['/lotes/303']}>
        <Routes>
          <Route path="/lotes/:id" element={<BatchDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Externo Colaborador')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Opciones de Externo Colaborador/i));
    fireEvent.click(screen.getByText('Editar'));

    await waitFor(() => {
      expect(screen.getByText('Editar Datos de Miembro')).toBeInTheDocument();
    });

    const unitSelect = screen.getByLabelText(/Unidad Scout \*/i);
    expect(unitSelect).toHaveValue('no_scout');

    // Change unit to troop (scout unit)
    fireEvent.change(unitSelect, { target: { value: 'tropa' } });

    // Exceptional toggle is now visible because status is pending
    await waitFor(() => {
      expect(screen.getByLabelText(/Autorizar emisión de reconocimiento \(Caso Excepcional\)/i)).toBeInTheDocument();
    });

    vi.mocked(api.updateMember).mockResolvedValueOnce({
      ...unverifiedMember,
      unit: 'tropa',
      status: 'pending'
    });

    fireEvent.click(screen.getByText('Guardar Cambios'));

    await waitFor(() => {
      expect(api.updateMember).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: 'V-88888888',
          unit: 'tropa',
          status: 'pending'
        })
      );
    });
  });

  describe('BatchDetail Walkthrough Tour', () => {
    const mockWalkthroughBatch: Batch = {
      id: 101,
      comment: 'Lote de Prueba Walkthrough',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      unit_scope: 'mixed',
      recognition_type: 'Servicio Prolongado',
      created_at: '2026-08-20T10:00:00.000Z'
    };

    const mockWalkthroughMembers: ScoutMember[] = [
      {
        identity: 'V-12345678',
        first_names: 'Mariana',
        last_names: 'Rojas',
        birth_date: '2004-03-12',
        member_type: 'young',
        unit: 'clan',
        status: 'active',
        batch_id: 101,
        recognition_code: 'REC-SP-001'
      }
    ];

    const mockWalkthroughHierarchy = {
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    };

    it('renders WalkthroughHelpButton and all data-walkthrough DOM attributes', async () => {
      vi.mocked(api.getBatchById).mockResolvedValueOnce(mockWalkthroughBatch);
      vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce(mockWalkthroughMembers);
      vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockWalkthroughHierarchy);

      const { container } = render(
        <MemoryRouter initialEntries={['/lotes/101']}>
          <Routes>
            <Route path="/lotes/:id" element={<BatchDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Lote #101')).toBeInTheDocument();
      });

      // Verify WalkthroughHelpButton
      const helpBtn = screen.getByRole('button', { name: 'Ver guía interactiva' });
      expect(helpBtn).toBeInTheDocument();

      // Verify DOM data-walkthrough selectors
      expect(container.querySelector('[data-walkthrough="batch-detail-header"]')).toBeInTheDocument();
      expect(
        container.querySelector('[data-walkthrough="batch-detail-summary-cards"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-walkthrough="batch-detail-members-table"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-walkthrough="batch-detail-table-actions"]')
      ).toBeInTheDocument();
    });

    it('starts and steps through the 4-step walkthrough tour upon clicking the help button', async () => {
      vi.mocked(api.getBatchById).mockResolvedValueOnce(mockWalkthroughBatch);
      vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce(mockWalkthroughMembers);
      vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockWalkthroughHierarchy);

      render(
        <MemoryRouter initialEntries={['/lotes/101']}>
          <Routes>
            <Route path="/lotes/:id" element={<BatchDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Lote #101')).toBeInTheDocument();
      });

      const helpBtn = screen.getByRole('button', { name: 'Ver guía interactiva' });
      fireEvent.click(helpBtn);

      // Step 1: Detalle y Acciones del Lote
      await waitFor(() => {
        expect(screen.getByText('Detalle y Acciones del Lote')).toBeInTheDocument();
      });
      expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Consulta la información completa del lote. Desde la cabecera puedes descargar todos los reconocimientos oficiales en PDF, generar el reporte de lista o eliminar el lote si es necesario.'
        )
      ).toBeInTheDocument();

      // Click Siguiente -> Step 2
      fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

      // Step 2: Resumen y Observaciones
      expect(screen.getByText('Resumen y Observaciones')).toBeInTheDocument();
      expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Revisa la estructura geográfica, el tipo de reconocimiento otorgado, el desglose demográfico de miembros (Jóvenes y Adultos) y los comentarios u observaciones registradas.'
        )
      ).toBeInTheDocument();

      // Click Siguiente -> Step 3
      fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

      // Step 3: Listado de Homenajeados
      expect(screen.getByText('Listado de Homenajeados')).toBeInTheDocument();
      expect(screen.getByText('Paso 3 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Visualiza todos los miembros del lote con su cédula, nombres, unidad scout (Manada, Tropa, No Scout, etc.), estatus y código oficial de reconocimiento.'
        )
      ).toBeInTheDocument();

      // Click Siguiente -> Step 4
      fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

      // Step 4: Gestión Individual de Miembros
      expect(screen.getByText('Gestión Individual de Miembros')).toBeInTheDocument();
      expect(screen.getByText('Paso 4 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Desde el menú de 3 puntos en cada fila puedes descargar el reconocimiento individual en PDF, consultar la vista rápida o editar los datos (incluyendo la autorización con justificación para casos excepcionales).'
        )
      ).toBeInTheDocument();

      // Last step finish button
      const finishBtn = screen.getByRole('button', { name: /¡Entendido! 🎉/i });
      expect(finishBtn).toBeInTheDocument();

      // Complete tour
      fireEvent.click(finishBtn);

      // Overlay closes
      expect(screen.queryByText('Gestión Individual de Miembros')).not.toBeInTheDocument();
      expect(localStorage.getItem('chil_tour_batch-detail-tour_test-user-id')).toBe('true');
    });

    it('allows navigating backwards and skipping the tour', async () => {
      vi.mocked(api.getBatchById).mockResolvedValueOnce(mockWalkthroughBatch);
      vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce(mockWalkthroughMembers);
      vi.mocked(api.getHierarchyData).mockResolvedValueOnce(mockWalkthroughHierarchy);

      render(
        <MemoryRouter initialEntries={['/lotes/101']}>
          <Routes>
            <Route path="/lotes/:id" element={<BatchDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Lote #101')).toBeInTheDocument();
      });

      const helpBtn = screen.getByRole('button', { name: 'Ver guía interactiva' });
      fireEvent.click(helpBtn);

      await waitFor(() => {
        expect(screen.getByText('Detalle y Acciones del Lote')).toBeInTheDocument();
      });

      // Move to Step 2
      fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));
      expect(screen.getByText('Resumen y Observaciones')).toBeInTheDocument();

      // Go back to Step 1
      fireEvent.click(screen.getByRole('button', { name: /◀ Anterior/i }));
      expect(screen.getByText('Detalle y Acciones del Lote')).toBeInTheDocument();

      // Skip tour
      fireEvent.click(screen.getByRole('button', { name: /Omitir guía/i }));
      expect(screen.queryByText('Detalle y Acciones del Lote')).not.toBeInTheDocument();
    });
  });
});
