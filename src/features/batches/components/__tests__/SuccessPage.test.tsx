import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SuccessPage } from '../SuccessPage';
import * as api from '../../api';
import * as recognitions from '../../../recognitions';

vi.mock('../../api', () => ({
  getBatchById: vi.fn(),
  getMembersByBatchId: vi.fn(),
  getHierarchyData: vi.fn(() => Promise.resolve({ regions: [], districts: [], groups: [] }))
}));

vi.mock('../../../recognitions', () => ({
  generateBatchCertificatesPdf: vi.fn(),
  getRecognitionTypeById: vi.fn(() => Promise.resolve(null))
}));

describe('SuccessPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders not-found empty state when no batch info is available', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce(null);

    render(
      <MemoryRouter initialEntries={[{ pathname: '/lotes/exito', state: { batchId: 999 } }]}>
        <SuccessPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No se encontró información del lote')).toBeInTheDocument();
      expect(screen.getByText('Volver a la lista')).toBeInTheDocument();
    });
  });

  it('renders batch success metrics, members table, and downloads PDF report', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 555,
      comment: 'Lote Exitoso',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      recognition_type: 'Go Solar',
      created_at: '2026-08-21T12:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
      {
        identity: 'V-11111111',
        first_names: 'Ana',
        last_names: 'Perez',
        birth_date: '2005-01-01',
        member_type: 'young',
        status: 'active',
        batch_id: 555
      },
      {
        identity: 'V-22222222',
        first_names: 'Carlos',
        last_names: 'Gomez',
        birth_date: '1990-05-15',
        member_type: 'adult',
        status: 'pending',
        batch_id: 555
      }
    ]);

    vi.mocked(recognitions.generateBatchCertificatesPdf).mockResolvedValueOnce('Diplomas_Lote_555_go_solar.pdf');

    render(
      <MemoryRouter initialEntries={[{ pathname: '/lotes/exito', state: { batchId: 555, name: 'Lote San Luis' } }]}>
        <SuccessPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('¡Lote Generado Exitosamente!')).toBeInTheDocument();
    });

    expect(screen.getByText('#555')).toBeInTheDocument();
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();
    expect(screen.getByText('SCT-2026-1111')).toBeInTheDocument();
    expect(screen.getByText('SCT-PENDIENTE')).toBeInTheDocument();

    // Trigger PDF download
    const downloadBtn = screen.getByText(/Descargar PDF del Reporte/i);
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(recognitions.generateBatchCertificatesPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          batch: expect.objectContaining({ id: 555 }),
          members: expect.any(Array)
        })
      );
      expect(screen.getByText(/¡Diplomas descargados exitosamente en Diplomas_Lote_555_go_solar\.pdf!/i)).toBeInTheDocument();
    });
  });
});
