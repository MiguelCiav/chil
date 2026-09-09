import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MainLayout } from '../MainLayout';
import * as authFeature from '../../features/auth';

vi.mock('../../components/Sidebar', () => ({
  Sidebar: ({ isMobileOpen, onMobileClose }: { isMobileOpen?: boolean; onMobileClose?: () => void }) => (
    <div data-testid="mock-sidebar">
      <span>Mock Sidebar</span>
      {isMobileOpen && (
        <button data-testid="close-mobile-sidebar" onClick={onMobileClose}>
          Close Mobile
        </button>
      )}
    </div>
  )
}));

vi.mock('../../features/auth', () => ({
  useAuth: vi.fn()
}));

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authFeature.useAuth).mockReturnValue({
      user: {
        uid: 'test-uid',
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

  it('does NOT render Sidebar or mobile header on root landing page route "/"', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <MainLayout>
          <div>Landing Content</div>
        </MainLayout>
      </MemoryRouter>
    );

    expect(screen.getByText('Landing Content')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-sidebar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Abrir menú/i })).not.toBeInTheDocument();
  });

  it('does NOT render Sidebar or mobile header on "/inicio" landing route', () => {
    render(
      <MemoryRouter initialEntries={['/inicio']}>
        <MainLayout>
          <div>Inicio Content</div>
        </MainLayout>
      </MemoryRouter>
    );

    expect(screen.getByText('Inicio Content')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-sidebar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Abrir menú/i })).not.toBeInTheDocument();
  });

  it('renders Sidebar and mobile header on internal application routes like "/lotes"', () => {
    render(
      <MemoryRouter initialEntries={['/lotes']}>
        <MainLayout>
          <div>Batches Content</div>
        </MainLayout>
      </MemoryRouter>
    );

    expect(screen.getByText('Batches Content')).toBeInTheDocument();
    expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir menú/i })).toBeInTheDocument();
  });

  it('opens and closes mobile sidebar when hamburger button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/lotes']}>
        <MainLayout>
          <div>Batches Content</div>
        </MainLayout>
      </MemoryRouter>
    );

    const openBtn = screen.getByRole('button', { name: /Abrir menú/i });
    fireEvent.click(openBtn);

    expect(screen.getByTestId('close-mobile-sidebar')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('close-mobile-sidebar'));
    expect(screen.queryByTestId('close-mobile-sidebar')).not.toBeInTheDocument();
  });
});
