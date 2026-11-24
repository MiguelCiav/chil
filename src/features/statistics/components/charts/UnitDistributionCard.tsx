import React from 'react';
import { Compass } from 'lucide-react';
import { Card, CardBody } from '../../../../components';
import { UnitDistributionData, UnitDistributionItem, YoYComparisonData } from '../../types';
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

function computeUnitMaxCount(
  items: UnitDistributionItem[],
  yoy?: YoYComparisonData,
  hasYoY: boolean = false
): number {
  if (hasYoY && yoy) {
    return Math.max(...yoy.units.map(i => i.currentCount), 1);
  }
  if (items.length > 0) {
    return Math.max(...items.map(i => i.count), 1);
  }
  return 1;
}

export const UnitDistributionCard: React.FC<UnitDistributionCardProps> = ({ data, yoy }) => {
  const { items } = data;
  const hasYoY = Boolean(yoy?.hasPreviousYearData);
  const maxCount = computeUnitMaxCount(items, yoy, hasYoY);

  const tableRows = hasYoY && yoy
    ? yoy.units.map(u => ({
        unit: u.unit,
        label: u.label,
        badgeClass: u.badgeClass,
        count: u.currentCount,
        previousCount: u.previousCount,
        diff: u.diff,
        percentChange: u.percentChange,
        percentage: u.currentPercentage
      }))
    : items.map(item => ({
        unit: item.unit,
        label: item.label,
        badgeClass: item.badgeClass,
        count: item.count,
        previousCount: undefined as number | undefined,
        diff: undefined as number | undefined,
        percentChange: undefined as number | null | undefined,
        percentage: item.percentage
      }));

  return (
    <Card>
      <CardBody className="p-5 space-y-4 font-sans">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 text-primary rounded-xl" aria-hidden="true">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-neutral text-base tracking-tight">
            Reconocimientos entregados por Unidad
          </h3>
        </div>

        {/* Segmented Stacked Progress Bar */}
        <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden flex">
          {tableRows.map(item => {
            if (item.count === 0) return null;
            const barColor = UNIT_BAR_COLORS[item.unit] ?? 'bg-primary';
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-primary/20 bg-primary/10">
                <th className="px-4 py-2.5 font-bold text-neutral uppercase tracking-wider">Unidad Scout</th>
                <th className="px-4 py-2.5 font-bold text-neutral uppercase tracking-wider text-right">
                  {hasYoY && yoy ? `Total (${yoy.currentYear})` : 'Total Reconocimientos'}
                </th>
                {hasYoY && yoy && (
                  <>
                    <th className="px-4 py-2.5 font-bold text-neutral uppercase tracking-wider text-right">
                      Año Anterior ({yoy.previousYear})
                    </th>
                    <th className="px-4 py-2.5 font-bold text-neutral uppercase tracking-wider text-right">
                      Variación
                    </th>
                  </>
                )}
                <th className="px-4 py-2.5 font-bold text-neutral uppercase tracking-wider text-right">
                  % del Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableRows.map(row => {
                const barColor = UNIT_BAR_COLORS[row.unit] ?? 'bg-primary';
                return (
                  <tr key={row.unit} className="hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-neutral">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${row.badgeClass}`}>
                        {row.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-neutral text-right">
                      {row.count}
                    </td>
                    {hasYoY && row.previousCount !== undefined && row.diff !== undefined && (
                      <>
                        <td className="px-4 py-2.5 font-medium text-neutral/75 text-right">
                          {row.previousCount}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <YoYVariationBadge
                            diff={row.diff}
                            percentChange={row.percentChange ?? null}
                          />
                        </td>
                      </>
                    )}
                    <td className="px-4 py-2.5 text-right font-medium text-neutral/75">
                      <div className="flex items-center justify-end gap-2">
                        <span>{row.percentage}%</span>
                        <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`${barColor} h-full rounded-full`}
                            style={{ width: `${(row.count / maxCount) * 100}%` }}
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
      </CardBody>
    </Card>
  );
};
