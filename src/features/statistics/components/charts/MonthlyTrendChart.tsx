import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { MonthlyTrendData } from '../../types';

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
  year?: number;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ data, year }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const displayYear = year || (data[0]?.year ?? new Date().getFullYear());
  const maxVal = Math.max(...data.map(d => d.totalCount), 5);

  const svgWidth = 600;
  const svgHeight = 200;
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 24;
  const paddingBottom = 32;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const slotWidth = chartWidth / data.length;
  const barWidth = Math.max(slotWidth * 0.55, 14);

  // Y-axis tick values
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  const totalPeriodDiplomas = data.reduce((acc, curr) => acc + curr.totalCount, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral text-base tracking-tight">
              Tendencia Mensual de Emisiones
            </h3>
            <p className="text-xs text-neutral/60">
              Distribución de diplomas otorgados a lo largo del año {displayYear}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold text-neutral/50">Total año</span>
          <p className="text-lg font-extrabold text-primary leading-none">
            {totalPeriodDiplomas}
          </p>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[220px] select-none"
          role="img"
          aria-label={`Gráfico de tendencia mensual para el año ${displayYear}`}
        >
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

          {/* Month Bars */}
          {data.map((item, idx) => {
            const barHeight = (item.totalCount / maxVal) * chartHeight;
            const xCenter = paddingLeft + idx * slotWidth + slotWidth / 2;
            const xBar = xCenter - barWidth / 2;
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
                aria-label={`${item.label}: ${item.totalCount} diplomas`}
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
                  width={barWidth}
                  height={chartHeight}
                  fill="#f1f5f9"
                  rx={4}
                />

                {/* Value bar */}
                {item.totalCount > 0 && (
                  <rect
                    x={xBar}
                    y={yBar}
                    width={barWidth}
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
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && data[hoveredIdx] && (
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
        )}
      </div>
    </div>
  );
};
