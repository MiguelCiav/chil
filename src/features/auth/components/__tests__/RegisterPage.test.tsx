import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RegisterPage } from '../RegisterPage';
import * as authHook from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

describe('RegisterPage component', () => {
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

  it('renders register form with fields and links', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Crear una Cuenta' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre y Apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contraseña$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirmar Contraseña$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear Cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Inicia sesión aquí/i })).toBeInTheDocument();
  });

  it('validates required fields, password length, and password match', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Crear Cuenta' }));

    await waitFor(() => {
      expect(screen.getByText('El nombre completo debe tener al menos 2 caracteres')).toBeInTheDocument();
      expect(screen.getByText('El correo electrónico es requerido')).toBeInTheDocument();
      expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument();
    });

    // Short password (< 6 chars)
    fireEvent.change(screen.getByLabelText(/Nombre y Apellido/i), { target: { value: 'Carlos Mendoza' } });
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'carlos@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Contraseña$/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/^Confirmar Contraseña$/i), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Crear Cuenta' }));

    await waitFor(() => {
      expect(screen.getByText('La contraseña debe tener al menos 6 caracteres')).toBeInTheDocument();
    });

    // Mismatched passwords
    fireEvent.change(screen.getByLabelText(/^Contraseña$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/^Confirmar Contraseña$/i), { target: { value: 'differentpass' } });

    fireEvent.click(screen.getByRole('button', { name: 'Crear Cuenta' }));

    await waitFor(() => {
      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('toggles password and confirm password visibility', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^Contraseña$/i) as HTMLInputElement;
    const confirmInput = screen.getByLabelText(/^Confirmar Contraseña$/i) as HTMLInputElement;

    expect(passwordInput.type).toBe('password');
    expect(confirmInput.type).toBe('password');

    const togglePasswordBtn = screen.getByLabelText('Ver contraseña');
    fireEvent.click(togglePasswordBtn);
    expect(passwordInput.type).toBe('text');

    const toggleConfirmBtn = screen.getByLabelText('Ver confirmar contraseña');
    fireEvent.click(toggleConfirmBtn);
    expect(confirmInput.type).toBe('text');
  });

  it('submits valid registration data and navigates to /lotes', async () => {
    mockRegister.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={['/registro']}>
        <Routes>
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/lotes" element={<div>Lotes List Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Nombre y Apellido/i), { target: { value: 'Ana Scout' } });
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'ana@scouts.org.ve' } });
    fireEvent.change(screen.getByLabelText(/^Contraseña$/i), { target: { value: 'securePass123' } });
    fireEvent.change(screen.getByLabelText(/^Confirmar Contraseña$/i), { target: { value: 'securePass123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Crear Cuenta' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        full_name: 'Ana Scout',
        email: 'ana@scouts.org.ve',
        password: 'securePass123',
        confirm_password: 'securePass123'
      });
      expect(screen.getByText('Lotes List Page')).toBeInTheDocument();
    });
  });

  it('displays server error if registration fails', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Ya existe una cuenta registrada con este correo electrónico.'));

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Nombre y Apellido/i), { target: { value: 'Ana Scout' } });
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'ana@scouts.org.ve' } });
    fireEvent.change(screen.getByLabelText(/^Contraseña$/i), { target: { value: 'securePass123' } });
    fireEvent.change(screen.getByLabelText(/^Confirmar Contraseña$/i), { target: { value: 'securePass123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Crear Cuenta' }));

    await waitFor(() => {
      expect(screen.getByText('Ya existe una cuenta registrada con este correo electrónico.')).toBeInTheDocument();
    });
  });

  it('redirects to /lotes if user is already authenticated', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: {
        uid: 'u-reg',
        email: 'logged@scouts.org.ve',
        displayName: 'Logged User',
        photoURL: null
      },
      loading: false,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      resetPassword: mockResetPassword
    });

    render(
      <MemoryRouter initialEntries={['/registro']}>
        <Routes>
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/lotes" element={<div>Redirected to Lotes</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Redirected to Lotes')).toBeInTheDocument();
  });
});
