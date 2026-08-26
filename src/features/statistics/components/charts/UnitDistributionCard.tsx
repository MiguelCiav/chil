import React from 'react';
import { Compass } from 'lucide-react';
import { UnitDistributionData, YoYComparisonData } from '../../types';
import { YoYVariationBadge } from '../YoYVariationBadge';

interface UnitDistributionCardProps {
  data: UnitDistributionData;
  yoy?: YoYComparisonData;
}

const UNIT_BAR_COLORS: Record<string, string> = {
  manada: 'bg-amber-500',
  tropa: 'bg-emerald-500',
  caminantes: 'bg-blue-500',
  clan: 'bg-red-500',
  institucional: 'bg-purple-500',
  no_scout: 'bg-slate-400'
};

export const UnitDistributionCard: React.FC<UnitDistributionCardProps> = ({ data, yoy }) => {
  const { items, totalCount } = data;
  const hasYoY = Boolean(yoy && yoy.hasPreviousYearData);
  const maxCount = hasYoY && yoy
    ? Math.max(...yoy.units.map(i => i.currentCount), 1)
    : items.length > 0
    ? Math.max(...items.map(i => i.count), 1)
    : 1;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral text-base tracking-tight">
              Reconocimientos entregados por Unidad
            </h3>
            <p className="text-xs text-neutral/60">
              Distribución de reconocimientos según la unidad scout o emisión directa
              {hasYoY && yoy && ` • Comparativa ${yoy.previousYear} vs ${yoy.currentYear}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-neutral/50">Total Reconocimientos:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-extrabold">
            {totalCount}
          </span>
        </div>
      </div>

      {/* Segmented Stacked Progress Bar */}
      <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden flex shadow-inner">
        {items.map(item => {
          if (item.count === 0) return null;
          const barColor = UNIT_BAR_COLORS[item.unit] || 'bg-primary';
          return (
            <div
              key={item.unit}
              className={`${barColor} h-full transition-all duration-500 hover:opacity-90`}
              style={{ width: `${item.percentage}%` }}
              title={`${item.label}: ${item.count} (${item.percentage}%)`}
            />
          );
        })}
      </div>

      {/* Unit Table */}
      {hasYoY && yoy ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#faf8f5]">
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider">Unidad Scout</th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider text-right">
                  Total ({yoy.currentYear})
                </th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider text-right">
                  Año Anterior ({yoy.previousYear})
                </th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider text-right">
                  Variación
                </th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider text-right">
                  % del Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {yoy.units.map(item => {
                const barColor = UNIT_BAR_COLORS[item.unit] || 'bg-primary';
                return (
                  <tr key={item.unit} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-neutral">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${item.badgeClass}`}>
                        {item.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-neutral text-right">
                      {item.currentCount}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-neutral/60 text-right">
                      {item.previousCount}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <YoYVariationBadge diff={item.diff} percentChange={item.percentChange} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-neutral/70">
                      <div className="flex items-center justify-end gap-2">
                        <span>{item.currentPercentage}%</span>
                        <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`${barColor} h-full rounded-full`}
                            style={{ width: `${(item.currentCount / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#faf8f5]">
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider">Unidad Scout</th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider text-right">Total Reconocimientos</th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider text-right">% del Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => {
                const barColor = UNIT_BAR_COLORS[item.unit] || 'bg-primary';
                return (
                  <tr key={item.unit} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-neutral">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${item.badgeClass}`}>
                        {item.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-neutral text-right">
                      {item.count}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-neutral/70">
                      <div className="flex items-center justify-end gap-2">
                        <span>{item.percentage}%</span>
                        <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`${barColor} h-full rounded-full`}
                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

