import { jsPDF } from 'jspdf';
import { StatisticsDataset } from '../types';

export interface FilterSummaryLabels {
  periodLabel?: string;
  regionLabel?: string;
  districtLabel?: string;
  recognitionLabel?: string;
  memberTypeLabel?: string;
}

/**
 * Generates and downloads an Executive Statistics Report in PDF format using jsPDF.
 */
export function exportStatisticsPdf(
  stats: StatisticsDataset,
  filterSummary?: FilterSummaryLabels
): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  const todayStr = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const dateFileTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `Reporte_Estadistico_Chil_${dateFileTag}.pdf`;

  let y = 16;

  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - 18) {
      doc.addPage();
      y = 16;
      drawHeaderSmall();
    }
  };

  const drawHeaderSmall = () => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Asociación de Scouts de Venezuela — Sistema Chil | Reporte Estadístico', margin, y);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + 2, margin + contentWidth, y + 2);
    y += 8;
  };

  // Header Banner
  doc.setFillColor(11, 79, 108); // Primary dark blue/teal
  doc.rect(margin, y, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('INFORME EJECUTIVO Y ANÁLISIS ESTADÍSTICO', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(220, 235, 245);
  doc.text('Asociación de Scouts de Venezuela • Sistema Chil de Gestión y Emisión', margin + 6, y + 15);
  doc.text(`Fecha de emisión: ${todayStr}`, margin + 6, y + 20);

  y += 28;

  // Filter Summary Box
  if (filterSummary) {
    const filterParts: string[] = [];
    if (filterSummary.periodLabel) filterParts.push(`Período: ${filterSummary.periodLabel}`);
    if (filterSummary.recognitionLabel) filterParts.push(`Reconocimiento: ${filterSummary.recognitionLabel}`);
    if (filterSummary.regionLabel) filterParts.push(`Región: ${filterSummary.regionLabel}`);
    if (filterSummary.districtLabel) filterParts.push(`Distrito: ${filterSummary.districtLabel}`);
    if (filterSummary.memberTypeLabel) filterParts.push(`Tipo: ${filterSummary.memberTypeLabel}`);

    if (filterParts.length > 0) {
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(215, 225, 235);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(50, 70, 90);
      doc.text('Filtros aplicados:', margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      const filterText = filterParts.join('  |  ');
      doc.text(filterText.substring(0, 110), margin + 30, y + 6);

      y += 14;
    }
  }

  // Executive KPI Summary Cards (4 boxes in 2x2 grid)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Indicadores Clave de Rendimiento (KPIs)', margin, y);
  y += 4;

  const boxW = (contentWidth - 6) / 2; // ~88mm
  const boxH = 18;

  // Card 1: Diplomas Emitidos
  doc.setFillColor(240, 248, 255);
  doc.setDrawColor(180, 215, 245);
  doc.roundedRect(margin, y, boxW, boxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(11, 79, 108);
  doc.text('TOTAL DIPLOMAS EMITIDOS', margin + 4, y + 5);
  doc.setFontSize(14);
  doc.text(String(stats.kpis.totalDiplomas), margin + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 105, 120);
  doc.text(`${stats.kpis.totalMembers} miembros procesados en ${stats.kpis.totalBatches} lotes`, margin + 4, y + 16);

  // Card 2: Tasa de Registro Válido
  const col2X = margin + boxW + 6;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(col2X, y, boxW, boxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text('TASA DE REGISTRO VÁLIDO', col2X + 4, y + 5);
  doc.setFontSize(14);
  doc.text(`${stats.kpis.validationRate}%`, col2X + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 100, 80);
  doc.text(`${stats.kpis.activeCount} válidos, ${stats.kpis.exceptionalCount} excepcionales, ${stats.kpis.pendingCount} pendientes`, col2X + 4, y + 16);

  y += boxH + 4;

  // Card 3: Demografía
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(margin, y, boxW, boxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text('DISTRIBUCIÓN DEMOGRÁFICA', margin + 4, y + 5);
  doc.setFontSize(12);
  doc.text(`${stats.demographics.youngPercentage}% Jóvenes  |  ${stats.demographics.adultPercentage}% Adultos`, margin + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 90, 40);
  doc.text(`${stats.demographics.youngCount} jóvenes / ${stats.demographics.adultCount} adultos`, margin + 4, y + 16);

  // Card 4: Cobertura Territorial
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(col2X, y, boxW, boxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(107, 33, 168);
  doc.text('COBERTURA TERRITORIAL', col2X + 4, y + 5);
  doc.setFontSize(14);
  doc.text(`${stats.kpis.activeRegionsCount} Regiones`, col2X + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 80, 130);
  doc.text(`${stats.kpis.activeDistrictsCount} distritos y ${stats.kpis.activeGroupsCount} grupos scouts`, col2X + 4, y + 16);

  y += boxH + 8;

  // Section: Calidad y Estatus de Emisiones
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Calidad y Estatus de los Registros', margin, y);
  y += 4;

  const statItemW = (contentWidth - 8) / 3;
  const statBoxH = 12;

  // Active status
  doc.setFillColor(230, 247, 235);
  doc.setDrawColor(195, 238, 208);
  doc.roundedRect(margin, y, statItemW, statBoxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(27, 122, 55);
  doc.text('● Registro Válido (Automático)', margin + 3, y + 4.5);
  doc.setFontSize(9);
  doc.text(`${stats.statusBreakdown.activeCount} (${stats.statusBreakdown.activePercentage}%)`, margin + 3, y + 9.5);

  // Exceptional status
  const statX2 = margin + statItemW + 4;
  doc.setFillColor(243, 232, 255);
  doc.setDrawColor(233, 213, 255);
  doc.roundedRect(statX2, y, statItemW, statBoxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(126, 34, 206);
  doc.text('● Emisión Excepcional', statX2 + 3, y + 4.5);
  doc.setFontSize(9);
  doc.text(`${stats.statusBreakdown.exceptionalCount} (${stats.statusBreakdown.exceptionalPercentage}%)`, statX2 + 3, y + 9.5);

  // Pending status
  const statX3 = statX2 + statItemW + 4;
  doc.setFillColor(254, 234, 232);
  doc.setDrawColor(252, 207, 202);
  doc.roundedRect(statX3, y, statItemW, statBoxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(201, 42, 42);
  doc.text('● Registro Inválido / Pendiente', statX3 + 3, y + 4.5);
  doc.setFontSize(9);
  doc.text(`${stats.statusBreakdown.pendingCount} (${stats.statusBreakdown.pendingPercentage}%)`, statX3 + 3, y + 9.5);

  y += statBoxH + 8;

  // Section: Ranking de Reconocimientos
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Distribución por Tipo de Reconocimiento', margin, y);
  y += 4;

  // Table header
  doc.setFillColor(240, 243, 246);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);
  doc.text('RECONOCIMIENTO', margin + 4, y + 4.5);
  doc.text('CANTIDAD', margin + 120, y + 4.5);
  doc.text('% DEL TOTAL', margin + 155, y + 4.5);
  y += 7;

  const topRecs = stats.recognitionRankings.slice(0, 8);
  if (topRecs.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('No hay datos disponibles de reconocimientos para el período seleccionado.', margin + 4, y + 5);
    y += 8;
  } else {
    topRecs.forEach((r, idx) => {
      checkPageBreak(8);
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 40, 50);
      doc.text(r.name.substring(0, 55), margin + 4, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(String(r.count), margin + 120, y + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.text(`${r.percentage}%`, margin + 155, y + 4.2);
      y += 6;
    });
  }

  y += 6;

  // Section: Distribución Geográfica (Top Regiones)
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Distribución Geográfica — Principales Regiones', margin, y);
  y += 4;

  doc.setFillColor(240, 243, 246);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);
  doc.text('REGIÓN', margin + 4, y + 4.5);
  doc.text('DIPLOMAS', margin + 120, y + 4.5);
  doc.text('% DEL TOTAL', margin + 155, y + 4.5);
  y += 7;

  const topRegions = stats.geographic.regions.slice(0, 6);
  if (topRegions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('No hay registros geográficos disponibles.', margin + 4, y + 5);
    y += 8;
  } else {
    topRegions.forEach((reg, idx) => {
      checkPageBreak(8);
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 40, 50);
      doc.text(reg.name.substring(0, 55), margin + 4, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(String(reg.count), margin + 120, y + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.text(`${reg.percentage}%`, margin + 155, y + 4.2);
      y += 6;
    });
  }

  y += 6;

  // Section: Actividad Mensual
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Actividad por Mes', margin, y);
  y += 4;

  doc.setFillColor(240, 243, 246);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);
  doc.text('MES', margin + 4, y + 4.5);
  doc.text('TOTAL', margin + 50, y + 4.5);
  doc.text('VÁLIDOS', margin + 85, y + 4.5);
  doc.text('EXCEPCIONALES', margin + 120, y + 4.5);
  doc.text('PENDIENTES', margin + 155, y + 4.5);
  y += 7;

  stats.monthlyTrends.forEach((m, idx) => {
    checkPageBreak(8);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(margin, y, contentWidth, 5.5, 'F');
    }
    doc.setDrawColor(240, 240, 240);
    doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 40, 50);
    doc.text(m.label, margin + 4, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(m.totalCount), margin + 50, y + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.text(String(m.activeCount), margin + 85, y + 3.8);
    doc.text(String(m.exceptionalCount), margin + 120, y + 3.8);
    doc.text(String(m.pendingCount), margin + 155, y + 3.8);
    y += 5.5;
  });

  // Stamp footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, pageHeight - 12, margin + contentWidth, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text('Sistema Chil • Documento generado automáticamente para uso institucional interno.', margin, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, margin + contentWidth - 16, pageHeight - 7);
  }

  doc.save(fileName);
  return fileName;
}
