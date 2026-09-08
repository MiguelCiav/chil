import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getHierarchyData,
  createBatch,
  updateBatch,
  deleteBatch,
  getAllBatches,
  getBatchById,
  createMember,
  updateMember,
  deleteMember,
  getMembersByBatchId,
  getAllMembers,
  saveScraperCredentials,
  hasScraperCredentials,
  loginScraper,
  getMemberStatus,
  getRecognitionBadgeStyle,
  getRecognitionName,
  exportMembersToCSV,
  generateRecognitionCode,
  assignBatchRecognitionCodes,
  mergeBatches
} from '../index';
import * as firestore from 'firebase/firestore';
import * as functionsSdk from 'firebase/functions';

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: storageMock,
  writable: true
});

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn((_db, name) => ({ id: name })),
    doc: vi.fn((_db, coll, id) => ({ id, path: `${coll}/${id}` })),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      commit: vi.fn()
    })),
    deleteDoc: vi.fn()
  };
});

vi.mock('firebase/functions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/functions')>();
  return {
    ...actual,
    getFunctions: vi.fn(() => ({})),
    httpsCallable: vi.fn()
  };
});

vi.mock('../../../../lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-user-uid' } },
  db: {},
  functions: {}
}));

describe('Batches API Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  describe('getHierarchyData', () => {
    it('returns sorted regions, districts, and groups from Firestore when present', async () => {
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce({
          docs: [
            { data: () => ({ id: 2, name: 'Región Central' }) },
            { data: () => ({ id: 1, name: 'Región Capital' }) }
          ]
        } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>)
        .mockResolvedValueOnce({
          docs: [
            { data: () => ({ id: 20, name: 'Distrito Valencia', region_id: 2 }) },
            { data: () => ({ id: 10, name: 'Distrito Sucre', region_id: 1 }) }
          ]
        } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>)
        .mockResolvedValueOnce({
          docs: [
            { data: () => ({ id: 200, name: 'Grupo Cabriales', district_id: 20 }) },
            { data: () => ({ id: 100, name: 'Grupo San Luis', district_id: 10 }) }
          ]
        } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const data = await getHierarchyData();
      expect(data.regions[0].id).toBe(0);
      expect(data.regions[0].name).toBe('No aplica');
      expect(data.regions[1].id).toBe(1);
      expect(data.districts[0].id).toBe(0);
      expect(data.districts[0].name).toBe('No aplica');
      expect(data.districts[1].id).toBe(10);
      expect(data.groups[0].id).toBe(0);
      expect(data.groups[0].name).toBe('No aplica');
      expect(data.groups[1].id).toBe(100);
    });

    it('seeds Firestore collections when empty and returns fallback seeded data', async () => {
      const commitMock = vi.fn();
      const setMock = vi.fn();
      vi.mocked(firestore.writeBatch).mockReturnValue({
        set: setMock,
        commit: commitMock
      } as unknown as ReturnType<typeof firestore.writeBatch>);

      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce({ docs: [] } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>)
        .mockResolvedValueOnce({ docs: [] } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>)
        .mockResolvedValueOnce({ docs: [] } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const data = await getHierarchyData();
      expect(commitMock).toHaveBeenCalled();
      expect(data.regions.length).toBeGreaterThan(0);
    });

    it('falls back to local JSON on Firestore query error', async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error('Firestore permission denied'));

      const data = await getHierarchyData();
      expect(data.regions.length).toBeGreaterThan(0);
    });
  });

  describe('Batch CRUD operations', () => {
    it('creates a new batch with secure numeric ID and recognition type', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValueOnce();

      const newBatch = await createBatch({
        comment: 'Nuevo lote',
        region_id: 1,
        district_id: 10,
        group_id: 100,
        recognition_type: 'sct-wood-badge',
        recognition_duration: '3 años'
      });

      expect(newBatch.comment).toBe('Nuevo lote');
      expect(newBatch.id).toBeGreaterThan(0);
      expect(newBatch.recognition_type).toBe('sct-wood-badge');
      expect(newBatch.recognition_duration).toBe('3 años');
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('safely handles missing or NaN hierarchy IDs when creating batch', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValueOnce();

      const newBatch = await createBatch({
        region_id: NaN,
        district_id: NaN,
        group_id: NaN,
        recognition_type: 'sct-wood-badge'
      });

      expect(newBatch.region_id).toBe(0);
      expect(newBatch.district_id).toBe(0);
      expect(newBatch.group_id).toBe(0);
      const writtenObject = vi.mocked(firestore.setDoc).mock.calls[0][1] as Record<string, unknown>;
      expect(Number.isNaN(writtenObject.region_id)).toBe(false);
      expect(writtenObject.region_id).toBe(0);
    });

    it('updates an existing batch preserving created_at date', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ created_at: '2026-01-01T00:00:00.000Z' })
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

      const updated = await updateBatch(1234, {
        comment: 'Lote modificado',
        region_id: 1,
        district_id: 10,
        group_id: 100,
        recognition_type: 'sct-wood-badge'
      });

      expect(updated.created_at).toBe('2026-01-01T00:00:00.000Z');
      expect(updated.comment).toBe('Lote modificado');
    });

    it('updates an uncreated batch setting fresh created_at date', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => false,
        data: () => null
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

      const updated = await updateBatch(5678, {
        region_id: 1,
        district_id: 10,
        group_id: 100,
        recognition_type: 'sct-promesa'
      });

      expect(updated.created_at).toBeDefined();
    });

    it('retrieves all batches sorted by creation date descending', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        forEach: (cb: (doc: { data: () => unknown }) => void) => {
          const batches = [
            { id: 1, created_at: '2026-01-01T00:00:00.000Z' },
            { id: 2, created_at: '2026-02-01T00:00:00.000Z' }
          ];
          batches.forEach(b => cb({ data: () => b }));
        }
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const all = await getAllBatches();
      expect(all[0].id).toBe(2);
      expect(all[1].id).toBe(1);
    });

    it('retrieves single batch by id', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ id: 999, comment: 'Encontrado' })
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

      const b = await getBatchById(999);
      expect(b?.id).toBe(999);
    });
    it('deletes batch and all its associated scout members atomically', async () => {
      const deleteMock = vi.fn();
      const commitMock = vi.fn();
      vi.mocked(firestore.writeBatch).mockReturnValueOnce({
        delete: deleteMock,
        commit: commitMock
      } as unknown as ReturnType<typeof firestore.writeBatch>);

      const mockMemberDocRef = { id: 'V-111' };
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        forEach: (cb: (doc: { ref: typeof mockMemberDocRef }) => void) => {
          cb({ ref: mockMemberDocRef });
        }
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      await deleteBatch(101);

      expect(deleteMock).toHaveBeenCalledWith(mockMemberDocRef);
      expect(deleteMock).toHaveBeenCalledWith(expect.objectContaining({ path: 'batches/101' }));
      expect(commitMock).toHaveBeenCalled();
    });
  });

  describe('mergeBatches operation', () => {
    it('throws error when fewer than 2 batch IDs are provided', async () => {
      await expect(mergeBatches({ batchIds: [1] })).rejects.toThrow(
        'Se requieren al menos 2 lotes para fusionar'
      );
      await expect(mergeBatches({ batchIds: [] })).rejects.toThrow(
        'Se requieren al menos 2 lotes para fusionar'
      );
    });

    it('throws error when fewer than 2 valid batches exist in Firestore', async () => {
      vi.mocked(firestore.getDoc)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ id: 101, created_at: '2026-08-01T00:00:00.000Z' })
        } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>)
        .mockResolvedValueOnce({
          exists: () => false,
          data: () => null
        } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

      await expect(mergeBatches({ batchIds: [101, 102] })).rejects.toThrow(
        'No se encontraron suficientes lotes válidos para fusionar'
      );
    });

    it('merges batches: computes newest timestamp, reassigns members preserving group, deletes old batches and creates merged batch', async () => {
      const batch1 = {
        id: 101,
        comment: 'Lote Uno',
        region_id: 1,
        district_id: 10,
        group_id: 100,
        recognition_type: 'sct-wood-badge',
        recognition_duration: '3 años',
        unit_scope: 'manada',
        created_at: '2026-08-01T10:00:00.000Z',
        user_id: 'user-1'
      };
      const batch2 = {
        id: 102,
        comment: 'Lote Dos',
        region_id: 1,
        district_id: 10,
        group_id: 200,
        recognition_type: 'sct-wood-badge',
        recognition_duration: '3 años',
        unit_scope: 'tropa',
        created_at: '2026-08-15T12:00:00.000Z',
        user_id: 'user-1'
      };

      // Mock getBatchById for 101 and 102
      vi.mocked(firestore.getDoc)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => batch1
        } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => batch2
        } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

      // Members for batch 101 and 102
      const member1 = {
        identity: 'V-111',
        batch_id: 101,
        group_id: 100,
        first_names: 'Ana',
        last_names: 'Perez'
      };
      const member2 = {
        identity: 'V-222',
        batch_id: 102,
        group_id: 200,
        first_names: 'Luis',
        last_names: 'Gomez'
      };

      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce({
          forEach: (cb: (doc: { data: () => unknown }) => void) => {
            cb({ data: () => member1 });
          }
        } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>)
        .mockResolvedValueOnce({
          forEach: (cb: (doc: { data: () => unknown }) => void) => {
            cb({ data: () => member2 });
          }
        } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const setMock = vi.fn();
      const deleteMock = vi.fn();
      const commitMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(firestore.writeBatch).mockReturnValueOnce({
        set: setMock,
        delete: deleteMock,
        commit: commitMock
      } as unknown as ReturnType<typeof firestore.writeBatch>);

      const result = await mergeBatches({
        batchIds: [101, 102],
        newComment: 'Lote consolidado agosto'
      });

      // Validations:
      // 1. Result batch structure
      expect(result.id).toBeGreaterThan(0);
      expect(result.comment).toBe('Lote consolidado agosto');
      // Newest timestamp: 2026-08-15T12:00:00.000Z > 2026-08-01T10:00:00.000Z
      expect(result.created_at).toBe('2026-08-15T12:00:00.000Z');
      // Region same -> 1, District same -> 10
      expect(result.region_id).toBe(1);
      expect(result.district_id).toBe(10);
      // Groups differed (100 vs 200) -> 0
      expect(result.group_id).toBe(0);
      // Units differed ('manada' vs 'tropa') -> 'mixed'
      expect(result.unit_scope).toBe('mixed');
      // Recognition type same -> 'sct-wood-badge'
      expect(result.recognition_type).toBe('sct-wood-badge');

      // 2. batchOp.set called for new batch
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({ path: `batches/${result.id}` }),
        result
      );

      // 3. Member reassignment with batch_id updated and original group preserved
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'scout_members/V-111' }),
        expect.objectContaining({
          batch_id: result.id,
          group_id: 100,
          identity: 'V-111'
        })
      );
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'scout_members/V-222' }),
        expect.objectContaining({
          batch_id: result.id,
          group_id: 200,
          identity: 'V-222'
        })
      );

      // 4. Old batches deleted
      expect(deleteMock).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'batches/101' })
      );
      expect(deleteMock).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'batches/102' })
      );

      // 5. Atomic commit executed
      expect(commitMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Member CRUD operations', () => {
    const mockMember = {
      identity: 'V-12345678',
      first_names: 'Juan',
      last_names: 'Perez',
      birth_date: '2000-01-01',
      member_type: 'young' as const,
      status: 'active' as const,
      batch_id: 100
    };

    it('creates a scout member without undefined fields', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValueOnce();
      const res = await createMember({
        ...mockMember,
        email: undefined,
        phone: undefined,
        exceptional_reason: undefined
      });
      expect(res.identity).toBe('V-12345678');
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({
          email: undefined,
          phone: undefined,
          exceptional_reason: undefined
        })
      );
      // Verify keys in the written object do not contain undefined values
      const writtenObject = vi.mocked(firestore.setDoc).mock.calls[0][1] as Record<string, unknown>;
      Object.keys(writtenObject).forEach(key => {
        expect(writtenObject[key]).not.toBeUndefined();
      });
    });

    it('updates a scout member without undefined fields', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValueOnce();
      const res = await updateMember({
        ...mockMember,
        email: undefined,
        phone: undefined
      });
      expect(res.identity).toBe('V-12345678');
      const writtenObject = vi.mocked(firestore.setDoc).mock.calls[0][1] as Record<string, unknown>;
      Object.keys(writtenObject).forEach(key => {
        expect(writtenObject[key]).not.toBeUndefined();
      });
    });

    it('deletes a scout member', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValueOnce();
      await deleteMember('V-12345678');
      expect(firestore.deleteDoc).toHaveBeenCalled();
    });

    it('gets members by batch ID', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        forEach: (cb: (doc: { data: () => unknown }) => void) => {
          cb({ data: () => mockMember });
        }
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const list = await getMembersByBatchId(100);
      expect(list).toHaveLength(1);
      expect(list[0].identity).toBe('V-12345678');
    });
    it('gets all members across batches', async () => {
      // 1st getDocs: batches query
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        forEach: (cb: (doc: { data: () => unknown }) => void) => {
          cb({ data: () => ({ id: 100, created_at: '2026-01-01T00:00:00.000Z' }) });
        }
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      // 2nd getDocs: members in batch 100
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        docs: [{ data: () => mockMember }]
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const list = await getAllMembers('test-user-uid');
      expect(list).toHaveLength(1);
      expect(list[0].identity).toBe('V-12345678');
    });

    it('returns empty array when target user is empty or has no batches', async () => {
      const listEmptyUser = await getAllMembers('');
      expect(listEmptyUser).toEqual([]);

      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        forEach: () => {}
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const listNoBatches = await getAllMembers('no-batch-user');
      expect(listNoBatches).toEqual([]);
    });
  });

  describe('Recognition and Export Helpers', () => {

    it('returns proper recognition names and badge styles', () => {
      expect(getRecognitionName('sct-wood-badge')).toBe('Insignia de Madera');
      expect(getRecognitionName(undefined)).toBe('-');
      expect(getRecognitionName('Desconocido')).toBe('Desconocido');

      const stylePlastic = getRecognitionBadgeStyle('Embajadores de la Marea de Plástico');
      expect(stylePlastic.bg).toBe('bg-sky-100');

      const styleEarth = getRecognitionBadgeStyle('Tribu de la Tierra');
      expect(styleEarth.bg).toBe('bg-[#e9e7db]');

      const styleNature = getRecognitionBadgeStyle('Campeones por la Naturaleza');
      expect(styleNature.bg).toBe('bg-[#fee2d8]');

      const styleSolar = getRecognitionBadgeStyle('Go Solar');
      expect(styleSolar.bg).toBe('bg-amber-100');

      const styleEmpty = getRecognitionBadgeStyle(undefined);
      expect(styleEmpty.bg).toBe('bg-gray-100');
    });

    it('exports members list to CSV', () => {
      const clickMock = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const appendMock = vi.spyOn(document.body, 'appendChild');
      const removeMock = vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(() => {});
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();

      exportMembersToCSV(
        { id: 101, region_id: 1, district_id: 1, group_id: 1, created_at: '2026-01-01' },
        [{
          identity: 'V-100',
          first_names: 'Ana',
          last_names: 'Silva',
          birth_date: '2000-01-01',
          member_type: 'young',
          status: 'active',
          batch_id: 101
        }]
      );

      expect(clickMock).toHaveBeenCalled();
      expect(appendMock).toHaveBeenCalled();
      expect(removeMock).toHaveBeenCalled();

      clickMock.mockRestore();
      removeMock.mockRestore();
    });

    it('generates short unique alphanumeric recognition codes excluding ambiguous chars', () => {
      const code = generateRecognitionCode('TEST', 6);
      expect(code).toMatch(/^TEST-[A-Z2-9]{6}$/);
      expect(code).not.toMatch(/[0O1I]/);
    });

    it('assigns batch recognition codes correctly for auto and manual modes', () => {
      const members = [
        {
          identity: 'V-100',
          first_names: 'Ana',
          last_names: 'Silva',
          birth_date: '2000-01-01',
          member_type: 'young' as const,
          status: 'active' as const,
          batch_id: 101
        },
        {
          identity: 'V-200',
          first_names: 'Carlos',
          last_names: 'Perez',
          birth_date: '1995-01-01',
          member_type: 'adult' as const,
          status: 'pending' as const,
          batch_id: 101
        }
      ];

      const autoAssigned = assignBatchRecognitionCodes(members, 'auto');
      expect(autoAssigned[0].recognition_code).toMatch(/^REC-[A-Z2-9]{6}$/);
      expect(autoAssigned[1].recognition_code).toBe('');

      const manualAssigned = assignBatchRecognitionCodes(autoAssigned, 'manual');
      expect(manualAssigned[0].recognition_code).toBe('');
      expect(manualAssigned[1].recognition_code).toBe('');
    });
  });

  describe('Scraper Credentials & Cloud Functions', () => {
    it('saves and checks scraper credentials', async () => {
      expect(await hasScraperCredentials()).toBe(false);
      await saveScraperCredentials({ email: 's@test.com', password: 'pass' });
      expect(await hasScraperCredentials()).toBe(true);
    });

    it('throws when logging in without configured credentials', async () => {
      await expect(loginScraper()).rejects.toThrow('No hay credenciales configuradas');
    });

    it('calls loginScraper callable when credentials exist', async () => {
      await saveScraperCredentials({ email: 's@test.com', password: 'pass' });
      const callableMock = vi.fn().mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(functionsSdk.httpsCallable).mockReturnValueOnce(callableMock as unknown as ReturnType<typeof functionsSdk.httpsCallable>);

      await loginScraper();
      expect(callableMock).toHaveBeenCalledWith({ credentials: { email: 's@test.com', password: 'pass' } });
    });

    it('handles loginScraper error', async () => {
      await saveScraperCredentials({ email: 's@test.com', password: 'pass' });
      const callableMock = vi.fn().mockRejectedValueOnce(new Error('Credenciales incorrectas'));
      vi.mocked(functionsSdk.httpsCallable).mockReturnValueOnce(callableMock as unknown as ReturnType<typeof functionsSdk.httpsCallable>);

      await expect(loginScraper()).rejects.toThrow('Credenciales incorrectas');
    });

    it('fetches member status via callable function', async () => {
      const callableMock = vi.fn().mockResolvedValueOnce({
        data: {
          nombre_completo: 'Carlos Test',
          status: 'Registro válido',
          telefono: '123',
          correo_electronico: 'c@t.com',
          fecha_nacimiento: '2000-01-01'
        }
      });
      vi.mocked(functionsSdk.httpsCallable).mockReturnValueOnce(callableMock as unknown as ReturnType<typeof functionsSdk.httpsCallable>);

      const res = await getMemberStatus('12345678');
      expect(res.nombre_completo).toBe('Carlos Test');
    });

    it('handles getMemberStatus error', async () => {
      const callableMock = vi.fn().mockRejectedValueOnce(new Error('No registrado'));
      vi.mocked(functionsSdk.httpsCallable).mockReturnValueOnce(callableMock as unknown as ReturnType<typeof functionsSdk.httpsCallable>);

      await expect(getMemberStatus('99999999')).rejects.toThrow('No registrado');
    });
  });
});
