import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
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
    vi.mocked(api.getScraperSessionStatus).mockResolvedValue({
      connected: false,
      status: 'none',
      impeesaEmail: null,
      updatedAt: null
    });
  });

  const renderSidebarWithProvider = (initialEntries = ['/']) => {
    return render(
      <ScraperSettingsProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Sidebar />
          <ScraperSettingsModal />
        </MemoryRouter>
      </ScraperSettingsProvider>
    );
  };

  it('renders logo, title, navigation links in correct order, and UserProfileMenu when authenticated', () => {
    renderSidebarWithProvider();

    expect(screen.getByText('Chil')).toBeInTheDocument();
    const logoImg = screen.getByAltText('Chil Logo');
    expect(logoImg.closest('a')).toHaveAttribute('href', '/lotes');

    const nav = screen.getByRole('navigation', { name: /Navegación principal/i });
    const links = within(nav).getAllByRole('link');
    expect(links[0]).toHaveTextContent('Lotes');
    expect(links[1]).toHaveTextContent('Nuevo Lote');
    expect(links[2]).toHaveTextContent('Reconocimientos');
    expect(links[3]).toHaveTextContent('Resumen');
    expect(links[4]).toHaveTextContent('Estadísticas');

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

    renderSidebarWithProvider();

    expect(screen.getByText('Chil')).toBeInTheDocument();
    const logoImg = screen.getByAltText('Chil Logo');
    expect(logoImg.closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrarse/i })).toBeInTheDocument();
    expect(screen.queryByText('Nuevo Lote')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-profile-menu')).not.toBeInTheDocument();
  });

  it('toggles collapse state and saves in localStorage', () => {
    renderSidebarWithProvider();

    const collapseBtn = screen.getByRole('button', { name: /Colapsar barra lateral/i });
    expect(collapseBtn).toBeInTheDocument();

    fireEvent.click(collapseBtn);

    expect(localStorage.getItem('chil_sidebar_collapsed')).toBe('true');
    const expandBtn = screen.getByRole('button', { name: /Expandir barra lateral/i });
    expect(within(expandBtn).getByAltText('Chil Logo')).toBeInTheDocument();

    fireEvent.click(expandBtn);

    expect(localStorage.getItem('chil_sidebar_collapsed')).toBe('false');
    expect(screen.getByRole('button', { name: /Colapsar barra lateral/i })).toBeInTheDocument();
  });

  it('opens shared scraper settings modal and connects Impeesa session', async () => {
    vi.mocked(api.saveScraperSession).mockResolvedValue({
      connected: true,
      status: 'active',
      impeesaEmail: 'scout@test.com',
      updatedAt: '2026-11-12T10:00:00.000Z'
    });

    renderSidebarWithProvider();

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

  it('renders mobile drawer when isMobileOpen is true and handles onMobileClose', () => {
    const handleClose = vi.fn();

    render(
      <ScraperSettingsProvider>
        <MemoryRouter>
          <Sidebar isMobileOpen={true} onMobileClose={handleClose} />
        </MemoryRouter>
      </ScraperSettingsProvider>
    );

    expect(screen.getByRole('dialog', { name: /Menú lateral móvil/i })).toBeInTheDocument();
    const closeBtn = screen.getByRole('button', { name: /Cerrar menú/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByTestId('sidebar-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('highlights active links with Scout primary brown styling', () => {
    renderSidebarWithProvider(['/lotes']);

    const lotesLink = screen.getByRole('link', { name: /Lotes/i });
    expect(lotesLink).toHaveClass('bg-primary/10');
    expect(lotesLink).toHaveClass('text-primary');
  });

  it('highlights Nuevo Lote with active styling when path is /lotes/nuevo', () => {
    renderSidebarWithProvider(['/lotes/nuevo']);

    const nuevoLink = screen.getByRole('link', { name: /Nuevo Lote/i });
    expect(nuevoLink).toHaveClass('bg-primary/10');
    expect(nuevoLink).toHaveClass('text-primary');
  });
});
