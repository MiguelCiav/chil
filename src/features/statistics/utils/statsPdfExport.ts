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

type RgbTuple = readonly [number, number, number];

const COLORS = {
  primary: [140, 78, 55] as RgbTuple,
  primaryTintBg: [244, 237, 234] as RgbTuple,
  primaryTintBorder: [229, 216, 211] as RgbTuple,
  neutral: [56, 56, 54] as RgbTuple,
  muted: [115, 115, 112] as RgbTuple,
  subtle: [148, 163, 184] as RgbTuple,
  cardBorder: [229, 231, 235] as RgbTuple,
  rowDivider: [241, 245, 249] as RgbTuple,
  warmSurface: [250, 248, 245] as RgbTuple,
  trackBg: [241, 245, 249] as RgbTuple,
  white: [255, 255, 255] as RgbTuple,
  sky: [2, 132, 199] as RgbTuple,
  skyText: [3, 105, 161] as RgbTuple,
  skyBg: [240, 249, 255] as RgbTuple,
  amber: [245, 158, 11] as RgbTuple,
  amberText: [180, 83, 9] as RgbTuple,
  emeraldDark: [5, 150, 105] as RgbTuple,
  emeraldMed: [16, 185, 129] as RgbTuple,
  emeraldLight: [52, 211, 153] as RgbTuple,
  indigoDark: [79, 70, 229] as RgbTuple,
  indigoMed: [99, 102, 241] as RgbTuple,
  indigoLight: [129, 140, 248] as RgbTuple,
  purple: [126, 34, 206] as RgbTuple,
  rose: [190, 18, 60] as RgbTuple,
  slatePrev: [203, 213, 225] as RgbTuple
} as const;

const UNIT_RGB_COLORS: Record<string, RgbTuple> = {
  manada: [245, 158, 11],
  tropa: [16, 185, 129],
  caminantes: [59, 130, 246],
  clan: [239, 68, 68],
  institucional: [168, 85, 247],
  no_scout: [148, 163, 184]
};

export type PageBreakChecker = (doc: jsPDF, currentY: number, requiredSpace: number) => number;

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
  chartStartX: number;
}

function setRgbFill(doc: jsPDF, rgb: RgbTuple): void {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setRgbDraw(doc: jsPDF, rgb: RgbTuple): void {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setRgbText(doc: jsPDF, rgb: RgbTuple): void {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function getRatioBarColor(
  count: number,
  maxCount: number,
  palette: readonly [RgbTuple, RgbTuple, RgbTuple]
): RgbTuple {
  if (maxCount <= 0) return palette[0];
  const ratio = count / maxCount;
  if (ratio > 0.75) return palette[0];
  if (ratio > 0.4) return palette[1];
  return palette[2];
}

function drawMiniProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  ratio: number,
  fillRgb: RgbTuple
): void {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  setRgbFill(doc, COLORS.trackBg);
  doc.roundedRect(x, y, width, 1.8, 0.9, 0.9, 'F');
  if (clampedRatio > 0) {
    const fillW = Math.max(width * clampedRatio, 1.2);
    setRgbFill(doc, fillRgb);
    doc.roundedRect(x, y, Math.min(fillW, width), 1.8, 0.9, 0.9, 'F');
  }
}

function formatVariationText(diff: number, percentChange: number | null): string {
  const diffSign = diff >= 0 ? '+' : '';
  const pctStr = percentChange !== null ? ` (${diffSign}${percentChange}%)` : '';
  return `${diffSign}${diff}${pctStr}`;
}

function drawSectionHeaderCard(
  doc: jsPDF,
  options: {
    title: string;
    subtitle: string;
    badgeText?: string;
    accentRgb: RgbTuple;
    y: number;
    borderRgb?: RgbTuple;
  }
): number {
  const { title, subtitle, badgeText, accentRgb, y, borderRgb = COLORS.cardBorder } = options;

  setRgbFill(doc, COLORS.white);
  setRgbDraw(doc, borderRgb);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 13, 2, 2, 'FD');

  // Icon accent pill matching web card icon wrapper
  setRgbFill(doc, accentRgb);
  doc.roundedRect(MARGIN + 3.5, y + 3.2, 1.8, 6.6, 0.9, 0.9, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setRgbText(doc, COLORS.neutral);
  doc.text(title, MARGIN + 7.5, y + 5.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  setRgbText(doc, COLORS.muted);
  doc.text(subtitle, MARGIN + 7.5, y + 10);

  if (badgeText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    const pillW = Math.max(badgeText.length * 1.45 + 6, 18);
    const pillX = MARGIN + CONTENT_WIDTH - pillW - 3.5;
    setRgbFill(doc, COLORS.rowDivider);
    doc.roundedRect(pillX, y + 3.6, pillW, 5.4, 2.5, 2.5, 'F');
    setRgbText(doc, COLORS.muted);
    doc.text(badgeText, pillX + pillW / 2, y + 7.1, { align: 'center' });
  }

  return y + 15;
}

function drawTableHeaderBar(doc: jsPDF, y: number): void {
  setRgbFill(doc, COLORS.primaryTintBg);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
  setRgbDraw(doc, COLORS.primaryTintBorder);
  doc.line(MARGIN, y + 7, MARGIN + CONTENT_WIDTH, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setRgbText(doc, COLORS.neutral);
}

export function drawHeaderSmall(doc: jsPDF, y: number): number {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  setRgbText(doc, COLORS.muted);
  doc.text('Asociación de Scouts de Venezuela — Sistema Chil | Estadísticas y Análisis', MARGIN, y);
  setRgbDraw(doc, COLORS.cardBorder);
  doc.line(MARGIN, y + 2, MARGIN + CONTENT_WIDTH, y + 2);
  return y + 7;
}

export function checkPageBreak(doc: jsPDF, currentY: number, requiredSpace: number): number {
  if (currentY + requiredSpace > PAGE_HEIGHT - 18) {
    doc.addPage();
    return drawHeaderSmall(doc, 14);
  }
  return currentY;
}

function drawFilterSummaryBox(doc: jsPDF, filterSummary: FilterSummaryLabels, y: number): number {
  const filterParts: string[] = [];
  if (filterSummary.periodLabel) filterParts.push(`Período: ${filterSummary.periodLabel}`);
  if (filterSummary.recognitionLabel) filterParts.push(`Reconocimiento: ${filterSummary.recognitionLabel}`);
  if (filterSummary.regionLabel) filterParts.push(`Región: ${filterSummary.regionLabel}`);
  if (filterSummary.districtLabel) filterParts.push(`Distrito: ${filterSummary.districtLabel}`);
  if (filterSummary.memberTypeLabel) filterParts.push(`Tipo: ${filterSummary.memberTypeLabel}`);

  if (filterParts.length === 0) return y;

  setRgbFill(doc, COLORS.warmSurface);
  setRgbDraw(doc, COLORS.cardBorder);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 9.5, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  setRgbText(doc, COLORS.primary);
  doc.text('Filtros activos:', MARGIN + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  setRgbText(doc, COLORS.neutral);
  const filterText = filterParts.join('  •  ');
  doc.text(filterText.substring(0, 110), MARGIN + 26, y + 6);

  return y + 13;
}

/**
 * Draws the web-matching page header and applied filters bar.
 */
export function drawReportHeader(
  doc: jsPDF,
  stats: StatisticsDataset,
  filterSummary?: FilterSummaryLabels,
  startY: number = 14
): number {
  const yoy = stats.yoyComparison;
  const hasYoY = Boolean(yoy?.hasPreviousYearData);
  const todayStr = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  let y = startY;

  // Web-matching crisp light header card
  setRgbFill(doc, COLORS.white);
  setRgbDraw(doc, COLORS.primaryTintBorder);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 21, 2.5, 2.5, 'FD');

  // Left brand accent bar
  setRgbFill(doc, COLORS.primary);
  doc.roundedRect(MARGIN, y, 2.2, 21, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setRgbText(doc, COLORS.neutral);
  doc.text('Estadísticas y Análisis', MARGIN + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setRgbText(doc, COLORS.muted);
  doc.text(
    'Métricas consolidadas, tendencias temporales y cobertura de reconocimientos emitidos.',
    MARGIN + 6,
    y + 13.5
  );

  doc.setFontSize(6.8);
  setRgbText(doc, COLORS.subtle);
  doc.text(`Asociación de Scouts de Venezuela • Sistema Chil • Emitido el ${todayStr}`, MARGIN + 6, y + 18);

  if (hasYoY && yoy) {
    const pillLabel = `Reporte Comparativo Anual (${yoy.previousYear} vs ${yoy.currentYear})`;
    const pillW = Math.max(pillLabel.length * 1.48 + 6, 56);
    const pillX = MARGIN + CONTENT_WIDTH - pillW - 4;
    setRgbFill(doc, COLORS.skyBg);
    setRgbDraw(doc, [186, 230, 253]);
    doc.roundedRect(pillX, y + 4.5, pillW, 6.2, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    setRgbText(doc, COLORS.skyText);
    doc.text(pillLabel, pillX + pillW / 2, y + 8.6, { align: 'center' });
  }

  y += 24;

  if (filterSummary) {
    y = drawFilterSummaryBox(doc, filterSummary, y);
  }

  return y;
}

function drawKpiCardShell(x: number, y: number, w: number, h: number, doc: jsPDF): void {
  setRgbFill(doc, COLORS.white);
  setRgbDraw(doc, COLORS.cardBorder);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
}

function drawKpiDiplomasCard(params: KpiBoxParams): void {
  const { doc, stats, hasYoY, yoy, x, y, w, h } = params;
  drawKpiCardShell(x, y, w, h, doc);

  setRgbFill(doc, COLORS.primaryTintBg);
  doc.roundedRect(x + w - 8, y + 2.5, 5.5, 5.5, 1.5, 1.5, 'F');
  setRgbFill(doc, COLORS.primary);
  doc.roundedRect(x + w - 6.3, y + 4.2, 2.1, 2.1, 0.5, 0.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  setRgbText(doc, COLORS.muted);
  doc.text('TOTAL RECONOCIMIENTOS', x + 3, y + 5.5);

  doc.setFontSize(13.5);
  setRgbText(doc, COLORS.neutral);
  doc.text(String(stats.kpis.totalDiplomas), x + 3, y + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  setRgbText(doc, COLORS.muted);
  doc.text(`de ${stats.kpis.totalMembers} miembros procesados`, x + 3, y + 16.5);

  if (hasYoY && yoy) {
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(x + 3, y + 18.2, x + w - 3, y + 18.2);
    doc.setFontSize(6);
    setRgbText(doc, COLORS.muted);
    doc.text(`vs ${yoy.previousYear}:`, x + 3, y + 21.5);
    doc.setFont('helvetica', 'bold');
    setRgbText(doc, yoy.totalDiplomas.diff >= 0 ? COLORS.emeraldDark : COLORS.rose);
    doc.text(
      formatVariationText(yoy.totalDiplomas.diff, yoy.totalDiplomas.percentChange),
      x + w - 3,
      y + 21.5,
      { align: 'right' }
    );
  }
}

function drawKpiTopRecognitionCard(params: KpiBoxParams): void {
  const { doc, stats, x, y, w, h } = params;
  drawKpiCardShell(x, y, w, h, doc);

  setRgbFill(doc, [236, 253, 245]);
  doc.roundedRect(x + w - 8, y + 2.5, 5.5, 5.5, 1.5, 1.5, 'F');
  setRgbFill(doc, COLORS.emeraldDark);
  doc.roundedRect(x + w - 6.3, y + 4.2, 2.1, 2.1, 0.5, 0.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  setRgbText(doc, COLORS.muted);
  doc.text('MÁS ENTREGADO', x + 3, y + 5.5);

  doc.setFontSize(9.2);
  setRgbText(doc, [4, 120, 87]);
  const topRecDisplay = (stats.kpis.topRecognitionName ?? '-').substring(0, 20);
  doc.text(topRecDisplay, x + 3, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  setRgbText(doc, COLORS.muted);
  doc.text(`${stats.kpis.topRecognitionCount ?? 0} reconocimientos emitidos`, x + 3, y + 16.5);
}

function drawKpiTerritoryCard(params: KpiBoxParams): void {
  const { doc, stats, x, y, w, h } = params;
  drawKpiCardShell(x, y, w, h, doc);

  setRgbFill(doc, [243, 232, 255]);
  doc.roundedRect(x + w - 8, y + 2.5, 5.5, 5.5, 1.5, 1.5, 'F');
  setRgbFill(doc, COLORS.purple);
  doc.roundedRect(x + w - 6.3, y + 4.2, 2.1, 2.1, 0.5, 0.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  setRgbText(doc, COLORS.muted);
  doc.text('REGIONES Y DISTRITOS', x + 3, y + 5.5);

  doc.setFontSize(12.5);
  setRgbText(doc, COLORS.purple);
  doc.text(`${stats.kpis.activeRegionsCount} Regiones`, x + 3, y + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  setRgbText(doc, COLORS.muted);
  doc.text(
    `en ${stats.kpis.activeDistrictsCount} distritos y ${stats.kpis.activeGroupsCount} grupos`,
    x + 3,
    y + 16.5
  );
}

function drawKpiDemographicsCard(params: KpiBoxParams): void {
  const { doc, stats, hasYoY, yoy, x, y, w, h } = params;
  drawKpiCardShell(x, y, w, h, doc);

  setRgbFill(doc, COLORS.skyBg);
  doc.roundedRect(x + w - 8, y + 2.5, 5.5, 5.5, 1.5, 1.5, 'F');
  setRgbFill(doc, COLORS.sky);
  doc.roundedRect(x + w - 6.3, y + 4.2, 2.1, 2.1, 0.5, 0.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  setRgbText(doc, COLORS.muted);
  doc.text('DEMOGRAFÍA', x + 3, y + 5.5);

  doc.setFontSize(12);
  setRgbText(doc, COLORS.skyText);
  doc.text(`${stats.demographics.youngPercentage}% Jóvenes`, x + 3, y + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.1);
  setRgbText(doc, COLORS.muted);
  doc.text(
    `${stats.demographics.youngCount} jóv. / ${stats.demographics.adultCount} adul. (${stats.demographics.adultPercentage}%)`,
    x + 3,
    y + 16.5
  );

  if (hasYoY && yoy) {
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(x + 3, y + 18.2, x + w - 3, y + 18.2);
    const jDiff = yoy.demographics.young.diff;
    const aDiff = yoy.demographics.adult.diff;
    doc.setFontSize(5.8);
    setRgbText(doc, COLORS.muted);
    doc.text(`vs ${yoy.previousYear}:`, x + 3, y + 21.5);
    doc.setFont('helvetica', 'bold');
    setRgbText(doc, jDiff >= 0 ? COLORS.emeraldDark : COLORS.rose);
    doc.text(`J:${jDiff >= 0 ? '+' : ''}${jDiff} | A:${aDiff >= 0 ? '+' : ''}${aDiff}`, x + w - 3, y + 21.5, {
      align: 'right'
    });
  }
}

/**
 * Draws the 4 web-matching KPI cards (`StatKpiGrid`).
 */
export function drawKpiSummaryBoxes(
  doc: jsPDF,
  stats: StatisticsDataset,
  startY: number
): number {
  const yoy = stats.yoyComparison;
  const hasYoY = Boolean(yoy?.hasPreviousYearData);
  const gap = 3;
  const cardW = (CONTENT_WIDTH - gap * 3) / 4;
  const cardH = hasYoY ? 23.5 : 19;

  drawKpiDiplomasCard({ doc, stats, hasYoY, yoy, x: MARGIN, y: startY, w: cardW, h: cardH });
  drawKpiTopRecognitionCard({ doc, stats, hasYoY, yoy, x: MARGIN + cardW + gap, y: startY, w: cardW, h: cardH });
  drawKpiTerritoryCard({ doc, stats, hasYoY, yoy, x: MARGIN + 2 * (cardW + gap), y: startY, w: cardW, h: cardH });
  drawKpiDemographicsCard({ doc, stats, hasYoY, yoy, x: MARGIN + 3 * (cardW + gap), y: startY, w: cardW, h: cardH });

  return startY + cardH + 6;
}

function drawRegionTableYoY(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  const yoy = stats.yoyComparison!;
  const maxCount = Math.max(...yoy.regions.map(r => r.currentCount), 1);

  drawTableHeaderBar(doc, y);
  doc.text('REGIÓN', MARGIN + 4, y + 4.7);
  doc.text(`TOTAL (${yoy.currentYear})`, MARGIN + 74, y + 4.7);
  doc.text(`AÑO ANT. (${yoy.previousYear})`, MARGIN + 102, y + 4.7);
  doc.text('VARIACIÓN', MARGIN + 131, y + 4.7);
  doc.text('% DEL TOTAL', MARGIN + 157, y + 4.7);
  y += 7;

  if (yoy.regions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setRgbText(doc, COLORS.subtle);
    doc.text('No hay registros disponibles por región.', MARGIN + 4, y + 5);
    return y + 8;
  }

  yoy.regions.forEach((reg, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      setRgbFill(doc, COLORS.warmSurface);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6.2, 'F');
    }
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(MARGIN, y + 6.2, MARGIN + CONTENT_WIDTH, y + 6.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setRgbText(doc, COLORS.neutral);
    doc.text(`${idx + 1}. ${reg.name.substring(0, 34)}`, MARGIN + 4, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(reg.currentCount), MARGIN + 84, y + 4.2);
    doc.setFont('helvetica', 'normal');
    setRgbText(doc, COLORS.muted);
    doc.text(String(reg.previousCount), MARGIN + 112, y + 4.2);

    setRgbText(doc, reg.diff >= 0 ? COLORS.emeraldDark : COLORS.rose);
    doc.text(formatVariationText(reg.diff, reg.percentChange), MARGIN + 131, y + 4.2);

    setRgbText(doc, COLORS.neutral);
    doc.text(`${reg.currentPercentage}%`, MARGIN + 163, y + 4.2, { align: 'right' });
    drawMiniProgressBar(
      doc,
      MARGIN + 166,
      y + 2.2,
      13,
      reg.currentCount / maxCount,
      getRatioBarColor(reg.currentCount, maxCount, [COLORS.emeraldDark, COLORS.emeraldMed, COLORS.emeraldLight])
    );
    y += 6.2;
  });

  return y;
}

function drawRegionTableStandard(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  const maxCount = Math.max(...stats.geographic.regions.map(r => r.count), 1);

  drawTableHeaderBar(doc, y);
  doc.text('REGIÓN', MARGIN + 4, y + 4.7);
  doc.text('TOTAL RECONOCIMIENTOS', MARGIN + 104, y + 4.7);
  doc.text('% DEL TOTAL', MARGIN + 150, y + 4.7);
  y += 7;

  if (stats.geographic.regions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setRgbText(doc, COLORS.subtle);
    doc.text('No hay registros disponibles por región.', MARGIN + 4, y + 5);
    return y + 8;
  }

  stats.geographic.regions.forEach((reg, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      setRgbFill(doc, COLORS.warmSurface);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6.2, 'F');
    }
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(MARGIN, y + 6.2, MARGIN + CONTENT_WIDTH, y + 6.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setRgbText(doc, COLORS.neutral);
    doc.text(`${idx + 1}. ${reg.name.substring(0, 52)}`, MARGIN + 4, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(reg.count), MARGIN + 114, y + 4.2);
    doc.setFont('helvetica', 'normal');
    setRgbText(doc, COLORS.muted);
    doc.text(`${reg.percentage}%`, MARGIN + 160, y + 4.2, { align: 'right' });
    drawMiniProgressBar(
      doc,
      MARGIN + 163,
      y + 2.2,
      16,
      reg.count / maxCount,
      getRatioBarColor(reg.count, maxCount, [COLORS.emeraldDark, COLORS.emeraldMed, COLORS.emeraldLight])
    );
    y += 6.2;
  });

  return y;
}

function drawDistrictTableYoY(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  const yoy = stats.yoyComparison!;
  const maxCount = Math.max(...yoy.districts.map(d => d.currentCount), 1);

  drawTableHeaderBar(doc, y);
  doc.text('REGIÓN', MARGIN + 4, y + 4.7);
  doc.text('DISTRITO', MARGIN + 44, y + 4.7);
  doc.text(`TOTAL (${yoy.currentYear})`, MARGIN + 86, y + 4.7);
  doc.text(`ANT. (${yoy.previousYear})`, MARGIN + 110, y + 4.7);
  doc.text('VARIACIÓN', MARGIN + 132, y + 4.7);
  doc.text('% TOTAL', MARGIN + 157, y + 4.7);
  y += 7;

  if (yoy.districts.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setRgbText(doc, COLORS.subtle);
    doc.text('No hay registros disponibles por distrito.', MARGIN + 4, y + 5);
    return y + 8;
  }

  yoy.districts.forEach((dist, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      setRgbFill(doc, COLORS.warmSurface);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6.2, 'F');
    }
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(MARGIN, y + 6.2, MARGIN + CONTENT_WIDTH, y + 6.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    setRgbText(doc, COLORS.muted);
    doc.text((dist.parentName ?? '-').substring(0, 20), MARGIN + 4, y + 4.2);
    setRgbText(doc, COLORS.neutral);
    doc.text(`${idx + 1}. ${dist.name.substring(0, 22)}`, MARGIN + 44, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(dist.currentCount), MARGIN + 94, y + 4.2);
    doc.setFont('helvetica', 'normal');
    setRgbText(doc, COLORS.muted);
    doc.text(String(dist.previousCount), MARGIN + 117, y + 4.2);

    setRgbText(doc, dist.diff >= 0 ? COLORS.emeraldDark : COLORS.rose);
    doc.text(formatVariationText(dist.diff, dist.percentChange), MARGIN + 132, y + 4.2);

    setRgbText(doc, COLORS.neutral);
    doc.text(`${dist.currentPercentage}%`, MARGIN + 163, y + 4.2, { align: 'right' });
    drawMiniProgressBar(
      doc,
      MARGIN + 166,
      y + 2.2,
      13,
      dist.currentCount / maxCount,
      getRatioBarColor(dist.currentCount, maxCount, [COLORS.emeraldDark, COLORS.emeraldMed, COLORS.emeraldLight])
    );
    y += 6.2;
  });

  return y;
}

function drawDistrictTableStandard(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  const maxCount = Math.max(...stats.geographic.districts.map(d => d.count), 1);

  drawTableHeaderBar(doc, y);
  doc.text('REGIÓN', MARGIN + 4, y + 4.7);
  doc.text('DISTRITO', MARGIN + 56, y + 4.7);
  doc.text('TOTAL RECONOCIMIENTOS', MARGIN + 110, y + 4.7);
  doc.text('% DEL TOTAL', MARGIN + 150, y + 4.7);
  y += 7;

  if (stats.geographic.districts.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setRgbText(doc, COLORS.subtle);
    doc.text('No hay registros disponibles por distrito.', MARGIN + 4, y + 5);
    return y + 8;
  }

  stats.geographic.districts.forEach((dist, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      setRgbFill(doc, COLORS.warmSurface);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6.2, 'F');
    }
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(MARGIN, y + 6.2, MARGIN + CONTENT_WIDTH, y + 6.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setRgbText(doc, COLORS.muted);
    doc.text((dist.parentName ?? '-').substring(0, 28), MARGIN + 4, y + 4.2);
    setRgbText(doc, COLORS.neutral);
    doc.text(`${idx + 1}. ${dist.name.substring(0, 32)}`, MARGIN + 56, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(dist.count), MARGIN + 120, y + 4.2);
    doc.setFont('helvetica', 'normal');
    setRgbText(doc, COLORS.muted);
    doc.text(`${dist.percentage}%`, MARGIN + 160, y + 4.2, { align: 'right' });
    drawMiniProgressBar(
      doc,
      MARGIN + 163,
      y + 2.2,
      16,
      dist.count / maxCount,
      getRatioBarColor(dist.count, maxCount, [COLORS.emeraldDark, COLORS.emeraldMed, COLORS.emeraldLight])
    );
    y += 6.2;
  });

  return y;
}

function drawGroupTableStandard(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  const groups = stats.geographic.groups ?? [];
  let y = startY;
  const maxCount = Math.max(...groups.map(g => g.count), 1);

  drawTableHeaderBar(doc, y);
  doc.text('DISTRITO', MARGIN + 4, y + 4.7);
  doc.text('GRUPO SCOUT', MARGIN + 56, y + 4.7);
  doc.text('TOTAL RECONOCIMIENTOS', MARGIN + 110, y + 4.7);
  doc.text('% DEL TOTAL', MARGIN + 150, y + 4.7);
  y += 7;

  if (groups.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setRgbText(doc, COLORS.subtle);
    doc.text('No hay registros disponibles por grupo scout para los filtros seleccionados.', MARGIN + 4, y + 5);
    return y + 8;
  }

  groups.forEach((group, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      setRgbFill(doc, COLORS.warmSurface);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6.2, 'F');
    }
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(MARGIN, y + 6.2, MARGIN + CONTENT_WIDTH, y + 6.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setRgbText(doc, COLORS.muted);
    doc.text((group.parentName ?? '-').substring(0, 28), MARGIN + 4, y + 4.2);
    setRgbText(doc, COLORS.neutral);
    doc.text(`${idx + 1}. ${group.name.substring(0, 32)}`, MARGIN + 56, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(group.count), MARGIN + 120, y + 4.2);
    doc.setFont('helvetica', 'normal');
    setRgbText(doc, COLORS.muted);
    doc.text(`${group.percentage}%`, MARGIN + 160, y + 4.2, { align: 'right' });
    drawMiniProgressBar(
      doc,
      MARGIN + 163,
      y + 2.2,
      16,
      group.count / maxCount,
      getRatioBarColor(group.count, maxCount, [COLORS.indigoDark, COLORS.indigoMed, COLORS.indigoLight])
    );
    y += 6.2;
  });

  return y;
}

/**
 * Draws geographic summary tables (Region, District, and Scout Group) matching web cards.
 */
export function drawGeographicTables(
  doc: jsPDF,
  stats: StatisticsDataset,
  startY: number,
  onBreak: PageBreakChecker = checkPageBreak
): number {
  let y = startY;
  const hasYoY = Boolean(stats.yoyComparison?.hasPreviousYearData);
  const yoy = stats.yoyComparison;

  // SECTION 1: Region Table
  y = onBreak(doc, y, 35);
  const regCount = hasYoY && yoy ? yoy.regions.length : stats.geographic.regions.length;
  y = drawSectionHeaderCard(doc, {
    title: '1. Reconocimientos Entregados por Región',
    subtitle: 'Distribución de los reconocimientos válidos entregados por región territorial',
    badgeText: `${regCount} ${regCount === 1 ? 'región' : 'regiones'}`,
    accentRgb: COLORS.emeraldDark,
    borderRgb: COLORS.primaryTintBorder,
    y
  });

  y = hasYoY
    ? drawRegionTableYoY(doc, stats, y, onBreak)
    : drawRegionTableStandard(doc, stats, y, onBreak);

  y += 6;

  // SECTION 2: District Table
  y = onBreak(doc, y, 35);
  const distCount = hasYoY && yoy ? yoy.districts.length : stats.geographic.districts.length;
  y = drawSectionHeaderCard(doc, {
    title: '2. Reconocimientos Entregados por Distrito',
    subtitle: 'Distribución territorial por distrito y su región correspondiente',
    badgeText: `${distCount} ${distCount === 1 ? 'distrito' : 'distritos'}`,
    accentRgb: COLORS.emeraldMed,
    borderRgb: COLORS.primaryTintBorder,
    y
  });

  y = hasYoY
    ? drawDistrictTableYoY(doc, stats, y, onBreak)
    : drawDistrictTableStandard(doc, stats, y, onBreak);

  y += 6;

  // SECTION 2b: Scout Group Table (matching GroupSummaryTable)
  if (stats.geographic.groups) {
    y = onBreak(doc, y, 35);
    const groupCount = stats.geographic.groups.length;
    y = drawSectionHeaderCard(doc, {
      title: '2b. Reconocimientos Entregados por Grupo Scout',
      subtitle: 'Distribución territorial por grupo scout y distrito correspondiente',
      badgeText: `${groupCount} ${groupCount === 1 ? 'grupo' : 'grupos'}`,
      accentRgb: COLORS.indigoMed,
      borderRgb: COLORS.primaryTintBorder,
      y
    });

    y = drawGroupTableStandard(doc, stats, y, onBreak);
    y += 6;
  }

  return y;
}

function drawUnitSegmentedBar(doc: jsPDF, stats: StatisticsDataset, y: number): number {
  const items = stats.unitDistribution.items;
  setRgbFill(doc, COLORS.trackBg);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 3.2, 1.5, 1.5, 'F');

  let cursorX = MARGIN;
  items.forEach(item => {
    if (item.count <= 0 || item.percentage <= 0) return;
    const segW = Math.min((item.percentage / 100) * CONTENT_WIDTH, MARGIN + CONTENT_WIDTH - cursorX);
    if (segW <= 0) return;
    const rgb = UNIT_RGB_COLORS[item.unit] ?? COLORS.primary;
    setRgbFill(doc, rgb);
    doc.rect(cursorX, y, segW, 3.2, 'F');
    cursorX += segW;
  });

  return y + 6;
}

function drawUnitTableYoY(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  const yoy = stats.yoyComparison!;
  const maxCount = Math.max(...yoy.units.map(u => u.currentCount), 1);

  drawTableHeaderBar(doc, y);
  doc.text('UNIDAD SCOUT', MARGIN + 4, y + 4.7);
  doc.text(`TOTAL (${yoy.currentYear})`, MARGIN + 74, y + 4.7);
  doc.text(`AÑO ANT. (${yoy.previousYear})`, MARGIN + 102, y + 4.7);
  doc.text('VARIACIÓN', MARGIN + 131, y + 4.7);
  doc.text('% TOTAL', MARGIN + 157, y + 4.7);
  y += 7;

  yoy.units.forEach((item, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      setRgbFill(doc, COLORS.warmSurface);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6.2, 'F');
    }
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(MARGIN, y + 6.2, MARGIN + CONTENT_WIDTH, y + 6.2);

    const unitRgb = UNIT_RGB_COLORS[item.unit] ?? COLORS.primary;
    setRgbFill(doc, unitRgb);
    doc.roundedRect(MARGIN + 4, y + 2, 2.2, 2.2, 1, 1, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setRgbText(doc, COLORS.neutral);
    const displayUnitLabel = item.unit === 'no_scout' ? 'No scout (Agradecimientos)' : item.label;
    doc.text(displayUnitLabel, MARGIN + 8, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.currentCount), MARGIN + 84, y + 4.2);
    doc.setFont('helvetica', 'normal');
    setRgbText(doc, COLORS.muted);
    doc.text(String(item.previousCount), MARGIN + 112, y + 4.2);

    setRgbText(doc, item.diff >= 0 ? COLORS.emeraldDark : COLORS.rose);
    doc.text(formatVariationText(item.diff, item.percentChange), MARGIN + 131, y + 4.2);

    setRgbText(doc, COLORS.neutral);
    doc.text(`${item.currentPercentage}%`, MARGIN + 163, y + 4.2, { align: 'right' });
    drawMiniProgressBar(doc, MARGIN + 166, y + 2.2, 13, item.currentCount / maxCount, unitRgb);
    y += 6.2;
  });

  return y;
}

function drawUnitTableStandard(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  const maxCount = Math.max(...stats.unitDistribution.items.map(u => u.count), 1);

  drawTableHeaderBar(doc, y);
  doc.text('UNIDAD SCOUT', MARGIN + 4, y + 4.7);
  doc.text('TOTAL RECONOCIMIENTOS', MARGIN + 104, y + 4.7);
  doc.text('% DEL TOTAL', MARGIN + 150, y + 4.7);
  y += 7;

  stats.unitDistribution.items.forEach((item, idx) => {
    y = onBreak(doc, y, 7);
    if (idx % 2 === 1) {
      setRgbFill(doc, COLORS.warmSurface);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6.2, 'F');
    }
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(MARGIN, y + 6.2, MARGIN + CONTENT_WIDTH, y + 6.2);

    const unitRgb = UNIT_RGB_COLORS[item.unit] ?? COLORS.primary;
    setRgbFill(doc, unitRgb);
    doc.roundedRect(MARGIN + 4, y + 2, 2.2, 2.2, 1, 1, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setRgbText(doc, COLORS.neutral);
    const displayUnitLabel = item.unit === 'no_scout' ? 'No scout (Agradecimientos)' : item.label;
    doc.text(displayUnitLabel, MARGIN + 8, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.count), MARGIN + 114, y + 4.2);
    doc.setFont('helvetica', 'normal');
    setRgbText(doc, COLORS.muted);
    doc.text(`${item.percentage}%`, MARGIN + 160, y + 4.2, { align: 'right' });
    drawMiniProgressBar(doc, MARGIN + 163, y + 2.2, 16, item.count / maxCount, unitRgb);
    y += 6.2;
  });

  return y;
}

function drawAnnularSector(
  doc: jsPDF,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
  fillRgb: RgbTuple
): void {
  if (typeof doc.lines !== 'function') return;
  const sweepDeg = endDeg - startDeg;
  if (sweepDeg <= 0) return;

  const steps = Math.max(8, Math.ceil(sweepDeg / 4));
  const points: Array<[number, number]> = [];

  for (let i = 0; i <= steps; i++) {
    const rad = ((startDeg + (sweepDeg * i) / steps) * Math.PI) / 180;
    points.push([cx + outerR * Math.cos(rad), cy + outerR * Math.sin(rad)]);
  }
  for (let i = steps; i >= 0; i--) {
    const rad = ((startDeg + (sweepDeg * i) / steps) * Math.PI) / 180;
    points.push([cx + innerR * Math.cos(rad), cy + innerR * Math.sin(rad)]);
  }

  const startPoint = points[0];
  const relLines: Array<[number, number]> = [];
  for (let i = 1; i < points.length; i++) {
    relLines.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
  }

  setRgbFill(doc, fillRgb);
  doc.lines(relLines, startPoint[0], startPoint[1], [1, 1], 'F', true);
}

function drawDemographicsDonutGraphic(
  doc: jsPDF,
  stats: StatisticsDataset,
  cx: number,
  cy: number
): void {
  const outerR = 14;
  const innerR = 9.2;

  if (typeof doc.circle === 'function') {
    setRgbFill(doc, COLORS.trackBg);
    doc.circle(cx, cy, outerR, 'F');
  }

  const youngSweep = (stats.demographics.youngPercentage / 100) * 360;
  const adultSweep = (stats.demographics.adultPercentage / 100) * 360;
  const startAngle = -90;

  if (stats.demographics.youngCount > 0 && youngSweep > 0) {
    drawAnnularSector(
      doc,
      cx,
      cy,
      outerR,
      innerR,
      startAngle,
      startAngle + Math.min(youngSweep, 359.9),
      COLORS.sky
    );
  }

  if (stats.demographics.adultCount > 0 && adultSweep > 0) {
    drawAnnularSector(
      doc,
      cx,
      cy,
      outerR,
      innerR,
      startAngle + youngSweep,
      startAngle + Math.min(youngSweep + adultSweep, 359.9),
      COLORS.amber
    );
  }

  if (typeof doc.circle === 'function') {
    setRgbFill(doc, COLORS.white);
    doc.circle(cx, cy, innerR, 'F');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setRgbText(doc, COLORS.neutral);
  doc.text(String(stats.demographics.totalCount), cx, cy + 1, { align: 'center' });

  doc.setFontSize(5.5);
  setRgbText(doc, COLORS.muted);
  doc.text('TOTAL', cx, cy + 4.5, { align: 'center' });
}

function drawDemographicsTableYoY(
  doc: jsPDF,
  stats: StatisticsDataset,
  tableX: number,
  tableW: number,
  startY: number
): number {
  let y = startY;
  const yoy = stats.yoyComparison!;

  setRgbFill(doc, COLORS.warmSurface);
  doc.rect(tableX, y, tableW, 6.5, 'F');
  setRgbDraw(doc, COLORS.cardBorder);
  doc.line(tableX, y + 6.5, tableX + tableW, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  setRgbText(doc, COLORS.muted);

  doc.text('CATEGORÍA', tableX + 3, y + 4.4);
  doc.text(String(yoy.currentYear), tableX + 42, y + 4.4, { align: 'right' });
  doc.text(String(yoy.previousYear), tableX + 60, y + 4.4, { align: 'right' });
  doc.text('VAR.', tableX + 86, y + 4.4, { align: 'right' });
  doc.text('% TOTAL', tableX + tableW - 3, y + 4.4, { align: 'right' });
  y += 6.5;

  const rows = [
    { label: 'Jóvenes', metric: yoy.demographics.young, dotRgb: COLORS.sky },
    { label: 'Adultos', metric: yoy.demographics.adult, dotRgb: COLORS.amber }
  ];

  rows.forEach((row) => {
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(tableX, y + 6.2, tableX + tableW, y + 6.2);
    setRgbFill(doc, row.dotRgb);
    doc.roundedRect(tableX + 3, y + 2, 2.2, 2.2, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    setRgbText(doc, COLORS.neutral);
    doc.text(row.label, tableX + 7, y + 4.3);
    doc.text(String(row.metric.current), tableX + 42, y + 4.3, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    setRgbText(doc, COLORS.muted);
    doc.text(String(row.metric.previous), tableX + 60, y + 4.3, { align: 'right' });

    setRgbText(doc, row.metric.diff >= 0 ? COLORS.emeraldDark : COLORS.rose);
    doc.text(formatVariationText(row.metric.diff, row.metric.percentChange), tableX + 86, y + 4.3, { align: 'right' });

    setRgbText(doc, COLORS.neutral);
    doc.text(`${row.metric.currentPercentage}%`, tableX + tableW - 18, y + 4.3, { align: 'right' });
    drawMiniProgressBar(doc, tableX + tableW - 15.5, y + 2.2, 12.5, row.metric.currentPercentage / 100, row.dotRgb);
    y += 6.2;
  });

  setRgbFill(doc, COLORS.warmSurface);
  doc.rect(tableX, y, tableW, 6.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  setRgbText(doc, COLORS.neutral);
  doc.text('Total', tableX + 3, y + 4.3);
  doc.text(String(yoy.demographics.total.current), tableX + 42, y + 4.3, { align: 'right' });
  setRgbText(doc, COLORS.muted);
  doc.text(String(yoy.demographics.total.previous), tableX + 60, y + 4.3, { align: 'right' });
  setRgbText(doc, yoy.demographics.total.diff >= 0 ? COLORS.emeraldDark : COLORS.rose);
  doc.text(formatVariationText(yoy.demographics.total.diff, yoy.demographics.total.percentChange), tableX + 86, y + 4.3, { align: 'right' });
  setRgbText(doc, COLORS.neutral);
  doc.text('100%', tableX + tableW - 3, y + 4.3, { align: 'right' });

  return y + 6.2;
}

function drawDemographicsTableStandard(
  doc: jsPDF,
  stats: StatisticsDataset,
  tableX: number,
  tableW: number,
  startY: number
): number {
  let y = startY;

  setRgbFill(doc, COLORS.warmSurface);
  doc.rect(tableX, y, tableW, 6.5, 'F');
  setRgbDraw(doc, COLORS.cardBorder);
  doc.line(tableX, y + 6.5, tableX + tableW, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  setRgbText(doc, COLORS.muted);

  doc.text('CATEGORÍA', tableX + 3, y + 4.4);
  doc.text('TOTAL RECONOCIMIENTOS', tableX + 80, y + 4.4, { align: 'right' });
  doc.text('% DEL TOTAL', tableX + tableW - 3, y + 4.4, { align: 'right' });
  y += 6.5;

  const rows = [
    { label: 'Jóvenes', count: stats.demographics.youngCount, pct: stats.demographics.youngPercentage, dotRgb: COLORS.sky },
    { label: 'Adultos', count: stats.demographics.adultCount, pct: stats.demographics.adultPercentage, dotRgb: COLORS.amber }
  ];

  rows.forEach((row) => {
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(tableX, y + 6.2, tableX + tableW, y + 6.2);
    setRgbFill(doc, row.dotRgb);
    doc.roundedRect(tableX + 3, y + 2, 2.2, 2.2, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setRgbText(doc, COLORS.neutral);
    doc.text(row.label, tableX + 7, y + 4.3);
    doc.text(String(row.count), tableX + 80, y + 4.3, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`${row.pct}%`, tableX + tableW - 21, y + 4.3, { align: 'right' });
    drawMiniProgressBar(doc, tableX + tableW - 18.5, y + 2.2, 15.5, row.pct / 100, row.dotRgb);
    y += 6.2;
  });

  setRgbFill(doc, COLORS.warmSurface);
  doc.rect(tableX, y, tableW, 6.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setRgbText(doc, COLORS.neutral);
  doc.text('Total', tableX + 3, y + 4.3);
  doc.text(String(stats.demographics.totalCount), tableX + 80, y + 4.3, { align: 'right' });
  doc.text('100%', tableX + tableW - 3, y + 4.3, { align: 'right' });

  return y + 6.2;
}

/**
 * Draws unit breakdown (with segmented bar) and demographics (with vector Donut chart).
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
    y = onBreak(doc, y, 50);
    y = drawSectionHeaderCard(doc, {
      title: '3. Reconocimientos Entregados por Unidad Scout',
      subtitle: 'Distribución de reconocimientos según la unidad scout o emisión directa',
      badgeText: `Total: ${stats.unitDistribution.totalCount}`,
      accentRgb: COLORS.primary,
      y
    });

    y = drawUnitSegmentedBar(doc, stats, y);

    y = (hasYoY && yoy)
      ? drawUnitTableYoY(doc, stats, y, onBreak)
      : drawUnitTableStandard(doc, stats, y, onBreak);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    setRgbText(doc, COLORS.muted);
    doc.text(
      '* Nota: Los reconocimientos emitidos a miembros No scout corresponden a Agradecimientos institucionales.',
      MARGIN + 2,
      y + 4.5
    );
    y += 9;
  }

  // SECTION 4: Demographics Donut + Table
  y = onBreak(doc, y, 48);
  y = drawSectionHeaderCard(doc, {
    title: '4. Resumen Demográfico (Jóvenes y Adultos)',
    subtitle: 'Distribución demográfica entre scouts jóvenes y dirigentes/adultos',
    badgeText: `${stats.demographics.totalCount} total`,
    accentRgb: COLORS.sky,
    y
  });

  const panelY = y;
  setRgbFill(doc, COLORS.white);
  setRgbDraw(doc, COLORS.cardBorder);
  doc.roundedRect(MARGIN, panelY, CONTENT_WIDTH, 32, 2, 2, 'FD');

  drawDemographicsDonutGraphic(doc, stats, MARGIN + 22, panelY + 16);

  const tableX = MARGIN + 46;
  const tableW = CONTENT_WIDTH - 49;
  if (hasYoY && yoy) {
    drawDemographicsTableYoY(doc, stats, tableX, tableW, panelY + 3.2);
  } else {
    drawDemographicsTableStandard(doc, stats, tableX, tableW, panelY + 3.2);
  }

  return panelY + 38;
}

function drawMonthlyTableYoY(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;
  const yoy = stats.yoyComparison!;

  drawTableHeaderBar(doc, y);
  doc.text('MES', MARGIN + 4, y + 4.7);
  doc.text(`TOTAL (${yoy.currentYear})`, MARGIN + 74, y + 4.7);
  doc.text(`AÑO ANT. (${yoy.previousYear})`, MARGIN + 102, y + 4.7);
  doc.text('VARIACIÓN', MARGIN + 131, y + 4.7);
  doc.text('% DEL TOTAL', MARGIN + 160, y + 4.7);
  y += 7;

  const totalDiplomasCurr = yoy.totalDiplomas.current || 1;

  yoy.monthly.forEach((m, idx) => {
    y = onBreak(doc, y, 6);
    if (idx % 2 === 1) {
      setRgbFill(doc, COLORS.warmSurface);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 5.4, 'F');
    }
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(MARGIN, y + 5.4, MARGIN + CONTENT_WIDTH, y + 5.4);

    const pct = yoy.totalDiplomas.current > 0
      ? Number(((m.currentCount / totalDiplomasCurr) * 100).toFixed(1))
      : 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    setRgbText(doc, COLORS.neutral);
    doc.text(m.label, MARGIN + 4, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(m.currentCount), MARGIN + 84, y + 3.8);
    doc.setFont('helvetica', 'normal');
    setRgbText(doc, COLORS.muted);
    doc.text(String(m.previousCount), MARGIN + 112, y + 3.8);
    setRgbText(doc, m.diff >= 0 ? COLORS.emeraldDark : COLORS.rose);
    doc.text(formatVariationText(m.diff, m.percentChange), MARGIN + 131, y + 3.8);
    setRgbText(doc, COLORS.neutral);
    doc.text(`${pct}%`, MARGIN + 168, y + 3.8);
    y += 5.4;
  });

  return y;
}

function drawMonthlyTableStandard(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = startY;

  drawTableHeaderBar(doc, y);
  doc.text('MES', MARGIN + 4, y + 4.7);
  doc.text('RECONOCIMIENTOS EMITIDOS', MARGIN + 104, y + 4.7);
  doc.text('% DEL TOTAL', MARGIN + 150, y + 4.7);
  y += 7;

  const totalDiplomas = stats.kpis.totalDiplomas || 1;

  stats.monthlyTrends.forEach((m, idx) => {
    y = onBreak(doc, y, 6);
    if (idx % 2 === 1) {
      setRgbFill(doc, COLORS.warmSurface);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 5.4, 'F');
    }
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(MARGIN, y + 5.4, MARGIN + CONTENT_WIDTH, y + 5.4);

    const pct = stats.kpis.totalDiplomas > 0
      ? Number(((m.totalCount / totalDiplomas) * 100).toFixed(1))
      : 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    setRgbText(doc, COLORS.neutral);
    doc.text(m.label, MARGIN + 4, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(m.totalCount), MARGIN + 114, y + 3.8);
    doc.setFont('helvetica', 'normal');
    setRgbText(doc, COLORS.muted);
    doc.text(`${pct}%`, MARGIN + 158, y + 3.8);
    y += 5.4;
  });

  return y;
}

function drawYoYMonthlyBar(params: MonthlyBarParams): void {
  const { doc, item, idx, maxMonthlyVal, slotW, barW, chartHeight, chartBottomY, chartStartX } = params;
  const usableHeight = chartHeight - 8;
  const barHCurr = maxMonthlyVal > 0 ? (item.currentCount / maxMonthlyVal) * usableHeight : 0;
  const barHPrev = maxMonthlyVal > 0 ? (item.previousCount / maxMonthlyVal) * usableHeight : 0;

  const slotX = chartStartX + idx * slotW;
  const xCenter = slotX + slotW / 2;
  const xBarCurr = xCenter - barW - 0.35;
  const xBarPrev = xCenter + 0.35;

  // Vertical month separator line between month slots for immediate readability
  if (idx > 0) {
    setRgbDraw(doc, [226, 232, 240]);
    doc.line(slotX, chartBottomY - usableHeight - 2, slotX, chartBottomY);
  }

  // Track backgrounds (matching web SVG slate track slots)
  setRgbFill(doc, COLORS.trackBg);
  doc.roundedRect(xBarCurr, chartBottomY - usableHeight, barW, usableHeight, 0.7, 0.7, 'F');
  setRgbFill(doc, [248, 250, 252]);
  doc.roundedRect(xBarPrev, chartBottomY - usableHeight, barW, usableHeight, 0.7, 0.7, 'F');

  const yBarCurr = chartBottomY - barHCurr;
  const yBarPrev = chartBottomY - barHPrev;

  if (barHCurr > 0) {
    setRgbFill(doc, COLORS.sky);
    doc.roundedRect(xBarCurr, yBarCurr, barW, barHCurr, 0.7, 0.7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    setRgbText(doc, COLORS.skyText);
    doc.text(String(item.currentCount), xBarCurr + barW / 2, yBarCurr - 1.2, { align: 'center' });
  }

  if (barHPrev > 0) {
    setRgbFill(doc, COLORS.slatePrev);
    doc.roundedRect(xBarPrev, yBarPrev, barW, barHPrev, 0.7, 0.7, 'F');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  setRgbText(doc, COLORS.muted);
  doc.text(item.label.substring(0, 3), xCenter, chartBottomY + 4.2, { align: 'center' });
}

function drawMonthlyChartContainer(
  doc: jsPDF,
  y: number,
  chartWidth: number,
  chartHeight: number,
  maxMonthlyVal: number
): { chartBottomY: number; chartStartX: number; plotWidth: number } {
  const chartBottomY = y + chartHeight;
  const chartStartX = MARGIN + 12;
  const plotWidth = chartWidth - 16;

  setRgbFill(doc, COLORS.white);
  setRgbDraw(doc, COLORS.cardBorder);
  doc.roundedRect(MARGIN, y, chartWidth, chartHeight + 10, 2, 2, 'FD');

  // Horizontal Y-axis gridlines matching web (0, mid, max)
  const usableHeight = chartHeight - 8;
  const yTicks = [0, Math.round(maxMonthlyVal / 2), maxMonthlyVal];
  yTicks.forEach(val => {
    const tickY = chartBottomY - (val / maxMonthlyVal) * usableHeight;
    setRgbDraw(doc, COLORS.rowDivider);
    doc.line(chartStartX, tickY, MARGIN + chartWidth - 4, tickY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    setRgbText(doc, COLORS.subtle);
    doc.text(String(val), chartStartX - 2, tickY + 1.5, { align: 'right' });
  });

  return { chartBottomY, chartStartX, plotWidth };
}

function drawMonthlyChartYoY(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = onBreak(doc, startY, 56);
  const yoy = stats.yoyComparison!;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setRgbText(doc, COLORS.neutral);
  doc.text('Gráfico de Tendencia Mensual y Comparativa:', MARGIN, y);

  // Legend matching web SVG legend (#0284c7 and #cbd5e1)
  doc.setFontSize(7);
  setRgbFill(doc, COLORS.sky);
  doc.roundedRect(MARGIN + CONTENT_WIDTH - 46, y - 2.8, 3.5, 3.2, 0.7, 0.7, 'F');
  setRgbText(doc, COLORS.neutral);
  doc.text(String(yoy.currentYear), MARGIN + CONTENT_WIDTH - 41, y - 0.3);

  setRgbFill(doc, COLORS.slatePrev);
  doc.roundedRect(MARGIN + CONTENT_WIDTH - 23, y - 2.8, 3.5, 3.2, 0.7, 0.7, 'F');
  setRgbText(doc, COLORS.muted);
  doc.text(String(yoy.previousYear), MARGIN + CONTENT_WIDTH - 18, y - 0.3);

  y += 5;

  const chartHeight = 36;
  const maxMonthlyVal = Math.max(...yoy.monthly.map(m => Math.max(m.currentCount, m.previousCount)), 5);
  const { chartBottomY, chartStartX, plotWidth } = drawMonthlyChartContainer(
    doc,
    y,
    CONTENT_WIDTH,
    chartHeight,
    maxMonthlyVal
  );

  const slotW = plotWidth / Math.max(yoy.monthly.length, 1);
  // Generous inter-month separation (~7.4mm between month groups vs 0.7mm within a pair)
  const barW = Math.min(Math.max((slotW - 6.8) / 2, 2.2), 3.4);

  yoy.monthly.forEach((item, idx) => {
    drawYoYMonthlyBar({
      doc,
      item,
      idx,
      maxMonthlyVal,
      slotW,
      barW,
      chartHeight,
      chartBottomY,
      chartStartX
    });
  });

  return chartBottomY + 14;
}

function drawMonthlyChartStandard(doc: jsPDF, stats: StatisticsDataset, startY: number, onBreak: PageBreakChecker): number {
  let y = onBreak(doc, startY, 54);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setRgbText(doc, COLORS.neutral);
  doc.text('Gráfico de Tendencia Mensual de Reconocimientos:', MARGIN, y);
  y += 5;

  const chartHeight = 36;
  const maxMonthlyVal = Math.max(...stats.monthlyTrends.map(m => m.totalCount), 5);
  const { chartBottomY, chartStartX, plotWidth } = drawMonthlyChartContainer(
    doc,
    y,
    CONTENT_WIDTH,
    chartHeight,
    maxMonthlyVal
  );

  const usableHeight = chartHeight - 8;
  const slotW = plotWidth / Math.max(stats.monthlyTrends.length, 1);
  const barW = Math.min(Math.max(slotW * 0.46, 3.5), 6.5);

  stats.monthlyTrends.forEach((item, idx) => {
    const slotX = chartStartX + idx * slotW;
    const xCenter = slotX + slotW / 2;
    const xBar = xCenter - barW / 2;
    const barHeight = maxMonthlyVal > 0 ? (item.totalCount / maxMonthlyVal) * usableHeight : 0;
    const yBar = chartBottomY - barHeight;

    if (idx > 0) {
      setRgbDraw(doc, [226, 232, 240]);
      doc.line(slotX, chartBottomY - usableHeight, slotX, chartBottomY);
    }

    setRgbFill(doc, COLORS.trackBg);
    doc.roundedRect(xBar, chartBottomY - usableHeight, barW, usableHeight, 0.8, 0.8, 'F');

    if (barHeight > 0) {
      setRgbFill(doc, COLORS.sky);
      doc.roundedRect(xBar, yBar, barW, barHeight, 0.8, 0.8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      setRgbText(doc, COLORS.skyText);
      doc.text(String(item.totalCount), xCenter, yBar - 1.3, { align: 'center' });
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    setRgbText(doc, COLORS.muted);
    doc.text(item.label.substring(0, 3), xCenter, chartBottomY + 4.2, { align: 'center' });
  });

  return chartBottomY + 14;
}

/**
 * Draws Section 5: Monthly summary table and spaced histogram chart.
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
  const totalPeriodDiplomas = stats.monthlyTrends.reduce((acc, m) => acc + m.totalCount, 0);

  y = drawSectionHeaderCard(doc, {
    title: '5. Resumen Mensual de Reconocimientos',
    subtitle: 'Distribución mensual de reconocimientos otorgados y tendencia temporal',
    badgeText: hasYoY && yoy
      ? `${yoy.currentYear}: ${yoy.totalDiplomas.current} | ${yoy.previousYear}: ${yoy.totalDiplomas.previous}`
      : `Total: ${totalPeriodDiplomas}`,
    accentRgb: COLORS.sky,
    y
  });

  y = (hasYoY && yoy)
    ? drawMonthlyTableYoY(doc, stats, y, onBreak)
    : drawMonthlyTableStandard(doc, stats, y, onBreak);

  y += 6;

  y = (hasYoY && yoy)
    ? drawMonthlyChartYoY(doc, stats, y, onBreak)
    : drawMonthlyChartStandard(doc, stats, y, onBreak);

  return y;
}

/**
 * Stamps footer on all document pages.
 */
export function drawReportFooter(doc: jsPDF, pageCount?: number): void {
  const totalPages = pageCount ?? doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    setRgbDraw(doc, COLORS.cardBorder);
    doc.line(MARGIN, PAGE_HEIGHT - 12, MARGIN + CONTENT_WIDTH, PAGE_HEIGHT - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setRgbText(doc, COLORS.subtle);
    doc.text('Sistema Chil • Documento generado automáticamente para uso institucional interno.', MARGIN, PAGE_HEIGHT - 7);
    doc.text(`Página ${i} de ${totalPages}`, MARGIN + CONTENT_WIDTH, PAGE_HEIGHT - 7, { align: 'right' });
  }
}

/**
 * Generates and downloads a web-matching Statistics Report in PDF format using jsPDF.
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

  let y = drawReportHeader(doc, stats, filterSummary, 14);
  y = drawKpiSummaryBoxes(doc, stats, y);
  y = drawGeographicTables(doc, stats, y, checkPageBreak);
  y = drawUnitAndDemographicsTables(doc, stats, y, checkPageBreak);
  drawMonthlyTrendSection(doc, stats, y, checkPageBreak);
  drawReportFooter(doc);

  doc.save(fileName);
  return fileName;
}
