import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../Navbar';
import * as api from '../../features/batches/api';

vi.mock('../../features/batches/api', () => ({
  hasScraperCredentials: vi.fn(),
  saveScraperCredentials: vi.fn()
}));

describe('Navbar component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders logo, brand name, and navigation links', () => {
    vi.mocked(api.hasScraperCredentials).mockResolvedValue(false);

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByText('Chil')).toBeInTheDocument();
    expect(screen.getByText('Nuevo lote')).toBeInTheDocument();
  });

  it('opens scraper settings modal, enters credentials and saves', async () => {
    vi.mocked(api.hasScraperCredentials).mockResolvedValue(false);
    vi.mocked(api.saveScraperCredentials).mockResolvedValue();

    render(
      <MemoryRouter>
        <Navbar />
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
});
