import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MainLayout } from '../MainLayout';

vi.mock('../../components/Navbar', () => ({
  Navbar: () => <div data-testid="mock-navbar">Mock Navbar</div>
}));

describe('MainLayout', () => {
  it('does NOT render Navbar on root landing page route "/"', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <MainLayout>
          <div>Landing Content</div>
        </MainLayout>
      </MemoryRouter>
    );

    expect(screen.getByText('Landing Content')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-navbar')).not.toBeInTheDocument();
  });

  it('does NOT render Navbar on "/inicio" landing route', () => {
    render(
      <MemoryRouter initialEntries={['/inicio']}>
        <MainLayout>
          <div>Inicio Content</div>
        </MainLayout>
      </MemoryRouter>
    );

    expect(screen.getByText('Inicio Content')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-navbar')).not.toBeInTheDocument();
  });

  it('renders Navbar on internal application routes like "/lotes"', () => {
    render(
      <MemoryRouter initialEntries={['/lotes']}>
        <MainLayout>
          <div>Batches Content</div>
        </MainLayout>
      </MemoryRouter>
    );

    expect(screen.getByText('Batches Content')).toBeInTheDocument();
    expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
  });
});
