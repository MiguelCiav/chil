import { jsPDF } from 'jspdf';
import { StatisticsDataset, YoYComparisonData } from '../types';

export interface FilterSummaryLabels {
  periodLabel?: string;
  regionLabel?: string;
  districtLabel?: string;
  recognitionLabel?: string;
  memberTypeLabel?: string;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 182mm

export type PageBreakChecker = (doc: jsPDF, currentY: number, requiredSpace: number) => number;

export function drawHeaderSmall(doc: jsPDF, y: number): number {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('Asociación de Scouts de Venezuela — Sistema Chil | Reporte Estadístico', MARGIN, y);
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y + 2, MARGIN + CONTENT_WIDTH, y + 2);
  return y + 8;
}

export function checkPageBreak(doc: jsPDF, currentY: number, requiredSpace: number): number {
  if (currentY + requiredSpace > PAGE_HEIGHT - 18) {
    doc.addPage();
    return drawHeaderSmall(doc, 16);
  }
  return currentY;
}

function drawReportBanner(
  doc: jsPDF,
  hasYoY: boolean,
  yoy: YoYComparisonData | undefined,
  todayStr: string,
  y: number
): number {
  const bannerHeight = hasYoY ? 28 : 24;
  doc.setFillColor(11, 79, 108); // Primary dark blue/teal
  doc.rect(MARGIN, y, CONTENT_WIDTH, bannerHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('INFORME EJECUTIVO Y ANÁLISIS ESTADÍSTICO', MARGIN + 6, y + 8);

  if (hasYoY && yoy) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(186, 230, 253);
    doc.text(`Reporte Comparativo Anual (${yoy.previousYear} vs ${yoy.currentYear})`, MARGIN + 6, y + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 235, 245);
    doc.text('Asociación de Scouts de Venezuela • Sistema Chil de Gestión y Emisión', MARGIN + 6, y + 19);
    doc.text(`Fecha de emisión: ${todayStr}`, MARGIN + 6, y + 24);
    return y + 32;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(220, 235, 245);
  doc.text('Asociación de Scouts de Venezuela • Sistema Chil de Gestión y Emisión', MARGIN + 6, y + 15);
  doc.text(`Fecha de emisión: ${todayStr}`, MARGIN + 6, y + 20);
  return y + 28;
}

function drawFilterSummaryBox(doc: jsPDF, filterSummary: FilterSummaryLabels, y: number): number {
  const filterParts: string[] = [];
  if (filterSummary.periodLabel) filterParts.push(`Período: ${filterSummary.periodLabel}`);
  if (filterSummary.recognitionLabel) filterParts.push(`Reconocimiento: ${filterSummary.recognitionLabel}`);
  if (filterSummary.regionLabel) filterParts.push(`Región: ${filterSummary.regionLabel}`);
  if (filterSummary.districtLabel) filterParts.push(`Distrito: ${filterSummary.districtLabel}`);
  if (filterSummary.memberTypeLabel) filterParts.push(`Tipo: ${filterSummary.memberTypeLabel}`);

  if (filterParts.length === 0) return y;

  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(215, 225, 235);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 10, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(50, 70, 90);
  doc.text('Filtros aplicados:', MARGIN + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  const filterText = filterParts.join('  |  ');
  doc.text(filterText.substring(0, 110), MARGIN + 30, y + 6);

  return y + 14;
}

/**
 * Draws the PDF report top header banner and applied filter summary box
 */
export function drawReportHeader(
  doc: jsPDF,
  stats: StatisticsDataset,
  filterSummary?: FilterSummaryLabels,
  startY: number = 16
): number {
  const yoy = stats.yoyComparison;
  const hasYoY = Boolean(yoy?.hasPreviousYearData);

  const todayStr = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  let y = drawReportBanner(doc, hasYoY, yoy, todayStr, startY);

  if (filterSummary) {
    y = drawFilterSummaryBox(doc, filterSummary, y);
  }

  return y;
}

export interface KpiBoxParams {
  doc: jsPDF;
  stats: StatisticsDataset;
  hasYoY?: boolean;
  yoy?: YoYComparisonData;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MonthlyBarParams {
  doc: jsPDF;
  item: { currentCount: number; previousCount: number; label: string };
  idx: number;
  maxMonthlyVal: number;
  slotW: number;
  barW: number;
  chartHeight: number;
  chartBottomY: number;
}

function drawKpiDiplomasBox(params: KpiBoxParams): void {
  const { doc, stats, hasYoY, yoy, x, y, w, h } = params;
  doc.setFillColor(240, 248, 255);
  doc.setDrawColor(180, 215, 245);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(11, 79, 108);
  doc.text('TOTAL RECONOCIMIENTOS', x + 3, y + 5);
  doc.setFontSize(12.5);
  doc.text(String(stats.kpis.totalDiplomas), x + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(90, 105, 120);
  if (hasYoY && yoy) {
    const diffSign = yoy.totalDiplomas.diff >= 0 ? '+' : '';
    const pctStr = yoy.totalDiplomas.percentChange !== null ? ` (${diffSign}${yoy.totalDiplomas.percentChange}%)` : '';
    doc.text(`vs ${yoy.totalDiplomas.previous} en ${yoy.previousYear}: ${diffSign}${yoy.totalDiplomas.diff}${pctStr}`, x + 3, y + 15.5);
  } else {
    doc.text(`de ${stats.kpis.totalMembers} miembros`, x + 3, y + 15.5);
  }
}

function drawKpiBatchesBox(params: KpiBoxParams): void {
  const { doc, stats, hasYoY, yoy, x, y, w, h } = params;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('TOTAL LOTES', x + 3, y + 5);
  doc.setFontSize(12.5);
  doc.text(`${stats.kpis.totalBatches} Lotes`, x + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 90, 40);
  if (hasYoY && yoy) {
    const diffSign = yoy.totalBatches.diff >= 0 ? '+' : '';
    doc.text(`vs ${yoy.totalBatches.previous} en ${yoy.previousYear} (${diffSign}${yoy.totalBatches.diff})`, x + 3, y + 15.5);
  } else {
    doc.text(`Promedio: ${stats.kpis.avgMembersPerBatch}/lote`, x + 3, y + 15.5);
  }
}

function drawKpiTopRecognitionBox(doc: jsPDF, stats: StatisticsDataset, x: number, y: number, w: number, h: number): void {
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('MÁS ENTREGADO', x + 3, y + 5);
  doc.setFontSize(9.5);
  const topRecDisplay = (stats.kpis.topRecognitionName ?? '-').substring(0, 18);
  doc.text(topRecDisplay, x + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(70, 100, 80);
  doc.text(`${stats.kpis.topRecognitionCount ?? 0} emitidos`, x + 3, y + 15.5);
}

function drawKpiTerritoryBox(doc: jsPDF, stats: StatisticsDataset, x: number, y: number, w: number, h: number): void {
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 33, 168);
  doc.text('COBERTURA TERRITORIAL', x + 3, y + 5);
  doc.setFontSize(12.5);
  doc.text(`${stats.kpis.activeRegionsCount} Regiones`, x + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 80, 130);
  doc.text(`en ${stats.kpis.activeDistrictsCount} distritos y ${stats.kpis.activeGroupsCount} grupos`, x + 3, y + 15.5);
}

function drawKpiDemographicsBox(params: KpiBoxParams): void {
  const { doc, stats, hasYoY, yoy, x, y, w, h } = params;
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(3, 105, 161);
  doc.text('DISTRIBUCIÓN DEMOGRÁFICA', x + 3, y + 5);
  doc.setFontSize(10.5);
  doc.text(`${stats.demographics.youngPercentage}% Jóvenes | ${stats.demographics.adultPercentage}% Adultos`, x + 3, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 100, 130);
  if (hasYoY && yoy) {
    doc.text(`vs ${yoy.demographics.young.previous} jóvenes / ${yoy.demographics.adult.previous} adultos (${yoy.previousYear})`, x + 3, y + 15.5);
  } else {
    doc.text(`${stats.demographics.youngCount} jóvenes / ${stats.demographics.adultCount} adultos`, x + 3, y + 15.5);
  }
}

/**
 * Draws executive KPI Summary cards (Top 5 KPIs)
 */
export function drawKpiSummaryBoxes(
  doc: jsPDF,
  stats: StatisticsDataset,
  startY: number
): number {
  let y = startY;
  const yoy = stats.yoyComparison;
  const hasYoY = Boolean(yoy?.hasPreviousYearData);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Indicadores Clave de Rendimiento (KPIs)', MARGIN, y);
  y += 4;

  const boxW3 = (CONTENT_WIDTH - 6) / 3;
  const boxW2 = (CONTENT_WIDTH - 4) / 2;
  const boxH = 18;

  // Row 1
  drawKpiDiplomasBox({ doc, stats, hasYoY, yoy, x: MARGIN, y, w: boxW3, h: boxH });
  drawKpiBatchesBox({ doc, stats, hasYoY, yoy, x: MARGIN + boxW3 + 3, y, w: boxW3, h: boxH });
  drawKpiTopRecognitionBox(doc, stats, MARGIN + 2 * (boxW3 + 3), y, boxW3, boxH);

  y += boxH + 3;

  // Row 2
  drawKpiTerritoryBox(doc, stats, MARGIN, y, boxW2, boxH);
  drawKpiDemographicsBox({ doc, stats, hasYoY, yoy, x: MARGIN + boxW2 + 4, y, w: boxW2, h: boxH });

  y += boxH + 8;
  return y;
}

function drawRegionTableYoY(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  const yoy = stats.yoyComparison!;

  doc.text('REGIÓN', MARGIN + 4, y + 4.5);
  doc.text(`TOTAL (${yoy.currentYear})`, MARGIN + 75, y + 4.5);
  doc.text(`AÑO ANT. (${yoy.previousYear})`, MARGIN + 112, y + 4.5);
  doc.text('VARIACIÓN', MARGIN + 145, y + 4.5);
  doc.text('% TOTAL', MARGIN + 168, y + 4.5);
  y += 7;

  if (yoy.regions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('No hay registros disponibles por región.', MARGIN + 4, y + 5);
    return y + 8;
  }

  yoy.regions.forEach((reg, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F');
    }
    doc.setDrawColor(240, 240, 240);
    doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 40, 50);
    doc.text(`${idx + 1}. ${reg.name.substring(0, 36)}`, MARGIN + 4, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(reg.currentCount), MARGIN + 85, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(String(reg.previousCount), MARGIN + 120, y + 4.2);
    const diffSign = reg.diff >= 0 ? '+' : '';
    const pctStr = reg.percentChange !== null ? ` (${diffSign}${reg.percentChange}%)` : '';
    doc.text(`${diffSign}${reg.diff}${pctStr}`, MARGIN + 145, y + 4.2);
    doc.text(`${reg.currentPercentage}%`, MARGIN + 168, y + 4.2);
    y += 6;
  });

  return y;
}

function drawRegionTableStandard(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  doc.text('REGIÓN', MARGIN + 4, y + 4.5);
  doc.text('TOTAL RECONOCIMIENTOS', MARGIN + 110, y + 4.5);
  doc.text('% DEL TOTAL', MARGIN + 155, y + 4.5);
  y += 7;

  if (stats.geographic.regions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('No hay registros disponibles por región.', MARGIN + 4, y + 5);
    return y + 8;
  }

  stats.geographic.regions.forEach((reg, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F');
    }
    doc.setDrawColor(240, 240, 240);
    doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 40, 50);
    doc.text(`${idx + 1}. ${reg.name.substring(0, 55)}`, MARGIN + 4, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(reg.count), MARGIN + 110, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(`${reg.percentage}%`, MARGIN + 155, y + 4.2);
    y += 6;
  });

  return y;
}

function drawDistrictTableYoY(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  const yoy = stats.yoyComparison!;

  doc.text('REGIÓN', MARGIN + 4, y + 4.5);
  doc.text('DISTRITO', MARGIN + 48, y + 4.5);
  doc.text(`TOTAL (${yoy.currentYear})`, MARGIN + 92, y + 4.5);
  doc.text(`AÑO ANT. (${yoy.previousYear})`, MARGIN + 120, y + 4.5);
  doc.text('VARIACIÓN', MARGIN + 148, y + 4.5);
  doc.text('% TOTAL', MARGIN + 168, y + 4.5);
  y += 7;

  if (yoy.districts.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('No hay registros disponibles por distrito.', MARGIN + 4, y + 5);
    return y + 8;
  }

  yoy.districts.forEach((dist, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F');
    }
    doc.setDrawColor(240, 240, 240);
    doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 80, 95);
    doc.text((dist.parentName ?? '-').substring(0, 22), MARGIN + 4, y + 4.2);
    doc.setTextColor(30, 40, 50);
    doc.text(`${idx + 1}. ${dist.name.substring(0, 22)}`, MARGIN + 48, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(dist.currentCount), MARGIN + 100, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(String(dist.previousCount), MARGIN + 128, y + 4.2);
    const diffSign = dist.diff >= 0 ? '+' : '';
    const pctStr = dist.percentChange !== null ? ` (${diffSign}${dist.percentChange}%)` : '';
    doc.text(`${diffSign}${dist.diff}${pctStr}`, MARGIN + 148, y + 4.2);
    doc.text(`${dist.currentPercentage}%`, MARGIN + 168, y + 4.2);
    y += 6;
  });

  return y;
}

function drawDistrictTableStandard(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  doc.text('REGIÓN', MARGIN + 4, y + 4.5);
  doc.text('DISTRITO', MARGIN + 60, y + 4.5);
  doc.text('TOTAL RECONOCIMIENTOS', MARGIN + 120, y + 4.5);
  doc.text('% DEL TOTAL', MARGIN + 155, y + 4.5);
  y += 7;

  if (stats.geographic.districts.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('No hay registros disponibles por distrito.', MARGIN + 4, y + 5);
    return y + 8;
  }

  stats.geographic.districts.forEach((dist, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F');
    }
    doc.setDrawColor(240, 240, 240);
    doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 80, 95);
    doc.text((dist.parentName ?? '-').substring(0, 30), MARGIN + 4, y + 4.2);
    doc.setTextColor(30, 40, 50);
    doc.text(`${idx + 1}. ${dist.name.substring(0, 35)}`, MARGIN + 60, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(dist.count), MARGIN + 120, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(`${dist.percentage}%`, MARGIN + 155, y + 4.2);
    y += 6;
  });

  return y;
}

/**
 * Draws geographic summary tables (Region and District)
 */
export function drawGeographicTables(
  doc: jsPDF,
  stats: StatisticsDataset,
  startY: number,
  onBreak: PageBreakChecker = checkPageBreak
): number {
  let y = startY;
  const hasYoY = Boolean(stats.yoyComparison?.hasPreviousYearData);

  // SECTION 1: Region Table
  y = onBreak(doc, y, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('1. Reconocimientos Entregados por Región', MARGIN, y);
  y += 4;

  doc.setFillColor(240, 243, 246);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);

  y = hasYoY
    ? drawRegionTableYoY(doc, stats, y, onBreak)
    : drawRegionTableStandard(doc, stats, y, onBreak);

  y += 6;

  // SECTION 2: District Table
  y = onBreak(doc, y, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Reconocimientos Entregados por Distrito', MARGIN, y);
  y += 4;

  doc.setFillColor(240, 243, 246);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);

  y = hasYoY
    ? drawDistrictTableYoY(doc, stats, y, onBreak)
    : drawDistrictTableStandard(doc, stats, y, onBreak);

  y += 6;
  return y;
}

function drawUnitTableYoY(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  const yoy = stats.yoyComparison!;

  doc.text('UNIDAD SCOUT', MARGIN + 4, y + 4.5);
  doc.text(`TOTAL (${yoy.currentYear})`, MARGIN + 75, y + 4.5);
  doc.text(`AÑO ANT. (${yoy.previousYear})`, MARGIN + 112, y + 4.5);
  doc.text('VARIACIÓN', MARGIN + 145, y + 4.5);
  doc.text('% TOTAL', MARGIN + 168, y + 4.5);
  y += 7;

  yoy.units.forEach((item, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F');
    }
    doc.setDrawColor(240, 240, 240);
    doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 40, 50);
    const displayUnitLabel = item.unit === 'no_scout' ? 'No scout (Agradecimientos)' : item.label;
    doc.text(displayUnitLabel, MARGIN + 4, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.currentCount), MARGIN + 85, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(String(item.previousCount), MARGIN + 120, y + 4.2);
    const diffSign = item.diff >= 0 ? '+' : '';
    const pctStr = item.percentChange !== null ? ` (${diffSign}${item.percentChange}%)` : '';
    doc.text(`${diffSign}${item.diff}${pctStr}`, MARGIN + 145, y + 4.2);
    doc.text(`${item.currentPercentage}%`, MARGIN + 168, y + 4.2);
    y += 6;
  });

  return y;
}

function drawUnitTableStandard(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  doc.text('UNIDAD SCOUT', MARGIN + 4, y + 4.5);
  doc.text('TOTAL RECONOCIMIENTOS', MARGIN + 110, y + 4.5);
  doc.text('% DEL TOTAL', MARGIN + 155, y + 4.5);
  y += 7;

  stats.unitDistribution.items.forEach((item, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F');
    }
    doc.setDrawColor(240, 240, 240);
    doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 40, 50);
    const displayUnitLabel = item.unit === 'no_scout' ? 'No scout (Agradecimientos)' : item.label;
    doc.text(displayUnitLabel, MARGIN + 4, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.count), MARGIN + 110, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.percentage}%`, MARGIN + 155, y + 4.2);
    y += 6;
  });

  return y;
}

function drawDemographicsTableYoY(doc: jsPDF, stats: StatisticsDataset, startY: number): number {
  let y = startY;
  const yoy = stats.yoyComparison!;

  doc.text('CATEGORÍA', MARGIN + 4, y + 4.5);
  doc.text(`TOTAL (${yoy.currentYear})`, MARGIN + 75, y + 4.5);
  doc.text(`AÑO ANT. (${yoy.previousYear})`, MARGIN + 112, y + 4.5);
  doc.text('VARIACIÓN', MARGIN + 145, y + 4.5);
  doc.text('% TOTAL', MARGIN + 168, y + 4.5);
  y += 7;

  // Row 1: Jóvenes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 40, 50);
  doc.text('Jóvenes', MARGIN + 4, y + 4.2);
  doc.setFont('helvetica', 'bold');
  doc.text(String(yoy.demographics.young.current), MARGIN + 85, y + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(String(yoy.demographics.young.previous), MARGIN + 120, y + 4.2);
  const youngSign = yoy.demographics.young.diff >= 0 ? '+' : '';
  const youngPctStr = yoy.demographics.young.percentChange !== null ? ` (${youngSign}${yoy.demographics.young.percentChange}%)` : '';
  doc.text(`${youngSign}${yoy.demographics.young.diff}${youngPctStr}`, MARGIN + 145, y + 4.2);
  doc.text(`${yoy.demographics.young.currentPercentage}%`, MARGIN + 168, y + 4.2);
  doc.setDrawColor(240, 240, 240);
  doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);
  y += 6;

  // Row 2: Adultos
  doc.setFillColor(250, 251, 252);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 40, 50);
  doc.text('Adultos', MARGIN + 4, y + 4.2);
  doc.setFont('helvetica', 'bold');
  doc.text(String(yoy.demographics.adult.current), MARGIN + 85, y + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(String(yoy.demographics.adult.previous), MARGIN + 120, y + 4.2);
  const adultSign = yoy.demographics.adult.diff >= 0 ? '+' : '';
  const adultPctStr = yoy.demographics.adult.percentChange !== null ? ` (${adultSign}${yoy.demographics.adult.percentChange}%)` : '';
  doc.text(`${adultSign}${yoy.demographics.adult.diff}${adultPctStr}`, MARGIN + 145, y + 4.2);
  doc.text(`${yoy.demographics.adult.currentPercentage}%`, MARGIN + 168, y + 4.2);
  doc.setDrawColor(240, 240, 240);
  doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);
  y += 6;

  // Row 3: Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(11, 79, 108);
  doc.text('Total', MARGIN + 4, y + 4.2);
  doc.text(String(yoy.demographics.total.current), MARGIN + 85, y + 4.2);
  doc.text(String(yoy.demographics.total.previous), MARGIN + 120, y + 4.2);
  const totalSign = yoy.demographics.total.diff >= 0 ? '+' : '';
  doc.text(`${totalSign}${yoy.demographics.total.diff}`, MARGIN + 145, y + 4.2);
  doc.text('100%', MARGIN + 168, y + 4.2);
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);
  y += 10;

  return y;
}

function drawDemographicsTableStandard(doc: jsPDF, stats: StatisticsDataset, startY: number): number {
  let y = startY;
  doc.text('CATEGORÍA', MARGIN + 4, y + 4.5);
  doc.text('TOTAL RECONOCIMIENTOS', MARGIN + 110, y + 4.5);
  doc.text('% DEL TOTAL', MARGIN + 155, y + 4.5);
  y += 7;

  // Row 1: Jóvenes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 40, 50);
  doc.text('Jóvenes', MARGIN + 4, y + 4.2);
  doc.setFont('helvetica', 'bold');
  doc.text(String(stats.demographics.youngCount), MARGIN + 110, y + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.demographics.youngPercentage}%`, MARGIN + 155, y + 4.2);
  doc.setDrawColor(240, 240, 240);
  doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);
  y += 6;

  // Row 2: Adultos
  doc.setFillColor(250, 251, 252);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 40, 50);
  doc.text('Adultos', MARGIN + 4, y + 4.2);
  doc.setFont('helvetica', 'bold');
  doc.text(String(stats.demographics.adultCount), MARGIN + 110, y + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.demographics.adultPercentage}%`, MARGIN + 155, y + 4.2);
  doc.setDrawColor(240, 240, 240);
  doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);
  y += 6;

  // Row 3: Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(11, 79, 108);
  doc.text('Total', MARGIN + 4, y + 4.2);
  doc.text(String(stats.demographics.totalCount), MARGIN + 110, y + 4.2);
  doc.text('100%', MARGIN + 155, y + 4.2);
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);
  y += 10;

  return y;
}

/**
 * Draws unit breakdown and demographics tables
 */
export function drawUnitAndDemographicsTables(
  doc: jsPDF,
  stats: StatisticsDataset,
  startY: number,
  onBreak: PageBreakChecker = checkPageBreak
): number {
  let y = startY;
  const yoy = stats.yoyComparison;
  const hasYoY = Boolean(yoy?.hasPreviousYearData);

  const hasUnitData = (hasYoY && yoy)
    ? yoy.units.length > 0
    : Boolean(stats.unitDistribution?.items?.length > 0);

  // SECTION 3: Unit Table (conditional)
  if (hasUnitData) {
    y = onBreak(doc, y, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('3. Reconocimientos Entregados por Unidad Scout', MARGIN, y);
    y += 4;

    doc.setFillColor(240, 243, 246);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 80, 95);

    y = (hasYoY && yoy)
      ? drawUnitTableYoY(doc, stats, y, onBreak)
      : drawUnitTableStandard(doc, stats, y, onBreak);

    // Footnote
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(110, 120, 130);
    doc.text('* Nota: Los reconocimientos emitidos a miembros No scout corresponden a Agradecimientos institucionales.', MARGIN + 4, y + 4.5);
    y += 8;
  }

  // SECTION 4: Demographics Table
  y = onBreak(doc, y, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('4. Resumen Demográfico (Jóvenes y Adultos)', MARGIN, y);
  y += 4;

  doc.setFillColor(240, 243, 246);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);

  y = (hasYoY && yoy)
    ? drawDemographicsTableYoY(doc, stats, y)
    : drawDemographicsTableStandard(doc, stats, y);

  return y;
}

function drawMonthlyTableYoY(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  const yoy = stats.yoyComparison!;

  doc.text('MES', MARGIN + 4, y + 4.5);
  doc.text(`TOTAL (${yoy.currentYear})`, MARGIN + 75, y + 4.5);
  doc.text(`AÑO ANT. (${yoy.previousYear})`, MARGIN + 112, y + 4.5);
  doc.text('VARIACIÓN', MARGIN + 145, y + 4.5);
  doc.text('% TOTAL', MARGIN + 168, y + 4.5);
  y += 7;

  const totalDiplomasCurr = yoy.totalDiplomas.current || 1;

  yoy.monthly.forEach((m, idx) => {
    y = onBreak(doc, y, 6);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 5.5, 'F');
    }
    doc.setDrawColor(240, 240, 240);
    doc.line(MARGIN, y + 5.5, MARGIN + CONTENT_WIDTH, y + 5.5);

    const pct = yoy.totalDiplomas.current > 0
      ? Number(((m.currentCount / totalDiplomasCurr) * 100).toFixed(1))
      : 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 40, 50);
    doc.text(m.label, MARGIN + 4, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(m.currentCount), MARGIN + 85, y + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.text(String(m.previousCount), MARGIN + 120, y + 3.8);
    const diffSign = m.diff >= 0 ? '+' : '';
    const pctStr = m.percentChange !== null ? ` (${diffSign}${m.percentChange}%)` : '';
    doc.text(`${diffSign}${m.diff}${pctStr}`, MARGIN + 145, y + 3.8);
    doc.text(`${pct}%`, MARGIN + 168, y + 3.8);
    y += 5.5;
  });

  return y;
}

function drawMonthlyTableStandard(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  doc.text('MES', MARGIN + 4, y + 4.5);
  doc.text('RECONOCIMIENTOS EMITIDOS', MARGIN + 110, y + 4.5);
  doc.text('% DEL TOTAL', MARGIN + 155, y + 4.5);
  y += 7;

  const totalDiplomas = stats.kpis.totalDiplomas || 1;

  stats.monthlyTrends.forEach((m, idx) => {
    y = onBreak(doc, y, 6);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 5.5, 'F');
    }
    doc.setDrawColor(240, 240, 240);
    doc.line(MARGIN, y + 5.5, MARGIN + CONTENT_WIDTH, y + 5.5);

    const pct = stats.kpis.totalDiplomas > 0
      ? Number(((m.totalCount / totalDiplomas) * 100).toFixed(1))
      : 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 40, 50);
    doc.text(m.label, MARGIN + 4, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(m.totalCount), MARGIN + 110, y + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pct}%`, MARGIN + 155, y + 3.8);
    y += 5.5;
  });

  return y;
}

function drawYoYMonthlyBar(params: MonthlyBarParams): void {
  const { doc, item, idx, maxMonthlyVal, slotW, barW, chartHeight, chartBottomY } = params;
  const barHCurr = maxMonthlyVal > 0 ? (item.currentCount / maxMonthlyVal) * (chartHeight - 8) : 0;
  const barHPrev = maxMonthlyVal > 0 ? (item.previousCount / maxMonthlyVal) * (chartHeight - 8) : 0;

  const xCenter = MARGIN + 8 + idx * slotW + slotW / 2;
  const xBarCurr = xCenter - barW - 0.5;
  const xBarPrev = xCenter + 0.5;

  const yBarCurr = chartBottomY - barHCurr;
  const yBarPrev = chartBottomY - barHPrev;

  // Draw Current Year Bar
  if (barHCurr > 0) {
    doc.setFillColor(11, 79, 108);
    doc.rect(xBarCurr, yBarCurr, barW, barHCurr, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(11, 79, 108);
    doc.text(String(item.currentCount), xBarCurr + barW / 2, yBarCurr - 1, { align: 'center' });
  }

  // Draw Previous Year Bar
  if (barHPrev > 0) {
    doc.setFillColor(148, 163, 184);
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
}

function drawMonthlyChartYoY(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = onBreak(doc, startY, 52);
  const yoy = stats.yoyComparison!;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 70, 90);
  doc.text('Gráfico de Tendencia Mensual y Comparativa:', MARGIN, y);

  // Legend
  doc.setFontSize(7);
  doc.setFillColor(11, 79, 108); // Primary dark blue
  doc.rect(MARGIN + CONTENT_WIDTH - 48, y - 3, 4, 3, 'F');
  doc.setTextColor(11, 79, 108);
  doc.text(String(yoy.currentYear), MARGIN + CONTENT_WIDTH - 42, y - 0.5);

  doc.setFillColor(148, 163, 184); // Slate gray
  doc.rect(MARGIN + CONTENT_WIDTH - 24, y - 3, 4, 3, 'F');
  doc.setTextColor(100, 115, 130);
  doc.text(String(yoy.previousYear), MARGIN + CONTENT_WIDTH - 18, y - 0.5);

  y += 5;

  const chartHeight = 32;
  const chartWidth = CONTENT_WIDTH;
  const chartBottomY = y + chartHeight;
  const maxMonthlyVal = Math.max(...yoy.monthly.map(m => Math.max(m.currentCount, m.previousCount)), 5);

  // Background chart container
  doc.setFillColor(250, 252, 254);
  doc.setDrawColor(225, 235, 245);
  doc.roundedRect(MARGIN, y, chartWidth, chartHeight + 10, 2, 2, 'FD');

  // Baseline axis
  doc.setDrawColor(200, 215, 230);
  doc.line(MARGIN + 6, chartBottomY, MARGIN + chartWidth - 6, chartBottomY);

  const slotW = (chartWidth - 16) / yoy.monthly.length;
  const barW = Math.max((slotW - 3) / 2, 2.5);

  yoy.monthly.forEach((item, idx) => {
    drawYoYMonthlyBar({
      doc,
      item,
      idx,
      maxMonthlyVal,
      slotW,
      barW,
      chartHeight,
      chartBottomY
    });
  });

  return chartBottomY + 14;
}

function drawMonthlyChartStandard(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = onBreak(doc, startY, 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 70, 90);
  doc.text('Gráfico de Tendencia Mensual de Reconocimientos:', MARGIN, y);
  y += 5;

  const chartHeight = 32;
  const chartWidth = CONTENT_WIDTH;
  const chartBottomY = y + chartHeight;
  const maxMonthlyVal = Math.max(...stats.monthlyTrends.map(m => m.totalCount), 5);

  // Background chart container
  doc.setFillColor(250, 252, 254);
  doc.setDrawColor(225, 235, 245);
  doc.roundedRect(MARGIN, y, chartWidth, chartHeight + 10, 2, 2, 'FD');

  // Baseline axis
  doc.setDrawColor(200, 215, 230);
  doc.line(MARGIN + 6, chartBottomY, MARGIN + chartWidth - 6, chartBottomY);

  const slotW = (chartWidth - 16) / stats.monthlyTrends.length;
  const barW = Math.max(slotW * 0.55, 4);

  stats.monthlyTrends.forEach((item, idx) => {
    const barHeight = maxMonthlyVal > 0 ? (item.totalCount / maxMonthlyVal) * (chartHeight - 8) : 0;
    const xCenter = MARGIN + 8 + idx * slotW + slotW / 2;
    const xBar = xCenter - barW / 2;
    const yBar = chartBottomY - barHeight;

    // Draw Bar
    if (barHeight > 0) {
      doc.setFillColor(11, 79, 108);
      doc.rect(xBar, yBar, barW, barHeight, 'F');

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

  return chartBottomY + 14;
}

/**
 * Draws Section 5: Monthly summary table and histogram chart
 */
export function drawMonthlyTrendSection(
  doc: jsPDF,
  stats: StatisticsDataset,
  startY: number,
  onBreak: PageBreakChecker = checkPageBreak
): number {
  let y = onBreak(doc, startY, 75);
  const yoy = stats.yoyComparison;
  const hasYoY = Boolean(yoy?.hasPreviousYearData);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('5. Resumen Mensual de Reconocimientos', MARGIN, y);
  y += 4;

  // Summary Table
  doc.setFillColor(240, 243, 246);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);

  y = (hasYoY && yoy)
    ? drawMonthlyTableYoY(doc, stats, y, onBreak)
    : drawMonthlyTableStandard(doc, stats, y, onBreak);

  y += 6;

  // Monthly Histogram Chart
  y = (hasYoY && yoy)
    ? drawMonthlyChartYoY(doc, stats, y, onBreak)
    : drawMonthlyChartStandard(doc, stats, y, onBreak);

  return y;
}

/**
 * Stamps footer on all document pages
 */
export function drawReportFooter(doc: jsPDF, pageCount?: number): void {
  const totalPages = pageCount ?? doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.line(MARGIN, PAGE_HEIGHT - 12, MARGIN + CONTENT_WIDTH, PAGE_HEIGHT - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text('Sistema Chil • Documento generado automáticamente para uso institucional interno.', MARGIN, PAGE_HEIGHT - 7);
    doc.text(`Página ${i} de ${totalPages}`, MARGIN + CONTENT_WIDTH - 16, PAGE_HEIGHT - 7);
  }
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

  const dateFileTag = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const fileName = `Reporte_Estadistico_Chil_${dateFileTag}.pdf`;

  // 1. Header Banner & Filter Summary
  let y = drawReportHeader(doc, stats, filterSummary, 16);

  // 2. Executive KPI Summary Cards
  y = drawKpiSummaryBoxes(doc, stats, y);

  // 3. Geographic Tables (Regions & Districts)
  y = drawGeographicTables(doc, stats, y, checkPageBreak);

  // 4. Unit & Demographics Tables
  y = drawUnitAndDemographicsTables(doc, stats, y, checkPageBreak);

  // 5. Monthly Trends Table & Histogram Chart
  drawMonthlyTrendSection(doc, stats, y, checkPageBreak);

  // 6. Stamp Footer across all pages
  drawReportFooter(doc);

  doc.save(fileName);
  return fileName;
}


