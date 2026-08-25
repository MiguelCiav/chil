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

  const drawHeaderSmall = () => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Asociación de Scouts de Venezuela — Sistema Chil | Reporte Estadístico', margin, y);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + 2, margin + contentWidth, y + 2);
    y += 8;
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - 18) {
      doc.addPage();
      y = 16;
      drawHeaderSmall();
    }
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

  // Executive KPI Summary Cards (Top 5 Executive KPIs)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Indicadores Clave de Rendimiento (KPIs)', margin, y);
  y += 4;

  const boxW3 = (contentWidth - 6) / 3; // ~58.6mm
  const boxW2 = (contentWidth - 4) / 2; // ~89mm
  const boxH = 18;

  // Row 1: 3 cards (Total Reconocimientos, Total Lotes, Reconocimiento Más Entregado)
  // Card 1: Total Reconocimientos
  doc.setFillColor(240, 248, 255);
  doc.setDrawColor(180, 215, 245);
  doc.roundedRect(margin, y, boxW3, boxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(11, 79, 108);
  doc.text('TOTAL RECONOCIMIENTOS', margin + 3, y + 5);
  doc.setFontSize(13);
  doc.text(String(stats.kpis.totalDiplomas), margin + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(90, 105, 120);
  doc.text(`de ${stats.kpis.totalMembers} miembros`, margin + 3, y + 15.5);

  // Card 2: Total Lotes
  const col2X = margin + boxW3 + 3;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(col2X, y, boxW3, boxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('TOTAL LOTES', col2X + 3, y + 5);
  doc.setFontSize(13);
  doc.text(`${stats.kpis.totalBatches} Lotes`, col2X + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 90, 40);
  doc.text(`Promedio: ${stats.kpis.avgMembersPerBatch}/lote`, col2X + 3, y + 15.5);

  // Card 3: Reconocimiento Más Entregado
  const col3X = col2X + boxW3 + 3;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(col3X, y, boxW3, boxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('MÁS ENTREGADO', col3X + 3, y + 5);
  doc.setFontSize(9.5);
  const topRecDisplay = (stats.kpis.topRecognitionName || '-').substring(0, 18);
  doc.text(topRecDisplay, col3X + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(70, 100, 80);
  doc.text(`${stats.kpis.topRecognitionCount || 0} emitidos`, col3X + 3, y + 15.5);

  y += boxH + 3;

  // Row 2: 2 cards (Regiones/Distritos Atendidos, Jóvenes vs Adultos)
  // Card 4: Cobertura Territorial
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(margin, y, boxW2, boxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 33, 168);
  doc.text('COBERTURA TERRITORIAL', margin + 3, y + 5);
  doc.setFontSize(13);
  doc.text(`${stats.kpis.activeRegionsCount} Regiones`, margin + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 80, 130);
  doc.text(`en ${stats.kpis.activeDistrictsCount} distritos y ${stats.kpis.activeGroupsCount} grupos`, margin + 3, y + 15.5);

  // Card 5: Demografía
  const col5X = margin + boxW2 + 4;
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(col5X, y, boxW2, boxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(3, 105, 161);
  doc.text('DISTRIBUCIÓN DEMOGRÁFICA', col5X + 3, y + 5);
  doc.setFontSize(11);
  doc.text(`${stats.demographics.youngPercentage}% Jóvenes | ${stats.demographics.adultPercentage}% Adultos`, col5X + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 100, 130);
  doc.text(`${stats.demographics.youngCount} jóvenes / ${stats.demographics.adultCount} adultos`, col5X + 3, y + 15.5);

  y += boxH + 8;

  // --------------------------------------------------------------------------
  // SECTION 1: Tabla de reconocimientos entregados por Región
  // --------------------------------------------------------------------------
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('1. Reconocimientos Entregados por Región', margin, y);
  y += 4;

  doc.setFillColor(240, 243, 246);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);
  doc.text('REGIÓN', margin + 4, y + 4.5);
  doc.text('TOTAL RECONOCIMIENTOS', margin + 110, y + 4.5);
  doc.text('% DEL TOTAL', margin + 155, y + 4.5);
  y += 7;

  if (stats.geographic.regions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('No hay registros disponibles por región.', margin + 4, y + 5);
    y += 8;
  } else {
    stats.geographic.regions.forEach((reg, idx) => {
      checkPageBreak(7);
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 40, 50);
      doc.text(`${idx + 1}. ${reg.name.substring(0, 55)}`, margin + 4, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(String(reg.count), margin + 110, y + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.text(`${reg.percentage}%`, margin + 155, y + 4.2);
      y += 6;
    });
  }

  y += 6;

  // --------------------------------------------------------------------------
  // SECTION 2: Tabla de reconocimientos entregados por Distrito
  // --------------------------------------------------------------------------
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Reconocimientos Entregados por Distrito', margin, y);
  y += 4;

  doc.setFillColor(240, 243, 246);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);
  doc.text('REGIÓN', margin + 4, y + 4.5);
  doc.text('DISTRITO', margin + 60, y + 4.5);
  doc.text('TOTAL RECONOCIMIENTOS', margin + 120, y + 4.5);
  doc.text('% DEL TOTAL', margin + 155, y + 4.5);
  y += 7;

  if (stats.geographic.districts.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('No hay registros disponibles por distrito.', margin + 4, y + 5);
    y += 8;
  } else {
    stats.geographic.districts.forEach((dist, idx) => {
      checkPageBreak(7);
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(70, 80, 95);
      doc.text((dist.parentName || '-').substring(0, 30), margin + 4, y + 4.2);
      doc.setTextColor(30, 40, 50);
      doc.text(`${idx + 1}. ${dist.name.substring(0, 35)}`, margin + 60, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(String(dist.count), margin + 120, y + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.text(`${dist.percentage}%`, margin + 155, y + 4.2);
      y += 6;
    });
  }

  y += 6;

  // --------------------------------------------------------------------------
  // SECTION 3: Tabla de reconocimientos entregados por Unidad
  // --------------------------------------------------------------------------
  if (stats.unitDistribution && stats.unitDistribution.items.length > 0) {
    checkPageBreak(45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('3. Reconocimientos Entregados por Unidad Scout', margin, y);
    y += 4;

    doc.setFillColor(240, 243, 246);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 80, 95);
    doc.text('UNIDAD SCOUT', margin + 4, y + 4.5);
    doc.text('TOTAL RECONOCIMIENTOS', margin + 110, y + 4.5);
    doc.text('% DEL TOTAL', margin + 155, y + 4.5);
    y += 7;

    stats.unitDistribution.items.forEach((item, idx) => {
      checkPageBreak(7);
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 40, 50);
      const displayUnitLabel = item.unit === 'no_scout' ? 'No scout (Agradecimientos)' : item.label;
      doc.text(displayUnitLabel, margin + 4, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.count), margin + 110, y + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.text(`${item.percentage}%`, margin + 155, y + 4.2);
      y += 6;
    });

    // Footnote explaining No scout recognitions as Agradecimientos
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(110, 120, 130);
    doc.text('* Nota: Los reconocimientos emitidos a miembros No scout corresponden a Agradecimientos institucionales.', margin + 4, y + 4.5);
    y += 8;
  }

  // --------------------------------------------------------------------------
  // SECTION 4: Resumen de reconocimientos entregados a Jóvenes y Adultos
  // --------------------------------------------------------------------------
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('4. Resumen Demográfico (Jóvenes y Adultos)', margin, y);
  y += 4;

  doc.setFillColor(240, 243, 246);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);
  doc.text('CATEGORÍA', margin + 4, y + 4.5);
  doc.text('TOTAL RECONOCIMIENTOS', margin + 110, y + 4.5);
  doc.text('% DEL TOTAL', margin + 155, y + 4.5);
  y += 7;

  // Row 1: Jóvenes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 40, 50);
  doc.text('Jóvenes', margin + 4, y + 4.2);
  doc.setFont('helvetica', 'bold');
  doc.text(String(stats.demographics.youngCount), margin + 110, y + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.demographics.youngPercentage}%`, margin + 155, y + 4.2);
  doc.setDrawColor(240, 240, 240);
  doc.line(margin, y + 6, margin + contentWidth, y + 6);
  y += 6;

  // Row 2: Adultos
  doc.setFillColor(250, 251, 252);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 40, 50);
  doc.text('Adultos', margin + 4, y + 4.2);
  doc.setFont('helvetica', 'bold');
  doc.text(String(stats.demographics.adultCount), margin + 110, y + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.demographics.adultPercentage}%`, margin + 155, y + 4.2);
  doc.setDrawColor(240, 240, 240);
  doc.line(margin, y + 6, margin + contentWidth, y + 6);
  y += 6;

  // Row 3: Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(11, 79, 108);
  doc.text('Total', margin + 4, y + 4.2);
  doc.text(String(stats.demographics.totalCount), margin + 110, y + 4.2);
  doc.text('100%', margin + 155, y + 4.2);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y + 6, margin + contentWidth, y + 6);
  y += 10;

  // --------------------------------------------------------------------------
  // SECTION 5: Tabla de resumen mensual de los reconocimientos, con su gráfico debajo
  // --------------------------------------------------------------------------
  checkPageBreak(75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('5. Resumen Mensual de Reconocimientos', margin, y);
  y += 4;

  // Summary Table
  doc.setFillColor(240, 243, 246);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);
  doc.text('MES', margin + 4, y + 4.5);
  doc.text('RECONOCIMIENTOS EMITIDOS', margin + 110, y + 4.5);
  doc.text('% DEL TOTAL', margin + 155, y + 4.5);
  y += 7;

  const totalDiplomas = stats.kpis.totalDiplomas || 1;

  stats.monthlyTrends.forEach((m, idx) => {
    checkPageBreak(6);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(margin, y, contentWidth, 5.5, 'F');
    }
    doc.setDrawColor(240, 240, 240);
    doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);

    const pct = stats.kpis.totalDiplomas > 0
      ? Number(((m.totalCount / totalDiplomas) * 100).toFixed(1))
      : 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 40, 50);
    doc.text(m.label, margin + 4, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(m.totalCount), margin + 110, y + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pct}%`, margin + 155, y + 3.8);
    y += 5.5;
  });

  y += 6;

  // Monthly Vector Histogram / Trend Chart Directly Below the Table
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 70, 90);
  doc.text('Gráfico de Tendencia Mensual de Reconocimientos:', margin, y);
  y += 5;

  const chartHeight = 32;
  const chartWidth = contentWidth;
  const chartBottomY = y + chartHeight;
  const maxMonthlyVal = Math.max(...stats.monthlyTrends.map(m => m.totalCount), 5);

  // Background chart container
  doc.setFillColor(250, 252, 254);
  doc.setDrawColor(225, 235, 245);
  doc.roundedRect(margin, y, chartWidth, chartHeight + 10, 2, 2, 'FD');

  // Baseline axis
  doc.setDrawColor(200, 215, 230);
  doc.line(margin + 6, chartBottomY, margin + chartWidth - 6, chartBottomY);

  const slotW = (chartWidth - 16) / stats.monthlyTrends.length;
  const barW = Math.max(slotW * 0.55, 4);

  stats.monthlyTrends.forEach((item, idx) => {
    const barHeight = maxMonthlyVal > 0 ? (item.totalCount / maxMonthlyVal) * (chartHeight - 8) : 0;
    const xCenter = margin + 8 + idx * slotW + slotW / 2;
    const xBar = xCenter - barW / 2;
    const yBar = chartBottomY - barHeight;

    // Draw Bar
    if (barHeight > 0) {
      doc.setFillColor(11, 79, 108); // Primary dark blue
      doc.rect(xBar, yBar, barW, barHeight, 'F');

      // Value label above bar
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(11, 79, 108);
      doc.text(String(item.totalCount), xCenter, yBar - 1.5, { align: 'center' });
    }

    // Month label below baseline
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 115, 130);
    const shortLabel = item.label.substring(0, 3);
    doc.text(shortLabel, xCenter, chartBottomY + 4, { align: 'center' });
  });

  y = chartBottomY + 14;

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

