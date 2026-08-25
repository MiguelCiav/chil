import React from 'react';
import { Compass } from 'lucide-react';
import { UnitDistributionData } from '../../types';

interface UnitDistributionCardProps {
  data: UnitDistributionData;
}

const UNIT_BAR_COLORS: Record<string, string> = {
  manada: 'bg-amber-500',
  tropa: 'bg-emerald-500',
  caminantes: 'bg-blue-500',
  clan: 'bg-red-500',
  institucional: 'bg-purple-500',
  no_scout: 'bg-slate-400'
};

export const UnitDistributionCard: React.FC<UnitDistributionCardProps> = ({ data }) => {
  const { items, totalCount } = data;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral text-base tracking-tight">
              Distribución por Unidad Scout
            </h3>
            <p className="text-xs text-neutral/60">
              Desglose de reconocimientos según la unidad scout o emisión directa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-neutral/50">Total Miembros:</span>
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

      {/* Unit Breakdown Grid (6 columns on lg, 3 on sm) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
        {items.map(item => {
          const barColor = UNIT_BAR_COLORS[item.unit] || 'bg-primary';
          return (
            <div
              key={item.unit}
              className="p-3 bg-[#faf8f5] border border-gray-200 rounded-xl flex flex-col justify-between hover:border-primary/30 transition-all shadow-2xs"
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${item.badgeClass}`}>
                  {item.label}
                </span>
                <span className="text-[11px] font-bold text-neutral/50">
                  {item.percentage}%
                </span>
              </div>

              <div>
                <p className="text-lg font-black text-neutral">
                  {item.count}
                </p>
                <div className="w-full bg-gray-200 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`${barColor} h-full rounded-full`}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
