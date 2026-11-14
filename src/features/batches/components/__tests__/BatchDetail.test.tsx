import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BatchDetail } from '../BatchDetail';
import { ScoutMember, Batch } from '../../types';
import * as api from '../../api';
import * as recognitions from '../../../recognitions';

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return {
    getBatchById: vi.fn(),
    getMembersByBatchId: vi.fn(),
    getHierarchyData: vi.fn(),
    updateMember: vi.fn(),
    deleteBatch: vi.fn(),
    generateBatchReport: vi.fn(),
    resolveBatchReportBuckets: actual.resolveBatchReportBuckets,
    exportMembersToCSV: vi.fn(),
    getRecognitionName: vi.fn((name) => name || 'Servicio Prolongado')
  };
});

vi.mock('../../../recognitions', () => ({
  generateBatchCertificatesZip: vi.fn(),
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

    vi.mocked(recognitions.generateBatchCertificatesZip).mockResolvedValueOnce(
      'Reconocimientos_Lote_101_servicio_prolongado.zip'
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
    expect(screen.queryByText(/Detalles del Lote/i)).not.toBeInTheDocument();
    expect(screen.getByText('Distribución Territorial del Lote')).toBeInTheDocument();
    expect(screen.getByText(/Región Capital/i)).toBeInTheDocument();
    expect(screen.getByText(/Distrito Sucre/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Grupo San Luis/i)).toHaveLength(3); // 1 territorial card + 2 table rows
    expect(screen.getByText(/Tipo de Reconocimiento/i)).toBeInTheDocument();
    expect(screen.getByText('Servicio Prolongado')).toBeInTheDocument();
    expect(screen.queryByText('5 años')).not.toBeInTheDocument();
    expect(screen.getByText(/Resumen de Miembros/i)).toBeInTheDocument();

    // Header action buttons are right-aligned on the rightmost side
    const deleteBtn = screen.getByRole('button', { name: /Eliminar Lote/i });
    const actionsBar = deleteBtn.parentElement;
    expect(actionsBar).toHaveClass('justify-end', 'xl:ml-auto');

    // Check table rows
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();
    expect(screen.getByText('SP-5Y-001')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('REC-2222')).not.toBeInTheDocument();

    // Check Member List PDF Export button
    const listBtn = screen.getByRole('button', { name: /Descargar lista/i });
    fireEvent.click(listBtn);

    await waitFor(() => {
      expect(api.generateBatchReport).toHaveBeenCalled();
      expect(screen.getByText(/Lista de miembros \(PDF\) generada exitosamente\./i)).toBeInTheDocument();
    });

    // Trigger batch ZIP download
    const downloadBtn = screen.getByRole('button', { name: /Descargar Reconocimientos \(ZIP\)/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(recognitions.generateBatchCertificatesZip).toHaveBeenCalledWith(
        expect.objectContaining({
          batch: expect.objectContaining({ id: 101 }),
          members: expect.any(Array)
        })
      );
      expect(
        screen.getByText(/¡Reconocimientos descargados exitosamente en Reconocimientos_Lote_101_servicio_prolongado\.zip!/i)
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
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

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
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

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
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

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
    // Active member without recognition_code renders '-' instead of fabricated placeholder
    expect(screen.queryByText('REC-1001')).not.toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);

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

  it('omits Detalles del Lote card and renders UNIDAD column with badges', async () => {
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
      expect(screen.queryByText('Alcance de Unidad')).not.toBeInTheDocument();
      expect(screen.queryByText('Detalles del Lote')).not.toBeInTheDocument();
      // "Manada" badge in UNIDAD column
      expect(screen.getAllByText('Manada').length).toBeGreaterThanOrEqual(1);
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

  it('renders "Sin observaciones registradas" and omits Detalles del Lote card when comment is empty', async () => {
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
    expect(screen.getByText('Insignia de Madera')).toBeInTheDocument();
    expect(screen.queryByText(/Detalles del Lote/i)).not.toBeInTheDocument();
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
          'Consulta la información completa del lote. Desde la cabecera puedes descargar todos los reconocimientos oficiales en PDF, generar el reporte de lista (completo o por grupo) o eliminar el lote si es necesario.'
        )
      ).toBeInTheDocument();

      // Click Siguiente -> Step 2
      fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

      // Step 2: Resumen y Observaciones
      expect(screen.getByText('Resumen y Observaciones')).toBeInTheDocument();
      expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Revisa el tipo de reconocimiento otorgado, el desglose demográfico de miembros (Jóvenes y Adultos) y los comentarios u observaciones registradas.'
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
      const finishBtn = screen.getByRole('button', { name: /¡Entendido!/i });
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

  describe('Grouped PDF List Report Controls & Cleared Group Editing', () => {
    const hierarchy = {
      regions: [
        { id: 0, name: 'No aplica' },
        { id: 1, name: 'Región Capital' },
        { id: 2, name: 'Región Central' }
      ],
      districts: [
        { id: 0, name: 'No aplica', region_id: 0 },
        { id: 10, name: 'Distrito Sucre', region_id: 1 },
        { id: 20, name: 'Distrito Valencia', region_id: 2 }
      ],
      groups: [
        { id: 0, name: 'No aplica', district_id: 0 },
        { id: 100, name: 'Grupo San Luis', district_id: 10 },
        { id: 200, name: 'Grupo Águilas', district_id: 20 }
      ]
    };

    const baseBatch: Batch = {
      id: 301,
      comment: 'Lote Multi-Grupo',
      region_id: 0,
      district_id: 0,
      group_id: 0,
      created_at: '2026-08-20T10:00:00.000Z'
    };

    const renderBatchDetail = (id = '301') =>
      render(
        <MemoryRouter initialEntries={[`/lotes/${id}`]}>
          <Routes>
            <Route path="/lotes/:id" element={<BatchDetail />} />
          </Routes>
        </MemoryRouter>
      );

    it('disables PDF list button with tooltip and hides "Por grupo" when batch has 0 members', async () => {
      vi.mocked(api.getBatchById).mockResolvedValueOnce(baseBatch);
      vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([]);
      vi.mocked(api.getHierarchyData).mockResolvedValueOnce(hierarchy);

      renderBatchDetail();

      await waitFor(() => {
        expect(screen.getByText('Lote #301')).toBeInTheDocument();
      });

      const listBtn = screen.getByRole('button', { name: /Descargar lista \(PDF\)/i });
      expect(listBtn).toBeDisabled();
      expect(listBtn).toHaveAttribute(
        'title',
        'No hay miembros en este lote para generar la lista'
      );
      expect(screen.queryByRole('button', { name: /Por grupo/i })).not.toBeInTheDocument();
    });

    it('hides "Por grupo" when entire batch resolves to 1 Scout group or 1 special bucket', async () => {
      // Case A: Single Scout group
      vi.mocked(api.getBatchById).mockResolvedValueOnce(baseBatch);
      vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
        {
          identity: 'V-1',
          first_names: 'Ana',
          last_names: 'Pérez',
          birth_date: '2000-01-01',
          member_type: 'adult',
          status: 'active',
          unit: 'manada',
          group_id: 100
        }
      ]);
      vi.mocked(api.getHierarchyData).mockResolvedValueOnce(hierarchy);

      const { unmount } = renderBatchDetail();
      await waitFor(() => expect(screen.getByText('Lote #301')).toBeInTheDocument());
      expect(screen.getByRole('button', { name: /Descargar lista \(PDF\)/i })).toBeEnabled();
      expect(screen.queryByRole('button', { name: /Por grupo/i })).not.toBeInTheDocument();
      unmount();

      // Case B: Single special bucket (all no_scout)
      vi.mocked(api.getBatchById).mockResolvedValueOnce(baseBatch);
      vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
        {
          identity: 'V-2',
          first_names: 'Luis',
          last_names: 'Rojas',
          birth_date: '1995-05-05',
          member_type: 'adult',
          status: 'exceptional',
          unit: 'no_scout'
        }
      ]);
      vi.mocked(api.getHierarchyData).mockResolvedValueOnce(hierarchy);

      renderBatchDetail();
      await waitFor(() => expect(screen.getByText('Lote #301')).toBeInTheDocument());
      expect(screen.queryByRole('button', { name: /Por grupo/i })).not.toBeInTheDocument();
    });

    it('shows "Por grupo" for 2+ buckets, supports 3-arg full export, scoped bucket export, Escape and outside click', async () => {
      const members: ScoutMember[] = [
        {
          identity: 'V-10',
          first_names: 'Carlos',
          last_names: 'Zapata',
          birth_date: '2001-01-01',
          member_type: 'adult',
          status: 'active',
          unit: 'clan',
          group_id: 100
        },
        {
          identity: 'V-20',
          first_names: 'Elena',
          last_names: 'Morales',
          birth_date: '1998-03-03',
          member_type: 'adult',
          status: 'pending',
          unit: 'no_scout'
        }
      ];

      vi.mocked(api.getBatchById).mockResolvedValueOnce(baseBatch);
      vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce(members);
      vi.mocked(api.getHierarchyData).mockResolvedValueOnce(hierarchy);
      vi.mocked(api.generateBatchReport).mockResolvedValue('Reporte_Lote_301.pdf');

      renderBatchDetail();
      await waitFor(() => expect(screen.getByText('Lote #301')).toBeInTheDocument());

      // 1-click full export passes 3 arguments (no bucketKey)
      fireEvent.click(screen.getByRole('button', { name: /Descargar lista \(PDF\)/i }));
      await waitFor(() => {
        expect(api.generateBatchReport).toHaveBeenCalledWith(baseBatch, members, hierarchy);
      });
      expect(vi.mocked(api.generateBatchReport).mock.calls[0]).toHaveLength(3);

      // Open "Por grupo" menu -> displays Scout group + divider + Miembros no scout
      const menuTrigger = screen.getByRole('button', { name: /Por grupo/i });
      fireEvent.click(menuTrigger);
      expect(menuTrigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('separator')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Grupo San Luis/i })).toHaveTextContent(
        'Distrito Sucre'
      );

      // Escape closes menu
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // Re-open and click outside closes menu
      fireEvent.click(menuTrigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // Re-open and select special bucket -> calls generateBatchReport with bucketKey
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByRole('menuitem', { name: /Miembros no scout/i }));

      await waitFor(() => {
        expect(api.generateBatchReport).toHaveBeenCalledWith(baseBatch, members, hierarchy, {
          bucketKey: 'special:no_scout'
        });
      });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('persists group_id: 0 via EditMemberModal when clearing a member group in BatchDetail', async () => {
      const member: ScoutMember = {
        identity: 'V-55',
        first_names: 'Pedro',
        last_names: 'Silveira',
        birth_date: '2002-02-02',
        member_type: 'adult',
        status: 'active',
        unit: 'tropa',
        region_id: 1,
        district_id: 10,
        group_id: 100
      };

      vi.mocked(api.getBatchById).mockResolvedValueOnce(baseBatch);
      vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([member]);
      vi.mocked(api.getHierarchyData).mockResolvedValueOnce(hierarchy);
      vi.mocked(api.updateMember).mockResolvedValueOnce({ ...member, group_id: 0 });
      vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([{ ...member, group_id: 0 }]);

      renderBatchDetail();
      await waitFor(() => expect(screen.getByText('Pedro Silveira')).toBeInTheDocument());

      fireEvent.click(screen.getByLabelText(/Opciones de Pedro Silveira/i));
      fireEvent.click(screen.getByText('Editar'));

      await waitFor(() => {
        expect(screen.getByText('Editar Datos de Miembro')).toBeInTheDocument();
      });

      const groupSelect = screen.getByLabelText(/Grupo Scout/i);
      fireEvent.change(groupSelect, { target: { value: '0' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => {
        expect(api.updateMember).toHaveBeenCalledWith(
          expect.objectContaining({
            identity: 'V-55',
            group_id: 0
          })
        );
      });
    });

    it('renders BatchTerritorialCard with Ver más/Ver menos toggle, special bars, and aligns MemberQuickViewModal with resolveMemberHierarchy', async () => {
      const multiGroupBatch: Batch = {
        id: 707,
        comment: 'Lote Territorial',
        region_id: 1,
        district_id: 10,
        group_id: 100,
        recognition_type: 'Servicio Prolongado',
        created_at: '2026-08-20T10:00:00.000Z'
      };
      const multiGroupHierarchy = {
        regions: [{ id: 1, name: 'Región Capital' }],
        districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
        groups: [
          { id: 100, name: 'Grupo San Luis', district_id: 10 },
          { id: 101, name: 'Grupo Bolívar', district_id: 10 },
          { id: 102, name: 'Grupo Miranda', district_id: 10 },
          { id: 103, name: 'Grupo Sucre', district_id: 10 }
        ]
      };
      const multiGroupMembers: ScoutMember[] = [
        { identity: 'V-1', first_names: 'M1', last_names: 'A', birth_date: '2000-01-01', member_type: 'young', status: 'active', unit: 'tropa', region_id: 1, district_id: 10, group_id: 100 },
        { identity: 'V-2', first_names: 'M2', last_names: 'B', birth_date: '2000-01-01', member_type: 'young', status: 'active', unit: 'tropa', region_id: 1, district_id: 10, group_id: 101 },
        { identity: 'V-3', first_names: 'M3', last_names: 'C', birth_date: '2000-01-01', member_type: 'young', status: 'active', unit: 'tropa', region_id: 1, district_id: 10, group_id: 102 },
        { identity: 'V-4', first_names: 'M4', last_names: 'D', birth_date: '2000-01-01', member_type: 'young', status: 'active', unit: 'tropa', region_id: 1, district_id: 10, group_id: 103 },
        { identity: 'V-5', first_names: 'NoScout', last_names: 'Person', birth_date: '2000-01-01', member_type: 'adult', status: 'active', unit: 'no_scout', region_id: 0, district_id: 0, group_id: 0 },
        { identity: 'V-6', first_names: 'Ungrouped', last_names: 'Scout', birth_date: '2000-01-01', member_type: 'adult', status: 'active', unit: 'institucional', region_id: 1, district_id: 10, group_id: 0 }
      ];

      vi.mocked(api.getBatchById).mockResolvedValueOnce(multiGroupBatch);
      vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce(multiGroupMembers);
      vi.mocked(api.getHierarchyData).mockResolvedValueOnce(multiGroupHierarchy);

      renderBatchDetail();

      await waitFor(() => {
        expect(screen.getByText('Distribución Territorial del Lote')).toBeInTheDocument();
        expect(screen.getByText('6 miembros')).toBeInTheDocument();
      });

      // Special bars rendered for noScoutCount > 0 and ungroupedScoutCount > 0
      expect(screen.getByText('Miembros no scout')).toBeInTheDocument();
      expect(screen.getByText('Sin grupo asignado')).toBeInTheDocument();

      // Ver más toggle is rendered because groups.length === 4 (> 3)
      const verMasBtn = screen.getByRole('button', { name: /Ver más/i });
      expect(verMasBtn).toBeInTheDocument();

      // Initially Grupo Sucre appears only once (in the members table), not in the collapsed 3-item card list
      expect(screen.getAllByText('Grupo Sucre')).toHaveLength(1);

      fireEvent.click(verMasBtn);
      expect(screen.getByRole('button', { name: /Ver menos/i })).toBeInTheDocument();
      expect(screen.getAllByText('Grupo Sucre')).toHaveLength(2);

      // Open Quick View for Ungrouped Scout (explicit group_id: 0 even though batch.group_id is 100)
      fireEvent.click(screen.getByLabelText(/Opciones de Ungrouped Scout/i));
      fireEvent.click(screen.getByText('Ver Ficha'));

      await waitFor(() => {
        expect(screen.getByText('Ficha del Miembro Scout')).toBeInTheDocument();
      });
      // Quick view displays 'No aplica' for explicit group_id: 0
      expect(screen.getAllByText('No aplica').length).toBeGreaterThanOrEqual(3);
    });
  });
});
