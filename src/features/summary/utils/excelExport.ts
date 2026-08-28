import { SummaryRowData } from '../types';

export const SUMMARY_EXCEL_HEADERS = [
  'Fecha de Emisión',
  'Lote',
  'Reconocimiento',
  'Cédula',
  'Nombres',
  'Apellidos',
  'Unidad',
  'Tipo',
  'Estatus',
  'Justificación Excepcional',
  'Código de Reconocimiento',
  'Región',
  'Distrito',
  'Grupo'
];

export function formatSummaryRowForExport(row: SummaryRowData): string[] {
  return [
    row.issueDate || '',
    row.batchCode || '',
    row.recognitionName || '',
    row.identity || '',
    row.firstName || '',
    row.lastName || '',
    row.unitLabel || '',
    row.memberTypeLabel || '',
    row.statusLabel || '',
    row.exceptionalReason || '',
    row.recognitionCode || '',
    row.regionName || '',
    row.districtName || '',
    row.groupName || ''
  ];
}

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }
  let str: string;
  if (typeof val === 'string') {
    str = val;
  } else if (typeof val === 'number' || typeof val === 'boolean') {
    str = String(val);
  } else {
    str = JSON.stringify(val);
  }
  return `"${str.replaceAll('"', '""')}"`;
}

export function generateSummaryCsv(data: SummaryRowData[]): string {
  const headerRow = SUMMARY_EXCEL_HEADERS.map(escapeCsvField).join(',');
  const dataRows = data.map(row => formatSummaryRowForExport(row).map(escapeCsvField).join(','));
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

export function exportToExcel(data: SummaryRowData[], filename?: string): void {
  const defaultFilename = `Resumen_Reconocimientos_${new Date().toISOString().split('T')[0]}.csv`;
  let targetFilename = filename?.trim() || defaultFilename;

  // Ensure appropriate extension
  if (!targetFilename.toLowerCase().endsWith('.csv') && !targetFilename.toLowerCase().endsWith('.xlsx')) {
    targetFilename = `${targetFilename}.csv`;
  }

  const csvContent = generateSummaryCsv(data);

  if (typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', targetFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
