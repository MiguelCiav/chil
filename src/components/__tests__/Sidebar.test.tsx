import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import * as api from '../../features/batches/api';
import * as authFeature from '../../features/auth';

vi.mock('../../features/batches/api', () => ({
  hasScraperCredentials: vi.fn(),
  saveScraperCredentials: vi.fn()
}));

vi.mock('../../features/auth', () => ({
  useAuth: vi.fn(),
  UserProfileMenu: () => <div data-testid="user-profile-menu">User Profile Menu</div>
}));

describe('Sidebar component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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
  });

  it('renders logo, title, navigation links in correct order, and UserProfileMenu when authenticated', () => {
    vi.mocked(api.hasScraperCredentials).mockResolvedValue(false);

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Chil')).toBeInTheDocument();
    const logoImg = screen.getByAltText('Chil Logo');
    expect(logoImg.closest('a')).toHaveAttribute('href', '/lotes');

    const nav = screen.getByRole('navigation', { name: /Navegación principal/i });
    const links = within(nav).getAllByRole('link');
    expect(links[0]).toHaveTextContent('Emisión Rápida');
    expect(links[1]).toHaveTextContent('Lotes');
    expect(links[2]).toHaveTextContent('Nuevo Lote');
    expect(links[3]).toHaveTextContent('Reconocimientos');
    expect(links[4]).toHaveTextContent('Resumen');
    expect(links[5]).toHaveTextContent('Estadísticas');

    expect(screen.getByTestId('user-profile-menu')).toBeInTheDocument();
    expect(screen.getByLabelText(/Ajustes de Credenciales Scraper/i)).toBeInTheDocument();
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

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Chil')).toBeInTheDocument();
    const logoImg = screen.getByAltText('Chil Logo');
    expect(logoImg.closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrarse/i })).toBeInTheDocument();
    expect(screen.queryByText('Emisión Rápida')).not.toBeInTheDocument();
    expect(screen.queryByText('Nuevo Lote')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-profile-menu')).not.toBeInTheDocument();
  });

  it('toggles collapse state and saves in localStorage', () => {
    vi.mocked(api.hasScraperCredentials).mockResolvedValue(false);

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    const collapseBtn = screen.getByRole('button', { name: /Colapsar barra lateral/i });
    expect(collapseBtn).toBeInTheDocument();

    fireEvent.click(collapseBtn);

    expect(localStorage.getItem('chil_sidebar_collapsed')).toBe('true');
    // When collapsed, the reduced logo acts as the expand button without a separate arrow
    const expandBtn = screen.getByRole('button', { name: /Expandir barra lateral/i });
    expect(within(expandBtn).getByAltText('Chil Logo')).toBeInTheDocument();

    // Expand again by clicking the reduced logo
    fireEvent.click(expandBtn);

    expect(localStorage.getItem('chil_sidebar_collapsed')).toBe('false');
    expect(screen.getByRole('button', { name: /Colapsar barra lateral/i })).toBeInTheDocument();
  });

  it('opens scraper settings modal, enters credentials and saves', async () => {
    vi.mocked(api.hasScraperCredentials).mockResolvedValue(false);
    vi.mocked(api.saveScraperCredentials).mockResolvedValue();

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    const settingsBtn = screen.getByLabelText(/Ajustes de Credenciales Scraper/i);
    fireEvent.click(settingsBtn);

    await waitFor(() => {
      expect(screen.getByText('Configuración del Scraper ASV')).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Correo Electrónico/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);

    fireEvent.change(emailInput, { target: { value: 'scout@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'mypassword123' } });

    const saveBtn = screen.getByText('Guardar Ajustes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.saveScraperCredentials).toHaveBeenCalledWith({
        email: 'scout@test.com',
        password: 'mypassword123'
      });
      expect(screen.getByText('Credenciales guardadas exitosamente.')).toBeInTheDocument();
    });
  });

  it('renders mobile drawer when isMobileOpen is true and handles onMobileClose', () => {
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <Sidebar isMobileOpen={true} onMobileClose={handleClose} />
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog', { name: /Menú lateral móvil/i })).toBeInTheDocument();
    const closeBtn = screen.getByRole('button', { name: /Cerrar menú/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByTestId('sidebar-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('highlights active links with Scout primary brown styling and special styling for Emisión Rápida', () => {
    vi.mocked(api.hasScraperCredentials).mockResolvedValue(false);

    render(
      <MemoryRouter initialEntries={['/lotes']}>
        <Sidebar />
      </MemoryRouter>
    );

    const lotesLink = screen.getByRole('link', { name: /Lotes/i });
    expect(lotesLink).toHaveClass('bg-primary/10');
    expect(lotesLink).toHaveClass('text-primary');

    const rapidoLink = screen.getByRole('link', { name: /Emisión Rápida/i });
    expect(rapidoLink).toHaveClass('bg-amber-100');
  });

  it('highlights Emisión Rápida with active amber styling when path is /lotes/rapido', () => {
    vi.mocked(api.hasScraperCredentials).mockResolvedValue(false);

    render(
      <MemoryRouter initialEntries={['/lotes/rapido']}>
        <Sidebar />
      </MemoryRouter>
    );

    const rapidoLink = screen.getByRole('link', { name: /Emisión Rápida/i });
    expect(rapidoLink).toHaveClass('bg-amber-300');
    expect(rapidoLink).toHaveClass('text-neutral-950');
  });
});
