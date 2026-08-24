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

describe('NewBatchWizard error cases & edge branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getHierarchyData).mockResolvedValue({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    });
  });

  const setupStep2 = async () => {
    vi.mocked(api.createBatch).mockResolvedValue({
      id: 888,
      comment: 'Lote Error Test',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      created_at: '2026-08-21T12:00:00.000Z'
    });

    render(
      <MemoryRouter>
        <NewBatchWizard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Región Scout/i)).not.toBeDisabled();
    });

    fireEvent.click(screen.getByLabelText(/Región Scout/i));
    const regOpt = await screen.findByText('Región Capital');
    fireEvent.click(regOpt);

    await waitFor(() => {
      expect(screen.getByText('Región Capital')).toBeInTheDocument();
      expect(screen.getByLabelText(/Distrito Scout/i)).not.toBeDisabled();
    });

    fireEvent.click(screen.getByLabelText(/Distrito Scout/i));
    const distOpt = await screen.findByText('Distrito Sucre');
    fireEvent.click(distOpt);

    await waitFor(() => {
      expect(screen.getByText('Distrito Sucre')).toBeInTheDocument();
      expect(screen.getByLabelText(/Grupo Scout/i)).not.toBeDisabled();
    });

    fireEvent.click(screen.getByLabelText(/Grupo Scout/i));
    const grpOpt = await screen.findByText('Grupo San Luis');
    fireEvent.click(grpOpt);

    await waitFor(() => {
      expect(screen.getByText('Grupo San Luis')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Tipo de Reconocimiento/i), {
      target: { value: 'sct-wood-badge' }
    });

    const nextBtn = screen.getByText('Siguiente paso');
    await waitFor(() => {
      expect(nextBtn).not.toBeDisabled();
    });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('Verificación de Cédulas')).toBeInTheDocument();
    });
  };

  it('shows missing credentials alert when verifying without scraper credentials configured', async () => {
    await setupStep2();

    vi.mocked(api.hasScraperCredentials).mockResolvedValue(false);

    const youngInput = screen.getByLabelText(/Cédulas de Jóvenes/i);
    fireEvent.change(youngInput, { target: { value: '29111222' } });

    const verifyBtn = screen.getByText('Iniciar Verificación');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Autenticación del Scraper Requerida/i)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByText('Cancelar');
    fireEvent.click(cancelBtn);
  });

  it('displays authentication error modal when loginScraper fails', async () => {
    await setupStep2();

    vi.mocked(api.hasScraperCredentials).mockResolvedValue(true);
    vi.mocked(api.loginScraper).mockRejectedValue(new Error('Credenciales inválidas en SERSIN'));

    const youngInput = screen.getByLabelText(/Cédulas de Jóvenes/i);
    fireEvent.change(youngInput, { target: { value: '29111222' } });

    const verifyBtn = screen.getByText('Iniciar Verificación');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Error de Autenticación')).toBeInTheDocument();
      expect(screen.getByText('Credenciales inválidas en SERSIN')).toBeInTheDocument();
    });
  });

  it('handles unregistered member lookup by creating a pending member', async () => {
    await setupStep2();

    vi.mocked(api.hasScraperCredentials).mockResolvedValue(true);
    vi.mocked(api.loginScraper).mockResolvedValue();
    vi.mocked(api.getMemberStatus).mockRejectedValue(new Error('No registrado'));
    vi.mocked(api.createMember).mockResolvedValue({
      identity: '99999999',
      first_names: 'Usuario',
      last_names: 'No Registrado',
      birth_date: '1990-01-01',
      member_type: 'young',
      status: 'pending',
      batch_id: 888
    });

    const youngInput = screen.getByLabelText(/Cédulas de Jóvenes/i);
    fireEvent.change(youngInput, { target: { value: '99999999' } });

    const verifyBtn = screen.getByText('Iniciar Verificación');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('No registrado')).toBeInTheDocument();
      expect(screen.getByText('Usuario No Registrado')).toBeInTheDocument();
    });
  });
});
