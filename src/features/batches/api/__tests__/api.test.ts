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
  exportMembersToCSV
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
      expect(data.regions[0].id).toBe(1);
      expect(data.districts[0].id).toBe(10);
      expect(data.groups[0].id).toBe(100);
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

    it('creates a scout member', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValueOnce();
      const res = await createMember(mockMember);
      expect(res.identity).toBe('V-12345678');
    });

    it('updates a scout member', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValueOnce();
      const res = await updateMember(mockMember);
      expect(res.identity).toBe('V-12345678');
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
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        forEach: (cb: (doc: { data: () => unknown }) => void) => {
          cb({ data: () => mockMember });
        }
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const list = await getAllMembers();
      expect(list).toHaveLength(1);
      expect(list[0].identity).toBe('V-12345678');
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
      const removeMock = vi.spyOn(document.body, 'removeChild');
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
