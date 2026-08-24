import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import {
  getAllRecognitionTypes,
  getRecognitionTypeById,
  createRecognitionType,
  updateRecognitionType,
  deleteRecognitionType,
  saveCertificateTemplate,
  processBackgroundImageFile,
  generateRecognitionId
} from '../index';
import { CertificateTemplate } from '../../types';

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
    deleteDoc: vi.fn(),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      commit: vi.fn()
    }))
  };
});

describe('Recognition Types API Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateRecognitionId', () => {
    it('generates normalized clean slug with sct- prefix', () => {
      expect(generateRecognitionId('Insignia de Madera')).toBe('sct-insignia-de-madera');
      expect(generateRecognitionId('Medalla al Mérito!')).toBe('sct-medalla-al-merito');
      expect(generateRecognitionId('  Tribu de la Tierra   ')).toBe('sct-tribu-de-la-tierra');
      expect(generateRecognitionId('---')).toBe('sct-custom');
    });
  });

  describe('getAllRecognitionTypes', () => {
    it('returns empty array when Firestore collection is empty', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: []
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const result = await getAllRecognitionTypes();

      expect(firestore.getDocs).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('returns sorted items when Firestore has documents', async () => {
      const mockDocs = [
        {
          id: 'sct-promesa',
          data: () => ({
            name: 'Promesa Scout',
            created_at: '2026-01-01T00:00:00.000Z'
          })
        },
        {
          id: 'sct-wood-badge',
          data: () => ({
            name: 'Insignia de Madera',
            created_at: '2026-01-01T00:00:00.000Z'
          })
        }
      ];

      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: mockDocs
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const result = await getAllRecognitionTypes();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Insignia de Madera');
      expect(result[1].name).toBe('Promesa Scout');
    });

    it('returns empty array on Firestore read error', async () => {
      vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error('Network error'));

      const result = await getAllRecognitionTypes();
      expect(result).toEqual([]);
    });
  });

  describe('getRecognitionTypeById', () => {
    it('returns recognition type when document exists', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'sct-merit',
        data: () => ({
          name: 'Medalla al Mérito',
          created_at: '2026-01-01T00:00:00.000Z'
        })
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

      const result = await getRecognitionTypeById('sct-merit');
      expect(result).toEqual({
        id: 'sct-merit',
        name: 'Medalla al Mérito',
        created_at: '2026-01-01T00:00:00.000Z'
      });
    });

    it('returns null when document does not exist', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => false
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

      const result = await getRecognitionTypeById('non-existent');
      expect(result).toBeNull();
    });

    it('returns null and logs error when getDoc throws', async () => {
      vi.mocked(firestore.getDoc).mockRejectedValueOnce(new Error('Firestore error'));

      const result = await getRecognitionTypeById('error-id');
      expect(result).toBeNull();
    });
  });

  describe('createRecognitionType', () => {
    it('creates and persists new recognition type to Firestore', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValueOnce();

      const created = await createRecognitionType({
        name: 'Orden del Sol Naciente'
      });

      expect(created.id).toBe('sct-orden-del-sol-naciente');
      expect(created.name).toBe('Orden del Sol Naciente');
      expect(created.created_at).toBeDefined();
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sct-orden-del-sol-naciente' }),
        expect.objectContaining({ name: 'Orden del Sol Naciente' })
      );
    });
  });

  describe('updateRecognitionType', () => {
    it('updates existing recognition type in Firestore', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'sct-merit',
        data: () => ({
          name: 'Medalla al Mérito',
          created_at: '2026-01-01T00:00:00.000Z'
        })
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);
      vi.mocked(firestore.setDoc).mockResolvedValueOnce();

      const updated = await updateRecognitionType('sct-merit', {
        name: 'Medalla al Mérito Extraordinario'
      });

      expect(updated.id).toBe('sct-merit');
      expect(updated.name).toBe('Medalla al Mérito Extraordinario');
      expect(updated.created_at).toBe('2026-01-01T00:00:00.000Z');
      expect(firestore.setDoc).toHaveBeenCalled();
    });
  });

  describe('deleteRecognitionType', () => {
    it('deletes recognition document from Firestore', async () => {
      vi.mocked(firestore.deleteDoc).mockResolvedValueOnce();

      await deleteRecognitionType('sct-merit');

      expect(firestore.deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sct-merit' })
      );
    });
  });

  describe('saveCertificateTemplate', () => {
    it('updates recognition document with certificate template using merge', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValueOnce();

      const mockTemplate: CertificateTemplate = {
        background_url: 'data:image/webp;base64,mockdata',
        page_width: 297,
        page_height: 210,
        orientation: 'landscape',
        fields: [
          {
            id: 'field-full_name',
            field_key: 'full_name',
            label: 'Nombre y Apellido',
            x: 50,
            y: 40,
            font_family: 'helvetica',
            font_size: 24,
            font_weight: 'bold',
            color: '#1b7a37',
            align: 'center'
          }
        ]
      };

      await saveCertificateTemplate('sct-wood-badge', mockTemplate);

      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sct-wood-badge' }),
        { template: mockTemplate },
        { merge: true }
      );
    });
  });

  describe('processBackgroundImageFile', () => {
    it('processes non-image file using FileReader directly and returns metadata', async () => {
      const mockFile = new File(['%PDF-1.4 mock content'], 'certificate.pdf', {
        type: 'application/pdf'
      });

      const result = await processBackgroundImageFile(mockFile);
      expect(result).toBeDefined();
      expect(typeof result.dataUrl).toBe('string');
      expect(result.width).toBe(297);
      expect(result.height).toBe(210);
      expect(result.aspectRatio).toBeCloseTo(1.414, 2);
      expect(result.orientation).toBe('landscape');
    });

    it('processes image file and returns image metadata', async () => {
      const mockFile = new File(['mock image content'], 'template.png', {
        type: 'image/png'
      });

      const result = await processBackgroundImageFile(mockFile);
      expect(result).toBeDefined();
      expect(typeof result.dataUrl).toBe('string');
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.aspectRatio).toBeGreaterThan(0);
      expect(['landscape', 'portrait']).toContain(result.orientation);
    });
  });
});

