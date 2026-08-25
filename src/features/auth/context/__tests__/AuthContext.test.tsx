import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../AuthContext';
import { useAuth } from '../../hooks/useAuth';
import { AuthUser } from '../../types';
import * as authApi from '../../api';

vi.mock('../../api', () => ({
  loginWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  logoutUser: vi.fn(),
  resetPasswordEmail: vi.fn(),
  onAuthStateChangedListener: vi.fn()
}));

const TestConsumerComponent = () => {
  const { user, loading, login, register, logout, resetPassword } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user ? user.email : 'none'}</div>
      <button
        onClick={() =>
          login({ email: 'user@test.com', password: 'password123' })
        }
      >
        Login Action
      </button>
      <button
        onClick={() =>
          register({
            full_name: 'Scout Admin',
            email: 'admin@test.com',
            password: 'pass',
            confirm_password: 'pass'
          })
        }
      >
        Register Action
      </button>
      <button onClick={() => logout()}>Logout Action</button>
      <button onClick={() => resetPassword('reset@test.com')}>
        Reset Action
      </button>
    </div>
  );
};

describe('AuthContext and AuthProvider', () => {
  let authCallback: ((user: AuthUser | null) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.onAuthStateChangedListener).mockImplementation((cb) => {
      authCallback = cb;
      return vi.fn();
    });
  });

  it('throws error when useAuth is consumed outside of AuthProvider', () => {
    // Suppress console.error in test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumerComponent />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    consoleError.mockRestore();
  });

  it('initializes with loading true then updates when auth state changes', () => {
    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );

    // Initial state before listener fires
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    // Simulate listener firing with user
    act(() => {
      if (authCallback) {
        authCallback({
          uid: 'u-99',
          email: 'scout@test.com',
          displayName: 'Scout User',
          photoURL: null
        });
      }
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('scout@test.com');
  });

  it('handles login, register, logout, and resetPassword actions', async () => {
    vi.mocked(authApi.loginWithEmail).mockResolvedValueOnce({
      uid: 'u-1',
      email: 'user@test.com',
      displayName: 'User 1',
      photoURL: null
    });
    vi.mocked(authApi.registerWithEmail).mockResolvedValueOnce({
      uid: 'u-2',
      email: 'admin@test.com',
      displayName: 'Scout Admin',
      photoURL: null
    });
    vi.mocked(authApi.logoutUser).mockResolvedValueOnce();
    vi.mocked(authApi.resetPasswordEmail).mockResolvedValueOnce();

    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );

    // Login action
    await act(async () => {
      screen.getByText('Login Action').click();
    });
    expect(authApi.loginWithEmail).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'password123'
    });
    expect(screen.getByTestId('user')).toHaveTextContent('user@test.com');

    // Register action
    await act(async () => {
      screen.getByText('Register Action').click();
    });
    expect(authApi.registerWithEmail).toHaveBeenCalled();
    expect(screen.getByTestId('user')).toHaveTextContent('admin@test.com');

    // Logout action
    await act(async () => {
      screen.getByText('Logout Action').click();
    });
    expect(authApi.logoutUser).toHaveBeenCalled();
    expect(screen.getByTestId('user')).toHaveTextContent('none');

    // Reset action
    await act(async () => {
      screen.getByText('Reset Action').click();
    });
    expect(authApi.resetPasswordEmail).toHaveBeenCalledWith('reset@test.com');
  });
});
