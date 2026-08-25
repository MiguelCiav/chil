import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import * as authHook from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

describe('LoginPage component', () => {
  const mockLogin = vi.fn();
  const mockRegister = vi.fn();
  const mockLogout = vi.fn();
  const mockResetPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      resetPassword: mockResetPassword
    });
  });

  it('renders login form with branding, inputs, and links', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contraseña$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Regístrate aquí/i })).toBeInTheDocument();
  });

  it('validates required fields and email format', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    await waitFor(() => {
      expect(screen.getByText('El correo electrónico es requerido')).toBeInTheDocument();
      expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();

    // Invalid email format
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
      target: { value: 'invalid-email' }
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
      target: { value: '123456' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    await waitFor(() => {
      expect(screen.getByText('Ingrese un correo electrónico válido')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^Contraseña$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByLabelText(/Ver contraseña/i);
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    const hideBtn = screen.getByLabelText(/Ocultar contraseña/i);
    fireEvent.click(hideBtn);
    expect(passwordInput.type).toBe('password');
  });

  it('submits valid credentials and calls login', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lotes" element={<div>Lotes Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
      target: { value: 'scout@test.com' }
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
      target: { value: 'secret123' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'scout@test.com',
        password: 'secret123'
      });
      expect(screen.getByText('Lotes Page')).toBeInTheDocument();
    });
  });

  it('displays server error message if login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Correo electrónico o contraseña incorrectos.'));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
      target: { value: 'scout@test.com' }
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
      target: { value: 'wrongpass' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    await waitFor(() => {
      expect(
        screen.getByText('Correo electrónico o contraseña incorrectos.')
      ).toBeInTheDocument();
    });
  });

  it('opens and closes forgot password modal', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const forgotBtn = screen.getByText('¿Olvidaste tu contraseña?');
    fireEvent.click(forgotBtn);

    expect(screen.getByText('Recuperar Contraseña')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Recuperar Contraseña')).not.toBeInTheDocument();
    });
  });

  it('redirects to /lotes if user is already authenticated', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: {
        uid: 'u-1',
        email: 'already@logged.in',
        displayName: 'Scout Logged',
        photoURL: null
      },
      loading: false,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      resetPassword: mockResetPassword
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lotes" element={<div>Authenticated Redirect</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Authenticated Redirect')).toBeInTheDocument();
  });
});
