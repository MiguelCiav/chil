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

  const yoy = stats.yoyComparison;
  const hasYoY = Boolean(yoy && yoy.hasPreviousYearData);

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
  const bannerHeight = hasYoY ? 28 : 24;
  doc.setFillColor(11, 79, 108); // Primary dark blue/teal
  doc.rect(margin, y, contentWidth, bannerHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('INFORME EJECUTIVO Y ANÁLISIS ESTADÍSTICO', margin + 6, y + 8);

  if (hasYoY && yoy) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(186, 230, 253);
    doc.text(`Reporte Comparativo Anual (${yoy.previousYear} vs ${yoy.currentYear})`, margin + 6, y + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 235, 245);
    doc.text('Asociación de Scouts de Venezuela • Sistema Chil de Gestión y Emisión', margin + 6, y + 19);
    doc.text(`Fecha de emisión: ${todayStr}`, margin + 6, y + 24);
    y += 32;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(220, 235, 245);
    doc.text('Asociación de Scouts de Venezuela • Sistema Chil de Gestión y Emisión', margin + 6, y + 15);
    doc.text(`Fecha de emisión: ${todayStr}`, margin + 6, y + 20);
    y += 28;
  }

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
  doc.setFontSize(10);
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
  doc.setFontSize(12.5);
  doc.text(String(stats.kpis.totalDiplomas), margin + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(90, 105, 120);
  if (hasYoY && yoy) {
    const diffSign = yoy.totalDiplomas.diff >= 0 ? '+' : '';
    const pctStr = yoy.totalDiplomas.percentChange !== null ? ` (${diffSign}${yoy.totalDiplomas.percentChange}%)` : '';
    doc.text(`vs ${yoy.totalDiplomas.previous} en ${yoy.previousYear}: ${diffSign}${yoy.totalDiplomas.diff}${pctStr}`, margin + 3, y + 15.5);
  } else {
    doc.text(`de ${stats.kpis.totalMembers} miembros`, margin + 3, y + 15.5);
  }

  // Card 2: Total Lotes
  const col2X = margin + boxW3 + 3;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(col2X, y, boxW3, boxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('TOTAL LOTES', col2X + 3, y + 5);
  doc.setFontSize(12.5);
  doc.text(`${stats.kpis.totalBatches} Lotes`, col2X + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 90, 40);
  if (hasYoY && yoy) {
    const diffSign = yoy.totalBatches.diff >= 0 ? '+' : '';
    doc.text(`vs ${yoy.totalBatches.previous} en ${yoy.previousYear} (${diffSign}${yoy.totalBatches.diff})`, col2X + 3, y + 15.5);
  } else {
    doc.text(`Promedio: ${stats.kpis.avgMembersPerBatch}/lote`, col2X + 3, y + 15.5);
  }

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
  doc.setFontSize(12.5);
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
  doc.setFontSize(10.5);
  doc.text(`${stats.demographics.youngPercentage}% Jóvenes | ${stats.demographics.adultPercentage}% Adultos`, col5X + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 100, 130);
  if (hasYoY && yoy) {
    doc.text(`vs ${yoy.demographics.young.previous} jóvenes / ${yoy.demographics.adult.previous} adultos (${yoy.previousYear})`, col5X + 3, y + 15.5);
  } else {
    doc.text(`${stats.demographics.youngCount} jóvenes / ${stats.demographics.adultCount} adultos`, col5X + 3, y + 15.5);
  }

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

  if (hasYoY && yoy) {
    doc.text('REGIÓN', margin + 4, y + 4.5);
    doc.text(`TOTAL (${yoy.currentYear})`, margin + 75, y + 4.5);
    doc.text(`AÑO ANT. (${yoy.previousYear})`, margin + 112, y + 4.5);
    doc.text('VARIACIÓN', margin + 145, y + 4.5);
    doc.text('% TOTAL', margin + 168, y + 4.5);
    y += 7;

    if (yoy.regions.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text('No hay registros disponibles por región.', margin + 4, y + 5);
      y += 8;
    } else {
      yoy.regions.forEach((reg, idx) => {
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
        doc.text(`${idx + 1}. ${reg.name.substring(0, 36)}`, margin + 4, y + 4.2);
        doc.setFont('helvetica', 'bold');
        doc.text(String(reg.currentCount), margin + 85, y + 4.2);
        doc.setFont('helvetica', 'normal');
        doc.text(String(reg.previousCount), margin + 120, y + 4.2);
        const diffSign = reg.diff >= 0 ? '+' : '';
        const pctStr = reg.percentChange !== null ? ` (${diffSign}${reg.percentChange}%)` : '';
        doc.text(`${diffSign}${reg.diff}${pctStr}`, margin + 145, y + 4.2);
        doc.text(`${reg.currentPercentage}%`, margin + 168, y + 4.2);
        y += 6;
      });
    }
  } else {
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

  if (hasYoY && yoy) {
    doc.text('REGIÓN', margin + 4, y + 4.5);
    doc.text('DISTRITO', margin + 48, y + 4.5);
    doc.text(`TOTAL (${yoy.currentYear})`, margin + 92, y + 4.5);
    doc.text(`AÑO ANT. (${yoy.previousYear})`, margin + 120, y + 4.5);
    doc.text('VARIACIÓN', margin + 148, y + 4.5);
    doc.text('% TOTAL', margin + 168, y + 4.5);
    y += 7;

    if (yoy.districts.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text('No hay registros disponibles por distrito.', margin + 4, y + 5);
      y += 8;
    } else {
      yoy.districts.forEach((dist, idx) => {
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
        doc.text((dist.parentName || '-').substring(0, 22), margin + 4, y + 4.2);
        doc.setTextColor(30, 40, 50);
        doc.text(`${idx + 1}. ${dist.name.substring(0, 22)}`, margin + 48, y + 4.2);
        doc.setFont('helvetica', 'bold');
        doc.text(String(dist.currentCount), margin + 100, y + 4.2);
        doc.setFont('helvetica', 'normal');
        doc.text(String(dist.previousCount), margin + 128, y + 4.2);
        const diffSign = dist.diff >= 0 ? '+' : '';
        const pctStr = dist.percentChange !== null ? ` (${diffSign}${dist.percentChange}%)` : '';
        doc.text(`${diffSign}${dist.diff}${pctStr}`, margin + 148, y + 4.2);
        doc.text(`${dist.currentPercentage}%`, margin + 168, y + 4.2);
        y += 6;
      });
    }
  } else {
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
  }

  y += 6;

  // --------------------------------------------------------------------------
  // SECTION 3: Tabla de reconocimientos entregados por Unidad
  // --------------------------------------------------------------------------
  const hasUnitData = (hasYoY && yoy) ? yoy.units.length > 0 : Boolean(stats.unitDistribution && stats.unitDistribution.items.length > 0);

  if (hasUnitData) {
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

    if (hasYoY && yoy) {
      doc.text('UNIDAD SCOUT', margin + 4, y + 4.5);
      doc.text(`TOTAL (${yoy.currentYear})`, margin + 75, y + 4.5);
      doc.text(`AÑO ANT. (${yoy.previousYear})`, margin + 112, y + 4.5);
      doc.text('VARIACIÓN', margin + 145, y + 4.5);
      doc.text('% TOTAL', margin + 168, y + 4.5);
      y += 7;

      yoy.units.forEach((item, idx) => {
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
        doc.text(String(item.currentCount), margin + 85, y + 4.2);
        doc.setFont('helvetica', 'normal');
        doc.text(String(item.previousCount), margin + 120, y + 4.2);
        const diffSign = item.diff >= 0 ? '+' : '';
        const pctStr = item.percentChange !== null ? ` (${diffSign}${item.percentChange}%)` : '';
        doc.text(`${diffSign}${item.diff}${pctStr}`, margin + 145, y + 4.2);
        doc.text(`${item.currentPercentage}%`, margin + 168, y + 4.2);
        y += 6;
      });
    } else {
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
    }

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

  if (hasYoY && yoy) {
    doc.text('CATEGORÍA', margin + 4, y + 4.5);
    doc.text(`TOTAL (${yoy.currentYear})`, margin + 75, y + 4.5);
    doc.text(`AÑO ANT. (${yoy.previousYear})`, margin + 112, y + 4.5);
    doc.text('VARIACIÓN', margin + 145, y + 4.5);
    doc.text('% TOTAL', margin + 168, y + 4.5);
    y += 7;

    // Row 1: Jóvenes
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 40, 50);
    doc.text('Jóvenes', margin + 4, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(yoy.demographics.young.current), margin + 85, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(String(yoy.demographics.young.previous), margin + 120, y + 4.2);
    const youngSign = yoy.demographics.young.diff >= 0 ? '+' : '';
    const youngPctStr = yoy.demographics.young.percentChange !== null ? ` (${youngSign}${yoy.demographics.young.percentChange}%)` : '';
    doc.text(`${youngSign}${yoy.demographics.young.diff}${youngPctStr}`, margin + 145, y + 4.2);
    doc.text(`${yoy.demographics.young.currentPercentage}%`, margin + 168, y + 4.2);
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
    doc.text(String(yoy.demographics.adult.current), margin + 85, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(String(yoy.demographics.adult.previous), margin + 120, y + 4.2);
    const adultSign = yoy.demographics.adult.diff >= 0 ? '+' : '';
    const adultPctStr = yoy.demographics.adult.percentChange !== null ? ` (${adultSign}${yoy.demographics.adult.percentChange}%)` : '';
    doc.text(`${adultSign}${yoy.demographics.adult.diff}${adultPctStr}`, margin + 145, y + 4.2);
    doc.text(`${yoy.demographics.adult.currentPercentage}%`, margin + 168, y + 4.2);
    doc.setDrawColor(240, 240, 240);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);
    y += 6;

    // Row 3: Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(11, 79, 108);
    doc.text('Total', margin + 4, y + 4.2);
    doc.text(String(yoy.demographics.total.current), margin + 85, y + 4.2);
    doc.text(String(yoy.demographics.total.previous), margin + 120, y + 4.2);
    const totalSign = yoy.demographics.total.diff >= 0 ? '+' : '';
    doc.text(`${totalSign}${yoy.demographics.total.diff}`, margin + 145, y + 4.2);
    doc.text('100%', margin + 168, y + 4.2);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);
    y += 10;
  } else {
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
  }

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

  if (hasYoY && yoy) {
    doc.text('MES', margin + 4, y + 4.5);
    doc.text(`TOTAL (${yoy.currentYear})`, margin + 75, y + 4.5);
    doc.text(`AÑO ANT. (${yoy.previousYear})`, margin + 112, y + 4.5);
    doc.text('VARIACIÓN', margin + 145, y + 4.5);
    doc.text('% TOTAL', margin + 168, y + 4.5);
    y += 7;

    const totalDiplomasCurr = yoy.totalDiplomas.current || 1;

    yoy.monthly.forEach((m, idx) => {
      checkPageBreak(6);
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, y, contentWidth, 5.5, 'F');
      }
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);

      const pct = yoy.totalDiplomas.current > 0
        ? Number(((m.currentCount / totalDiplomasCurr) * 100).toFixed(1))
        : 0;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 40, 50);
      doc.text(m.label, margin + 4, y + 3.8);
      doc.setFont('helvetica', 'bold');
      doc.text(String(m.currentCount), margin + 85, y + 3.8);
      doc.setFont('helvetica', 'normal');
      doc.text(String(m.previousCount), margin + 120, y + 3.8);
      const diffSign = m.diff >= 0 ? '+' : '';
      const pctStr = m.percentChange !== null ? ` (${diffSign}${m.percentChange}%)` : '';
      doc.text(`${diffSign}${m.diff}${pctStr}`, margin + 145, y + 3.8);
      doc.text(`${pct}%`, margin + 168, y + 3.8);
      y += 5.5;
    });

    y += 6;

    // Monthly Vector Histogram / Trend Chart (Dual Bars)
    checkPageBreak(52);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 70, 90);
    doc.text('Gráfico de Tendencia Mensual y Comparativa:', margin, y);

    // Chart Legend
    doc.setFontSize(7);
    doc.setFillColor(11, 79, 108); // Primary dark blue
    doc.rect(margin + contentWidth - 48, y - 3, 4, 3, 'F');
    doc.setTextColor(11, 79, 108);
    doc.text(String(yoy.currentYear), margin + contentWidth - 42, y - 0.5);

    doc.setFillColor(148, 163, 184); // Slate gray
    doc.rect(margin + contentWidth - 24, y - 3, 4, 3, 'F');
    doc.setTextColor(100, 115, 130);
    doc.text(String(yoy.previousYear), margin + contentWidth - 18, y - 0.5);

    y += 5;

    const chartHeight = 32;
    const chartWidth = contentWidth;
    const chartBottomY = y + chartHeight;
    const maxMonthlyVal = Math.max(...yoy.monthly.map(m => Math.max(m.currentCount, m.previousCount)), 5);

    // Background chart container
    doc.setFillColor(250, 252, 254);
    doc.setDrawColor(225, 235, 245);
    doc.roundedRect(margin, y, chartWidth, chartHeight + 10, 2, 2, 'FD');

    // Baseline axis
    doc.setDrawColor(200, 215, 230);
    doc.line(margin + 6, chartBottomY, margin + chartWidth - 6, chartBottomY);

    const slotW = (chartWidth - 16) / yoy.monthly.length;
    const barW = Math.max((slotW - 3) / 2, 2.5);

    yoy.monthly.forEach((item, idx) => {
      const barHCurr = maxMonthlyVal > 0 ? (item.currentCount / maxMonthlyVal) * (chartHeight - 8) : 0;
      const barHPrev = maxMonthlyVal > 0 ? (item.previousCount / maxMonthlyVal) * (chartHeight - 8) : 0;

      const xCenter = margin + 8 + idx * slotW + slotW / 2;
      const xBarCurr = xCenter - barW - 0.5;
      const xBarPrev = xCenter + 0.5;

      const yBarCurr = chartBottomY - barHCurr;
      const yBarPrev = chartBottomY - barHPrev;

      // Draw Current Year Bar
      if (barHCurr > 0) {
        doc.setFillColor(11, 79, 108); // Primary dark blue
        doc.rect(xBarCurr, yBarCurr, barW, barHCurr, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(11, 79, 108);
        doc.text(String(item.currentCount), xBarCurr + barW / 2, yBarCurr - 1, { align: 'center' });
      }

      // Draw Previous Year Bar
      if (barHPrev > 0) {
        doc.setFillColor(148, 163, 184); // Slate gray
        doc.rect(xBarPrev, yBarPrev, barW, barHPrev, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 115, 130);
        doc.text(String(item.previousCount), xBarPrev + barW / 2, yBarPrev - 1, { align: 'center' });
      }

      // Month label below baseline
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 115, 130);
      const shortLabel = item.label.substring(0, 3);
      doc.text(shortLabel, xCenter, chartBottomY + 4, { align: 'center' });
    });

    y = chartBottomY + 14;
  } else {
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
  }

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


