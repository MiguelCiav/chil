import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SuccessPage } from '../SuccessPage';
import * as api from '../../api';
import * as recognitions from '../../../recognitions';

vi.mock('../../api', () => ({
  getBatchById: vi.fn(),
  getMembersByBatchId: vi.fn(),
  getHierarchyData: vi.fn(() => Promise.resolve({ regions: [], districts: [], groups: [] })),
  generateBatchReport: vi.fn(() => Promise.resolve('Reporte_Lote_555.pdf'))
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

  it('renders batch success metrics, members table, and downloads PDF report and member list', async () => {
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

    vi.mocked(recognitions.generateBatchCertificatesPdf).mockResolvedValueOnce('Reconocimientos_Lote_555_go_solar.pdf');
    vi.mocked(api.generateBatchReport).mockResolvedValueOnce('Reporte_Lote_555.pdf');

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

    // Verify all 4 action buttons exist
    const downloadRecBtn = screen.getByRole('button', { name: /Descargar Reconocimientos/i });
    const downloadListBtn = screen.getByRole('button', { name: /Descargar Lista/i });
    const newBatchLink = screen.getByRole('button', { name: /Crear nuevo lote/i });
    const backListLink = screen.getByRole('button', { name: /Volver a la lista/i });

    expect(downloadRecBtn).toBeInTheDocument();
    expect(downloadListBtn).toBeInTheDocument();
    expect(newBatchLink).toBeInTheDocument();
    expect(backListLink).toBeInTheDocument();

    // 1. Trigger certificates PDF download
    fireEvent.click(downloadRecBtn);

    await waitFor(() => {
      expect(recognitions.generateBatchCertificatesPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          batch: expect.objectContaining({ id: 555 }),
          members: expect.any(Array)
        })
      );
      expect(screen.getByText(/¡Reconocimientos descargados exitosamente en Reconocimientos_Lote_555_go_solar\.pdf!/i)).toBeInTheDocument();
    });

    // 2. Trigger members list PDF report download
    fireEvent.click(downloadListBtn);

    await waitFor(() => {
      expect(api.generateBatchReport).toHaveBeenCalledWith(
        expect.objectContaining({ id: 555 }),
        expect.any(Array),
        expect.any(Object)
      );
      expect(screen.getByText(/¡Lista de miembros \(PDF\) descargada exitosamente!/i)).toBeInTheDocument();
    });
  });

  it('handles PDF download error with alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

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
      expect(screen.getByText(/Descargar Reconocimientos/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Descargar Reconocimientos/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al generar los reconocimientos en PDF.');
    });

    alertSpy.mockRestore();
  });

  it('handles member list PDF download error with alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

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

    vi.mocked(api.generateBatchReport).mockRejectedValueOnce(new Error('Report generation error'));

    render(
      <MemoryRouter initialEntries={[{ pathname: '/lotes/exito', state: { batchId: 555 } }]}>
        <SuccessPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Descargar Lista/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Descargar Lista/i));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error al generar la lista de miembros en PDF.');
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
