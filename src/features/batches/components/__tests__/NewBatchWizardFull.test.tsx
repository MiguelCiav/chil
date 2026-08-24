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
    getMembersByBatchId: vi.fn(),
    hasScraperCredentials: vi.fn(),
    loginScraper: vi.fn()
  };
});

vi.mock('../../../recognitions', () => ({
  getAllRecognitionTypes: vi.fn().mockResolvedValue([])
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('NewBatchWizard full flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getHierarchyData).mockResolvedValue({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    });
  });

  it('completes full flow from Step 1 to Step 2 to Step 3 and redirects to success', async () => {
    vi.mocked(api.createBatch).mockResolvedValue({
      id: 777,
      comment: 'Mi Lote Completo',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      created_at: '2026-08-21T12:00:00.000Z'
    });

    vi.mocked(api.hasScraperCredentials).mockResolvedValue(true);
    vi.mocked(api.loginScraper).mockResolvedValue();
    vi.mocked(api.getMemberStatus).mockResolvedValue({
      nombre_completo: 'Carlos Eduardo Gomez Perez',
      status: 'activo',
      telefono: '04121234567',
      correo_electronico: 'c@g.com',
      fecha_nacimiento: '2004-10-25'
    });
    vi.mocked(api.createMember).mockResolvedValue({
      identity: '29111222',
      first_names: 'Carlos Eduardo',
      last_names: 'Gomez Perez',
      birth_date: '2004-10-25',
      member_type: 'young',
      status: 'active',
      batch_id: 777
    });
    vi.mocked(api.getMembersByBatchId).mockResolvedValue([
      {
        identity: '29111222',
        first_names: 'Carlos Eduardo',
        last_names: 'Gomez Perez',
        birth_date: '2004-10-25',
        member_type: 'young',
        status: 'active',
        batch_id: 777
      }
    ]);

    render(
      <MemoryRouter>
        <NewBatchWizard />
      </MemoryRouter>
    );

    // Wait for hierarchy to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Región Scout/i)).not.toBeDisabled();
    });

    // 1. Select Region
    const regionBtn = screen.getByLabelText(/Región Scout/i);
    fireEvent.click(regionBtn);
    const regionOpt = await screen.findByText('Región Capital');
    fireEvent.click(regionOpt);

    await waitFor(() => {
      expect(screen.getByText('Región Capital')).toBeInTheDocument();
      expect(screen.getByLabelText(/Distrito Scout/i)).not.toBeDisabled();
    });

    // 2. Select District
    const districtBtn = screen.getByLabelText(/Distrito Scout/i);
    fireEvent.click(districtBtn);
    const districtOpt = await screen.findByText('Distrito Sucre');
    fireEvent.click(districtOpt);

    await waitFor(() => {
      expect(screen.getByText('Distrito Sucre')).toBeInTheDocument();
      expect(screen.getByLabelText(/Grupo Scout/i)).not.toBeDisabled();
    });

    // 3. Select Group
    const groupBtn = screen.getByLabelText(/Grupo Scout/i);
    fireEvent.click(groupBtn);
    const groupOpt = await screen.findByText('Grupo San Luis');
    fireEvent.click(groupOpt);

    await waitFor(() => {
      expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
    });

    // 4. Select Recognition Type
    const recSelect = screen.getByLabelText(/Tipo de Reconocimiento/i);
    fireEvent.change(recSelect, {
      target: { value: 'sct-wood-badge' }
    });

    // 5. Submit Step 1
    const nextBtn = screen.getByText('Siguiente paso');
    await waitFor(() => {
      expect(nextBtn).not.toBeDisabled();
    });
    fireEvent.click(nextBtn);

    // Step 2: Fill cedulas and verify
    await waitFor(() => {
      expect(screen.getByText('Verificación de Cédulas')).toBeInTheDocument();
    });

    const youngInput = screen.getByLabelText(/Cédulas de Jóvenes/i);
    fireEvent.change(youngInput, { target: { value: '29111222' } });

    const verifyBtn = screen.getByText('Iniciar Verificación');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Carlos Eduardo Gomez Perez')).toBeInTheDocument();
      expect(screen.getByText('Registro válido')).toBeInTheDocument();
    });

    // Continue to Step 3
    const continueBtn = screen.getByText('Validar y Continuar');
    fireEvent.click(continueBtn);

    // Step 3: Review & Finalize
    await waitFor(() => {
      expect(screen.getByText('Revisión Final del Lote')).toBeInTheDocument();
    });

    const finalizeBtn = screen.getByText('Generar Lote');
    fireEvent.click(finalizeBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/lotes/exito', {
        state: { batchId: 777, name: 'Mi Lote Completo' }
      });
    });
  });
});
