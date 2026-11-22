import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardBody, Button } from '../../../../components';
import { GeographicItem } from '../../types';
import { YoYVariationBadge } from '../YoYVariationBadge';

export interface YoYTerritorialSummaryItem {
  id: number | string;
  name: string;
  parentName?: string;
  currentCount: number;
  previousCount: number;
  diff: number;
  percentChange: number | null;
  currentPercentage?: number;
}

export interface TerritorialSummaryTableProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  items: readonly GeographicItem[];
  yoyItems?: readonly YoYTerritorialSummaryItem[];
  yoyYears?: { currentYear: number; previousYear: number };
  entityLabel: string;
  parentLabel?: string;
  countLabelSingular: string;
  countLabelPlural: string;
  showAllLabel: string;
  accentColor: 'emerald' | 'indigo';
  emptyMessage: string;
}

const ACCENT_STYLES: Record<
  'emerald' | 'indigo',
  { iconBox: string; toggleText: string; bars: [string, string, string] }
> = {
  emerald: {
    iconBox: 'bg-emerald-500/10 text-emerald-700',
    toggleText: 'text-emerald-700 hover:text-emerald-800',
    bars: ['bg-emerald-600', 'bg-emerald-500', 'bg-emerald-400']
  },
  indigo: {
    iconBox: 'bg-indigo-500/10 text-indigo-700',
    toggleText: 'text-indigo-700 hover:text-indigo-800',
    bars: ['bg-indigo-600', 'bg-indigo-500', 'bg-indigo-400']
  }
};

function getProgressColor(
  count: number,
  maxCount: number,
  bars: [string, string, string]
): string {
  if (maxCount <= 0) return bars[0];
  const ratio = count / maxCount;
  if (ratio > 0.75) return bars[0];
  if (ratio > 0.4) return bars[1];
  return bars[2];
}

export const TerritorialSummaryTable: React.FC<TerritorialSummaryTableProps> = ({
  title,
  subtitle,
  icon,
  items,
  yoyItems,
  yoyYears,
  entityLabel,
  parentLabel,
  countLabelSingular,
  countLabelPlural,
  showAllLabel,
  accentColor,
  emptyMessage
}) => {
  const [showAll, setShowAll] = useState(false);

  const hasYoY = Boolean(yoyItems && yoyYears);
  const itemsCount = hasYoY && yoyItems ? yoyItems.length : items.length;
  const accent = ACCENT_STYLES[accentColor];

  const maxCount =
    hasYoY && yoyItems
      ? Math.max(...yoyItems.map(i => i.currentCount), 1)
      : items.length > 0
        ? Math.max(...items.map(i => i.count), 1)
        : 1;

  const displayedRows = hasYoY && yoyItems
    ? (showAll ? yoyItems : yoyItems.slice(0, 5)).map(item => ({
        key: item.id || item.name,
        parentName: item.parentName,
        name: item.name,
        count: item.currentCount,
        previousCount: item.previousCount,
        diff: item.diff,
        percentChange: item.percentChange,
        percentage: item.currentPercentage ?? 0
      }))
    : (showAll ? items : items.slice(0, 5)).map(item => ({
        key: item.id || item.name,
        parentName: item.parentName,
        name: item.name,
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${accent.iconBox}`} aria-hidden="true">
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-neutral text-base tracking-tight">{title}</h3>
              {subtitle && (
                <p className="text-xs text-neutral/75">
                  {subtitle}
                  {hasYoY && yoyYears && ` • Comparativa ${yoyYears.previousYear} vs ${yoyYears.currentYear}`}
                </p>
              )}
            </div>
          </div>
          <span className="text-xs font-semibold text-neutral/75 bg-gray-100 px-2.5 py-1 rounded-full">
            {itemsCount} {itemsCount === 1 ? countLabelSingular : countLabelPlural}
          </span>
        </div>

        {/* Table Content */}
        {itemsCount === 0 ? (
          <div className="py-8 text-center text-neutral/75 text-xs">{emptyMessage}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-primary/10 border-b border-primary/20">
                  {parentLabel && (
                    <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider">
                      {parentLabel}
                    </th>
                  )}
                  <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider">
                    {entityLabel}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">
                    {hasYoY && yoyYears ? `Total (${yoyYears.currentYear})` : 'Total Reconocimientos'}
                  </th>
                  {hasYoY && yoyYears && (
                    <>
                      <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">
                        Año Anterior ({yoyYears.previousYear})
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">
                        Variación
                      </th>
                    </>
                  )}
                  <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">
                    % del Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {displayedRows.map((row, idx) => (
                  <tr key={row.key} className="hover:bg-primary/5 transition-colors bg-white">
                    {parentLabel && (
                      <td className="px-6 py-4 text-sm text-neutral/75 font-medium whitespace-nowrap">
                        {row.parentName ?? '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm font-semibold text-neutral whitespace-nowrap flex items-center gap-2">
                      <span className="text-neutral/75 font-bold w-4 text-right">{idx + 1}.</span>
                      <span>{row.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-neutral whitespace-nowrap text-right">
                      {row.count}
                    </td>
                    {hasYoY && row.previousCount !== undefined && row.diff !== undefined && (
                      <>
                        <td className="px-6 py-4 text-sm font-medium text-neutral/75 whitespace-nowrap text-right">
                          {row.previousCount}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-right">
                          <YoYVariationBadge
                            diff={row.diff}
                            percentChange={row.percentChange ?? null}
                          />
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 text-sm font-medium text-neutral/75 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{row.percentage}%</span>
                        <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`${getProgressColor(row.count, maxCount, accent.bars)} h-full rounded-full`}
                            style={{ width: `${(row.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Show more toggle */}
        {itemsCount > 5 && (
          <div className="pt-2 border-t border-gray-100 text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className={`text-xs font-semibold ${accent.toggleText}`}
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                  {showAllLabel} ({itemsCount})
                </>
              )}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
