import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NewBatchWizard } from '../NewBatchWizard';
import * as api from '../../api';

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return {
    ...actual,
    getHierarchyData: vi.fn(),
    createBatch: vi.fn(),
    updateBatch: vi.fn(),
    getMemberStatus: vi.fn(),
    createMember: vi.fn(),
    updateMember: vi.fn(),
    deleteMember: vi.fn(),
    batchUpdateMembers: vi.fn(),
    getMembersByBatchId: vi.fn(),
    hasScraperCredentials: vi.fn(),
    loginScraper: vi.fn(),
    assignBatchRecognitionCodes: vi.fn((members: Record<string, unknown>[]) =>
      members.map((m, idx: number) => ({
        ...m,
        recognition_code: (m.recognition_code as string) || `REC-${String(idx + 1).padStart(3, '0')}`
      }))
    )
  };
});

import * as recognitionsModule from '../../../recognitions';

vi.mock('../../../recognitions', () => ({
  getAllRecognitionTypes: vi.fn().mockResolvedValue([
    { id: 'sct-wood-badge', name: 'Insignia de Madera', created_at: '2026-01-01' }
  ]),
  downloadSingleCertificatePdf: vi.fn().mockResolvedValue('Certificado_29111222.pdf')
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

describe('NewBatchWizard full flow (2-Step Unified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(recognitionsModule.getAllRecognitionTypes).mockResolvedValue([
      { id: 'sct-wood-badge', name: 'Insignia de Madera', created_at: '2026-01-01' }
    ]);
    vi.mocked(api.getHierarchyData).mockResolvedValue({
      regions: [{ id: 5, name: 'DISTRITO CAPITAL' }],
      districts: [{ id: 21, name: 'AVILA', region_id: 5 }],
      groups: [{ id: 64, name: 'DON BOSCO 21', district_id: 21 }]
    });
  });

  it('completes full flow from Step 1 to Step 2 and redirects to success', async () => {
    vi.mocked(api.createBatch).mockResolvedValue({
      id: 777,
      comment: 'Mi Lote Completo',
      region_id: 0,
      district_id: 0,
      group_id: 0,
      recognition_type: 'sct-wood-badge',
      created_at: '2026-08-21T12:00:00.000Z'
    });

    vi.mocked(api.hasScraperCredentials).mockResolvedValue(true);
    vi.mocked(api.loginScraper).mockResolvedValue();
    vi.mocked(api.getMemberStatus).mockResolvedValue({
      nombre_completo: 'Carlos Eduardo Gomez Perez',
      status: 'activo',
      telefono: '04121234567',
      correo_electronico: 'c@g.com',
      fecha_nacimiento: '2004-10-25',
      region: 'DISTRITO CAPITAL',
      distrito: 'AVILA',
      grupo: 'DON BOSCO 21',
      unidad: 'Comunidad',
      edad: 17
    });
    vi.mocked(api.createMember).mockResolvedValue({
      identity: '29111222',
      first_names: 'Carlos Eduardo',
      last_names: 'Gomez Perez',
      birth_date: '2004-10-25',
      member_type: 'young',
      unit: 'caminantes',
      status: 'active',
      batch_id: 777,
      group_name: 'DON BOSCO 21',
      district_name: 'AVILA',
      region_name: 'DISTRITO CAPITAL'
    });
    vi.mocked(api.getMembersByBatchId).mockResolvedValue([
      {
        identity: '29111222',
        first_names: 'Carlos Eduardo',
        last_names: 'Gomez Perez',
        birth_date: '2004-10-25',
        member_type: 'young',
        unit: 'caminantes',
        status: 'active',
        batch_id: 777,
        group_name: 'DON BOSCO 21',
        district_name: 'AVILA',
        region_name: 'DISTRITO CAPITAL'
      }
    ]);
    vi.mocked(api.batchUpdateMembers).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <NewBatchWizard />
      </MemoryRouter>
    );

    // 1. Select Recognition Type
    await waitFor(() => {
      expect(screen.getByLabelText(/Tipo de Reconocimiento/i)).not.toBeDisabled();
    });
    fireEvent.change(screen.getByLabelText(/Tipo de Reconocimiento/i), {
      target: { value: 'sct-wood-badge' }
    });

    // 2. Set Comment
    fireEvent.change(screen.getByLabelText(/Título o Comentario del Lote/i), {
      target: { value: 'Mi Lote Completo' }
    });

    // 3. Enter Cédula
    const cedulaInput = screen.getByLabelText(/Cédulas de Identidad/i);
    fireEvent.change(cedulaInput, { target: { value: '29111222' } });

    // 4. Submit Step 1
    const verifyBtn = screen.getByRole('button', { name: /Cargar y Verificar Miembros/i });
    fireEvent.click(verifyBtn);

    // Step 2: Review & Confirm
    await waitFor(() => {
      expect(screen.getByText('Revisión y Confirmación del Lote')).toBeInTheDocument();
      expect(screen.getByText('Carlos Eduardo Gomez Perez')).toBeInTheDocument();
      expect(screen.getByText('Caminantes')).toBeInTheDocument();
    });

    // 5. Finalize Batch
    const finalizeBtn = screen.getByRole('button', { name: /Emitir Lote/i });
    fireEvent.click(finalizeBtn);

    await waitFor(() => {
      expect(api.batchUpdateMembers).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/lotes/exito', {
        state: { batchId: 777, name: 'Mi Lote Completo' }
      });
    });
  });

  it('supports single-member fast emission shortcut with Emitir y Descargar PDF button', async () => {
    vi.mocked(api.createBatch).mockResolvedValue({
      id: 888,
      comment: 'Emisión Rápida Individual',
      region_id: 0,
      district_id: 0,
      group_id: 0,
      recognition_type: 'sct-wood-badge',
      created_at: '2026-08-21T12:00:00.000Z'
    });

    vi.mocked(api.hasScraperCredentials).mockResolvedValue(true);
    vi.mocked(api.loginScraper).mockResolvedValue();
    vi.mocked(api.getMemberStatus).mockResolvedValue({
      nombre_completo: 'Miguel Ciavato',
      status: 'activo',
      telefono: '04121234567',
      correo_electronico: 'm@c.com',
      fecha_nacimiento: '2005-05-15',
      unidad: 'Caminantes',
      edad: 17
    });
    vi.mocked(api.createMember).mockResolvedValue({
      identity: '30541929',
      first_names: 'Miguel',
      last_names: 'Ciavato',
      birth_date: '2005-05-15',
      member_type: 'young',
      unit: 'caminantes',
      status: 'active',
      batch_id: 888
    });
    vi.mocked(api.getMembersByBatchId).mockResolvedValue([
      {
        identity: '30541929',
        first_names: 'Miguel',
        last_names: 'Ciavato',
        birth_date: '2005-05-15',
        member_type: 'young',
        unit: 'caminantes',
        status: 'active',
        batch_id: 888
      }
    ]);
    vi.mocked(api.batchUpdateMembers).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <NewBatchWizard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Tipo de Reconocimiento/i)).not.toBeDisabled();
    });

    fireEvent.change(screen.getByLabelText(/Tipo de Reconocimiento/i), {
      target: { value: 'sct-wood-badge' }
    });
    fireEvent.change(screen.getByLabelText(/Cédulas de Identidad/i), {
      target: { value: '30541929' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Cargar y Verificar Miembros/i }));

    // In Step 2, since membersList.length === 1, the immediate download button is rendered
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Emitir y Descargar PDF/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Emitir y Descargar PDF/i }));

    await waitFor(() => {
      expect(recognitionsModule.downloadSingleCertificatePdf).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/lotes/exito', {
        state: { batchId: 888, name: '' }
      });
    });
  });

  it('supports adding a manual No Scout member in Step 2', async () => {
    vi.mocked(api.createBatch).mockResolvedValue({
      id: 999,
      comment: 'Lote con Invitado',
      region_id: 0,
      district_id: 0,
      group_id: 0,
      recognition_type: 'sct-wood-badge',
      created_at: '2026-08-21T12:00:00.000Z'
    });

    vi.mocked(api.hasScraperCredentials).mockResolvedValue(true);
    vi.mocked(api.loginScraper).mockResolvedValue();
    vi.mocked(api.getMemberStatus).mockResolvedValue({
      nombre_completo: 'Scout Regular',
      status: 'activo',
      fecha_nacimiento: '2008-01-01',
      unidad: 'Tropa',
      edad: 14,
      telefono: '',
      correo_electronico: ''
    });
    vi.mocked(api.createMember).mockResolvedValue({
      identity: '12345678',
      first_names: 'Scout',
      last_names: 'Regular',
      birth_date: '2008-01-01',
      member_type: 'young',
      unit: 'tropa',
      status: 'active',
      batch_id: 999
    });
    vi.mocked(api.getMembersByBatchId).mockResolvedValue([
      {
        identity: '12345678',
        first_names: 'Scout',
        last_names: 'Regular',
        birth_date: '2008-01-01',
        member_type: 'young',
        unit: 'tropa',
        status: 'active',
        batch_id: 999
      }
    ]);

    render(
      <MemoryRouter>
        <NewBatchWizard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Tipo de Reconocimiento/i)).not.toBeDisabled();
    });

    fireEvent.change(screen.getByLabelText(/Tipo de Reconocimiento/i), {
      target: { value: 'sct-wood-badge' }
    });
    fireEvent.change(screen.getByLabelText(/Cédulas de Identidad/i), {
      target: { value: '12345678' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Cargar y Verificar Miembros/i }));

    await waitFor(() => {
      expect(screen.getByText('Revisión y Confirmación del Lote')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Agregar No Scout/i })).toBeInTheDocument();
    });

    // Open Manual Modal
    fireEvent.click(screen.getByRole('button', { name: /Agregar No Scout/i }));

    await waitFor(() => {
      expect(screen.getByText('Agregar Miembro Manual / No Scout')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Cédula de Identidad \*/i), {
      target: { value: '87654321' }
    });
    fireEvent.change(screen.getByLabelText(/Nombres \*/i), {
      target: { value: 'Dr. Roberto' }
    });
    fireEvent.change(screen.getByLabelText(/Apellidos \*/i), {
      target: { value: 'Mendoza' }
    });

    // Mock response after adding
    vi.mocked(api.getMembersByBatchId).mockResolvedValue([
      {
        identity: '12345678',
        first_names: 'Scout',
        last_names: 'Regular',
        birth_date: '2008-01-01',
        member_type: 'young',
        unit: 'tropa',
        status: 'active',
        batch_id: 999
      },
      {
        identity: '87654321',
        first_names: 'Dr. Roberto',
        last_names: 'Mendoza',
        birth_date: '1990-01-01',
        member_type: 'adult',
        unit: 'no_scout',
        status: 'active',
        batch_id: 999
      }
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Agregar Miembro/i }));

    await waitFor(() => {
      expect(screen.getByText('Dr. Roberto Mendoza')).toBeInTheDocument();
      expect(screen.getByText('No scout')).toBeInTheDocument();
    });
  });

  describe('Walkthrough Interactive Guide', () => {
    it('renders help button and all data-walkthrough targets in the DOM', async () => {
      const { container } = render(
        <MemoryRouter>
          <NewBatchWizard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Asistente de Creación de Lote')).toBeInTheDocument();
      });

      const helpBtn = screen.getByRole('button', { name: 'Ver guía interactiva' });
      expect(helpBtn).toBeInTheDocument();

      expect(container.querySelector('[data-walkthrough="wizard-header"]')).toBeInTheDocument();
      expect(container.querySelector('[data-walkthrough="wizard-stepper"]')).toBeInTheDocument();
      expect(container.querySelector('[data-walkthrough="wizard-step-container"]')).toBeInTheDocument();
      expect(container.querySelector('[data-walkthrough="wizard-navigation-buttons"]')).toBeInTheDocument();
    });

    it('starts and steps through the 4-step walkthrough tour upon clicking the help button', async () => {
      render(
        <MemoryRouter>
          <NewBatchWizard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Asistente de Creación de Lote')).toBeInTheDocument();
      });

      const helpBtn = screen.getByRole('button', { name: 'Ver guía interactiva' });
      fireEvent.click(helpBtn);

      // Step 1: Cabecera y Objetivo
      await waitFor(() => {
        expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
      });
      expect(
        screen.getByText(
          'Crea y emite lotes masivos de reconocimientos scouts mediante un proceso guiado y seguro en 2 sencillos pasos.'
        )
      ).toBeInTheDocument();

      // Click Siguiente -> Step 2
      fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

      // Step 2: Indicador de Progreso
      expect(screen.getByText('Progreso del Asistente')).toBeInTheDocument();
      expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          'El flujo se compone de: 1. Carga de Datos y Verificación en el Sistema de Registro, y 2. Edición, Códigos y Confirmación Final.'
        )
      ).toBeInTheDocument();

      // Click Siguiente -> Step 3
      fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

      // Step 3: Carga y Verificación Unificada
      expect(screen.getByText('Carga y Verificación Unificada')).toBeInTheDocument();
      expect(screen.getByText('Paso 3 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Selecciona el tipo de reconocimiento e ingresa las cédulas. La estructura territorial (Región, Distrito, Grupo) y las unidades se auto-detectarán.'
        )
      ).toBeInTheDocument();

      // Click Siguiente -> Step 4
      fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

      // Step 4: Avance entre Pasos
      expect(screen.getByText('Avance entre Pasos')).toBeInTheDocument();
      expect(screen.getByText('Paso 4 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          "Usa 'Cargar y Verificar Miembros' para procesar las cédulas con Impeesa y continuar a la revisión final de códigos y emisión."
        )
      ).toBeInTheDocument();

      // Complete tour
      const finishBtn = screen.getByRole('button', { name: /¡Entendido!/i });
      fireEvent.click(finishBtn);

      // Overlay closes
      expect(screen.queryByText('Avance entre Pasos')).not.toBeInTheDocument();
      expect(localStorage.getItem('chil_tour_new-batch-wizard-tour_test-user-id')).toBe('true');
    });
  });
});
