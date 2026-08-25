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
    query: vi.fn(),
    where: vi.fn(),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      commit: vi.fn()
    }))
  };
});

vi.mock('../../../../lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-user-uid' } },
  db: {}
}));

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
      expect(generateRecognitionId('')).toBe('sct-custom');
    });
  });

  describe('getAllRecognitionTypes', () => {
    it('returns empty array when user is not authenticated/empty', async () => {
      const result = await getAllRecognitionTypes('');
      expect(result).toEqual([]);
    });

    it('returns empty array when Firestore collection is empty', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: []
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const result = await getAllRecognitionTypes('test-user-uid');

      expect(firestore.getDocs).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('returns sorted items when Firestore has documents', async () => {
      const mockDocs = [
        {
          id: 'sct-promesa',
          data: () => ({
            name: 'Promesa Scout',
            created_at: '2026-01-01T00:00:00.000Z',
            template: { background_url: 'url1', fields: [] }
          })
        },
        {
          id: 'sct-wood-badge',
          data: () => ({
            name: '',
            created_at: ''
          })
        }
      ];

      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: mockDocs
      } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const result = await getAllRecognitionTypes();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Promesa Scout');
      expect(result[1].name).toBe('sct-wood-badge');
      expect(result[0].template).toBeDefined();
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
          created_at: '2026-01-01T00:00:00.000Z',
          template: { background_url: 'bg', fields: [] }
        })
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

      const result = await getRecognitionTypeById('sct-merit');
      expect(result).toEqual({
        id: 'sct-merit',
        name: 'Medalla al Mérito',
        created_at: '2026-01-01T00:00:00.000Z',
        template: { background_url: 'bg', fields: [] }
      });
    });

    it('returns default fallback name and date when missing in document data', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'sct-default',
        data: () => ({})
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

      const result = await getRecognitionTypeById('sct-default');
      expect(result?.id).toBe('sct-default');
      expect(result?.name).toBe('sct-default');
      expect(result?.created_at).toBeDefined();
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

    it('throws error when setDoc fails in createRecognitionType', async () => {
      vi.mocked(firestore.setDoc).mockRejectedValueOnce(new Error('Write permission denied'));

      await expect(createRecognitionType({ name: 'Falla DB' })).rejects.toThrow('Write permission denied');
    });
  });

  describe('updateRecognitionType', () => {
    it('updates existing recognition type in Firestore', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'sct-merit',
        data: () => ({
          name: 'Medalla al Mérito',
          created_at: '2026-01-01T00:00:00.000Z',
          template: { background_url: 'template_url', fields: [] }
        })
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);
      vi.mocked(firestore.setDoc).mockResolvedValueOnce();

      const updated = await updateRecognitionType('sct-merit', {
        name: 'Medalla al Mérito Extraordinario'
      });

      expect(updated.id).toBe('sct-merit');
      expect(updated.name).toBe('Medalla al Mérito Extraordinario');
      expect(updated.created_at).toBe('2026-01-01T00:00:00.000Z');
      expect(updated.template).toBeDefined();
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('handles update when existing item has no previous data or template', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => false
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);
      vi.mocked(firestore.setDoc).mockResolvedValueOnce();

      const updated = await updateRecognitionType('sct-new-id', {
        name: 'Nuevo Nombre'
      });

      expect(updated.id).toBe('sct-new-id');
      expect(updated.name).toBe('Nuevo Nombre');
      expect(updated.created_at).toBeDefined();
    });

    it('throws error when setDoc fails in updateRecognitionType', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'sct-merit',
        data: () => ({ name: 'Test' })
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);
      vi.mocked(firestore.setDoc).mockRejectedValueOnce(new Error('Update failed'));

      await expect(updateRecognitionType('sct-merit', { name: 'Update test' })).rejects.toThrow('Update failed');
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

    it('throws error when deleteDoc fails', async () => {
      vi.mocked(firestore.deleteDoc).mockRejectedValueOnce(new Error('Delete error'));

      await expect(deleteRecognitionType('sct-error')).rejects.toThrow('Delete error');
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

    it('throws error when setDoc fails in saveCertificateTemplate', async () => {
      vi.mocked(firestore.setDoc).mockRejectedValueOnce(new Error('Template save error'));

      await expect(
        saveCertificateTemplate('sct-error', {
          background_url: '',
          page_width: 297,
          page_height: 210,
          orientation: 'landscape',
          fields: []
        })
      ).rejects.toThrow('Template save error');
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

    it('rejects when non-image FileReader fails', async () => {
      const mockFile = new File(['mock content'], 'test.pdf', { type: 'application/pdf' });
      const originalFileReader = global.FileReader;

      class FailingFileReader {
        onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
        onerror: ((err: unknown) => unknown) | null = null;
        readAsDataURL() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('FileReader non-image failed'));
          }, 0);
        }
      }

      global.FileReader = FailingFileReader as unknown as typeof FileReader;
      await expect(processBackgroundImageFile(mockFile)).rejects.toThrow();
      global.FileReader = originalFileReader;
    });

    it('processes image file and returns image metadata for PNG', async () => {
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

    it('processes image file for JPEG', async () => {
      const mockFile = new File(['mock jpeg'], 'template.jpg', {
        type: 'image/jpeg'
      });

      const result = await processBackgroundImageFile(mockFile);
      expect(result).toBeDefined();
      expect(typeof result.dataUrl).toBe('string');
    });

    it('processes image file for WebP', async () => {
      const mockFile = new File(['mock webp'], 'template.webp', {
        type: 'image/webp'
      });

      const result = await processBackgroundImageFile(mockFile);
      expect(result).toBeDefined();
      expect(typeof result.dataUrl).toBe('string');
    });

    it('handles image onload with simulated Image element for landscape and canvas webp export', async () => {
      const originalImage = global.Image;
      const originalCreateElement = document.createElement.bind(document);

      class MockLandscapeImage {
        src = '';
        naturalWidth = 2400;
        naturalHeight = 1600;
        width = 2400;
        height = 1600;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 10);
        }
      }

      global.Image = MockLandscapeImage as unknown as typeof Image;

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn()
        })),
        toDataURL: vi.fn((type: string) => `data:${type};base64,mockcanvasdata`)
      };

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

      const mockFile = new File(['mock image'], 'landscape.png', { type: 'image/png' });
      const result = await processBackgroundImageFile(mockFile, 1920, 1080);

      expect(result.naturalWidth).toBe(2400);
      expect(result.orientation).toBe('landscape');
      expect(result.normalizedWidth).toBe(297);
      expect(result.dataUrl).toContain('data:image/webp');

      global.Image = originalImage;
      vi.restoreAllMocks();
    });

    it('handles image onload with simulated portrait Image and fallback to jpeg when webp throws', async () => {
      const originalImage = global.Image;
      const originalCreateElement = document.createElement.bind(document);

      class MockPortraitImage {
        src = '';
        naturalWidth = 1080;
        naturalHeight = 1920;
        width = 1080;
        height = 1920;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 10);
        }
      }

      global.Image = MockPortraitImage as unknown as typeof Image;

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn()
        })),
        toDataURL: vi.fn((type: string) => {
          if (type === 'image/webp') {
            throw new Error('WebP not supported');
          }
          return 'data:image/jpeg;base64,mockjpegdata';
        })
      };

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

      const mockFile = new File(['mock portrait'], 'portrait.jpg', { type: 'image/jpeg' });
      const result = await processBackgroundImageFile(mockFile, 1920, 1080);

      expect(result.orientation).toBe('portrait');
      expect(result.normalizedHeight).toBe(297);
      expect(result.dataUrl).toContain('data:image/jpeg');

      global.Image = originalImage;
      vi.restoreAllMocks();
    });

    it('handles image onload when canvas.getContext returns null', async () => {
      const originalImage = global.Image;
      const originalCreateElement = document.createElement.bind(document);

      class MockImage {
        src = '';
        naturalWidth = 1200;
        naturalHeight = 800;
        width = 1200;
        height = 800;
        onload: (() => void) | null = null;
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 10);
        }
      }

      global.Image = MockImage as unknown as typeof Image;

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => null)
      };

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

      const mockFile = new File(['mock image'], 'test.png', { type: 'image/png' });
      const result = await processBackgroundImageFile(mockFile);

      expect(result.width).toBe(1200);
      expect(result.height).toBe(800);

      global.Image = originalImage;
      vi.restoreAllMocks();
    });

    it('handles image onerror fallback gracefully', async () => {
      const originalImage = global.Image;

      class FailingImage {
        src = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 10);
        }
      }

      global.Image = FailingImage as unknown as typeof Image;

      const mockFile = new File(['corrupt image data'], 'broken.png', { type: 'image/png' });
      const result = await processBackgroundImageFile(mockFile);

      expect(result.width).toBe(297);
      expect(result.height).toBe(210);
      expect(result.orientation).toBe('landscape');

      global.Image = originalImage;
    });

    it('rejects when image FileReader errors out', async () => {
      const mockFile = new File(['mock content'], 'test.png', { type: 'image/png' });
      const originalFileReader = global.FileReader;

      class FailingFileReader {
        onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
        onerror: ((err: unknown) => unknown) | null = null;
        readAsDataURL() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Image reader failed'));
          }, 0);
        }
      }

      global.FileReader = FailingFileReader as unknown as typeof FileReader;
      await expect(processBackgroundImageFile(mockFile)).rejects.toThrow();
      global.FileReader = originalFileReader;
    });
  });
});


