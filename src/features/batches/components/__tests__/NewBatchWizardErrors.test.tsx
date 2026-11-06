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

import * as recognitionsModule from '../../../recognitions';

vi.mock('../../../recognitions', () => ({
  getAllRecognitionTypes: vi.fn().mockResolvedValue([
    { id: 'sct-wood-badge', name: 'Insignia de Madera', created_at: '2026-01-01' }
  ])
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

describe('NewBatchWizard error cases & edge branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(recognitionsModule.getAllRecognitionTypes).mockResolvedValue([
      { id: 'sct-wood-badge', name: 'Insignia de Madera', created_at: '2026-01-01' }
    ]);
    vi.mocked(api.getHierarchyData).mockResolvedValue({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito Sucre', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo San Luis', district_id: 10 }]
    });
  });

  it('shows missing credentials alert when verifying without scraper credentials configured', async () => {
    vi.mocked(api.hasScraperCredentials).mockResolvedValue(false);

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

    const cedulasInput = screen.getByLabelText(/Cédulas de Identidad/i);
    fireEvent.change(cedulasInput, { target: { value: '29111222' } });

    const verifyBtn = screen.getByRole('button', { name: /Cargar y Verificar Miembros/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Autenticación del Scraper Requerida/i)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByText('Cancelar');
    fireEvent.click(cancelBtn);
  });

  it('displays authentication error modal when loginScraper fails', async () => {
    vi.mocked(api.hasScraperCredentials).mockResolvedValue(true);
    vi.mocked(api.loginScraper).mockRejectedValue(new Error('Credenciales inválidas en Sistema de Registro'));

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

    const cedulasInput = screen.getByLabelText(/Cédulas de Identidad/i);
    fireEvent.change(cedulasInput, { target: { value: '29111222' } });

    const verifyBtn = screen.getByRole('button', { name: /Cargar y Verificar Miembros/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Error de Autenticación')).toBeInTheDocument();
      expect(screen.getByText('Credenciales inválidas en Sistema de Registro')).toBeInTheDocument();
    });
  });

  it('handles unregistered member lookup by creating a pending member', async () => {
    vi.mocked(api.hasScraperCredentials).mockResolvedValue(true);
    vi.mocked(api.loginScraper).mockResolvedValue();
    vi.mocked(api.createBatch).mockResolvedValue({
      id: 888,
      comment: '',
      region_id: 0,
      district_id: 0,
      group_id: 0,
      recognition_type: 'sct-wood-badge',
      created_at: '2026-08-21T12:00:00.000Z'
    });
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
    vi.mocked(api.getMembersByBatchId).mockResolvedValue([
      {
        identity: '99999999',
        first_names: 'Usuario',
        last_names: 'No Registrado',
        birth_date: '1990-01-01',
        member_type: 'young',
        status: 'pending',
        batch_id: 888
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

    const cedulasInput = screen.getByLabelText(/Cédulas de Identidad/i);
    fireEvent.change(cedulasInput, { target: { value: '99999999' } });

    const verifyBtn = screen.getByRole('button', { name: /Cargar y Verificar Miembros/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Revisión y Confirmación del Lote')).toBeInTheDocument();
      expect(screen.getByText('Usuario No Registrado')).toBeInTheDocument();
      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });
  });

  it('renders warning card and disables next button when recognitionTypes is empty in Step 1', async () => {
    vi.mocked(recognitionsModule.getAllRecognitionTypes).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <NewBatchWizard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No tienes tipos de reconocimientos registrados. Debes crear al menos un tipo de reconocimiento en el Catálogo antes de crear un nuevo lote./i)
      ).toBeInTheDocument();
    });

    const catLink = screen.getByRole('link', { name: /Ir al Catálogo de Reconocimientos/i });
    expect(catLink).toBeInTheDocument();
    expect(catLink).toHaveAttribute('href', '/reconocimientos');

    const nextBtn = screen.getByRole('button', { name: /Cargar y Verificar Miembros/i });
    expect(nextBtn).toBeDisabled();
  });
});
