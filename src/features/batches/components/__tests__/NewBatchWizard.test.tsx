import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewBatchWizard } from '../NewBatchWizard';
import * as batchesApi from '../../api';
import * as recognitionsApi from '../../../recognitions';
import { useScraperSettings } from '../../../../context/ScraperSettingsContext';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock('../../../auth', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'coord-uid', email: 'coord@scouts.org.ve' }
  }))
}));

vi.mock('../../../../context/ScraperSettingsContext', () => ({
  useScraperSettings: vi.fn()
}));

vi.mock('../../../../components/walkthrough', () => ({
  useWalkthrough: vi.fn(() => ({
    isOpen: false,
    currentStep: null,
    currentStepIndex: 0,
    totalSteps: 0,
    targetRect: null,
    startTour: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    skipTour: vi.fn()
  })),
  WalkthroughOverlay: () => null,
  WalkthroughHelpButton: () => null
}));

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return {
    ...actual,
    getHierarchyData: vi.fn(),
    createBatch: vi.fn(),
    createBatchWithMembers: vi.fn(),
    createMember: vi.fn(),
    getMemberStatus: vi.fn(),
    getScraperSessionStatus: vi.fn(),
    getMembersByBatchId: vi.fn()
  };
});

vi.mock('../../../recognitions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../recognitions')>();
  return {
    ...actual,
    getAllRecognitionTypes: vi.fn()
  };
});

describe('NewBatchWizard (Deferred Emission, Probe-First Pool & Delta Scraping)', () => {
  const mockSetSessionStatus = vi.fn();
  const mockRefreshSessionStatus = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(batchesApi.getHierarchyData).mockResolvedValue({
      regions: [{ id: 0, name: 'No aplica' }, { id: 1, name: 'DISTRITO CAPITAL' }],
      districts: [{ id: 0, name: 'No aplica', region_id: 0 }, { id: 10, name: 'AVILA', region_id: 1 }],
      groups: [{ id: 0, name: 'No aplica', district_id: 0 }, { id: 100, name: 'DON BOSCO 21', district_id: 10 }]
    });
    vi.mocked(recognitionsApi.getAllRecognitionTypes).mockResolvedValue([
      { id: 'sct-wood-badge', name: 'Insignia de Madera', created_at: '2026-01-01T00:00:00.000Z' }
    ]);
    vi.mocked(useScraperSettings).mockReturnValue({
      isOpen: false,
      sessionStatus: {
        connected: true,
        status: 'active',
        impeesaEmail: 'coord@scouts.org.ve',
        updatedAt: '2026-11-22T10:00:00.000Z'
      },
      isLoadingStatus: false,
      openModal: vi.fn(),
      closeModal: vi.fn(),
      refreshSessionStatus: mockRefreshSessionStatus,
      setSessionStatus: mockSetSessionStatus
    });
  });

  const fillStep1AndSubmit = async (cedulas: string) => {
    await waitFor(() => {
      expect(screen.getByLabelText(/Tipo de Reconocimiento/i)).not.toBeDisabled();
    });
    fireEvent.change(screen.getByLabelText(/Tipo de Reconocimiento/i), {
      target: { value: 'sct-wood-badge' }
    });
    fireEvent.change(screen.getByLabelText(/Cédulas de Identidad/i), {
      target: { value: cedulas }
    });
    fireEvent.click(screen.getByRole('button', { name: /Cargar y Verificar Miembros/i }));
  };

  it('defers all Firestore writes to Step 2 Emitir Lote and scrapes only delta cedulas on back-navigation', async () => {
    vi.mocked(batchesApi.getMemberStatus).mockImplementation(async (cedula: string) => ({
      nombre_completo: `Scout ${cedula}`,
      status: 'Activo',
      telefono: '04141234567',
      correo_electronico: `scout${cedula}@scouts.org.ve`,
      fecha_nacimiento: '2005-01-01',
      region: 'DISTRITO CAPITAL',
      distrito: 'AVILA',
      grupo: 'DON BOSCO 21'
    }));

    vi.mocked(batchesApi.createBatchWithMembers).mockResolvedValueOnce({
      batch: {
        id: 777111222,
        comment: '',
        region_id: 0,
        district_id: 0,
        group_id: 0,
        recognition_type: 'sct-wood-badge',
        created_at: '2026-11-22T12:00:00.000Z'
      },
      members: []
    });

    render(
      <MemoryRouter>
        <NewBatchWizard />
      </MemoryRouter>
    );

    await fillStep1AndSubmit('11111111\n22222222');

    await waitFor(() => {
      expect(screen.getByText('Revisión y Confirmación del Lote')).toBeInTheDocument();
    });

    // Zero Firestore writes and zero getScraperSessionStatus / getMembersByBatchId calls in Step 1
    expect(batchesApi.getScraperSessionStatus).not.toHaveBeenCalled();
    expect(batchesApi.createBatch).not.toHaveBeenCalled();
    expect(batchesApi.createMember).not.toHaveBeenCalled();
    expect(batchesApi.getMembersByBatchId).not.toHaveBeenCalled();
    expect(batchesApi.createBatchWithMembers).not.toHaveBeenCalled();
    expect(batchesApi.getMemberStatus).toHaveBeenCalledTimes(2);

    // Go back to Step 1 and append 1 new cedula -> only the delta cedula is scraped
    fireEvent.click(screen.getByRole('button', { name: /Atrás \(Modificar Cédulas\)/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Cédulas de Identidad/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Cédulas de Identidad/i), {
      target: { value: '11111111\n22222222\n33333333' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Cargar y Verificar Miembros/i }));

    await waitFor(() => {
      expect(screen.getByText('Revisión y Confirmación del Lote')).toBeInTheDocument();
    });
    expect(batchesApi.getMemberStatus).toHaveBeenCalledTimes(3);
    expect(batchesApi.getMemberStatus).toHaveBeenLastCalledWith('33333333');

    // Emitir Lote commits batch + 3 members atomically and navigates to /lotes/:id
    fireEvent.click(screen.getByRole('button', { name: /Emitir Lote/i }));

    await waitFor(() => {
      expect(batchesApi.createBatchWithMembers).toHaveBeenCalledTimes(1);
      const [, membersArg] = vi.mocked(batchesApi.createBatchWithMembers).mock.calls[0];
      expect(membersArg).toHaveLength(3);
      expect(mockNavigate).toHaveBeenCalledWith('/lotes/777111222');
    });
  });

  it('aborts immediately on first probe ScraperSessionError without scraping remaining cedulas', async () => {
    const expiredErr = new batchesApi.ScraperSessionError(
      'SCRAPER_SESSION_EXPIRED',
      'Tu sesión de Impeesa expiró.'
    );
    vi.mocked(batchesApi.getMemberStatus).mockRejectedValueOnce(expiredErr);

    render(
      <MemoryRouter>
        <NewBatchWizard />
      </MemoryRouter>
    );

    await fillStep1AndSubmit('11111111\n22222222\n33333333\n44444444');

    await waitFor(() => {
      expect(mockSetSessionStatus).toHaveBeenCalled();
    });

    // Only the 1st probe request was sent
    expect(batchesApi.getMemberStatus).toHaveBeenCalledTimes(1);
    expect(batchesApi.getMemberStatus).toHaveBeenCalledWith('11111111');
    expect(mockRefreshSessionStatus).not.toHaveBeenCalled();
    expect(screen.queryByText('Revisión y Confirmación del Lote')).not.toBeInTheDocument();
  });

  it('halts remaining queued cedulas when a mid-batch worker catches ScraperSessionError', async () => {
    const expiredErr = new batchesApi.ScraperSessionError(
      'SCRAPER_SESSION_EXPIRED',
      'Tu sesión de Impeesa expiró.'
    );
    vi.mocked(batchesApi.getMemberStatus)
      .mockResolvedValueOnce({
        nombre_completo: 'Scout Uno',
        status: 'Activo',
        telefono: '04141234567',
        correo_electronico: 'scout1@scouts.org.ve',
        fecha_nacimiento: '2005-01-01',
        region: 'DISTRITO CAPITAL',
        distrito: 'AVILA',
        grupo: 'DON BOSCO 21'
      })
      .mockRejectedValue(expiredErr);

    render(
      <MemoryRouter>
        <NewBatchWizard />
      </MemoryRouter>
    );

    const tenCedulas = Array.from({ length: 10 }, (_, i) => `1000000${i}`).join('\n');
    await fillStep1AndSubmit(tenCedulas);

    await waitFor(() => {
      expect(mockSetSessionStatus).toHaveBeenCalled();
    });

    // Probe (1) + at most 4 in-flight workers (< 10 total cedulas)
    expect(vi.mocked(batchesApi.getMemberStatus).mock.calls.length).toBeLessThan(10);
    expect(screen.queryByText('Revisión y Confirmación del Lote')).not.toBeInTheDocument();
  });
});
