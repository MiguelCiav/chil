import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BatchDetail } from '../BatchDetail';
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

    vi.mocked(recognitions.generateBatchCertificatesPdf).mockResolvedValueOnce(
      'Diplomas_Lote_101_servicio_prolongado.pdf'
    );

    vi.mocked(recognitions.generateBatchCertificatesPdf).mockResolvedValueOnce(
      'Diplomas_Lote_101_servicio_prolongado.pdf'
    );

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

    // Check Member List PDF Export button
    const listBtn = screen.getByRole('button', { name: /Descargar lista/i });
    fireEvent.click(listBtn);

    await waitFor(() => {
      expect(api.generateBatchReport).toHaveBeenCalled();
      expect(screen.getByText(/Lista de miembros \(PDF\) generada exitosamente\./i)).toBeInTheDocument();
    });
    // Trigger batch PDF download
    const downloadBtn = screen.getByRole('button', { name: /Descargar todos \(PDF\)/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(recognitions.generateBatchCertificatesPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          batch: expect.objectContaining({ id: 101 }),
          members: expect.any(Array)
        })
      );
      expect(
        screen.getByText(/¡Diplomas descargados exitosamente en Diplomas_Lote_101_servicio_prolongado\.pdf!/i)
      ).toBeInTheDocument();
    });
  });

  it('downloads single member diploma when clicking option in member dropdown menu', async () => {
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
      'Diploma_V-11111111_Lote_101_insignia_de_madera.pdf'
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

    // Click Descargar Diploma (PDF)
    const downloadDiplomaBtn = screen.getByRole('button', { name: /Descargar Diploma \(PDF\)/i });
    fireEvent.click(downloadDiplomaBtn);

    await waitFor(() => {
      expect(recognitions.downloadSingleCertificatePdf).toHaveBeenCalledWith(
        expect.objectContaining({
          member: activeMember,
          batch: expect.objectContaining({ id: 101 })
        })
      );
      expect(screen.getByText(/¡Diploma descargado: Diploma_V-11111111_Lote_101_insignia_de_madera\.pdf!/i)).toBeInTheDocument();
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

    // Trigger Single diploma error
    fireEvent.click(screen.getByLabelText(/Opciones de Ana Perez/i));
    fireEvent.click(screen.getByRole('button', { name: /Descargar Diploma \(PDF\)/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al descargar el diploma.');
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
});
