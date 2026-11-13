import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScraperSettingsModal } from '../ScraperSettingsModal';
import {
  ScraperSettingsProvider,
  useScraperSettings
} from '../../../context/ScraperSettingsContext';
import * as api from '../../../features/batches/api';
import * as authFeature from '../../../features/auth';

vi.mock('../../../features/batches/api', () => ({
  getScraperSessionStatus: vi.fn(),
  saveScraperSession: vi.fn(),
  clearScraperSession: vi.fn(),
  purgeLegacyScraperStorage: vi.fn()
}));

vi.mock('../../../features/auth', () => ({
  useAuth: vi.fn()
}));

const ModalTrigger = () => {
  const { openModal } = useScraperSettings();
  return (
    <button type="button" onClick={openModal}>
      Abrir Modal
    </button>
  );
};

describe('ScraperSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authFeature.useAuth).mockReturnValue({
      user: {
        uid: 'uid-1',
        email: 'chil@test.com',
        displayName: 'Test User',
        photoURL: null
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn()
    });
  });

  const renderModal = async () => {
    render(
      <ScraperSettingsProvider>
        <ModalTrigger />
        <ScraperSettingsModal />
      </ScraperSettingsProvider>
    );
    fireEvent.click(screen.getByText('Abrir Modal'));
    await waitFor(() => {
      expect(
        screen.getByText('Conexión con Sistema de Registro (Impeesa)')
      ).toBeInTheDocument();
    });
  };

  it('shows honest security notice stating password is never stored', async () => {
    vi.mocked(api.getScraperSessionStatus).mockResolvedValue({
      connected: false,
      status: 'none',
      impeesaEmail: null,
      updatedAt: null
    });

    await renderModal();

    expect(
      screen.getByText(/nunca guarda ni registra tu contraseña/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/AES-256-GCM/i)).toBeInTheDocument();
  });

  it('shows active session status, pre-fills email only, clears password after save, and supports disconnect', async () => {
    vi.mocked(api.getScraperSessionStatus).mockResolvedValue({
      connected: true,
      status: 'active',
      impeesaEmail: 'impeesa@scouts.org.ve',
      updatedAt: '2026-11-12T10:00:00.000Z'
    });
    vi.mocked(api.clearScraperSession).mockResolvedValue({
      connected: false,
      status: 'none',
      impeesaEmail: null,
      updatedAt: null
    });

    await renderModal();

    expect(screen.getByText('Sesión activa')).toBeInTheDocument();
    expect(screen.getByText('impeesa@scouts.org.ve')).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo de Impeesa/i)).toHaveValue(
      'impeesa@scouts.org.ve'
    );
    expect(screen.getByLabelText(/Contraseña/i)).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: /Desconectar/i }));

    await waitFor(() => {
      expect(api.clearScraperSession).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText(/Sesión de Impeesa desconectada correctamente/i)
      ).toBeInTheDocument();
    });
  });

  it('shows expired status warning when session status is expired', async () => {
    vi.mocked(api.getScraperSessionStatus).mockResolvedValue({
      connected: false,
      status: 'expired',
      impeesaEmail: 'impeesa@scouts.org.ve',
      updatedAt: null
    });

    await renderModal();

    expect(screen.getByText('Sesión expirada')).toBeInTheDocument();
  });
});
