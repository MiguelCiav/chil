import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { UserProfileMenu } from '../UserProfileMenu';
import * as authHook from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

describe('UserProfileMenu component', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when user is null', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      resetPassword: vi.fn()
    });

    const { container } = render(
      <MemoryRouter>
        <UserProfileMenu />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders initials avatar and display name for authenticated user', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: {
        uid: 'u-1',
        email: 'miguel@test.com',
        displayName: 'Miguel Ciavato',
        photoURL: null
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      resetPassword: vi.fn()
    });

    render(
      <MemoryRouter>
        <UserProfileMenu />
      </MemoryRouter>
    );

    expect(screen.getByText('MC')).toBeInTheDocument();
    expect(screen.getByText('Miguel Ciavato')).toBeInTheDocument();
  });

  it('opens dropdown, displays user details, and triggers logout', async () => {
    mockLogout.mockResolvedValueOnce(undefined);

    vi.mocked(authHook.useAuth).mockReturnValue({
      user: {
        uid: 'u-1',
        email: 'scout@test.com',
        displayName: 'Carlos Mendoza',
        photoURL: null
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      resetPassword: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/lotes']}>
        <Routes>
          <Route path="/lotes" element={<UserProfileMenu />} />
          <Route path="/login" element={<div>Logged Out Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Open dropdown
    const menuBtn = screen.getByLabelText('Menú de usuario');
    fireEvent.click(menuBtn);

    expect(screen.getByText('scout@test.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Cerrar Sesión/i })).toBeInTheDocument();

    // Click logout
    const logoutBtn = screen.getByRole('menuitem', { name: /Cerrar Sesión/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(screen.getByText('Logged Out Page')).toBeInTheDocument();
    });
  });

  it('closes dropdown when pressing Escape key', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: {
        uid: 'u-1',
        email: 'scout@test.com',
        displayName: 'Carlos Mendoza',
        photoURL: null
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      resetPassword: vi.fn()
    });

    render(
      <MemoryRouter>
        <UserProfileMenu />
      </MemoryRouter>
    );

    const menuBtn = screen.getByLabelText('Menú de usuario');
    fireEvent.click(menuBtn);
    expect(screen.getByText('scout@test.com')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('scout@test.com')).not.toBeInTheDocument();
  });
});
