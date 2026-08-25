import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { MonthlyTrendData, YoYComparisonData } from '../../types';
import { YoYVariationBadge } from '../YoYVariationBadge';

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
  year?: number;
  yoy?: YoYComparisonData;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ data, year, yoy }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const hasYoY = Boolean(yoy && yoy.hasPreviousYearData);
  const displayYear = yoy?.currentYear || year || (data[0]?.year ?? new Date().getFullYear());
  const prevYear = yoy?.previousYear || displayYear - 1;

  const maxVal = hasYoY && yoy
    ? Math.max(...yoy.monthly.map(m => Math.max(m.currentCount, m.previousCount)), 5)
    : Math.max(...data.map(d => d.totalCount), 5);

  const svgWidth = 600;
  const svgHeight = 220;
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 32;
  const paddingBottom = 32;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const monthCount = hasYoY && yoy ? yoy.monthly.length : data.length;
  const slotWidth = chartWidth / (monthCount || 12);
  const singleBarWidth = Math.max(slotWidth * 0.55, 14);
  const dualBarWidth = Math.max((slotWidth - 8) / 2, 7);

  // Y-axis tick values
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  const totalPeriodDiplomas = data.reduce((acc, curr) => acc + curr.totalCount, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full font-sans">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral text-base tracking-tight">
              Resumen Mensual de Reconocimientos
            </h3>
            <p className="text-xs text-neutral/60">
              Distribución de reconocimientos otorgados a lo largo del año {displayYear}
              {hasYoY && yoy && ` • Comparativa vs ${prevYear}`}
            </p>
          </div>
        </div>

        <div className="text-right flex items-center gap-4 sm:gap-6 self-start sm:self-auto">
          {hasYoY && yoy ? (
            <>
              <div>
                <span className="text-[11px] font-semibold text-neutral/50">Año {displayYear}</span>
                <p className="text-lg font-extrabold text-primary leading-none">
                  {yoy.totalDiplomas.current}
                </p>
              </div>
              <div className="border-l border-gray-200 pl-4">
                <span className="text-[11px] font-semibold text-neutral/50">Año {prevYear}</span>
                <p className="text-lg font-bold text-neutral/60 leading-none">
                  {yoy.totalDiplomas.previous}
                </p>
              </div>
            </>
          ) : (
            <div>
              <span className="text-xs font-semibold text-neutral/50">Total año</span>
              <p className="text-lg font-extrabold text-primary leading-none">
                {totalPeriodDiplomas}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="overflow-x-auto mb-6">
        {hasYoY && yoy ? (
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#faf8f5]">
                <th className="px-3 py-2 font-bold text-neutral/70 uppercase tracking-wider">Mes</th>
                <th className="px-3 py-2 font-bold text-neutral/70 uppercase tracking-wider text-right">
                  Total ({yoy.currentYear})
                </th>
                <th className="px-3 py-2 font-bold text-neutral/70 uppercase tracking-wider text-right">
                  Año Anterior ({yoy.previousYear})
                </th>
                <th className="px-3 py-2 font-bold text-neutral/70 uppercase tracking-wider text-right">
                  Variación
                </th>
                <th className="px-3 py-2 font-bold text-neutral/70 uppercase tracking-wider text-right">
                  % del Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {yoy.monthly.map((m) => {
                const totalCurr = yoy.totalDiplomas.current || 1;
                const pct = yoy.totalDiplomas.current > 0 ? Number(((m.currentCount / totalCurr) * 100).toFixed(1)) : 0;
                return (
                  <tr key={m.label} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3 py-1.5 font-semibold text-neutral">
                      {m.label}
                    </td>
                    <td className="px-3 py-1.5 font-bold text-neutral text-right">
                      {m.currentCount}
                    </td>
                    <td className="px-3 py-1.5 font-medium text-neutral/60 text-right">
                      {m.previousCount}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <YoYVariationBadge diff={m.diff} percentChange={m.percentChange} />
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium text-neutral/70">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#faf8f5]">
                <th className="px-3 py-2 font-bold text-neutral/70 uppercase tracking-wider">Mes</th>
                <th className="px-3 py-2 font-bold text-neutral/70 uppercase tracking-wider text-right">Reconocimientos Emitidos</th>
                <th className="px-3 py-2 font-bold text-neutral/70 uppercase tracking-wider text-right">% del Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((m) => {
                const pct = totalPeriodDiplomas > 0 ? Number(((m.totalCount / totalPeriodDiplomas) * 100).toFixed(1)) : 0;
                return (
                  <tr key={m.monthKey} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3 py-1.5 font-semibold text-neutral">
                      {m.label}
                    </td>
                    <td className="px-3 py-1.5 font-bold text-neutral text-right">
                      {m.totalCount}
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium text-neutral/70">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Interactive SVG Chart Directly Below */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[240px] select-none"
          role="img"
          aria-label={`Gráfico de tendencia mensual para el año ${displayYear}${hasYoY && yoy ? ` y comparativa con ${prevYear}` : ''}`}
        >
          {/* Chart Legend (Top Right) */}
          {hasYoY && yoy && (
            <g transform={`translate(${svgWidth - paddingRight - 160}, 10)`}>
              <rect x="0" y="2" width="10" height="10" rx="2" fill="#0284c7" />
              <text x="14" y="11" fontSize="10" fill="#334155" fontWeight="600" fontFamily="sans-serif">
                {displayYear}
              </text>
              <rect x="70" y="2" width="10" height="10" rx="2" fill="#cbd5e1" />
              <text x="84" y="11" fontSize="10" fill="#64748b" fontWeight="600" fontFamily="sans-serif">
                {prevYear}
              </text>
            </g>
          )}

          {/* Horizontal Grid lines & Y-axis labels */}
          {yTicks.map((val) => {
            const yPos = paddingTop + chartHeight - (val / maxVal) * chartHeight;
            return (
              <g key={`ytick-${val}`}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={svgWidth - paddingRight}
                  y2={yPos}
                  stroke="#f1f5f9"
                  strokeWidth="1.5"
                  strokeDasharray={val === 0 ? undefined : '4 4'}
                />
                <text
                  x={paddingLeft - 6}
                  y={yPos + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Dual or Single Month Bars */}
          {hasYoY && yoy ? (
            yoy.monthly.map((item, idx) => {
              const currentBarH = (item.currentCount / maxVal) * chartHeight;
              const prevBarH = (item.previousCount / maxVal) * chartHeight;

              const slotX = paddingLeft + idx * slotWidth;
              const xCenter = slotX + slotWidth / 2;

              const xBarCurr = xCenter - dualBarWidth - 1.5;
              const xBarPrev = xCenter + 1.5;

              const yBarCurr = paddingTop + chartHeight - currentBarH;
              const yBarPrev = paddingTop + chartHeight - prevBarH;
              const isHovered = hoveredIdx === idx;

              return (
                <g
                  key={item.label}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-all"
                  tabIndex={0}
                  role="graphics-symbol"
                  aria-label={`${item.label}: ${item.currentCount} (${displayYear}) vs ${item.previousCount} (${prevYear})`}
                >
                  {/* Background hover column highlight */}
                  <rect
                    x={slotX + 1}
                    y={paddingTop}
                    width={slotWidth - 2}
                    height={chartHeight}
                    fill={isHovered ? '#f8fafc' : 'transparent'}
                    rx={6}
                  />

                  {/* Current year bar */}
                  <rect
                    x={xBarCurr}
                    y={paddingTop}
                    width={dualBarWidth}
                    height={chartHeight}
                    fill="#f1f5f9"
                    rx={3}
                  />
                  {item.currentCount > 0 && (
                    <rect
                      x={xBarCurr}
                      y={yBarCurr}
                      width={dualBarWidth}
                      height={currentBarH}
                      fill={isHovered ? '#0e7490' : '#0284c7'}
                      rx={3}
                      className="transition-all duration-200"
                    />
                  )}

                  {/* Previous year bar */}
                  <rect
                    x={xBarPrev}
                    y={paddingTop}
                    width={dualBarWidth}
                    height={chartHeight}
                    fill="#f8fafc"
                    rx={3}
                  />
                  {item.previousCount > 0 && (
                    <rect
                      x={xBarPrev}
                      y={yBarPrev}
                      width={dualBarWidth}
                      height={prevBarH}
                      fill={isHovered ? '#94a3b8' : '#cbd5e1'}
                      rx={3}
                      className="transition-all duration-200"
                    />
                  )}

                  {/* Value above current bar */}
                  {item.currentCount > 0 && (
                    <text
                      x={xBarCurr + dualBarWidth / 2}
                      y={yBarCurr - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill={isHovered ? '#0369a1' : '#64748b'}
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {item.currentCount}
                    </text>
                  )}

                  {/* X-axis Month Label */}
                  <text
                    x={xCenter}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fontSize="11"
                    fill={isHovered ? '#0f172a' : '#64748b'}
                    fontWeight={isHovered ? '700' : '600'}
                    fontFamily="sans-serif"
                  >
                    {item.label}
                  </text>
                </g>
              );
            })
          ) : (
            data.map((item, idx) => {
              const barHeight = (item.totalCount / maxVal) * chartHeight;
              const xCenter = paddingLeft + idx * slotWidth + slotWidth / 2;
              const xBar = xCenter - singleBarWidth / 2;
              const yBar = paddingTop + chartHeight - barHeight;
              const isHovered = hoveredIdx === idx;

              return (
                <g
                  key={item.monthKey}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-all"
                  tabIndex={0}
                  role="graphics-symbol"
                  aria-label={`${item.label}: ${item.totalCount} reconocimientos`}
                >
                  {/* Background hover column highlight */}
                  <rect
                    x={paddingLeft + idx * slotWidth + 2}
                    y={paddingTop}
                    width={slotWidth - 4}
                    height={chartHeight}
                    fill={isHovered ? '#f8fafc' : 'transparent'}
                    rx={6}
                  />

                  {/* Base track (subtle background for zero or partial bars) */}
                  <rect
                    x={xBar}
                    y={paddingTop}
                    width={singleBarWidth}
                    height={chartHeight}
                    fill="#f1f5f9"
                    rx={4}
                  />

                  {/* Value bar */}
                  {item.totalCount > 0 && (
                    <rect
                      x={xBar}
                      y={yBar}
                      width={singleBarWidth}
                      height={barHeight}
                      fill={isHovered ? '#0e7490' : '#0284c7'}
                      rx={4}
                      className="transition-all duration-200"
                    />
                  )}

                  {/* Value on top of bar when hovered or non-zero */}
                  {item.totalCount > 0 && (
                    <text
                      x={xCenter}
                      y={yBar - 5}
                      textAnchor="middle"
                      fontSize="10"
                      fill={isHovered ? '#0369a1' : '#64748b'}
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {item.totalCount}
                    </text>
                  )}

                  {/* X-axis Month Label */}
                  <text
                    x={xCenter}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fontSize="11"
                    fill={isHovered ? '#0f172a' : '#64748b'}
                    fontWeight={isHovered ? '700' : '600'}
                    fontFamily="sans-serif"
                  >
                    {item.label}
                  </text>
                </g>
              );
            })
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && (
          hasYoY && yoy && yoy.monthly[hoveredIdx] ? (
            <div
              className="absolute top-1 right-2 bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-lg pointer-events-none transition-opacity z-10 border border-slate-700"
              style={{ minWidth: '140px' }}
            >
              <p className="font-bold text-sky-400 border-b border-slate-700 pb-1 mb-1">
                {yoy.monthly[hoveredIdx].label} • Comparativa
              </p>
              <div className="space-y-0.5 text-[11px]">
                <p className="flex justify-between gap-2">
                  <span className="text-sky-300">Año {displayYear}:</span>
                  <span className="font-bold">{yoy.monthly[hoveredIdx].currentCount}</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-slate-400">Año {prevYear}:</span>
                  <span className="font-semibold">{yoy.monthly[hoveredIdx].previousCount}</span>
                </p>
                <p className="flex justify-between gap-2 pt-1 border-t border-slate-700/60">
                  <span className="text-slate-300">Variación:</span>
                  <span className={yoy.monthly[hoveredIdx].diff >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {yoy.monthly[hoveredIdx].diff >= 0 ? '+' : ''}{yoy.monthly[hoveredIdx].diff}
                    {yoy.monthly[hoveredIdx].percentChange !== null ? ` (${yoy.monthly[hoveredIdx].percentChange >= 0 ? '+' : ''}${yoy.monthly[hoveredIdx].percentChange}%)` : ''}
                  </span>
                </p>
              </div>
            </div>
          ) : data[hoveredIdx] ? (
            <div
              className="absolute top-1 right-2 bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-lg pointer-events-none transition-opacity z-10 border border-slate-700"
              style={{ minWidth: '130px' }}
            >
              <p className="font-bold text-sky-400 border-b border-slate-700 pb-1 mb-1">
                {data[hoveredIdx].label} {displayYear}
              </p>
              <div className="space-y-0.5 text-[11px]">
                <p className="flex justify-between gap-2">
                  <span className="text-slate-300">Total:</span>
                  <span className="font-bold">{data[hoveredIdx].totalCount}</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-emerald-400">Válidos:</span>
                  <span className="font-semibold">{data[hoveredIdx].activeCount}</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-purple-400">Excepcionales:</span>
                  <span className="font-semibold">{data[hoveredIdx].exceptionalCount}</span>
                </p>
                {data[hoveredIdx].pendingCount > 0 && (
                  <p className="flex justify-between gap-2">
                    <span className="text-red-400">Inválidos:</span>
                    <span className="font-semibold">{data[hoveredIdx].pendingCount}</span>
                  </p>
                )}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
};

