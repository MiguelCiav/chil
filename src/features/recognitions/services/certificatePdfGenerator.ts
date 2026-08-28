import { jsPDF } from 'jspdf';
import { Batch, ScoutMember, Region, District, ScoutGroup, getUnitLabel } from '../../batches/types';
import { getHierarchyData } from '../../batches/api';
import { getRecognitionTypeById } from '../api';
import {
  RecognitionType,
  CertificateTemplate,
  RecognitionFieldConfig,
  RecognitionFieldKey,
  AVAILABLE_TEMPLATE_FIELDS
} from '../types';

export interface HierarchyData {
  regions: Region[];
  districts: District[];
  groups: ScoutGroup[];
}

export interface SingleCertificateParams {
  member: ScoutMember;
  batch: Batch;
  recognition?: RecognitionType | null;
  hierarchy?: HierarchyData;
}

export interface BatchCertificatesParams {
  batch: Batch;
  members: ScoutMember[];
  recognition?: RecognitionType | null;
  hierarchy?: HierarchyData;
}

/**
 * Converts a hex color string (e.g. "#1b7a37" or "#fff") to RGB numbers.
 */
export function hexToRgb(hex?: string): { r: number; g: number; b: number } {
  if (!hex) {
    return { r: 33, g: 33, b: 33 };
  }
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) {
    return { r: 33, g: 33, b: 33 };
  }
  const num = Number.parseInt(cleanHex, 16);
  if (Number.isNaN(num)) {
    return { r: 33, g: 33, b: 33 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Formats an ISO date string to Spanish short format (e.g. "12 Oct 2026").
 */
export function formatIssueDate(dateStr?: string): string {
  if (!dateStr) return '12 Oct 2026';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = d.getUTCDate();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Sanitizes a string into a clean filename slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Normalizes certificate page dimensions to standard physical millimeter print sizes
 * while strictly preserving the image's aspect ratio.
 *
 * - Landscape (AR >= 1): Base width = 297 mm (A4 width), height = Math.round((297 / AR) * 100) / 100 mm.
 * - Portrait (AR < 1): Base height = 297 mm (A4 height), width = Math.round((297 * AR) * 100) / 100 mm.
 */
export interface NormalizedPageDimensions {
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  aspectRatio: number;
}

export function getNormalizedPageDimensions(
  template?: CertificateTemplate
): NormalizedPageDimensions {
  let ar: number | undefined = template?.aspect_ratio;
  if (!ar && template?.page_width && template?.page_height) {
    ar = template.page_width / template.page_height;
  }
  if (!ar || Number.isNaN(ar) || ar <= 0) {
    ar = template?.orientation === 'portrait' ? 210 / 297 : 297 / 210;
  }

  const orientation: 'landscape' | 'portrait' = ar >= 1 ? 'landscape' : 'portrait';
  let width: number;
  let height: number;

  if (orientation === 'landscape') {
    width = 297;
    height = Math.round((297 / ar) * 100) / 100;
  } else {
    height = 297;
    width = Math.round((297 * ar) * 100) / 100;
  }

  return {
    width,
    height,
    orientation,
    aspectRatio: ar
  };
}

function drawStandardScoutBorder(doc: jsPDF, width: number, height: number): void {
  // Outer border
  doc.setDrawColor(27, 122, 55); // Scout Green #1b7a37
  doc.setLineWidth(1.2);
  doc.rect(10, 10, width - 20, height - 20);

  // Inner border
  doc.setDrawColor(140, 78, 55); // Terracotta #8c4e37
  doc.setLineWidth(0.4);
  doc.rect(13, 13, width - 26, height - 26);

  // Decorative corner markers
  doc.setDrawColor(27, 122, 55);
  doc.setLineWidth(0.8);
  doc.line(10, 18, 18, 10);
  doc.line(width - 10, 18, width - 18, 10);
  doc.line(10, height - 18, 18, height - 10);
  doc.line(width - 10, height - 18, width - 18, height - 10);

  // Official Header
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(27, 122, 55);
  doc.text('ASOCIACIÓN DE SCOUTS DE VENEZUELA', width / 2, 24, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('CERTIFICADO OFICIAL DE RECONOCIMIENTO', width / 2, 30, { align: 'center' });

  // Watermark footer info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text('Fondo Estándar Scout', 16, height - 14);
  doc.text(`Formato ${width} × ${height} mm`, width - 16, height - 14, { align: 'right' });
}

function getImageFormatFromUrl(url: string): string {
  if (url.startsWith('data:image/png')) return 'PNG';
  if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) return 'JPEG';
  return 'WEBP';
}

function drawCertificateBackground(
  doc: jsPDF,
  backgroundUrl: string | undefined,
  width: number,
  height: number
): void {
  if (backgroundUrl && backgroundUrl.trim().length > 0) {
    const format = getImageFormatFromUrl(backgroundUrl);
    doc.addImage(backgroundUrl, format, 0, 0, width, height);
  } else {
    drawStandardScoutBorder(doc, width, height);
  }
}

function resolveHierarchyName(id?: number, list?: Array<{ id: number; name: string }>): string {
  if (!id || id === 0) return '-';
  const found = list?.find(item => item.id === id)?.name;
  if (!found || found.toLowerCase() === 'no aplica') return '-';
  return found;
}

/**
 * Interpolates certificate variables into mapped text key-values.
 */
export function interpolateCertificateVariables(params: {
  member: ScoutMember;
  batch: Batch;
  recognition?: RecognitionType | null;
  hierarchy?: HierarchyData;
}): Record<RecognitionFieldKey, string> {
  const { member, batch, recognition, hierarchy } = params;
  const regionName = resolveHierarchyName(batch.region_id, hierarchy?.regions);
  const districtName = resolveHierarchyName(batch.district_id, hierarchy?.districts);
  const groupName = resolveHierarchyName(batch.group_id, hierarchy?.groups);
  const recognitionName = recognition?.name ?? batch.recognition_type ?? 'Reconocimiento Scout';
  const issueDate = formatIssueDate(batch.created_at);
  const last4 = member.identity.length >= 4 ? member.identity.slice(-4) : member.identity;
  const recognitionCode =
    member.recognition_code || `REC-${String(batch.id).padStart(3, '0')}-${last4}`;

  return {
    full_name: `${member.first_names} ${member.last_names}`.trim(),
    identity: member.identity,
    recognition_name: recognitionName,
    region: regionName,
    district: districtName,
    group: groupName,
    unit: getUnitLabel(member.unit),
    issue_date: issueDate,
    recognition_code: recognitionCode
  };
}

export function resolveFieldsToRender(template?: CertificateTemplate): RecognitionFieldConfig[] {
  if (template?.fields && template.fields.length > 0) {
    return template.fields;
  }
  return AVAILABLE_TEMPLATE_FIELDS.map(def => ({
    id: `field-${def.field_key}`,
    field_key: def.field_key,
    label: def.label,
    x: def.default_x,
    y: def.default_y,
    font_family: def.default_font_family,
    font_size: def.default_font_size,
    font_weight: def.default_font_weight,
    color: def.default_color,
    align: def.default_align
  }));
}

function getFontFamily(fontFamily?: string): 'times' | 'courier' | 'helvetica' {
  if (fontFamily === 'times') return 'times';
  if (fontFamily === 'courier') return 'courier';
  return 'helvetica';
}

function getFontWeight(fontWeight?: string): 'bold' | 'italic' | 'normal' {
  if (fontWeight === 'bold') return 'bold';
  if (fontWeight === 'italic') return 'italic';
  return 'normal';
}

function drawSingleField(
  doc: jsPDF,
  field: RecognitionFieldConfig,
  value: string,
  width: number,
  height: number
): void {
  const x = Math.round(((field.x / 100) * width) * 100) / 100;
  const y = Math.round(((field.y / 100) * height) * 100) / 100;

  doc.setFont(getFontFamily(field.font_family), getFontWeight(field.font_weight));
  doc.setFontSize(field.font_size);

  const { r, g, b } = hexToRgb(field.color);
  doc.setTextColor(r, g, b);

  doc.text(value, x, y, {
    align: field.align,
    baseline: 'middle'
  });
}

/**
 * Renders a single certificate page onto a jsPDF document instance.
 */
export function renderCertificatePage(
  doc: jsPDF,
  options: {
    member: ScoutMember;
    batch: Batch;
    recognition?: RecognitionType | null;
    hierarchy?: HierarchyData;
    template?: CertificateTemplate;
    width?: number;
    height?: number;
  }
): void {
  const { member, batch, recognition, hierarchy, template } = options;
  const normalized = getNormalizedPageDimensions(template);
  const width = options.width ?? normalized.width;
  const height = options.height ?? normalized.height;

  drawCertificateBackground(doc, template?.background_url, width, height);

  const valuesMap = interpolateCertificateVariables({ member, batch, recognition, hierarchy });
  const fieldsToRender = resolveFieldsToRender(template);

  for (const field of fieldsToRender) {
    const value = valuesMap[field.field_key];
    if (value !== undefined && value !== null) {
      drawSingleField(doc, field, value, width, height);
    }
  }
}

async function resolvePdfContext(
  batch: Batch,
  recognition?: RecognitionType | null,
  hierarchy?: HierarchyData
): Promise<{ resolvedRecognition?: RecognitionType | null; resolvedHierarchy: HierarchyData }> {
  const resolvedHierarchy = hierarchy ?? (await getHierarchyData());
  let resolvedRecognition = recognition;
  if (resolvedRecognition === undefined && batch.recognition_type) {
    resolvedRecognition = await getRecognitionTypeById(batch.recognition_type);
  }
  return { resolvedRecognition, resolvedHierarchy };
}

/**
 * Generates a single certificate jsPDF instance for a member.
 */
export async function generateSingleCertificatePdf(
  params: SingleCertificateParams
): Promise<jsPDF> {
  const { member, batch, recognition, hierarchy } = params;
  const { resolvedRecognition, resolvedHierarchy } = await resolvePdfContext(batch, recognition, hierarchy);

  const template = resolvedRecognition?.template;
  const { width, height, orientation } = getNormalizedPageDimensions(template);

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [width, height]
  });

  renderCertificatePage(doc, {
    member,
    batch,
    recognition: resolvedRecognition,
    hierarchy: resolvedHierarchy,
    template,
    width,
    height
  });

  return doc;
}

/**
 * Generates and downloads a single certificate PDF file.
 */
export async function downloadSingleCertificatePdf(
  params: SingleCertificateParams
): Promise<string> {
  const doc = await generateSingleCertificatePdf(params);

  const sanitizedIdentity = params.member.identity.replace(/[^a-zA-Z0-9_-]/g, '_');
  const slug = slugify(params.recognition?.name ?? params.batch.recognition_type ?? 'Reconocimiento');
  const fileName = `Reconocimiento_${sanitizedIdentity}_Lote_${params.batch.id}_${slug}.pdf`;

  doc.save(fileName);
  return fileName;
}

/**
 * Generates and downloads a multi-page certificate PDF containing all active and exceptional members of a batch.
 */
export async function generateBatchCertificatesPdf(
  params: BatchCertificatesParams
): Promise<string> {
  const { batch, members, recognition, hierarchy } = params;

  const eligibleMembers = members.filter(m => m.status === 'active' || m.status === 'exceptional');
  if (eligibleMembers.length === 0) {
    throw new Error(
      'No hay miembros habilitados (activos o con emisión excepcional) en este lote para generar reconocimientos'
    );
  }

  const { resolvedRecognition, resolvedHierarchy } = await resolvePdfContext(batch, recognition, hierarchy);

  const template = resolvedRecognition?.template;
  const { width, height, orientation } = getNormalizedPageDimensions(template);

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [width, height]
  });

  eligibleMembers.forEach((member, index) => {
    if (index > 0) {
      doc.addPage([width, height], orientation);
    }
    renderCertificatePage(doc, {
      member,
      batch,
      recognition: resolvedRecognition,
      hierarchy: resolvedHierarchy,
      template,
      width,
      height
    });
  });

  const slug = slugify(resolvedRecognition?.name ?? batch.recognition_type ?? 'Reconocimientos');
  const fileName = `Reconocimientos_Lote_${batch.id}_${slug}.pdf`;

  doc.save(fileName);
  return fileName;
}
