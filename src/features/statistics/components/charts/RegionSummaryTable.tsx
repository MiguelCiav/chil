import React, { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { GeographicItem, YoYComparisonData, YoYRegionItem } from '../../types';
import { YoYVariationBadge } from '../YoYVariationBadge';

interface RegionSummaryTableProps {
  regions: GeographicItem[];
  yoy?: YoYComparisonData;
}

function getProgressColor(count: number, maxCount: number): string {
  if (maxCount <= 0) return 'bg-emerald-600';
  const ratio = count / maxCount;
  if (ratio > 0.75) return 'bg-emerald-600';
  if (ratio > 0.4) return 'bg-emerald-500';
  return 'bg-emerald-400';
}

function getRegionCountLabel(count: number): string {
  return count === 1 ? 'región' : 'regiones';
}

function computeRegionMaxCount(
  regions: GeographicItem[],
  yoy?: YoYComparisonData,
  hasYoY: boolean = false
): number {
  if (hasYoY && yoy) {
    return Math.max(...yoy.regions.map(r => r.currentCount), 1);
  }
  if (regions.length > 0) {
    return Math.max(...regions.map(r => r.count), 1);
  }
  return 1;
}

interface RegionTableYoYProps {
  regions: YoYRegionItem[];
  currentYear: number;
  previousYear: number;
  maxCount: number;
}

const RegionTableYoY: React.FC<RegionTableYoYProps> = ({
  regions,
  currentYear,
  previousYear,
  maxCount
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse font-sans">
      <thead>
        <tr className="bg-primary/10 border-b border-primary/20">
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider">Región</th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">
            Total ({currentYear})
          </th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">
            Año Anterior ({previousYear})
          </th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">
            Variación
          </th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">
            % del Total
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {regions.map((r, idx) => (
          <tr key={r.id || r.name} className="hover:bg-primary/5 transition-colors bg-white">
            <td className="px-6 py-4 text-sm font-semibold text-neutral whitespace-nowrap flex items-center gap-2">
              <span className="text-neutral/40 font-bold w-4 text-right">{idx + 1}.</span>
              <span>{r.name}</span>
            </td>
            <td className="px-6 py-4 text-sm font-bold text-neutral whitespace-nowrap text-right">
              {r.currentCount}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-neutral/60 whitespace-nowrap text-right">
              {r.previousCount}
            </td>
            <td className="px-6 py-4 text-sm whitespace-nowrap text-right">
              <YoYVariationBadge diff={r.diff} percentChange={r.percentChange} />
            </td>
            <td className="px-6 py-4 text-sm font-medium text-neutral/70 whitespace-nowrap text-right">
              <div className="flex items-center justify-end gap-2">
                <span>{r.currentPercentage}%</span>
                <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className={`${getProgressColor(r.currentCount, maxCount)} h-full rounded-full`}
                    style={{ width: `${(r.currentCount / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

interface RegionTableStandardProps {
  regions: GeographicItem[];
  maxCount: number;
}

const RegionTableStandard: React.FC<RegionTableStandardProps> = ({
  regions,
  maxCount
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse font-sans">
      <thead>
        <tr className="bg-primary/10 border-b border-primary/20">
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider">Región</th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">Total Reconocimientos</th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">% del Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {regions.map((r, idx) => (
          <tr key={r.id || r.name} className="hover:bg-primary/5 transition-colors bg-white">
            <td className="px-6 py-4 text-sm font-semibold text-neutral whitespace-nowrap flex items-center gap-2">
              <span className="text-neutral/40 font-bold w-4 text-right">{idx + 1}.</span>
              <span>{r.name}</span>
            </td>
            <td className="px-6 py-4 text-sm font-bold text-neutral whitespace-nowrap text-right">
              {r.count}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-neutral/70 whitespace-nowrap text-right">
              <div className="flex items-center justify-end gap-2">
                <span>{r.percentage}%</span>
                <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className={`${getProgressColor(r.count, maxCount)} h-full rounded-full`}
                    style={{ width: `${(r.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

function getDisplayedYoYRegions(hasYoY: boolean, yoy: YoYComparisonData | undefined, showAll: boolean): YoYRegionItem[] {
  if (!hasYoY || !yoy) return [];
  return showAll ? yoy.regions : yoy.regions.slice(0, 5);
}

function getDisplayedStandardRegions(hasYoY: boolean, regions: GeographicItem[], showAll: boolean): GeographicItem[] {
  if (hasYoY) return [];
  return showAll ? regions : regions.slice(0, 5);
}

function renderRegionTableBody(
  itemsCount: number,
  hasYoY: boolean,
  yoy: YoYComparisonData | undefined,
  displayedYoYRegions: YoYRegionItem[],
  displayedStandardRegions: GeographicItem[],
  maxCount: number
) {
  if (itemsCount === 0) {
    return (
      <div className="py-8 text-center text-neutral/50 text-xs">
        No hay registros disponibles por región para los filtros seleccionados.
      </div>
    );
  }
  if (hasYoY && yoy) {
    return (
      <RegionTableYoY
        regions={displayedYoYRegions}
        currentYear={yoy.currentYear}
        previousYear={yoy.previousYear}
        maxCount={maxCount}
      />
    );
  }
  return (
    <RegionTableStandard
      regions={displayedStandardRegions}
      maxCount={maxCount}
    />
  );
}

export const RegionSummaryTable: React.FC<RegionSummaryTableProps> = ({ regions, yoy }) => {
  const [showAll, setShowAll] = useState(false);

  const hasYoY = Boolean(yoy?.hasPreviousYearData);
  const itemsCount = hasYoY && yoy ? yoy.regions.length : regions.length;
  const maxCount = computeRegionMaxCount(regions, yoy, hasYoY);

  const displayedYoYRegions = getDisplayedYoYRegions(hasYoY, yoy, showAll);
  const displayedStandardRegions = getDisplayedStandardRegions(hasYoY, regions, showAll);

  return (
    <div className="bg-white border border-primary/20 rounded-2xl p-5 shadow-sm space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral text-base tracking-tight">
              Reconocimientos entregados por Región
            </h3>
            <p className="text-xs text-neutral/60">
              Distribución territorial consolidada por región scout
              {hasYoY && yoy && ` • Comparativa ${yoy.previousYear} vs ${yoy.currentYear}`}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-neutral/50 bg-gray-100 px-2.5 py-1 rounded-full">
          {itemsCount} {getRegionCountLabel(itemsCount)}
        </span>
      </div>

      {/* Table Content */}
      {renderRegionTableBody(
        itemsCount,
        hasYoY,
        yoy,
        displayedYoYRegions,
        displayedStandardRegions,
        maxCount
      )}

      {/* Show more toggle */}
      {itemsCount > 5 && (
        <div className="pt-2 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Ver todas ({itemsCount})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

