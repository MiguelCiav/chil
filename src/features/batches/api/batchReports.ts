import { jsPDF } from 'jspdf';
import { Batch, ScoutMember, Region, District, ScoutGroup } from '../types';
import { getBatchById } from './batchesCrud';
import { getMembersByBatchId } from './membersCrud';
import { getHierarchyData } from './hierarchyApi';

export type ReportBucketKind = 'group' | 'no_scout' | 'ungrouped';

export type ReportBucketKey = `group:${number}` | 'special:no_scout' | 'special:ungrouped';

export interface BatchReportBucket {
  key: ReportBucketKey;
  kind: ReportBucketKind;
  label: string;
  districtName: string | null;
  regionName: string | null;
  members: ScoutMember[];
}

export interface GenerateBatchReportOptions {
  bucketKey?: ReportBucketKey;
}

const PAGE_TOP_Y = 20;
const PAGE_BOTTOM_Y = 275;
const CONTENT_LEFT_X = 14;
const CONTENT_RIGHT_X = 196;
const CONTENT_WIDTH = 182;
const LINE_HEIGHT = 5;
const SECTION_HEADER_HEIGHT_GROUP = 13;
const SECTION_HEADER_HEIGHT_SPECIAL = 8;
const TABLE_HEADER_HEIGHT = 8;
const MIN_ROW_HEIGHT = 8;

function getReportMemberStatusColor(status: string): [number, number, number] {
  if (status === 'active') return [40, 167, 69]; // Green
  if (status === 'exceptional') return [126, 34, 206]; // Purple
  return [220, 53, 69]; // Red
}

function getReportMemberStatusText(status: string): string {
  if (status === 'active') return 'Registro Válido';
  if (status === 'exceptional') return 'Emisión Excepcional';
  return 'No registrado';
}

function sanitizeFilenameSlug(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'grupo'
  );
}

function compareReportMembers(a: ScoutMember, b: ScoutMember): number {
  const nameA = `${a.last_names ?? ''} ${a.first_names ?? ''}`.trim();
  const nameB = `${b.last_names ?? ''} ${b.first_names ?? ''}`.trim();
  const byName = nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  if (byName !== 0) return byName;
  return (a.identity ?? '').localeCompare(b.identity ?? '', 'es', { sensitivity: 'base' });
}

/**
 * Groups batch members into deterministic PDF report buckets ordered alphabetically
 * by Scout group name, followed by non-empty special buckets.
 */
export function resolveBatchReportBuckets(
  batch: Batch,
  members: ScoutMember[],
  hierarchy: { regions: Region[]; districts: District[]; groups: ScoutGroup[] }
): BatchReportBucket[] {
  const regionMap = new Map<number, Region>();
  for (const r of hierarchy.regions) {
    if (r.id !== 0) regionMap.set(r.id, r);
  }

  const districtMap = new Map<number, District>();
  for (const d of hierarchy.districts) {
    if (d.id !== 0) districtMap.set(d.id, d);
  }

  const groupMap = new Map<number, ScoutGroup>();
  for (const g of hierarchy.groups) {
    if (g.id !== 0) groupMap.set(g.id, g);
  }

  const bucketMap = new Map<ReportBucketKey, BatchReportBucket>();

  const getOrCreateBucket = (
    key: ReportBucketKey,
    factory: () => Omit<BatchReportBucket, 'members'>
  ): BatchReportBucket => {
    let existing = bucketMap.get(key);
    if (!existing) {
      existing = { ...factory(), members: [] };
      bucketMap.set(key, existing);
    }
    return existing;
  };

  for (const member of members) {
    if (member.unit === 'no_scout') {
      getOrCreateBucket('special:no_scout', () => ({
        key: 'special:no_scout',
        kind: 'no_scout',
        label: 'Miembros no scout',
        districtName: null,
        regionName: null
      })).members.push(member);
      continue;
    }

    const candidateGroupId = member.group_id ?? batch.group_id;
    if (candidateGroupId && candidateGroupId !== 0) {
      const group = groupMap.get(candidateGroupId);
      if (group) {
        const district = districtMap.get(group.district_id);
        const region = district ? regionMap.get(district.region_id) : undefined;
        const key: ReportBucketKey = `group:${group.id}`;
        getOrCreateBucket(key, () => ({
          key,
          kind: 'group',
          label: group.name,
          districtName: district?.name ?? 'No aplica',
          regionName: region?.name ?? 'No aplica'
        })).members.push(member);
        continue;
      }

      console.warn(
        `[batchReports] Grupo con id ${candidateGroupId} no encontrado en la jerarquía; enviando miembro a "Sin grupo asignado".`
      );
    }

    getOrCreateBucket('special:ungrouped', () => ({
      key: 'special:ungrouped',
      kind: 'ungrouped',
      label: 'Sin grupo asignado',
      districtName: null,
      regionName: null
    })).members.push(member);
  }

  const groupBuckets: BatchReportBucket[] = [];
  let noScoutBucket: BatchReportBucket | null = null;
  let ungroupedBucket: BatchReportBucket | null = null;

  for (const bucket of bucketMap.values()) {
    bucket.members.sort(compareReportMembers);
    if (bucket.kind === 'group') {
      groupBuckets.push(bucket);
    } else if (bucket.kind === 'no_scout') {
      noScoutBucket = bucket;
    } else {
      ungroupedBucket = bucket;
    }
  }

  groupBuckets.sort((a, b) => {
    const byLabel = a.label.localeCompare(b.label, 'es', { sensitivity: 'base' });
    return byLabel !== 0 ? byLabel : a.key.localeCompare(b.key);
  });

  if (noScoutBucket) groupBuckets.push(noScoutBucket);
  if (ungroupedBucket) groupBuckets.push(ungroupedBucket);

  return groupBuckets;
}

export function exportMembersToCSV(batch: Batch, members: ScoutMember[]): void {
  const headers = ['Cédula', 'Nombres', 'Apellidos', 'Tipo', 'Estatus', 'Código Rec.', 'Fecha Nacimiento', 'Email', 'Teléfono'];
  const rows = members.map(m => [
    `"${m.identity ?? ''}"`,
    `"${m.first_names ?? ''}"`,
    `"${m.last_names ?? ''}"`,
    `"${m.member_type === 'young' ? 'Joven' : 'Adulto'}"`,
    `"${getReportMemberStatusText(m.status)}"`,
    `"${m.recognition_code ?? '-'}"`,
    `"${m.birth_date ?? '-'}"`,
    `"${m.email ?? ''}"`,
    `"${m.phone ?? ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Lote_${batch.id}_miembros.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function drawSectionHeader(
  docPdf: jsPDF,
  bucket: BatchReportBucket,
  startY: number,
  isContinuation: boolean
): number {
  let y = startY;
  docPdf.setFontSize(12);
  docPdf.setTextColor(0, 0, 0);
  docPdf.setFont('helvetica', 'bold');
  const title = isContinuation
    ? `${bucket.label} (Continuación)`
    : `${bucket.label} (${bucket.members.length})`;
  docPdf.text(title, CONTENT_LEFT_X, y);

  if (bucket.kind === 'group') {
    docPdf.setFontSize(9);
    docPdf.setFont('helvetica', 'normal');
    docPdf.setTextColor(90, 90, 90);
    docPdf.text(
      `Distrito: ${bucket.districtName}  |  Región: ${bucket.regionName}`,
      CONTENT_LEFT_X,
      y + 5
    );
    y += SECTION_HEADER_HEIGHT_GROUP;
  } else {
    y += SECTION_HEADER_HEIGHT_SPECIAL;
  }

  docPdf.setFillColor(240, 240, 240);
  docPdf.rect(CONTENT_LEFT_X, y - 5, CONTENT_WIDTH, TABLE_HEADER_HEIGHT, 'F');
  docPdf.setFontSize(10);
  docPdf.setFont('helvetica', 'bold');
  docPdf.setTextColor(0, 0, 0);
  docPdf.text('Cédula', 16, y);
  docPdf.text('Nombre Completo', 46, y);
  docPdf.text('Tipo', 132, y);
  docPdf.text('Estado', 156, y);
  docPdf.setFont('helvetica', 'normal');

  return y + TABLE_HEADER_HEIGHT;
}

export async function generateBatchReport(
  batchOrId: number | Batch,
  membersParam?: ScoutMember[],
  hierarchyParam?: { regions: Region[]; districts: District[]; groups: ScoutGroup[] },
  options?: GenerateBatchReportOptions
): Promise<string> {
  const batch = typeof batchOrId === 'number' ? await getBatchById(batchOrId) : batchOrId;
  if (!batch) throw new Error('Lote no encontrado');

  const members = membersParam ?? (await getMembersByBatchId(batch.id));
  if (members.length === 0) {
    throw new Error('No hay miembros en este lote para generar el reporte.');
  }

  const hierarchy = hierarchyParam ?? (await getHierarchyData());
  const buckets = resolveBatchReportBuckets(batch, members, hierarchy);

  let selectedBucket: BatchReportBucket | undefined;
  if (options?.bucketKey !== undefined) {
    selectedBucket = buckets.find((b) => b.key === options.bucketKey);
    if (!selectedBucket) {
      throw new Error('El grupo seleccionado no tiene miembros en este lote.');
    }
  }

  const activeBuckets = selectedBucket ? [selectedBucket] : buckets;
  const exportedMembers = activeBuckets.flatMap((b) => b.members);

  const docPdf = new jsPDF();

  // Title / Header
  docPdf.setFontSize(22);
  docPdf.setTextColor(33, 33, 33);
  docPdf.text('Reporte de Registro de Lote', CONTENT_LEFT_X, 20);

  docPdf.setFontSize(12);
  docPdf.setTextColor(100, 100, 100);
  docPdf.text(`Generado el: ${new Date().toLocaleDateString()}`, CONTENT_LEFT_X, 28);

  // Horizontal separator line
  docPdf.setDrawColor(200, 200, 200);
  docPdf.line(CONTENT_LEFT_X, 32, CONTENT_RIGHT_X, 32);

  // Batch details section
  docPdf.setFontSize(14);
  docPdf.setTextColor(0, 0, 0);
  docPdf.setFont('helvetica', 'bold');
  docPdf.text('Información del Lote', CONTENT_LEFT_X, 42);

  docPdf.setFont('helvetica', 'normal');
  docPdf.setFontSize(11);
  docPdf.text(`ID del Lote: ${batch.id}`, CONTENT_LEFT_X, 50);
  docPdf.text(`Fecha de Creación: ${new Date(batch.created_at).toLocaleString()}`, CONTENT_LEFT_X, 56);

  const scopeLabel =
    activeBuckets.length > 1
      ? `Todos los grupos (${activeBuckets.length})`
      : activeBuckets[0].label;
  const scopeLines = docPdf.splitTextToSize(`Alcance: ${scopeLabel}`, 86);
  docPdf.text(scopeLines, 110, 50);

  let y = Math.max(62, 50 + scopeLines.length * LINE_HEIGHT + 2);
  const commentLines = docPdf.splitTextToSize(
    `Comentario: ${batch.comment?.trim() || 'Ninguno'}`,
    CONTENT_WIDTH
  );
  docPdf.text(commentLines, CONTENT_LEFT_X, y);
  y += commentLines.length * LINE_HEIGHT + 2;

  docPdf.line(CONTENT_LEFT_X, y, CONTENT_RIGHT_X, y);

  // Member summary metrics computed strictly from exported slice
  const activeCount = exportedMembers.filter((m) => m.status === 'active').length;
  const exceptionalCount = exportedMembers.filter((m) => m.status === 'exceptional').length;
  const pendingCount = exportedMembers.filter((m) => m.status === 'pending').length;

  y += 8;
  docPdf.setFontSize(14);
  docPdf.setFont('helvetica', 'bold');
  docPdf.text('Resumen de Miembros', CONTENT_LEFT_X, y);

  y += 8;
  docPdf.setFont('helvetica', 'normal');
  docPdf.setFontSize(10);
  docPdf.text(`Total: ${exportedMembers.length}`, 14, y);
  docPdf.text(`Activos (Válidos): ${activeCount}`, 56, y);
  docPdf.text(`Excepcionales: ${exceptionalCount}`, 110, y);
  docPdf.text(`Pendientes: ${pendingCount}`, 152, y);

  y += 6;
  docPdf.line(CONTENT_LEFT_X, y, CONTENT_RIGHT_X, y);
  y += 8;

  const ensureSpace = (requiredHeight: number): boolean => {
    if (y + requiredHeight > PAGE_BOTTOM_Y) {
      docPdf.addPage();
      y = PAGE_TOP_Y;
      return true;
    }
    return false;
  };

  for (const bucket of activeBuckets) {
    const sectionHeaderHeight =
      bucket.kind === 'group' ? SECTION_HEADER_HEIGHT_GROUP : SECTION_HEADER_HEIGHT_SPECIAL;
    ensureSpace(sectionHeaderHeight + TABLE_HEADER_HEIGHT + MIN_ROW_HEIGHT);
    y = drawSectionHeader(docPdf, bucket, y, false);

    for (const m of bucket.members) {
      const fullName = `${m.first_names ?? ''} ${m.last_names ?? ''}`.trim() || '-';
      const nameLines = docPdf.splitTextToSize(fullName, 82);
      const rowHeight = Math.max(MIN_ROW_HEIGHT, nameLines.length * LINE_HEIGHT + 3);

      if (ensureSpace(rowHeight)) {
        y = drawSectionHeader(docPdf, bucket, y, true);
      }

      const typeStr = m.member_type === 'young' ? 'Joven' : 'Adulto';
      const statusStr = getReportMemberStatusText(m.status);
      const [r, g, bColor] = getReportMemberStatusColor(m.status);

      docPdf.setFontSize(10);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text(m.identity ?? '', 16, y);
      docPdf.text(nameLines, 46, y);
      docPdf.text(typeStr, 132, y);

      docPdf.setTextColor(r, g, bColor);
      docPdf.text(statusStr, 156, y);
      docPdf.setTextColor(0, 0, 0);

      docPdf.setDrawColor(245, 245, 245);
      docPdf.line(CONTENT_LEFT_X, y + rowHeight - 5, CONTENT_RIGHT_X, y + rowHeight - 5);

      y += rowHeight;
    }

    y += 4;
  }

  const fileName = selectedBucket
    ? `Reporte_Lote_${batch.id}_${sanitizeFilenameSlug(selectedBucket.label)}.pdf`
    : `Reporte_Lote_${batch.id}.pdf`;
  docPdf.save(fileName);
  return fileName;
}
