import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQuickRecognition, executeQuickEmission } from '../useQuickRecognition';
import * as batchesApi from '../../api';
import * as recognitionsApi from '../../../recognitions';
import * as authFeature from '../../../auth';

vi.mock('../../api', () => ({
  getHierarchyData: vi.fn(),
  createBatch: vi.fn(),
  createMember: vi.fn(),
  getMemberStatus: vi.fn(),
  RECOGNITION_TYPES: [{ id: 'sct-wood-badge', name: 'Insignia de Madera' }]
}));

vi.mock('../../../recognitions', () => ({
  getAllRecognitionTypes: vi.fn(),
  downloadSingleCertificatePdf: vi.fn()
}));

vi.mock('../../../auth', () => ({
  useAuth: vi.fn()
}));

describe('useQuickRecognition hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authFeature.useAuth).mockReturnValue({
      user: {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn()
    });

    vi.mocked(batchesApi.getHierarchyData).mockResolvedValue({
      regions: [{ id: 1, name: 'Región Capital' }],
      districts: [{ id: 10, name: 'Distrito 10', region_id: 1 }],
      groups: [{ id: 100, name: 'Grupo 100', district_id: 10 }]
    });

    vi.mocked(recognitionsApi.getAllRecognitionTypes).mockResolvedValue([
      { id: 'sct-wood-badge', name: 'Insignia de Madera', created_at: '2026-01-01' }
    ]);
  });

  it('initializes with default values including memberType young', () => {
    const { result } = renderHook(() => useQuickRecognition());

    expect(result.current.unit).toBe('manada');
    expect(result.current.memberType).toBe('young');
    expect(result.current.identity).toBe('');
  });

  it('updates memberType when unit changes', () => {
    const { result } = renderHook(() => useQuickRecognition());

    act(() => {
      result.current.handleUnitChange('institucional');
    });
    expect(result.current.unit).toBe('institucional');
    expect(result.current.memberType).toBe('adult');

    act(() => {
      result.current.handleUnitChange('no_scout');
    });
    expect(result.current.unit).toBe('no_scout');
    expect(result.current.memberType).toBe('adult');

    act(() => {
      result.current.handleUnitChange('tropa');
    });
    expect(result.current.unit).toBe('tropa');
    expect(result.current.memberType).toBe('young');
  });

  it('allows manual update of memberType', () => {
    const { result } = renderHook(() => useQuickRecognition());

    act(() => {
      result.current.handleMemberTypeChange('adult');
    });
    expect(result.current.memberType).toBe('adult');

    act(() => {
      result.current.handleMemberTypeChange('young');
    });
    expect(result.current.memberType).toBe('young');
  });

  it('sanitizes identity input', () => {
    const { result } = renderHook(() => useQuickRecognition());

    act(() => {
      result.current.handleIdentityChange('V-12.345.678 abc!');
    });
    expect(result.current.identity).toBe('V-12345678');
  });

  it('auto-detects memberType on handleConsult based on age', async () => {
    vi.mocked(batchesApi.getMemberStatus).mockResolvedValueOnce({
      nombre_completo: 'Pedro Pérez',
      status: 'Activo',
      fecha_nacimiento: '1990-01-01',
      correo_electronico: 'p@test.com',
      telefono: '1234'
    });

    const { result } = renderHook(() => useQuickRecognition());

    act(() => {
      result.current.handleIdentityChange('V-12345678');
    });

    await act(async () => {
      await result.current.handleConsult();
    });

    expect(result.current.memberType).toBe('adult');
    expect(result.current.firstNames).toBe('Pedro');
    expect(result.current.lastNames).toBe('Pérez');
  });

  it('executes quick emission for No Scout without undefined errors and with correct memberType', async () => {
    vi.mocked(batchesApi.createBatch).mockResolvedValueOnce({
      id: 999,
      comment: '',
      region_id: 0,
      district_id: 0,
      group_id: 0,
      unit_scope: 'no_scout',
      recognition_type: 'sct-wood-badge',
      created_at: '2026-01-01'
    });

    vi.mocked(batchesApi.createMember).mockResolvedValueOnce({
      identity: 'V-11223344',
      first_names: 'Juan',
      last_names: 'Silva',
      birth_date: '2000-01-01',
      member_type: 'adult',
      unit: 'no_scout',
      status: 'active',
      batch_id: 999
    });

    vi.mocked(recognitionsApi.downloadSingleCertificatePdf).mockResolvedValueOnce('Cert.pdf');

    const emissionResult = await executeQuickEmission({
      comment: '',
      regionId: '',
      districtId: '',
      groupId: '',
      unit: 'no_scout',
      memberType: 'adult',
      recognitionType: 'sct-wood-badge',
      identity: 'V-11223344',
      firstNames: 'Juan',
      lastNames: 'Silva',
      birthDate: '',
      email: '',
      phone: '',
      recognitionCode: 'REC-123456',
      userId: 'user-123',
      availableRecognitionTypes: [{ id: 'sct-wood-badge', name: 'Insignia de Madera' }],
      regions: [],
      districts: [],
      groups: []
    });

    expect(emissionResult.batch.id).toBe(999);
    expect(emissionResult.member.member_type).toBe('adult');
    expect(batchesApi.createBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        region_id: 0,
        district_id: 0,
        group_id: 0,
        unit_scope: 'no_scout'
      }),
      'user-123'
    );
    expect(batchesApi.createMember).toHaveBeenCalledWith(
      expect.objectContaining({
        member_type: 'adult',
        unit: 'no_scout',
        verified_in_registry: false
      }),
      'user-123'
    );
  });
});
