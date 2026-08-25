import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hexToRgb,
  formatIssueDate,
  slugify,
  getNormalizedPageDimensions,
  generateSingleCertificatePdf,
  downloadSingleCertificatePdf,
  generateBatchCertificatesPdf,
  renderCertificatePage
} from '../certificatePdfGenerator';
import { Batch, ScoutMember } from '../../../batches/types';
import { RecognitionType, CertificateTemplate } from '../../types';
import * as firestore from 'firebase/firestore';
import { jsPDF } from 'jspdf';

const mockDocInstance = {
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  line: vi.fn(),
  setFont: vi.fn(),
  setFillColor: vi.fn(),
  rect: vi.fn(),
  addPage: vi.fn(),
  addImage: vi.fn(),
  save: vi.fn()
};

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    writeBatch: vi.fn(),
    deleteDoc: vi.fn()
  };
});

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation(function () {
      return mockDocInstance;
    })
  };
});

describe('certificatePdfGenerator service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hexToRgb helper', () => {
    it('converts standard 6-character hex colors correctly', () => {
      expect(hexToRgb('#1b7a37')).toEqual({ r: 27, g: 122, b: 55 });
      expect(hexToRgb('#8c4e37')).toEqual({ r: 140, g: 78, b: 55 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('converts 3-character shorthand hex colors correctly', () => {
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('handles undefined, empty or invalid hex gracefully with default fallback', () => {
      expect(hexToRgb(undefined)).toEqual({ r: 33, g: 33, b: 33 });
      expect(hexToRgb('')).toEqual({ r: 33, g: 33, b: 33 });
      expect(hexToRgb('invalid-hex')).toEqual({ r: 33, g: 33, b: 33 });
    });
  });

  describe('formatIssueDate helper', () => {
    it('formats ISO dates into Spanish short format', () => {
      expect(formatIssueDate('2026-10-12T12:00:00.000Z')).toBe('12 Oct 2026');
      expect(formatIssueDate('2026-01-05T00:00:00.000Z')).toBe('5 Ene 2026');
    });

    it('handles undefined or invalid date strings gracefully', () => {
      expect(formatIssueDate(undefined)).toBe('12 Oct 2026');
      expect(formatIssueDate('not-a-date')).toBe('not-a-date');
    });
  });

  describe('slugify helper', () => {
    it('creates clean lowercase slugs without accents or special characters', () => {
      expect(slugify('Insignia de Madera')).toBe('insignia_de_madera');
      expect(slugify('Medalla al Mérito #1')).toBe('medalla_al_merito_1');
      expect(slugify('  Embajadores de la Marea!  ')).toBe('embajadores_de_la_marea');
    });
  });

  describe('getNormalizedPageDimensions helper', () => {
    it('normalizes high resolution portrait image (e.g. 2657 x 3438) to standard millimeter print dimensions', () => {
      const portraitTemplate: CertificateTemplate = {
        background_url: 'data:image/webp;base64,portraitImage',
        page_width: 2657,
        page_height: 3438,
        aspect_ratio: 2657 / 3438,
        orientation: 'portrait',
        fields: []
      };

      const result = getNormalizedPageDimensions(portraitTemplate);
      expect(result.orientation).toBe('portrait');
      expect(result.height).toBe(297);
      expect(result.width).toBe(229.53);
      expect(result.aspectRatio).toBeCloseTo(0.7728, 4);
    });

    it('normalizes 4K landscape image (e.g. 3840 x 2160) to standard millimeter print dimensions', () => {
      const landscapeTemplate: CertificateTemplate = {
        background_url: 'data:image/webp;base64,4kImage',
        page_width: 3840,
        page_height: 2160,
        aspect_ratio: 3840 / 2160,
        orientation: 'landscape',
        fields: []
      };

      const result = getNormalizedPageDimensions(landscapeTemplate);
      expect(result.orientation).toBe('landscape');
      expect(result.width).toBe(297);
      expect(result.height).toBe(167.06);
      expect(result.aspectRatio).toBeCloseTo(16 / 9, 4);
    });

    it('handles standard A4 landscape dimensions (297 x 210)', () => {
      const a4Landscape: CertificateTemplate = {
        background_url: '',
        page_width: 297,
        page_height: 210,
        aspect_ratio: 297 / 210,
        orientation: 'landscape',
        fields: []
      };

      const result = getNormalizedPageDimensions(a4Landscape);
      expect(result.orientation).toBe('landscape');
      expect(result.width).toBe(297);
      expect(result.height).toBe(210);
    });

    it('handles standard A4 portrait dimensions (210 x 297)', () => {
      const a4Portrait: CertificateTemplate = {
        background_url: '',
        page_width: 210,
        page_height: 297,
        aspect_ratio: 210 / 297,
        orientation: 'portrait',
        fields: []
      };

      const result = getNormalizedPageDimensions(a4Portrait);
      expect(result.orientation).toBe('portrait');
      expect(result.height).toBe(297);
      expect(result.width).toBe(210);
    });

    it('handles 1:1 square aspect ratio (1000 x 1000)', () => {
      const squareTemplate: CertificateTemplate = {
        background_url: '',
        page_width: 1000,
        page_height: 1000,
        aspect_ratio: 1,
        orientation: 'landscape',
        fields: []
      };

      const result = getNormalizedPageDimensions(squareTemplate);
      expect(result.orientation).toBe('landscape');
      expect(result.width).toBe(297);
      expect(result.height).toBe(297);
    });

    it('returns default A4 landscape fallback for undefined or invalid template', () => {
      expect(getNormalizedPageDimensions(undefined)).toEqual({
        width: 297,
        height: 210,
        orientation: 'landscape',
        aspectRatio: 297 / 210
      });

      expect(getNormalizedPageDimensions({} as CertificateTemplate)).toEqual({
        width: 297,
        height: 210,
        orientation: 'landscape',
        aspectRatio: 297 / 210
      });
    });
  });

  const mockBatch: Batch = {
    id: 45,
    comment: 'Lote Conmemorativo',
    region_id: 1,
    district_id: 10,
    group_id: 100,
    recognition_type: 'sct-wood-badge',
    created_at: '2026-10-12T10:00:00.000Z'
  };

  const mockActiveMember: ScoutMember = {
    identity: 'V-18.234.567',
    first_names: 'Carlos Eduardo',
    last_names: 'Mendoza',
    birth_date: '1995-03-20',
    member_type: 'adult',
    unit: 'tropa',
    status: 'active',
    batch_id: 45,
    recognition_code: 'REC-45-001'
  };

  const mockPendingMember: ScoutMember = {
    identity: 'V-20.987.654',
    first_names: 'Pedro',
    last_names: 'Gomez',
    birth_date: '2008-07-14',
    member_type: 'young',
    status: 'pending',
    batch_id: 45
  };

  const mockHierarchy = {
    regions: [{ id: 1, name: 'Región Capital' }],
    districts: [{ id: 10, name: 'Distrito Metropolitano', region_id: 1 }],
    groups: [{ id: 100, name: 'Grupo Scouts 45 San Jorge', district_id: 10 }]
  };

  const mockRecognition: RecognitionType = {
    id: 'sct-wood-badge',
    name: 'Insignia de Madera',
    created_at: '2026-01-01T00:00:00.000Z'
  };

  describe('generateSingleCertificatePdf', () => {
    it('generates certificate with official standard Scout layout when no custom template is present', async () => {
      const doc = await generateSingleCertificatePdf({
        member: mockActiveMember,
        batch: mockBatch,
        recognition: mockRecognition,
        hierarchy: mockHierarchy
      });

      expect(doc).toBeDefined();

      // Check standard borders
      expect(mockDocInstance.rect).toHaveBeenCalledWith(10, 10, 277, 190);
      expect(mockDocInstance.rect).toHaveBeenCalledWith(13, 13, 271, 184);

      // Check standard header
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'ASOCIACIÓN DE SCOUTS DE VENEZUELA',
        148.5,
        24,
        { align: 'center' }
      );
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'CERTIFICADO OFICIAL DE RECONOCIMIENTO',
        148.5,
        30,
        { align: 'center' }
      );

      // Check interpolated fields
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Carlos Eduardo Mendoza',
        expect.any(Number),
        expect.any(Number),
        { align: 'center', baseline: 'middle' }
      );
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'V-18.234.567',
        expect.any(Number),
        expect.any(Number),
        { align: 'center', baseline: 'middle' }
      );
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Insignia de Madera',
        expect.any(Number),
        expect.any(Number),
        { align: 'center', baseline: 'middle' }
      );
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Región Capital',
        expect.any(Number),
        expect.any(Number),
        { align: 'left', baseline: 'middle' }
      );
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Distrito Metropolitano',
        expect.any(Number),
        expect.any(Number),
        { align: 'left', baseline: 'middle' }
      );
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Grupo Scouts 45 San Jorge',
        expect.any(Number),
        expect.any(Number),
        { align: 'left', baseline: 'middle' }
      );
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        '12 Oct 2026',
        expect.any(Number),
        expect.any(Number),
        { align: 'center', baseline: 'middle' }
      );
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Tropa',
        expect.any(Number),
        expect.any(Number),
        { align: 'left', baseline: 'middle' }
      );
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'REC-45-001',
        expect.any(Number),
        expect.any(Number),
        { align: 'center', baseline: 'middle' }
      );
    });

    it('generates certificate for no_scout direct emission member with No Scout label', async () => {
      const noScoutMember: ScoutMember = {
        identity: 'V-99.888.777',
        first_names: 'Colaborador',
        last_names: 'Externo',
        birth_date: '1990-01-01',
        member_type: 'adult',
        unit: 'no_scout',
        status: 'active',
        batch_id: 45,
        recognition_code: 'REC-45-NOSCOUT'
      };

      await generateSingleCertificatePdf({
        member: noScoutMember,
        batch: mockBatch,
        recognition: mockRecognition,
        hierarchy: mockHierarchy
      });

      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Colaborador Externo',
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'No Scout',
        expect.any(Number),
        expect.any(Number),
        { align: 'left', baseline: 'middle' }
      );
    });

    it('generates certificate with custom template dimensions, background image, and custom field styling', async () => {
      const customTemplate: CertificateTemplate = {
        background_url: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoFAAUAPm0ukUekIicTIAA/v81t',
        page_width: 320,
        page_height: 240,
        aspect_ratio: 320 / 240,
        orientation: 'landscape',
        fields: [
          {
            id: 'field-1',
            field_key: 'full_name',
            label: 'Nombre',
            x: 50,
            y: 40,
            font_family: 'times',
            font_size: 28,
            font_weight: 'bold',
            color: '#1b7a37',
            align: 'center'
          },
          {
            id: 'field-2',
            field_key: 'identity',
            label: 'Cédula',
            x: 50,
            y: 52,
            font_family: 'courier',
            font_size: 16,
            font_weight: 'italic',
            color: '#333333',
            align: 'center'
          },
          {
            id: 'field-3',
            field_key: 'recognition_code',
            label: 'Código',
            x: 85,
            y: 90,
            font_family: 'helvetica',
            font_size: 12,
            font_weight: 'normal',
            color: '#8c4e37',
            align: 'right'
          }
        ]
      };

      const customRec: RecognitionType = {
        ...mockRecognition,
        template: customTemplate
      };

      const memberWithoutCode: ScoutMember = {
        ...mockActiveMember,
        recognition_code: undefined
      };

      await generateSingleCertificatePdf({
        member: memberWithoutCode,
        batch: mockBatch,
        recognition: customRec,
        hierarchy: mockHierarchy
      });

      // Check that custom background image was injected with normalized millimeter dimensions
      expect(mockDocInstance.addImage).toHaveBeenCalledWith(
        customTemplate.background_url,
        'WEBP',
        0,
        0,
        297,
        222.75
      );

      // Check field 1: full_name (times, bold, 28pt, #1b7a37 -> 27, 122, 55, x=148.5, y=89.1)
      expect(mockDocInstance.setFont).toHaveBeenCalledWith('times', 'bold');
      expect(mockDocInstance.setFontSize).toHaveBeenCalledWith(28);
      expect(mockDocInstance.setTextColor).toHaveBeenCalledWith(27, 122, 55);
      expect(mockDocInstance.text).toHaveBeenCalledWith('Carlos Eduardo Mendoza', 148.5, 89.1, { align: 'center', baseline: 'middle' });

      // Check field 2: identity (courier, italic, 16pt, #333333 -> 51, 51, 51, x=148.5, y=115.83)
      expect(mockDocInstance.setFont).toHaveBeenCalledWith('courier', 'italic');
      expect(mockDocInstance.setFontSize).toHaveBeenCalledWith(16);
      expect(mockDocInstance.setTextColor).toHaveBeenCalledWith(51, 51, 51);
      expect(mockDocInstance.text).toHaveBeenCalledWith('V-18.234.567', 148.5, 115.83, { align: 'center', baseline: 'middle' });

      // Check field 3: default fallback recognition_code generation `REC-045-.567` (helvetica, normal, 12pt, #8c4e37 -> 140, 78, 55, x=252.45, y=200.48)
      expect(mockDocInstance.setFont).toHaveBeenCalledWith('helvetica', 'normal');
      expect(mockDocInstance.setFontSize).toHaveBeenCalledWith(12);
      expect(mockDocInstance.setTextColor).toHaveBeenCalledWith(140, 78, 55);
      expect(mockDocInstance.text).toHaveBeenCalledWith('REC-045-.567', 252.45, 200.48, { align: 'right', baseline: 'middle' });
    });

    it('normalizes high resolution portrait background (2657 x 3438) and stamps text at exact normalized coordinates', async () => {
      const highResPortraitTemplate: CertificateTemplate = {
        background_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
        page_width: 2657,
        page_height: 3438,
        aspect_ratio: 2657 / 3438,
        orientation: 'portrait',
        fields: [
          {
            id: 'field-name',
            field_key: 'full_name',
            label: 'Nombre y Apellido',
            x: 50,
            y: 45,
            font_family: 'helvetica',
            font_size: 28,
            font_weight: 'bold',
            color: '#1b7a37',
            align: 'center'
          },
          {
            id: 'field-id',
            field_key: 'identity',
            label: 'Cédula',
            x: 50,
            y: 52,
            font_family: 'helvetica',
            font_size: 14,
            font_weight: 'normal',
            color: '#333333',
            align: 'center'
          }
        ]
      };

      const highResRec: RecognitionType = {
        ...mockRecognition,
        template: highResPortraitTemplate
      };

      await generateSingleCertificatePdf({
        member: mockActiveMember,
        batch: mockBatch,
        recognition: highResRec,
        hierarchy: mockHierarchy
      });

      // Normalized portrait dimensions: 229.53 x 297 mm
      expect(mockDocInstance.addImage).toHaveBeenCalledWith(
        highResPortraitTemplate.background_url,
        'JPEG',
        0,
        0,
        229.53,
        297
      );

      // Check field 1: x = 50% * 229.53 = 114.77, y = 45% * 297 = 133.65
      expect(mockDocInstance.setFontSize).toHaveBeenCalledWith(28);
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Carlos Eduardo Mendoza',
        114.77,
        133.65,
        { align: 'center', baseline: 'middle' }
      );

      // Check field 2: x = 50% * 229.53 = 114.77, y = 52% * 297 = 154.44
      expect(mockDocInstance.setFontSize).toHaveBeenCalledWith(14);
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'V-18.234.567',
        114.77,
        154.44,
        { align: 'center', baseline: 'middle' }
      );
    });

    it('fetches hierarchy and recognition from Firestore if not provided in arguments', async () => {
      // Mock getHierarchyData (3 Firestore getDocs)
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce({
          docs: [{ data: () => ({ id: 1, name: 'Región Capital' }) }]
        } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>)
        .mockResolvedValueOnce({
          docs: [{ data: () => ({ id: 10, name: 'Distrito Metropolitano', region_id: 1 }) }]
        } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>)
        .mockResolvedValueOnce({
          docs: [{ data: () => ({ id: 100, name: 'Grupo Scouts 45 San Jorge', district_id: 10 }) }]
        } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      // Mock getRecognitionTypeById (Firestore getDoc)
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'sct-wood-badge',
        data: () => ({
          name: 'Insignia de Madera',
          created_at: '2026-01-01T00:00:00.000Z'
        })
      } as unknown as Awaited<ReturnType<typeof firestore.getDoc>>);

      await generateSingleCertificatePdf({
        member: mockActiveMember,
        batch: mockBatch
      });

      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Insignia de Madera',
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('downloadSingleCertificatePdf', () => {
    it('generates PDF, calls doc.save and returns formatted filename', async () => {
      const fileName = await downloadSingleCertificatePdf({
        member: mockActiveMember,
        batch: mockBatch,
        recognition: mockRecognition,
        hierarchy: mockHierarchy
      });

      expect(fileName).toBe('Diploma_V-18_234_567_Lote_45_insignia_de_madera.pdf');
      expect(mockDocInstance.save).toHaveBeenCalledWith('Diploma_V-18_234_567_Lote_45_insignia_de_madera.pdf');
    });
  });

    it('generates single certificate for exceptional member', async () => {
      const exceptionalMember: ScoutMember = {
        identity: 'V-30.123.456',
        first_names: 'Elena',
        last_names: 'Vasquez',
        birth_date: '2006-04-12',
        member_type: 'young',
        status: 'exceptional',
        batch_id: 45,
        recognition_code: 'REC-EXC-001'
      };

      const fileName = await downloadSingleCertificatePdf({
        member: exceptionalMember,
        batch: mockBatch,
        recognition: mockRecognition,
        hierarchy: mockHierarchy
      });

      expect(fileName).toBe('Diploma_V-30_123_456_Lote_45_insignia_de_madera.pdf');
      expect(mockDocInstance.save).toHaveBeenCalledWith('Diploma_V-30_123_456_Lote_45_insignia_de_madera.pdf');
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Elena Vasquez',
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

  describe('generateBatchCertificatesPdf', () => {
    it('generates multi-page PDF for active and exceptional members and excludes pending members', async () => {
      const members = [
        mockActiveMember,
        mockPendingMember,
        {
          identity: 'V-15.111.222',
          first_names: 'Mariana',
          last_names: 'Rojas',
          birth_date: '2001-09-10',
          member_type: 'adult',
          status: 'exceptional',
          batch_id: 45,
          recognition_code: 'REC-45-002'
        } as ScoutMember
      ];

      const fileName = await generateBatchCertificatesPdf({
        batch: mockBatch,
        members,
        recognition: mockRecognition,
        hierarchy: mockHierarchy
      });

      expect(fileName).toBe('Diplomas_Lote_45_insignia_de_madera.pdf');
      expect(mockDocInstance.save).toHaveBeenCalledWith('Diplomas_Lote_45_insignia_de_madera.pdf');

      // 1 active + 1 exceptional member = 2 eligible -> 1 addPage call for the second member
      expect(mockDocInstance.addPage).toHaveBeenCalledTimes(1);
      expect(mockDocInstance.addPage).toHaveBeenCalledWith([297, 210], 'landscape');

      // Both active and exceptional members rendered
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Carlos Eduardo Mendoza',
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
      expect(mockDocInstance.text).toHaveBeenCalledWith(
        'Mariana Rojas',
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );

      // Pending member excluded
      expect(mockDocInstance.text).not.toHaveBeenCalledWith(
        'Pedro Gomez',
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('throws an error if no active or exceptional members exist in the batch', async () => {
      const onlyPendingMembers = [mockPendingMember];

      await expect(
        generateBatchCertificatesPdf({
          batch: mockBatch,
          members: onlyPendingMembers,
          recognition: mockRecognition,
          hierarchy: mockHierarchy
        })
      ).rejects.toThrow('No hay miembros habilitados (activos o con emisión excepcional) en este lote para generar diplomas');
    });
  });

  describe('renderCertificatePage edge cases', () => {
    it('detects PNG and JPEG background formats correctly', () => {
      const pngTemplate: CertificateTemplate = {
        background_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        page_width: 297,
        page_height: 210,
        orientation: 'landscape',
        fields: []
      };

      renderCertificatePage(mockDocInstance as unknown as jsPDF, {
        member: mockActiveMember,
        batch: mockBatch,
        template: pngTemplate,
        width: 297,
        height: 210
      });

      expect(mockDocInstance.addImage).toHaveBeenCalledWith(
        pngTemplate.background_url,
        'PNG',
        0,
        0,
        297,
        210
      );

      const jpegTemplate: CertificateTemplate = {
        background_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
        page_width: 297,
        page_height: 210,
        orientation: 'landscape',
        fields: []
      };

      renderCertificatePage(mockDocInstance as unknown as jsPDF, {
        member: mockActiveMember,
        batch: mockBatch,
        template: jpegTemplate,
        width: 297,
        height: 210
      });

      expect(mockDocInstance.addImage).toHaveBeenCalledWith(
        jpegTemplate.background_url,
        'JPEG',
        0,
        0,
        297,
        210
      );
    });
  });
});
