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
        recognition_code: 'REC-1111',
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

    expect(screen.getByText('CÉDULA')).toBeInTheDocument();
    expect(screen.getByText('NOMBRE COMPLETO')).toBeInTheDocument();
    expect(screen.getByText('TIPO')).toBeInTheDocument();
    expect(screen.getByText('ESTATUS')).toBeInTheDocument();
    expect(screen.getByText('CÓDIGO REC.')).toBeInTheDocument();
    expect(screen.getByText('ACCIONES')).toBeInTheDocument();

    expect(screen.getByText('#555')).toBeInTheDocument();
    expect(screen.getByText('V-11111111')).toBeInTheDocument();
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.getByText('V-22222222')).toBeInTheDocument();
    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();
    expect(screen.getByText('REC-1111')).toBeInTheDocument();
    expect(screen.getByText('Registro Válido')).toBeInTheDocument();
    expect(screen.getByText('Registro Inválido')).toBeInTheDocument();

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

  it('handles PDF download error with alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

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
      }
    ]);

    vi.mocked(recognitions.generateBatchCertificatesPdf).mockRejectedValueOnce(new Error('PDF generation error'));

    render(
      <MemoryRouter initialEntries={[{ pathname: '/lotes/exito', state: { batchId: 555 } }]}>
        <SuccessPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Descargar PDF del Reporte/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Descargar PDF del Reporte/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al generar los diplomas en PDF.');
    });

    alertSpy.mockRestore();
  });

  it('falls back to loading last batch from localStorage when batchId is omitted from state', async () => {
    const mockStorageBatch = {
      id: 777,
      comment: 'Lote Guardado en LocalStorage',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      created_at: '2026-08-20T00:00:00.000Z'
    };

    localStorage.setItem('chil_batches', JSON.stringify([mockStorageBatch]));

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
      {
        identity: 'V-77777777',
        first_names: 'Luis',
        last_names: 'Rojas',
        birth_date: '2004-01-01',
        member_type: 'young',
        status: 'active',
        batch_id: 777
      }
    ]);

    render(
      <MemoryRouter initialEntries={['/lotes/exito']}>
        <SuccessPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('¡Lote Generado Exitosamente!')).toBeInTheDocument();
      expect(screen.getByText('#777')).toBeInTheDocument();
      expect(screen.getByText('Luis Rojas')).toBeInTheDocument();
    });

    localStorage.clear();
  });

  it('renders pending members alert and enables clicking Ver detalles and preview eye button', async () => {
    vi.mocked(api.getBatchById).mockResolvedValueOnce({
      id: 888,
      comment: 'Lote con Pendientes',
      region_id: 1,
      district_id: 10,
      group_id: 100,
      created_at: '2026-08-20T00:00:00.000Z'
    });

    vi.mocked(api.getMembersByBatchId).mockResolvedValueOnce([
      {
        identity: 'V-88888888',
        first_names: 'Pedro',
        last_names: 'Navas',
        birth_date: '2001-01-01',
        member_type: 'adult',
        status: 'pending',
        batch_id: 888
      }
    ]);

    render(
      <MemoryRouter initialEntries={[{ pathname: '/lotes/exito', state: { batchId: 888 } }]}>
        <SuccessPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pedro Navas')).toBeInTheDocument();
    });

    expect(screen.getByText(/Hay registros no válidos o pendientes/i)).toBeInTheDocument();

    const verDetallesBtn = screen.getByRole('button', { name: /Ver detalles/i });
    expect(verDetallesBtn).toBeInTheDocument();
    fireEvent.click(verDetallesBtn);

    const eyeBtn = screen.getByTitle(/Vista previa/i);
    expect(eyeBtn).toBeInTheDocument();
    fireEvent.click(eyeBtn);
  });
});
