import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportToExcel,
  generateSummaryCsv,
  formatSummaryRowForExport,
  SUMMARY_EXCEL_HEADERS
} from '../excelExport';
import { SummaryRowData } from '../../types';

describe('excelExport utility', () => {
  const sampleData: SummaryRowData[] = [
    {
      id: 'V-12345678-101',
      issueDate: '20 ago. 2026',
      rawDate: '2026-08-20T10:00:00.000Z',
      batchId: 101,
      batchCode: 'LT-2026-101',
      recognitionId: 'sct-go-solar',
      recognitionName: 'Go Solar',
      identity: 'V-12345678',
      firstName: 'Ana María',
      lastName: 'Pérez Gómez',
      fullName: 'Ana María Pérez Gómez',
      memberType: 'young',
      memberTypeLabel: 'Joven',
      status: 'active',
      statusLabel: 'Registro Válido',
      recognitionCode: 'SOL-001',
      regionName: 'Región Capital',
      districtName: 'Distrito Sucre',
      groupName: 'Grupo San Luis'
    },
    {
      id: 'V-87654321-102',
      issueDate: '21 ago. 2026',
      rawDate: '2026-08-21T11:00:00.000Z',
      batchId: 102,
      batchCode: 'LT-2026-102',
      recognitionId: 'sct-wood-badge',
      recognitionName: 'Insignia de Madera "2 Tramos"',
      identity: 'V-87654321',
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      fullName: 'Carlos Rodríguez',
      memberType: 'adult',
      memberTypeLabel: 'Adulto',
      status: 'pending',
      statusLabel: 'Registro Inválido',
      recognitionCode: 'WB-099',
      regionName: 'Región Andina',
      districtName: 'Distrito Norte',
      groupName: 'Grupo Scouts 45, Caracas'
    }
  ];

  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLMock = vi.fn(() => 'blob:mock-url');
    revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes all 12 required Spanish headers in the exact order', () => {
    expect(SUMMARY_EXCEL_HEADERS).toEqual([
      'Fecha de Emisión',
      'Lote',
      'Reconocimiento',
      'Cédula',
      'Nombres',
      'Apellidos',
      'Tipo',
      'Estatus',
      'Código de Reconocimiento',
      'Región',
      'Distrito',
      'Grupo'
    ]);
  });

  it('formats a single summary row data array accurately', () => {
    const formatted = formatSummaryRowForExport(sampleData[0]);
    expect(formatted).toEqual([
      '20 ago. 2026',
      'LT-2026-101',
      'Go Solar',
      'V-12345678',
      'Ana María',
      'Pérez Gómez',
      'Joven',
      'Registro Válido',
      'SOL-001',
      'Región Capital',
      'Distrito Sucre',
      'Grupo San Luis'
    ]);
  });

  it('generates CSV string with UTF-8 BOM encoding and quoted fields', () => {
    const csv = generateSummaryCsv(sampleData);
    // Starts with UTF-8 BOM
    expect(csv.startsWith('\uFEFF')).toBe(true);

    // Includes header line
    expect(csv).toContain(
      '"Fecha de Emisión","Lote","Reconocimiento","Cédula","Nombres","Apellidos","Tipo","Estatus","Código de Reconocimiento","Región","Distrito","Grupo"'
    );

    // Contains first row data
    expect(csv).toContain(
      '"20 ago. 2026","LT-2026-101","Go Solar","V-12345678","Ana María","Pérez Gómez","Joven","Registro Válido","SOL-001","Región Capital","Distrito Sucre","Grupo San Luis"'
    );

    // Properly escapes double quotes and commas
    expect(csv).toContain('"Insignia de Madera ""2 Tramos"""');
    expect(csv).toContain('"Grupo Scouts 45, Caracas"');
  });

  it('generates CSV correctly with empty data list', () => {
    const csv = generateSummaryCsv([]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe(
      '"Fecha de Emisión","Lote","Reconocimiento","Cédula","Nombres","Apellidos","Tipo","Estatus","Código de Reconocimiento","Región","Distrito","Grupo"'
    );
  });

  it('handles missing or undefined row fields gracefully', () => {
    const incompleteRow: SummaryRowData = {
      id: 'V-999-1',
      issueDate: '',
      rawDate: '',
      batchId: 1,
      batchCode: '',
      recognitionId: '',
      recognitionName: '',
      identity: 'V-999',
      firstName: '',
      lastName: '',
      fullName: '',
      memberType: 'young',
      memberTypeLabel: 'Joven',
      status: 'active',
      statusLabel: 'Registro Válido',
      recognitionCode: '',
      regionName: '',
      districtName: '',
      groupName: ''
    };

    const formatted = formatSummaryRowForExport(incompleteRow);
    expect(formatted).toEqual([
      '',
      '',
      '',
      'V-999',
      '',
      '',
      'Joven',
      'Registro Válido',
      '',
      '',
      '',
      ''
    ]);
  });

  it('triggers browser download with default filename when no filename is passed', () => {
    const clickSpy = vi.fn();
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(node => node);

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    exportToExcel(sampleData);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');

    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('triggers browser download with custom filename and appends .csv extension if missing', () => {
    let capturedFilename = '';
    const clickSpy = vi.fn();

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
        const origSetAttribute = el.setAttribute.bind(el);
        el.setAttribute = (name: string, value: string) => {
          if (name === 'download') {
            capturedFilename = value;
          }
          origSetAttribute(name, value);
        };
      }
      return el;
    });

    exportToExcel(sampleData, 'Reporte_Personalizado');
    expect(capturedFilename).toBe('Reporte_Personalizado.csv');

    exportToExcel(sampleData, 'Reporte_Personalizado.xlsx');
    expect(capturedFilename).toBe('Reporte_Personalizado.xlsx');
  });
});
