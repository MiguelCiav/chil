import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPasswordModal } from '../ForgotPasswordModal';
import * as authHook from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

describe('ForgotPasswordModal component', () => {
  const mockResetPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: mockResetPassword
    });
  });

  it('does not render when isOpen is false', () => {
    render(<ForgotPasswordModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Recuperar Contraseña')).not.toBeInTheDocument();
  });

  it('renders modal with email field and buttons when isOpen is true', () => {
    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} defaultEmail="test@scouts.org.ve" />);
    expect(screen.getByText('Recuperar Contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo Electrónico/i)).toHaveValue('test@scouts.org.ve');
  });

  it('validates email on submit', async () => {
    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} defaultEmail="" />);

    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'notanemail' } });
    const submitBtn = screen.getByRole('button', { name: /Enviar Instrucciones/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Ingrese un correo electrónico válido')).toBeInTheDocument();
    });
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('submits successfully and displays confirmation', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined);

    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} defaultEmail="scout@test.com" />);

    fireEvent.click(screen.getByRole('button', { name: /Enviar Instrucciones/i }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('scout@test.com');
      expect(screen.getByText('¡Correo de recuperación enviado!')).toBeInTheDocument();
    });
  });

  it('displays error if resetPassword fails', async () => {
    mockResetPassword.mockRejectedValueOnce(new Error('No existe una cuenta con este correo electrónico.'));

    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} defaultEmail="unknown@test.com" />);

    fireEvent.click(screen.getByRole('button', { name: /Enviar Instrucciones/i }));

    await waitFor(() => {
      expect(screen.getByText('No existe una cuenta con este correo electrónico.')).toBeInTheDocument();
    });
  });
});
