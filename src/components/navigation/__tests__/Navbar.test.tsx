import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { ScraperSettingsModal } from '../ScraperSettingsModal';
import { ScraperSettingsProvider } from '../../../context/ScraperSettingsContext';
import * as api from '../../../features/batches/api';
import * as authFeature from '../../../features/auth';

vi.mock('../../../features/batches/api', () => ({
  getScraperSessionStatus: vi.fn(),
  saveScraperSession: vi.fn(),
  clearScraperSession: vi.fn(),
  purgeLegacyScraperStorage: vi.fn()
}));

vi.mock('../../../features/auth', () => ({
  useAuth: vi.fn(),
  UserProfileMenu: () => <div data-testid="user-profile-menu">User Profile Menu</div>
}));

describe('Navbar component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authFeature.useAuth).mockReturnValue({
      user: {
        uid: 'user-123',
        email: 'scout@test.com',
        displayName: 'Scout User',
        photoURL: null
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn()
    });
    vi.mocked(api.getScraperSessionStatus).mockResolvedValue({
      connected: false,
      status: 'none',
      impeesaEmail: null,
      updatedAt: null
    });
  });

  const renderNavbarWithProvider = (initialEntries = ['/']) => {
    return render(
      <ScraperSettingsProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Navbar />
          <ScraperSettingsModal />
        </MemoryRouter>
      </ScraperSettingsProvider>
    );
  };

  it('renders logo, brand name, navigation links, and UserProfileMenu when authenticated', () => {
    renderNavbarWithProvider();

    expect(screen.getByText('Chil')).toBeInTheDocument();
    const logoLink = screen.getByRole('link', { name: /Chil Logo Chil/i });
    expect(logoLink).toHaveAttribute('href', '/lotes');

    expect(screen.getByText('Emisión Rápida')).toBeInTheDocument();
    expect(screen.getByText('Nuevo lote')).toBeInTheDocument();
    expect(screen.getByText('Listado de lotes')).toBeInTheDocument();
    expect(screen.getByText('Resumen')).toBeInTheDocument();
    expect(screen.getByText('Estadísticas')).toBeInTheDocument();
    expect(screen.getByText('Reconocimientos')).toBeInTheDocument();
    expect(screen.getByTestId('user-profile-menu')).toBeInTheDocument();
  });

  it('renders login and register buttons when unauthenticated', () => {
    vi.mocked(authFeature.useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn()
    });

    renderNavbarWithProvider();

    expect(screen.getByText('Chil')).toBeInTheDocument();
    const logoLink = screen.getByRole('link', { name: /Chil Logo Chil/i });
    expect(logoLink).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrarse/i })).toBeInTheDocument();
    expect(screen.queryByText('Emisión Rápida')).not.toBeInTheDocument();
    expect(screen.queryByText('Nuevo lote')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-profile-menu')).not.toBeInTheDocument();
  });

  it('opens shared scraper settings modal, enters credentials and connects session', async () => {
    vi.mocked(api.saveScraperSession).mockResolvedValue({
      connected: true,
      status: 'active',
      impeesaEmail: 'scout@test.com',
      updatedAt: '2026-11-12T10:00:00.000Z'
    });

    renderNavbarWithProvider();

    const settingsBtn = screen.getByLabelText(/Ajustes de Credenciales Scraper/i);
    fireEvent.click(settingsBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Conexión con Sistema de Registro (Impeesa)')
      ).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Correo de Impeesa/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);

    fireEvent.change(emailInput, { target: { value: 'scout@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'mypassword123' } });

    const saveBtn = screen.getByRole('button', { name: /Conectar Sesión/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.saveScraperSession).toHaveBeenCalledWith({
        email: 'scout@test.com',
        password: 'mypassword123'
      });
      expect(
        screen.getByText(/Sesión de Impeesa conectada y guardada de forma segura/i)
      ).toBeInTheDocument();
    });
  });

  it('highlights only "Nuevo lote" when path is /lotes/nuevo', () => {
    renderNavbarWithProvider(['/lotes/nuevo']);

    const nuevoLoteLink = screen.getByRole('link', { name: 'Nuevo lote' });
    const listadoLotesLink = screen.getByRole('link', { name: 'Listado de lotes' });
    const recognitionsLink = screen.getByRole('link', { name: 'Reconocimientos' });
    const resumenLink = screen.getByRole('link', { name: 'Resumen' });
    const estadisticasLink = screen.getByRole('link', { name: 'Estadísticas' });

    expect(nuevoLoteLink).toHaveClass('border-primary');
    expect(nuevoLoteLink).toHaveClass('text-primary');
    expect(listadoLotesLink).toHaveClass('border-transparent');
    expect(recognitionsLink).toHaveClass('border-transparent');
    expect(resumenLink).toHaveClass('border-transparent');
    expect(estadisticasLink).toHaveClass('border-transparent');
  });

  it('highlights only "Listado de lotes" when path is /lotes', () => {
    renderNavbarWithProvider(['/lotes']);

    const nuevoLoteLink = screen.getByRole('link', { name: 'Nuevo lote' });
    const listadoLotesLink = screen.getByRole('link', { name: 'Listado de lotes' });
    const recognitionsLink = screen.getByRole('link', { name: 'Reconocimientos' });
    const resumenLink = screen.getByRole('link', { name: 'Resumen' });
    const estadisticasLink = screen.getByRole('link', { name: 'Estadísticas' });

    expect(listadoLotesLink).toHaveClass('border-primary');
    expect(listadoLotesLink).toHaveClass('text-primary');
    expect(nuevoLoteLink).toHaveClass('border-transparent');
    expect(recognitionsLink).toHaveClass('border-transparent');
    expect(resumenLink).toHaveClass('border-transparent');
    expect(estadisticasLink).toHaveClass('border-transparent');
  });

  it('highlights only "Reconocimientos" when path is /reconocimientos', () => {
    renderNavbarWithProvider(['/reconocimientos']);

    const nuevoLoteLink = screen.getByRole('link', { name: 'Nuevo lote' });
    const listadoLotesLink = screen.getByRole('link', { name: 'Listado de lotes' });
    const recognitionsLink = screen.getByRole('link', { name: 'Reconocimientos' });
    const resumenLink = screen.getByRole('link', { name: 'Resumen' });
    const estadisticasLink = screen.getByRole('link', { name: 'Estadísticas' });

    expect(recognitionsLink).toHaveClass('border-primary');
    expect(recognitionsLink).toHaveClass('text-primary');
    expect(nuevoLoteLink).toHaveClass('border-transparent');
    expect(listadoLotesLink).toHaveClass('border-transparent');
    expect(resumenLink).toHaveClass('border-transparent');
    expect(estadisticasLink).toHaveClass('border-transparent');
  });

  it('highlights only "Resumen" when path is /resumen', () => {
    renderNavbarWithProvider(['/resumen']);

    const nuevoLoteLink = screen.getByRole('link', { name: 'Nuevo lote' });
    const listadoLotesLink = screen.getByRole('link', { name: 'Listado de lotes' });
    const recognitionsLink = screen.getByRole('link', { name: 'Reconocimientos' });
    const resumenLink = screen.getByRole('link', { name: 'Resumen' });
    const estadisticasLink = screen.getByRole('link', { name: 'Estadísticas' });

    expect(resumenLink).toHaveClass('border-primary');
    expect(resumenLink).toHaveClass('text-primary');
    expect(nuevoLoteLink).toHaveClass('border-transparent');
    expect(listadoLotesLink).toHaveClass('border-transparent');
    expect(recognitionsLink).toHaveClass('border-transparent');
    expect(estadisticasLink).toHaveClass('border-transparent');
  });

  it('highlights only "Estadísticas" when path is /estadisticas', () => {
    renderNavbarWithProvider(['/estadisticas']);

    const nuevoLoteLink = screen.getByRole('link', { name: 'Nuevo lote' });
    const listadoLotesLink = screen.getByRole('link', { name: 'Listado de lotes' });
    const recognitionsLink = screen.getByRole('link', { name: 'Reconocimientos' });
    const resumenLink = screen.getByRole('link', { name: 'Resumen' });
    const estadisticasLink = screen.getByRole('link', { name: 'Estadísticas' });

    expect(estadisticasLink).toHaveClass('border-primary');
    expect(estadisticasLink).toHaveClass('text-primary');
    expect(nuevoLoteLink).toHaveClass('border-transparent');
    expect(listadoLotesLink).toHaveClass('border-transparent');
    expect(recognitionsLink).toHaveClass('border-transparent');
    expect(resumenLink).toHaveClass('border-transparent');
  });

  it('highlights only "Emisión Rápida" when path is /lotes/rapido', () => {
    renderNavbarWithProvider(['/lotes/rapido']);

    const rapidoLink = screen.getByRole('link', { name: 'Emisión Rápida' });
    const nuevoLoteLink = screen.getByRole('link', { name: 'Nuevo lote' });
    const listadoLotesLink = screen.getByRole('link', { name: 'Listado de lotes' });

    expect(rapidoLink).toHaveClass('bg-amber-300');
    expect(rapidoLink).toHaveClass('text-neutral-950');
    expect(nuevoLoteLink).toHaveClass('border-transparent');
    expect(listadoLotesLink).toHaveClass('border-transparent');
  });

  it('applies amber-100 shading to "Emisión Rápida" when path is not /lotes/rapido', () => {
    renderNavbarWithProvider(['/lotes']);

    const rapidoLink = screen.getByRole('link', { name: 'Emisión Rápida' });
    expect(rapidoLink).toHaveClass('bg-amber-100');
    expect(rapidoLink).toHaveClass('text-neutral-900');
  });
});
