import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QuickRecognition } from '../QuickRecognition';
import { splitFullName } from '../../utils/nameHelper';
import * as batchesApi from '../../api';
import * as recognitionsApi from '../../../recognitions';
import * as authFeature from '../../../auth';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock('../../api', () => ({
  getHierarchyData: vi.fn(),
  createBatch: vi.fn(),
  createMember: vi.fn(),
  getMemberStatus: vi.fn(),
  RECOGNITION_TYPES: [
    { id: 'sct-wood-badge', name: 'Insignia de Madera' },
    { id: 'sct-promesa', name: 'Promesa Scout' }
  ]
}));

vi.mock('../../../recognitions', () => ({
  getAllRecognitionTypes: vi.fn(),
  downloadSingleCertificatePdf: vi.fn()
}));

vi.mock('../../../auth', () => ({
  useAuth: vi.fn()
}));

describe('QuickRecognition Component', () => {
  const mockHierarchy = {
    regions: [
      { id: 1, name: 'Región Capital' },
      { id: 2, name: 'Región Zulia' }
    ],
    districts: [
      { id: 10, name: 'Distrito Sucre', region_id: 1 },
      { id: 20, name: 'Distrito Maracaibo', region_id: 2 }
    ],
    groups: [
      { id: 100, name: 'Grupo San Luis', district_id: 10 },
      { id: 200, name: 'Grupo Chiquinquirá', district_id: 20 }
    ]
  };

  const mockRecTypes = [
    { id: 'sct-wood-badge', name: 'Insignia de Madera', created_at: '2026-01-01' },
    { id: 'sct-merit', name: 'Medalla al Mérito', created_at: '2026-01-02' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('chil_tour_quick-recognition-tour_user-quick-123', 'true');

    vi.mocked(authFeature.useAuth).mockReturnValue({
      user: {
        uid: 'user-quick-123',
        email: 'quick@scouts.org.ve',
        displayName: 'Quick Scouter',
        photoURL: null
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn()
    });

    vi.mocked(batchesApi.getHierarchyData).mockResolvedValue(mockHierarchy);
    vi.mocked(recognitionsApi.getAllRecognitionTypes).mockResolvedValue(mockRecTypes);
  });

  it('renders form with header, dynamic recognition types and cascading hierarchy', async () => {
    render(
      <MemoryRouter>
        <QuickRecognition />
      </MemoryRouter>
    );

    expect(screen.getByText('Emisión Rápida de Reconocimiento')).toBeInTheDocument();
    expect(screen.getByText('Emite y descarga un reconocimiento individual de forma inmediata en un solo paso.')).toBeInTheDocument();

    // Wait for hierarchy to load
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Región Capital' })).toBeInTheDocument();
    });

    // Check recognition types populated
    expect(screen.getByRole('option', { name: 'Insignia de Madera' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Medalla al Mérito' })).toBeInTheDocument();

    // Select Region -> Distrito should populate
    const regionSelect = screen.getByLabelText('Región Scout');
    fireEvent.change(regionSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Distrito Sucre' })).toBeInTheDocument();
    });

    // Select District -> Grupo should populate
    const districtSelect = screen.getByLabelText('Distrito Scout');
    fireEvent.change(districtSelect, { target: { value: '10' } });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Grupo San Luis' })).toBeInTheDocument();
    });
  });

  it('validates required fields before submitting', async () => {
    render(
      <MemoryRouter>
        <QuickRecognition />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Región Capital' })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Emitir y Descargar Reconocimiento/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Debe seleccionar un tipo de reconocimiento')).toBeInTheDocument();
      expect(screen.getByText('Debe seleccionar una región')).toBeInTheDocument();
      expect(screen.getByText('Debe ingresar la cédula de identidad')).toBeInTheDocument();
      expect(screen.getByText('Debe ingresar el o los nombres')).toBeInTheDocument();
      expect(screen.getByText('Debe ingresar el o los apellidos')).toBeInTheDocument();
    });

    expect(batchesApi.createBatch).not.toHaveBeenCalled();
    expect(batchesApi.createMember).not.toHaveBeenCalled();
    expect(recognitionsApi.downloadSingleCertificatePdf).not.toHaveBeenCalled();
  });

  it('allows querying Sistema de Registro for scout units and auto-populates names', async () => {
    vi.mocked(batchesApi.getMemberStatus).mockResolvedValue({
      nombre_completo: 'Carlos Eduardo Mendoza Silva',
      status: 'Activo',
      fecha_nacimiento: '2010-05-15',
      correo_electronico: 'carlos@example.com',
      telefono: '04141234567'
    });

    render(
      <MemoryRouter>
        <QuickRecognition />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Región Capital' })).toBeInTheDocument();
    });

    // Set cédula
    const cedulaInput = screen.getByLabelText('Cédula de Identidad');
    fireEvent.change(cedulaInput, { target: { value: 'V-25123456' } });

    // Click Consultar Sistema de Registro
    const searchBtn = screen.getByRole('button', { name: /Consultar/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(batchesApi.getMemberStatus).toHaveBeenCalledWith('V-25123456');
    });

    // Check names auto-filled
    const firstNameInput = screen.getByLabelText('Nombres') as HTMLInputElement;
    const lastNameInput = screen.getByLabelText('Apellidos') as HTMLInputElement;

    expect(firstNameInput.value).toBe('Carlos Eduardo');
    expect(lastNameInput.value).toBe('Mendoza Silva');
    expect(screen.getByText(/✓ Miembro encontrado: Carlos Eduardo Mendoza Silva/i)).toBeInTheDocument();
  });

  it('handles Sistema de Registro not found error gracefully', async () => {
    vi.mocked(batchesApi.getMemberStatus).mockRejectedValue(new Error('No registrado'));

    render(
      <MemoryRouter>
        <QuickRecognition />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Región Capital' })).toBeInTheDocument();
    });

    const cedulaInput = screen.getByLabelText('Cédula de Identidad');
    fireEvent.change(cedulaInput, { target: { value: 'V-99999999' } });

    const searchBtn = screen.getByRole('button', { name: /Consultar/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('Usuario no registrado en Sistema de Registro.')).toBeInTheDocument();
    });
  });

  it('supports No Scout unit emission without Sistema de Registro lookup', async () => {
    vi.mocked(batchesApi.createBatch).mockResolvedValue({
      id: 501,
      comment: 'Reconocimiento Especial',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      unit_scope: 'no_scout',
      recognition_type: 'sct-wood-badge',
      created_at: '2026-08-25T12:00:00.000Z',
      user_id: 'user-quick-123'
    });

    vi.mocked(batchesApi.createMember).mockResolvedValue({
      identity: 'V-11223344',
      first_names: 'María',
      last_names: 'González',
      birth_date: '2000-01-01',
      unit: 'no_scout',
      member_type: 'adult',
      status: 'active',
      batch_id: 501,
      recognition_code: 'REC-XYZ123',
      user_id: 'user-quick-123'
    });

    vi.mocked(recognitionsApi.downloadSingleCertificatePdf).mockResolvedValue('Reconocimiento_V-11223344_Lote_501.pdf');

    render(
      <MemoryRouter>
        <QuickRecognition />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Región Capital' })).toBeInTheDocument();
    });

    // Select No Scout unit
    const unitSelect = screen.getByLabelText('Unidad / Categoría');
    fireEvent.change(unitSelect, { target: { value: 'no_scout' } });

    // Verify Sistema de Registro button is hidden and note is displayed
    expect(screen.queryByRole('button', { name: /Consultar/i })).not.toBeInTheDocument();
    expect(screen.getByText('(No requiere verificación Sistema de Registro)')).toBeInTheDocument();

    // Fill form fields
    fireEvent.change(screen.getByLabelText('Tipo de Reconocimiento'), { target: { value: 'sct-wood-badge' } });
    fireEvent.change(screen.getByLabelText('Región Scout'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Distrito Scout'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Grupo Scout'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Cédula de Identidad'), { target: { value: 'V-11223344' } });
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'María' } });
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'González' } });
    fireEvent.change(screen.getByLabelText('Comentario / Motivo (Opcional)'), { target: { value: 'Reconocimiento Especial' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Emitir y Descargar Reconocimiento/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(batchesApi.createBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          region_id: 1,
          district_id: 10,
          group_id: 100,
          unit_scope: 'no_scout',
          recognition_type: 'sct-wood-badge',
          comment: 'Reconocimiento Especial',
          user_id: 'user-quick-123'
        }),
        'user-quick-123'
      );
    });

    expect(batchesApi.createMember).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: 'V-11223344',
        first_names: 'María',
        last_names: 'González',
        unit: 'no_scout',
        member_type: 'adult',
        status: 'active',
        batch_id: 501,
        user_id: 'user-quick-123'
      }),
      'user-quick-123'
    );

    expect(recognitionsApi.downloadSingleCertificatePdf).toHaveBeenCalled();

    // Check Success Screen rendered
    await waitFor(() => {
      expect(screen.getByText('¡Reconocimiento Emitido con Éxito!')).toBeInTheDocument();
      expect(screen.getByText('María González')).toBeInTheDocument();
      expect(screen.getByText('Lote #501')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Emitir otro reconocimiento rápido/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ver Lote Creado/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ir al Listado de Lotes/i })).toBeInTheDocument();
    });
  });

  it('allows regenerating recognition code and manual editing', async () => {
    render(
      <MemoryRouter>
        <QuickRecognition />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Región Capital' })).toBeInTheDocument();
    });

    const codeInput = screen.getByLabelText('Código de Reconocimiento') as HTMLInputElement;
    const initialCode = codeInput.value;
    expect(initialCode).toMatch(/^REC-/);

    // Regenerate code
    const regenBtn = screen.getByRole('button', { name: /Regenerar/i });
    fireEvent.click(regenBtn);

    const newCode = codeInput.value;
    expect(newCode).toMatch(/^REC-/);

    // Manual edit
    fireEvent.change(codeInput, { target: { value: 'REC-CUSTOM99' } });
    expect(codeInput.value).toBe('REC-CUSTOM99');
  });

  it('shows error when attempting to submit a scout unit without querying the registry', async () => {
    render(
      <MemoryRouter>
        <QuickRecognition />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Región Capital' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Tipo de Reconocimiento/i), { target: { value: 'sct-wood-badge' } });
    fireEvent.change(screen.getByLabelText(/Región Scout/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Distrito Scout/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Grupo Scout/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Cédula de Identidad/i), { target: { value: 'V-12345678' } });
    fireEvent.change(screen.getByLabelText(/Nombres/i), { target: { value: 'Carlos' } });
    fireEvent.change(screen.getByLabelText(/Apellidos/i), { target: { value: 'Mendoza' } });

    const submitBtn = screen.getByRole('button', { name: /Emitir y Descargar Reconocimiento/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Debe consultar el sistema de registro para verificar la cédula del scout antes de emitir el reconocimiento.')).toBeInTheDocument();
    });

    expect(batchesApi.createBatch).not.toHaveBeenCalled();
  });

  it('cascades "No aplica" region to disable district and group and set their values to "No aplica"', async () => {
    render(
      <MemoryRouter>
        <QuickRecognition />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Región Capital' })).toBeInTheDocument();
    });

    const regionSelect = screen.getByLabelText(/Región Scout/i);
    const districtSelect = screen.getByLabelText(/Distrito Scout/i);
    const groupSelect = screen.getByLabelText(/Grupo Scout/i);

    // Select "No aplica" (value "0")
    fireEvent.change(regionSelect, { target: { value: '0' } });

    expect((districtSelect as HTMLSelectElement).value).toBe('0');
    expect((groupSelect as HTMLSelectElement).value).toBe('0');
    expect(districtSelect).toBeDisabled();
    expect(groupSelect).toBeDisabled();
  });

  it('resets form when clicking "Emitir otro reconocimiento rápido" on success screen', async () => {
    vi.mocked(batchesApi.getMemberStatus).mockResolvedValue({
      nombre_completo: 'Pedro Páramo',
      status: 'Activo',
      fecha_nacimiento: '2000-01-01',
      correo_electronico: 'pedro@example.com',
      telefono: '04140000000'
    });

    vi.mocked(batchesApi.createBatch).mockResolvedValue({
      id: 777,
      region_id: 1,
      district_id: 10,
      group_id: 100,
      unit_scope: 'manada',
      recognition_type: 'sct-wood-badge',
      created_at: '2026-08-25T12:00:00.000Z'
    });

    vi.mocked(batchesApi.createMember).mockResolvedValue({
      identity: 'V-98765432',
      first_names: 'Pedro',
      last_names: 'Páramo',
      birth_date: '2000-01-01',
      unit: 'manada',
      member_type: 'young',
      status: 'active',
      batch_id: 777,
      recognition_code: 'REC-123456'
    });

    vi.mocked(recognitionsApi.downloadSingleCertificatePdf).mockResolvedValue('Reconocimiento.pdf');

    render(
      <MemoryRouter>
        <QuickRecognition />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Región Capital' })).toBeInTheDocument();
    });

    // Fill and submit
    fireEvent.change(screen.getByLabelText(/Tipo de Reconocimiento/i), { target: { value: 'sct-wood-badge' } });
    fireEvent.change(screen.getByLabelText(/Región Scout/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Distrito Scout/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Grupo Scout/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Cédula de Identidad/i), { target: { value: 'V-98765432' } });

    // Consult scraper
    fireEvent.click(screen.getByRole('button', { name: /Consultar/i }));
    await waitFor(() => {
      expect(screen.getByText(/✓ Miembro encontrado: Pedro Páramo/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Emitir y Descargar Reconocimiento/i }));

    await waitFor(() => {
      expect(screen.getByText('¡Reconocimiento Emitido con Éxito!')).toBeInTheDocument();
    });

    // Click Emitir otro
    const emitAnotherBtn = screen.getByRole('button', { name: /Emitir otro reconocimiento rápido/i });
    fireEvent.click(emitAnotherBtn);

    // Should return to form
    await waitFor(() => {
      expect(screen.getByText('1. Datos del Reconocimiento')).toBeInTheDocument();
    });

    const cedulaInput = screen.getByLabelText(/Cédula de Identidad/i) as HTMLInputElement;
    expect(cedulaInput.value).toBe('');
  });

  it('navigates to batch detail and batch list from success screen', async () => {
    vi.mocked(batchesApi.getMemberStatus).mockResolvedValue({
      nombre_completo: 'Ana Rojas',
      status: 'Activo',
      fecha_nacimiento: '2000-01-01',
      correo_electronico: 'ana@example.com',
      telefono: '04140000001'
    });

    vi.mocked(batchesApi.createBatch).mockResolvedValue({
      id: 888,
      region_id: 1,
      district_id: 10,
      group_id: 100,
      unit_scope: 'manada',
      recognition_type: 'sct-wood-badge',
      created_at: '2026-08-25T12:00:00.000Z'
    });

    vi.mocked(batchesApi.createMember).mockResolvedValue({
      identity: 'V-12345',
      first_names: 'Ana',
      last_names: 'Rojas',
      birth_date: '2000-01-01',
      unit: 'manada',
      member_type: 'young',
      status: 'active',
      batch_id: 888,
      recognition_code: 'REC-123456'
    });

    vi.mocked(recognitionsApi.downloadSingleCertificatePdf).mockResolvedValue('Reconocimiento.pdf');

    render(
      <MemoryRouter>
        <QuickRecognition />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Región Capital' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Tipo de Reconocimiento/i), { target: { value: 'sct-wood-badge' } });
    fireEvent.change(screen.getByLabelText(/Región Scout/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Distrito Scout/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Grupo Scout/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Cédula de Identidad/i), { target: { value: 'V-12345' } });

    // Consult scraper
    fireEvent.click(screen.getByRole('button', { name: /Consultar/i }));
    await waitFor(() => {
      expect(screen.getByText(/✓ Miembro encontrado: Ana Rojas/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Emitir y Descargar Reconocimiento/i }));

    await waitFor(() => {
      expect(screen.getByText('¡Reconocimiento Emitido con Éxito!')).toBeInTheDocument();
    });

    // Click "Ver Lote Creado"
    fireEvent.click(screen.getByRole('button', { name: /Ver Lote Creado/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/lotes/888');

    // Click "Ir al Listado de Lotes"
    fireEvent.click(screen.getByRole('button', { name: /Ir al Listado de Lotes/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/lotes');
  });

  describe('Walkthrough Interactive Guide', () => {
    it('renders help button and all data-walkthrough targets in the DOM', async () => {
      const { container } = render(
        <MemoryRouter>
          <QuickRecognition />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Emisión Rápida de Reconocimiento')).toBeInTheDocument();
      });

      const helpBtn = screen.getByRole('button', { name: 'Ver guía interactiva' });
      expect(helpBtn).toBeInTheDocument();

      expect(container.querySelector('[data-walkthrough="quick-rec-header"]')).toBeInTheDocument();
      expect(container.querySelector('[data-walkthrough="quick-rec-recognition-section"]')).toBeInTheDocument();
      expect(container.querySelector('[data-walkthrough="quick-rec-recipient-section"]')).toBeInTheDocument();
      expect(container.querySelector('[data-walkthrough="quick-rec-actions-section"]')).toBeInTheDocument();
    });

    it('starts and steps through the 4-step walkthrough tour upon clicking the help button', async () => {
      render(
        <MemoryRouter>
          <QuickRecognition />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Emisión Rápida de Reconocimiento')).toBeInTheDocument();
      });

      const helpBtn = screen.getByRole('button', { name: 'Ver guía interactiva' });
      fireEvent.click(helpBtn);

      // Step 1: Cabecera y Objetivo
      await waitFor(() => {
        expect(screen.getByText('Emisión Rápida de Reconocimientos')).toBeInTheDocument();
      });
      expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Este módulo te permite emitir y descargar un reconocimiento individual en un solo paso, ideal para reconocer a una persona sin procesar lotes masivos.'
        )
      ).toBeInTheDocument();

      // Click Siguiente -> Step 2
      fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

      // Step 2: Tipo de Reconocimiento y Ubicación
      expect(screen.getByText('Tipo de Reconocimiento y Ubicación')).toBeInTheDocument();
      expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Selecciona el tipo de reconocimiento a otorgar y la estructura geográfica (Región, Distrito, Grupo). Si es para alguien no scout (agradecimiento), estos campos son opcionales.'
        )
      ).toBeInTheDocument();

      // Click Siguiente -> Step 3
      fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

      // Step 3: Datos del Reconocido y Unidad
      expect(screen.getByText('Datos del Reconocido y Unidad')).toBeInTheDocument();
      expect(screen.getByText('Paso 3 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          "Selecciona la unidad. Para miembros scouts, ingresa la cédula y haz clic en 'Consultar' para autocompletar sus datos desde el sistema de registro."
        )
      ).toBeInTheDocument();

      // Click Siguiente -> Step 4
      fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));

      // Step 4: Código y Descarga Inmediata
      expect(screen.getByText('Código y Descarga Inmediata')).toBeInTheDocument();
      expect(screen.getByText('Paso 4 de 4')).toBeInTheDocument();
      expect(
        screen.getByText(
          "El código oficial se genera automáticamente (puedes regenerarlo o editarlo). Al pulsar 'Emitir y Descargar Reconocimiento', el lote se crea en el sistema y el PDF se descarga al instante."
        )
      ).toBeInTheDocument();

      // Last step finish button
      const finishBtn = screen.getByRole('button', { name: /¡Entendido!/i });
      expect(finishBtn).toBeInTheDocument();

      // Complete tour
      fireEvent.click(finishBtn);

      // Overlay closes
      expect(screen.queryByText('Código y Descarga Inmediata')).not.toBeInTheDocument();
      expect(localStorage.getItem('chil_tour_quick-recognition-tour_user-quick-123')).toBe('true');
    });
  });

  describe('splitFullName helper function', () => {
    it('handles 4 or more parts', () => {
      expect(splitFullName('Juan Carlos Perez Rodriguez')).toEqual({
        first_names: 'Juan Carlos',
        last_names: 'Perez Rodriguez'
      });
    });

    it('handles 3 parts', () => {
      expect(splitFullName('Maria Elena Gonzalez')).toEqual({
        first_names: 'Maria',
        last_names: 'Elena Gonzalez'
      });
    });

    it('handles 2 parts', () => {
      expect(splitFullName('Carlos Mendoza')).toEqual({
        first_names: 'Carlos',
        last_names: 'Mendoza'
      });
    });

    it('handles single name', () => {
      expect(splitFullName('Madonna')).toEqual({
        first_names: 'Madonna',
        last_names: ''
      });
    });
  });
});
