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
  generateRecognitionId,
  ENCRYPTED_PDF_NOT_SUPPORTED_MESSAGE,
  INVALID_PDF_MESSAGE,
  EMPTY_PDF_MESSAGE,
  BACKGROUND_SIZE_LIMIT_EXCEEDED_MESSAGE,
  INVALID_IMAGE_FORMAT_MESSAGE,
  MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH,
  MAX_FIRESTORE_TEMPLATE_BYTES,
  PdfPageRenderer
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
        background_url: 'data:image/jpeg;base64,mockdata',
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

    it('rejects template payload exceeding Firestore 1 MB document limit', async () => {
      const oversizedTemplate: CertificateTemplate = {
        background_url: `data:image/jpeg;base64,${'A'.repeat(MAX_FIRESTORE_TEMPLATE_BYTES + 100)}`,
        page_width: 297,
        page_height: 210,
        orientation: 'landscape',
        fields: []
      };

      await expect(saveCertificateTemplate('sct-wood-badge', oversizedTemplate)).rejects.toThrow(
        'La imagen de fondo excede el límite máximo de almacenamiento permitido (1 MB)'
      );
      expect(firestore.setDoc).not.toHaveBeenCalled();
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
    function spyOnMockCanvasFactory(options: {
      alpha?: number;
      toDataURL?: (canvas: { width: number; height: number }, type: string, quality?: number) => string;
    }) {
      const originalCreateElement = document.createElement.bind(document);
      const createdCanvases: Array<{
        width: number;
        height: number;
        fillRect: ReturnType<typeof vi.fn>;
        drawImage: ReturnType<typeof vi.fn>;
      }> = [];

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          const fillRect = vi.fn();
          const drawImage = vi.fn();
          const canvasObj = {
            width: 0,
            height: 0,
            fillRect,
            drawImage,
            getContext: vi.fn(() => ({
              fillStyle: '',
              fillRect,
              drawImage,
              getImageData: vi.fn(() => ({
                data: new Uint8ClampedArray([255, 255, 255, options.alpha ?? 255])
              }))
            })),
            toDataURL: vi.fn((type: string, quality?: number) => {
              if (options.toDataURL) {
                return options.toDataURL(canvasObj, type, quality);
              }
              return `data:${type};base64,mockcanvasdata`;
            })
          };
          createdCanvases.push(canvasObj);
          return canvasObj as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

      return createdCanvases;
    }

    it('converts single-page A4 landscape PDF onto white JPEG preserving proportions', async () => {
      const mockFile = new File(['%PDF-1.4 mock content'], 'certificate.pdf', {
        type: 'application/pdf'
      });

      const fillRect = vi.fn();
      const canvasEl = {
        width: 1527,
        height: 1080,
        getContext: vi.fn(),
        toDataURL: vi.fn(() => 'data:image/jpeg;base64,pdfpage1')
      };
      const ctx = {
        fillStyle: '',
        fillRect,
        drawImage: vi.fn(),
        getImageData: vi.fn()
      } as unknown as CanvasRenderingContext2D;

      const pdfRenderer: PdfPageRenderer = vi.fn(async () => ({
        canvas: canvasEl as unknown as HTMLCanvasElement,
        ctx,
        naturalWidth: 842,
        naturalHeight: 595,
        exactRatio: 841.89 / 595.28,
        pageCount: 1
      }));

      const result = await processBackgroundImageFile(mockFile, 1920, 1080, { pdfRenderer });

      expect(pdfRenderer).toHaveBeenCalledWith(mockFile, 1920, 1080);
      expect(result.dataUrl).toBe('data:image/jpeg;base64,pdfpage1');
      expect(result.sourceType).toBe('pdf');
      expect(result.pageCount).toBe(1);
      expect(result.wasCompressedHeavily).toBe(false);
      expect(result.orientation).toBe('landscape');
      expect(result.normalizedWidth).toBe(297);
      expect(result.normalizedHeight).toBe(210);
      expect(result.aspectRatio).toBe(1.414);
      // Cleanup zeroes rendered canvas dimensions after encoding
      expect(canvasEl.width).toBe(0);
      expect(canvasEl.height).toBe(0);
    });

    it('preserves portrait US Letter PDF proportions and reports multi-page metadata', async () => {
      const mockFile = new File(['%PDF-1.4 letter portrait'], 'diploma.pdf', {
        type: 'application/pdf'
      });

      const canvasEl = {
        width: 834,
        height: 1080,
        toDataURL: vi.fn(() => 'data:image/jpeg;base64,portraitletter')
      } as unknown as HTMLCanvasElement;
      const ctx = {} as CanvasRenderingContext2D;

      const pdfRenderer: PdfPageRenderer = vi.fn(async () => ({
        canvas: canvasEl,
        ctx,
        naturalWidth: 612,
        naturalHeight: 792,
        exactRatio: 612 / 792,
        pageCount: 3
      }));

      const result = await processBackgroundImageFile(mockFile, 1920, 1080, { pdfRenderer });

      expect(result.sourceType).toBe('pdf');
      expect(result.pageCount).toBe(3);
      expect(result.orientation).toBe('portrait');
      expect(result.normalizedHeight).toBe(297);
      expect(result.normalizedWidth).toBe(229.5);
      expect(result.aspectRatio).toBe(0.773);
    });

    it('uniformly downscales oversized PDF renders while preserving aspectRatio and keeping size <= 750k', async () => {
      const mockFile = new File(['%PDF-1.4 dense'], 'dense.pdf', {
        type: 'application/pdf'
      });

      const exactRatio = 16 / 9;
      const oversizedPayload = `data:image/jpeg;base64,${'X'.repeat(MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH + 500)}`;

      const createdCanvases = spyOnMockCanvasFactory({
        toDataURL: (canvas) => {
          if (canvas.width <= 1632) {
            return 'data:image/jpeg;base64,uniformlydownscaled';
          }
          return oversizedPayload;
        }
      });

      const pdfCanvas = {
        width: 1920,
        height: 1080,
        toDataURL: vi.fn(() => oversizedPayload)
      } as unknown as HTMLCanvasElement;
      const ctx = {} as CanvasRenderingContext2D;

      const pdfRenderer: PdfPageRenderer = vi.fn(async () => ({
        canvas: pdfCanvas,
        ctx,
        naturalWidth: 1920,
        naturalHeight: 1080,
        exactRatio,
        pageCount: 1
      }));

      const result = await processBackgroundImageFile(mockFile, 1920, 1080, { pdfRenderer });

      expect(result.dataUrl).toBe('data:image/jpeg;base64,uniformlydownscaled');
      expect(result.dataUrl.length).toBeLessThanOrEqual(MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH);
      expect(result.wasCompressedHeavily).toBe(true);
      expect(result.aspectRatio).toBe(1.778);
      expect(result.normalizedWidth).toBe(297);
      expect(result.normalizedHeight).toBe(167.06);
      expect(createdCanvases).toHaveLength(1);
      // After cleanup in finally, dimensions were zeroed; verify drawImage used exact 16:9 scaled height (1632 x 918)
      expect(createdCanvases[0].drawImage).toHaveBeenCalledWith(pdfCanvas, 0, 0, 1632, 918);

      vi.restoreAllMocks();
    });

    it('rejects with BACKGROUND_SIZE_LIMIT_EXCEEDED_MESSAGE when all scale/quality passes stay above 750k', async () => {
      const mockFile = new File(['%PDF-1.4 huge'], 'huge.pdf', {
        type: 'application/pdf'
      });

      const oversizedPayload = `data:image/jpeg;base64,${'X'.repeat(MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH + 500)}`;
      spyOnMockCanvasFactory({
        toDataURL: () => oversizedPayload
      });

      const pdfCanvas = {
        width: 1920,
        height: 1080,
        toDataURL: vi.fn(() => oversizedPayload)
      } as unknown as HTMLCanvasElement;

      const pdfRenderer: PdfPageRenderer = vi.fn(async () => ({
        canvas: pdfCanvas,
        ctx: {} as CanvasRenderingContext2D,
        naturalWidth: 1920,
        naturalHeight: 1080,
        exactRatio: 16 / 9,
        pageCount: 1
      }));

      await expect(
        processBackgroundImageFile(mockFile, 1920, 1080, { pdfRenderer })
      ).rejects.toThrow(BACKGROUND_SIZE_LIMIT_EXCEEDED_MESSAGE);

      vi.restoreAllMocks();
    });

    it('renders page 1 onto #ffffff canvas via default pdfjs-dist loader and cleans up resources', async () => {
      vi.resetModules();

      const pageCleanupMock = vi.fn();
      const docCleanupMock = vi.fn().mockResolvedValue(undefined);
      const taskDestroyMock = vi.fn().mockResolvedValue(undefined);
      const fillRectMock = vi.fn();
      const renderMock = vi.fn(() => ({ promise: Promise.resolve() }));
      const fakeCtx = {
        fillStyle: '',
        fillRect: fillRectMock
      };

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn(() => fakeCtx),
            toDataURL: vi.fn(() => 'data:image/jpeg;base64,realpdfjsflow')
          } as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

      class MockPasswordException extends Error {
        override name = 'PasswordException';
      }

      const getDocumentMock = vi.fn(() => ({
        destroy: taskDestroyMock,
        promise: Promise.resolve({
          numPages: 2,
          getPage: vi.fn(async () => ({
            getViewport: vi.fn(({ scale }: { scale: number }) => ({
              width: 842 * scale,
              height: 595 * scale
            })),
            render: renderMock,
            cleanup: pageCleanupMock
          })),
          cleanup: docCleanupMock
        })
      }));

      vi.doMock('pdfjs-dist', () => ({
        GlobalWorkerOptions: { workerSrc: '' },
        PasswordException: MockPasswordException,
        getDocument: getDocumentMock
      }));
      vi.doMock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
        default: '/assets/pdf.worker.min.mjs'
      }));

      const { processBackgroundImageFile: freshProcess } = await import('../imageProcessor');
      const file = new File([new Uint8Array([37, 80, 68, 70])], 'cert.pdf', {
        type: 'application/pdf'
      });

      const result = await freshProcess(file);

      expect(result.dataUrl).toBe('data:image/jpeg;base64,realpdfjsflow');
      expect(result.sourceType).toBe('pdf');
      expect(result.pageCount).toBe(2);
      expect(fakeCtx.fillStyle).toBe('#ffffff');
      expect(fillRectMock).toHaveBeenCalled();
      expect(renderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          canvas: expect.any(Object),
          canvasContext: fakeCtx
        })
      );
      expect(pageCleanupMock).toHaveBeenCalledTimes(1);
      expect(docCleanupMock).toHaveBeenCalledTimes(1);
      expect(taskDestroyMock).toHaveBeenCalledTimes(1);

      vi.doUnmock('pdfjs-dist');
      vi.doUnmock('pdfjs-dist/build/pdf.worker.min.mjs?url');
      vi.restoreAllMocks();
    });

    it('maps PasswordException, empty PDFs, and corrupted PDFs to explicit Spanish errors', async () => {
      vi.resetModules();

      class MockPasswordException extends Error {
        override name = 'PasswordException';
      }

      const taskDestroyMock = vi.fn().mockResolvedValue(undefined);
      const getDocumentMock = vi
        .fn()
        .mockImplementationOnce(() => ({
          destroy: taskDestroyMock,
          promise: Promise.reject(new MockPasswordException('encrypted'))
        }))
        .mockImplementationOnce(() => ({
          destroy: taskDestroyMock,
          promise: Promise.resolve({ numPages: 0, cleanup: vi.fn() })
        }))
        .mockImplementationOnce(() => ({
          destroy: taskDestroyMock,
          promise: Promise.reject(new Error('Invalid PDF structure'))
        }));

      vi.doMock('pdfjs-dist', () => ({
        GlobalWorkerOptions: { workerSrc: '' },
        PasswordException: MockPasswordException,
        getDocument: getDocumentMock
      }));
      vi.doMock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
        default: '/assets/pdf.worker.min.mjs'
      }));

      const { processBackgroundImageFile: freshProcess } = await import('../imageProcessor');

      const pdfFile = new File([new Uint8Array([37, 80, 68, 70])], 'test.pdf', {
        type: 'application/pdf'
      });

      await expect(freshProcess(pdfFile)).rejects.toThrow(ENCRYPTED_PDF_NOT_SUPPORTED_MESSAGE);
      await expect(freshProcess(pdfFile)).rejects.toThrow(EMPTY_PDF_MESSAGE);
      await expect(freshProcess(pdfFile)).rejects.toThrow(INVALID_PDF_MESSAGE);
      expect(taskDestroyMock).toHaveBeenCalledTimes(3);

      vi.doUnmock('pdfjs-dist');
      vi.doUnmock('pdfjs-dist/build/pdf.worker.min.mjs?url');
      vi.restoreAllMocks();
    });

    it('rejects unsupported non-image MIME types with validation error', async () => {
      const mockFile = new File(['plain text content'], 'notes.txt', {
        type: 'text/plain'
      });

      await expect(processBackgroundImageFile(mockFile)).rejects.toThrow(
        INVALID_IMAGE_FORMAT_MESSAGE
      );
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

    it('normalizes opaque landscape image onto JPEG canvas output', async () => {
      const originalImage = global.Image;

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

      const createdCanvases = spyOnMockCanvasFactory({ alpha: 255 });

      const mockFile = new File(['mock image'], 'landscape.png', { type: 'image/png' });
      const result = await processBackgroundImageFile(mockFile, 1920, 1080);

      expect(result.naturalWidth).toBe(2400);
      expect(result.orientation).toBe('landscape');
      expect(result.normalizedWidth).toBe(297);
      expect(result.dataUrl).toContain('data:image/jpeg');
      expect(createdCanvases.length).toBeGreaterThanOrEqual(2);

      global.Image = originalImage;
      vi.restoreAllMocks();
    });

    it('preserves PNG format when alpha transparency is detected on image', async () => {
      const originalImage = global.Image;

      class MockTransparentImage {
        src = '';
        naturalWidth = 1200;
        naturalHeight = 800;
        width = 1200;
        height = 800;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 10);
        }
      }

      global.Image = MockTransparentImage as unknown as typeof Image;

      spyOnMockCanvasFactory({
        alpha: 0,
        toDataURL: (_canvas, type) => `data:${type};base64,mocktransparentpng`
      });

      const mockFile = new File(['mock transparent png'], 'transparent.png', { type: 'image/png' });
      const result = await processBackgroundImageFile(mockFile, 1920, 1080);

      expect(result.dataUrl).toContain('data:image/png');

      global.Image = originalImage;
      vi.restoreAllMocks();
    });

    it('handles portrait image and steps down JPEG quality if initial payload exceeds Firestore limit', async () => {
      const originalImage = global.Image;

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

      spyOnMockCanvasFactory({
        alpha: 255,
        toDataURL: (_canvas, _type, quality) => {
          if (quality && quality > 0.75) {
            return `data:image/jpeg;base64,${'X'.repeat(MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH + 500)}`;
          }
          return 'data:image/jpeg;base64,compactjpegdata';
        }
      });

      const mockFile = new File(['mock portrait'], 'portrait.jpg', { type: 'image/jpeg' });
      const result = await processBackgroundImageFile(mockFile, 1920, 1080);

      expect(result.orientation).toBe('portrait');
      expect(result.normalizedHeight).toBe(297);
      expect(result.dataUrl).toBe('data:image/jpeg;base64,compactjpegdata');

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
