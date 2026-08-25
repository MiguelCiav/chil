import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import * as authHook from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

const LoginPageMock = () => {
  const location = useLocation();
  const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname || 'unknown';
  return <div data-testid="login-page">Login Page. Redirected from: {fromPath}</div>;
};

describe('ProtectedRoute component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner while checking authentication', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Secret Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Verificando sesión...')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('redirects to /login and preserves previous location when unauthenticated', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/protected/resource']}>
        <Routes>
          <Route
            path="/protected/resource"
            element={
              <ProtectedRoute>
                <div>Secret Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPageMock />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toHaveTextContent('Redirected from: /protected/resource');
  });

  it('renders children when authenticated', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: {
        uid: 'user-789',
        email: 'authed@scouts.org.ve',
        displayName: 'Authed Scout',
        photoURL: null
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Secret Authenticated Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Secret Authenticated Content')).toBeInTheDocument();
  });
});
