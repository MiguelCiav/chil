import { jsPDF } from 'jspdf';
import { Batch, ScoutMember, Region, District, ScoutGroup } from '../types';
import { getBatchById } from './batchesCrud';
import { getMembersByBatchId } from './membersCrud';
import { getHierarchyData } from './hierarchyApi';

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

export async function generateBatchReport(
  batchOrId: number | Batch,
  membersParam?: ScoutMember[],
  hierarchyParam?: { regions: Region[]; districts: District[]; groups: ScoutGroup[] }
): Promise<string> {
  let batch: Batch | null = null;
  if (typeof batchOrId === 'number') {
    batch = await getBatchById(batchOrId);
  } else {
    batch = batchOrId;
  }
  if (!batch) throw new Error("Lote no encontrado");
  const members = membersParam ?? (await getMembersByBatchId(batch.id));
  const hierarchy = hierarchyParam ?? (await getHierarchyData());
  
  const region = (!batch.region_id || batch.region_id === 0) ? 'No aplica' : (hierarchy.regions.find(r => r.id === batch.region_id)?.name ?? `Región ${batch.region_id}`);
  const district = (!batch.district_id || batch.district_id === 0) ? 'No aplica' : (hierarchy.districts.find(d => d.id === batch.district_id)?.name ?? `Distrito ${batch.district_id}`);
  const group = (!batch.group_id || batch.group_id === 0) ? 'No aplica' : (hierarchy.groups.find(g => g.id === batch.group_id)?.name ?? `Grupo ${batch.group_id}`);

  const docPdf = new jsPDF();
  
  // Title / Header
  docPdf.setFontSize(22);
  docPdf.setTextColor(33, 33, 33);
  docPdf.text("Reporte de Registro de Lote", 14, 20);
  
  docPdf.setFontSize(12);
  docPdf.setTextColor(100, 100, 100);
  docPdf.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 28);
  
  // Horizontal separator line
  docPdf.setDrawColor(200, 200, 200);
  docPdf.line(14, 32, 196, 32);
  
  // Batch details section
  docPdf.setFontSize(14);
  docPdf.setTextColor(0, 0, 0);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("Información del Lote", 14, 42);
  
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(11);
  docPdf.text(`Comentario: ${batch.comment ?? 'Ninguno'}`, 14, 50);
  docPdf.text(`ID del Lote: ${batch.id}`, 14, 56);
  docPdf.text(`Fecha de Creación: ${new Date(batch.created_at).toLocaleString()}`, 14, 62);
  
  docPdf.text(`Región: ${region}`, 110, 50);
  docPdf.text(`Distrito: ${district}`, 110, 56);
  docPdf.text(`Grupo: ${group}`, 110, 62);
  
  docPdf.line(14, 68, 196, 68);
  
  // Member summary metrics
  const activeCount = members.filter(m => m.status === 'active').length;
  const pendingCount = members.filter(m => m.status === 'pending').length;
  
  docPdf.setFont("helvetica", "bold");
  docPdf.text("Resumen de Miembros", 14, 76);
  
  docPdf.setFont("helvetica", "normal");
  docPdf.text(`Total Miembros: ${members.length}`, 14, 84);
  docPdf.text(`Miembros Activos (Válidos): ${activeCount}`, 70, 84);
  docPdf.text(`Miembros Pendientes (No Registrados): ${pendingCount}`, 130, 84);
  
  docPdf.line(14, 90, 196, 90);
  
  // Table header
  docPdf.setFont("helvetica", "bold");
  docPdf.text("Lista de Miembros", 14, 98);
  
  let y = 108;
  docPdf.setFillColor(240, 240, 240);
  docPdf.rect(14, y - 6, 182, 8, "F");
  
  docPdf.setFontSize(10);
  docPdf.text("Cédula", 16, y - 1);
  docPdf.text("Nombre Completo", 46, y - 1);
  docPdf.text("Grupo", 106, y - 1);
  docPdf.text("Tipo", 146, y - 1);
  docPdf.text("Estado", 170, y - 1);
  
  docPdf.setFont("helvetica", "normal");
  y += 6;
  
  // Sort members alphabetically by last_names, then first_names
  const sortedMembers = [...members].sort((a, b) => {
    const nameA = `${a.last_names} ${a.first_names}`.toLowerCase();
    const nameB = `${b.last_names} ${b.first_names}`.toLowerCase();
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });

  // Table rows
  for (const m of sortedMembers) {
    if (y > 270) {
      docPdf.addPage();
      y = 20;
      // Re-draw simple header on new page
      docPdf.setFont("helvetica", "bold");
      docPdf.text("Lista de Miembros (Continuación)", 14, y);
      y += 10;
      docPdf.setFont("helvetica", "normal");
    }
    
    const fullName = `${m.first_names} ${m.last_names}`;
    const memberGroupId = m.group_id ?? batch.group_id;
    const memberGroupName = (!memberGroupId || memberGroupId === 0)
      ? 'No aplica'
      : (hierarchy.groups.find(g => g.id === memberGroupId)?.name ?? `Grupo ${memberGroupId}`);
    const typeStr = m.member_type === 'young' ? 'Joven' : 'Adulto';
    const statusStr = getReportMemberStatusText(m.status);
    const [r, g, bColor] = getReportMemberStatusColor(m.status);
    
    // Draw row separator
    docPdf.setDrawColor(245, 245, 245);
    docPdf.line(14, y + 1, 196, y + 1);
    
    docPdf.text(m.identity, 16, y);
    docPdf.text(fullName.substring(0, 26), 46, y);
    docPdf.text(memberGroupName.substring(0, 18), 106, y);
    docPdf.text(typeStr, 146, y);
    
    docPdf.setTextColor(r, g, bColor);
    docPdf.text(statusStr, 170, y);
    docPdf.setTextColor(0, 0, 0); // Reset
    
    y += 8;
  }
  
  const fileName = `Reporte_Lote_${batch.id}.pdf`;
  docPdf.save(fileName);
  return fileName;
}
