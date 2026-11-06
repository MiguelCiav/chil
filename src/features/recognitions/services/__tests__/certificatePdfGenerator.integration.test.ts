import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import {
  generateSingleCertificatePdf,
  generateBatchCertificatesPdf,
  generateBatchCertificatesZip,
  renderCertificatePage,
  registerCustomFonts,
  setCachedScoutsPlanarFontBase64,
  SCOUTS_PLANAR_FONT_NAME,
  CERTIFICATE_BG_IMAGE_ALIAS,
  BatchGenerationProgress
} from '../certificatePdfGenerator';
import { Batch, ScoutMember } from '../../../../types';
import { RecognitionType, CertificateTemplate } from '../../types';

// Valid 1x1 RGB PNG Base64 data URL for real jsPDF PNG decoder testing
const VALID_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const mockBatch: Batch = {
  id: 101,
  comment: 'Lote Integración Binaria Real',
  region_id: 1,
  district_id: 10,
  group_id: 100,
  recognition_type: 'sct-orden-merito',
  created_at: '2026-10-12T10:00:00.000Z'
};

const mockHierarchy = {
  regions: [{ id: 1, name: 'Región Metropolitana' }],
  districts: [{ id: 10, name: 'Distrito Ávila', region_id: 1 }],
  groups: [{ id: 100, name: 'Grupo Scout Bolívar N° 24', district_id: 10 }]
};

const mockSpanishMember: ScoutMember = {
  identity: 'V-18.456.789',
  first_names: 'Ángel José',
  last_names: 'Gómez Peña',
  birth_date: '1992-05-15',
  member_type: 'adult',
  unit: 'tropa',
  status: 'active',
  batch_id: 101,
  recognition_code: 'REC-101-789'
};

function decodeBufferAscii(buffer: ArrayBuffer): string {
  return new TextDecoder('latin1').decode(new Uint8Array(buffer));
}

// Bridge jsPDF's internal instance `save` property to `jsPDF.prototype.save` via jsPDF's official
// `initialized` plugin hook so `vi.spyOn(jsPDF.prototype, 'save')` intercepts all `.save()` calls.
if (typeof jsPDF.prototype.save !== 'function') {
  jsPDF.prototype.save = function (this: jsPDF) {
    return this;
  } as typeof jsPDF.prototype.save;
}
const jsPdfApi = (jsPDF as unknown as { API?: { events?: Array<[string, (this: jsPDF) => void]> } }).API;
jsPdfApi?.events?.push([
  'initialized',
  function (this: jsPDF) {
    this.save = ((filename?: string) => jsPDF.prototype.save.call(this, filename)) as typeof this.save;
  }
]);

describe('certificatePdfGenerator — Real Binary jsPDF & JSZip Integration Suite (P2.3)', () => {
  let saveSpy: ReturnType<typeof vi.spyOn>;
  let lastSavedPdfBuffer: ArrayBuffer | null = null;

  beforeEach(() => {
    lastSavedPdfBuffer = null;
    setCachedScoutsPlanarFontBase64(null);

    // Spy ONLY on prototype.save to prevent file download/write side-effects while keeping all real jsPDF compilation intact
    saveSpy = vi.spyOn(jsPDF.prototype, 'save').mockImplementation(function (this: jsPDF) {
      lastSavedPdfBuffer = this.output('arraybuffer');
      return this;
    });
  });

  afterEach(() => {
    saveSpy.mockRestore();
    setCachedScoutsPlanarFontBase64(null);
  });

  it('1. Valid Binary PDF Header & Spanish Accents: compiles a real PDF starting with %PDF- containing Spanish characters', async () => {
    const recognition: RecognitionType = {
      id: 'sct-orden-merito',
      name: 'Cédula de Reconocimiento al Mérito Escultista',
      created_at: '2026-01-01T00:00:00.000Z',
      template: {
        background_url: '',
        page_width: 297,
        page_height: 210,
        aspect_ratio: 297 / 210,
        orientation: 'landscape',
        fields: [
          {
            id: 'f-name',
            field_key: 'full_name',
            label: 'Nombre Completo',
            x: 50,
            y: 45,
            font_family: 'helvetica',
            font_size: 26,
            font_weight: 'bold',
            color: '#1b7a37',
            align: 'center'
          },
          {
            id: 'f-region',
            field_key: 'region',
            label: 'Región',
            x: 50,
            y: 60,
            font_family: 'times',
            font_size: 16,
            font_weight: 'normal',
            color: '#212121',
            align: 'center'
          },
          {
            id: 'f-id',
            field_key: 'identity',
            label: 'Cédula',
            x: 50,
            y: 72,
            font_family: 'courier',
            font_size: 14,
            font_weight: 'normal',
            color: '#333333',
            align: 'center'
          },
          {
            id: 'f-rec',
            field_key: 'recognition_name',
            label: 'Cédula / Distinción',
            x: 50,
            y: 30,
            font_family: 'helvetica',
            font_size: 18,
            font_weight: 'bold',
            color: '#8c4e37',
            align: 'center'
          }
        ]
      }
    };

    const doc = await generateSingleCertificatePdf({
      member: mockSpanishMember,
      batch: mockBatch,
      recognition,
      hierarchy: mockHierarchy
    });

    const pdfBuffer = doc.output('arraybuffer');
    expect(pdfBuffer).toBeInstanceOf(ArrayBuffer);
    expect(pdfBuffer.byteLength).toBeGreaterThan(500);

    const rawPdfText = decodeBufferAscii(pdfBuffer);
    // Verify valid PDF binary signature header and EOF marker
    expect(rawPdfText.startsWith('%PDF-')).toBe(true);
    expect(rawPdfText).toContain('%%EOF');

    // Verify Spanish characters ("Ángel José Gómez Peña", "Región Metropolitana", "Cédula") are encoded in the PDF stream
    expect(rawPdfText).toContain('Ángel José Gómez Peña');
    expect(rawPdfText).toContain('Región Metropolitana');
    expect(rawPdfText).toContain('Cédula de Reconocimiento al Mérito Escultista');
  });

  it('2. Image Alias Memory Deduplication Benchmark (P0.1): deduplicates cert_bg_image XObject across a 20-member multi-page PDF', async () => {
    const templateWithPngBg: CertificateTemplate = {
      background_url: VALID_PNG_DATA_URL,
      page_width: 297,
      page_height: 210,
      aspect_ratio: 297 / 210,
      orientation: 'landscape',
      fields: [
        {
          id: 'f-name',
          field_key: 'full_name',
          label: 'Nombre',
          x: 50,
          y: 50,
          font_family: 'helvetica',
          font_size: 24,
          font_weight: 'bold',
          color: '#1b7a37',
          align: 'center'
        }
      ]
    };

    const recognitionWithBg: RecognitionType = {
      id: 'sct-bg-bench',
      name: 'Reconocimiento con Fondo PNG',
      created_at: '2026-01-01T00:00:00.000Z',
      template: templateWithPngBg
    };

    // 1-member PDF
    const singleDoc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [297, 210]
    });
    renderCertificatePage(singleDoc, {
      member: mockSpanishMember,
      batch: mockBatch,
      recognition: recognitionWithBg,
      hierarchy: mockHierarchy,
      template: templateWithPngBg,
      width: 297,
      height: 210
    });
    const singlePageBuffer = singleDoc.output('arraybuffer');
    const singlePageBytes = singlePageBuffer.byteLength;

    // 20-member multi-page PDF via generateBatchCertificatesPdf
    const twentyMembers: ScoutMember[] = Array.from({ length: 20 }, (_, i) => ({
      ...mockSpanishMember,
      identity: `V-${10000000 + i}`,
      first_names: `Scout Miembro ${i + 1}`,
      last_names: 'Pérez Bolívar'
    }));

    const fileName = await generateBatchCertificatesPdf(
      {
        batch: mockBatch,
        members: twentyMembers,
        recognition: recognitionWithBg,
        hierarchy: mockHierarchy
      },
      { chunkSize: 10 }
    );

    expect(fileName).toContain('Reconocimientos_Lote_101');
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(lastSavedPdfBuffer).not.toBeNull();

    const twentyPageBuffer = lastSavedPdfBuffer!;
    const twentyPageBytes = twentyPageBuffer.byteLength;
    const rawSinglePagePdf = decodeBufferAscii(singlePageBuffer);
    const rawTwentyPagePdf = decodeBufferAscii(twentyPageBuffer);

    expect(rawTwentyPagePdf.startsWith('%PDF-')).toBe(true);
    expect(CERTIFICATE_BG_IMAGE_ALIAS).toBe('cert_bg_image');

    // Verify that the 20-page PDF embeds the exact same number of Image XObjects as a 1-page PDF
    // (1 RGB stream + 1 SMask stream = 2 total, rather than 40 across 20 pages), and only defines /I0 (never /I1..I19)
    const singlePageImageXObjects = rawSinglePagePdf.match(/\/Subtype\s*\/Image/g) ?? [];
    const twentyPageImageXObjects = rawTwentyPagePdf.match(/\/Subtype\s*\/Image/g) ?? [];
    expect(twentyPageImageXObjects.length).toBe(singlePageImageXObjects.length);
    expect(rawTwentyPagePdf).toContain('/I0');
    expect(rawTwentyPagePdf).not.toContain('/I1');

    // Verify 20-page PDF remains compact (well under 6x the 1-page PDF size, rather than 20x image duplication)
    expect(twentyPageBytes).toBeGreaterThan(singlePageBytes);
    expect(twentyPageBytes).toBeLessThan(singlePageBytes * 6);
  });

  it('3. TrueType Font Embedding (Scouts-GT-Planar-Bold.ttf, P0.3): embeds real TTF font into jsPDF VFS and compiles valid PDF', async () => {
    const fontPath = resolve(process.cwd(), 'public/fonts/Scouts-GT-Planar-Bold.ttf');
    const fontBase64 = readFileSync(fontPath, 'base64');
    expect(fontBase64.length).toBeGreaterThan(1000);

    setCachedScoutsPlanarFontBase64(fontBase64);

    const recognitionWithCustomFont: RecognitionType = {
      id: 'sct-ttf-test',
      name: 'Orden del León Dorado',
      created_at: '2026-01-01T00:00:00.000Z',
      template: {
        background_url: VALID_PNG_DATA_URL,
        page_width: 297,
        page_height: 210,
        aspect_ratio: 297 / 210,
        orientation: 'landscape',
        fields: [
          {
            id: 'f-planar-name',
            field_key: 'full_name',
            label: 'Nombre en Scouts GT Planar',
            x: 50,
            y: 45,
            font_family: 'scouts-gt-planar-bold',
            font_size: 28,
            font_weight: 'bold',
            color: '#1b7a37',
            align: 'center'
          },
          {
            id: 'f-planar-region',
            field_key: 'region',
            label: 'Región',
            x: 50,
            y: 60,
            font_family: 'scouts-gt-planar-bold',
            font_size: 16,
            font_weight: 'normal',
            color: '#333333',
            align: 'center'
          }
        ]
      }
    };

    const doc = await generateSingleCertificatePdf({
      member: mockSpanishMember,
      batch: mockBatch,
      recognition: recognitionWithCustomFont,
      hierarchy: mockHierarchy
    });

    // Also verify direct registerCustomFonts call returns true on a fresh jsPDF instance
    const manualDoc = new jsPDF();
    expect(registerCustomFonts(manualDoc, fontBase64)).toBe(true);

    const fontList = doc.getFontList();
    expect(fontList).toHaveProperty(SCOUTS_PLANAR_FONT_NAME);
    expect(fontList[SCOUTS_PLANAR_FONT_NAME]).toEqual(expect.arrayContaining(['bold', 'normal']));

    const pdfBuffer = doc.output('arraybuffer');
    expect(pdfBuffer.byteLength).toBeGreaterThan(5000);

    const rawPdfText = decodeBufferAscii(pdfBuffer);
    expect(rawPdfText.startsWith('%PDF-')).toBe(true);
    // Verify TrueType / CIDFont descriptors are embedded in the binary PDF
    expect(rawPdfText).toMatch(/\/Subtype\s*\/CIDFontType2|\/FontFile2/);
  });

  it('4. Real ZIP Archive Generation & Progress Callback (P1.2): generates a real non-empty ZIP Blob containing valid PDFs and reaches 100% progress', async () => {
    let capturedBlob: Blob | null = null;

    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalRevokeObjectURL = window.URL.revokeObjectURL;
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    window.URL.createObjectURL = vi.fn((obj: Blob | MediaSource) => {
      if (obj instanceof Blob) {
        capturedBlob = obj;
      }
      return 'blob:http://localhost/real-integration-zip';
    });
    window.URL.revokeObjectURL = vi.fn();

    try {
      const members: ScoutMember[] = [
        mockSpanishMember,
        {
          ...mockSpanishMember,
          identity: 'V-22.333.444',
          first_names: 'María Gabriela',
          last_names: 'Rodríguez Ñañez',
          status: 'exceptional'
        },
        {
          ...mockSpanishMember,
          identity: 'V-25.666.777',
          first_names: 'Andrés',
          last_names: 'Bello Sucre',
          status: 'active'
        }
      ];

      const progressSteps: BatchGenerationProgress[] = [];

      const zipFileName = await generateBatchCertificatesZip(
        {
          batch: mockBatch,
          members,
          recognition: {
            id: 'sct-orden-merito',
            name: 'Orden al Mérito Scout',
            created_at: '2026-01-01T00:00:00.000Z'
          },
          hierarchy: mockHierarchy
        },
        {
          chunkSize: 2,
          onProgress: (progress) => {
            progressSteps.push(progress);
          }
        }
      );

      expect(zipFileName).toBe('Reconocimientos_Lote_101_orden_al_merito_scout.zip');

      // Assert progress callback invocations up to percentage: 100
      expect(progressSteps).toEqual([
        { current: 1, total: 3, percentage: 33 },
        { current: 2, total: 3, percentage: 67 },
        { current: 3, total: 3, percentage: 100 }
      ]);
      expect(progressSteps[progressSteps.length - 1].percentage).toBe(100);

      // Assert real non-empty Blob was created and passed to download trigger
      expect(capturedBlob).not.toBeNull();
      expect(capturedBlob).toBeInstanceOf(Blob);
      expect(capturedBlob!.size).toBeGreaterThan(1000);

      // Unpack the real ZIP Blob with JSZip to verify each archived entry is a valid binary PDF
      const zipArrayBuffer = await capturedBlob!.arrayBuffer();
      const loadedZip = await JSZip.loadAsync(zipArrayBuffer);
      const entryNames = Object.keys(loadedZip.files);
      expect(entryNames).toHaveLength(3);

      for (const entryName of entryNames) {
        expect(entryName).toMatch(/^Reconocimiento_.*_Lote_101_orden_al_merito_scout\.pdf$/);
        const entryBytes = await loadedZip.files[entryName].async('uint8array');
        const header = new TextDecoder('latin1').decode(entryBytes.slice(0, 5));
        expect(header).toBe('%PDF-');
      }
    } finally {
      anchorClickSpy.mockRestore();
      window.URL.createObjectURL = originalCreateObjectURL;
      window.URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });
});
