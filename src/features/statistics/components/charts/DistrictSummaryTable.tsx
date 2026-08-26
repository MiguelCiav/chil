import React, { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { GeographicItem, YoYComparisonData, YoYDistrictItem } from '../../types';
import { YoYVariationBadge } from '../YoYVariationBadge';

interface DistrictSummaryTableProps {
  districts: GeographicItem[];
  yoy?: YoYComparisonData;
}

function computeDistrictMaxCount(
  districts: GeographicItem[],
  yoy?: YoYComparisonData,
  hasYoY: boolean = false
): number {
  if (hasYoY && yoy) {
    return Math.max(...yoy.districts.map(d => d.currentCount), 1);
  }
  if (districts.length > 0) {
    return Math.max(...districts.map(d => d.count), 1);
  }
  return 1;
}

interface DistrictTableYoYProps {
  districts: YoYDistrictItem[];
  currentYear: number;
  previousYear: number;
  maxCount: number;
}

const DistrictTableYoY: React.FC<DistrictTableYoYProps> = ({
  districts,
  currentYear,
  previousYear,
  maxCount
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse font-sans">
      <thead>
        <tr className="bg-primary/10 border-b border-primary/20">
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider">Región</th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider">Distrito</th>
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
        {districts.map((d, idx) => (
          <tr key={d.id || d.name} className="hover:bg-primary/5 transition-colors bg-white">
            <td className="px-6 py-4 text-sm text-neutral/70 font-medium whitespace-nowrap">
              {d.parentName ?? '-'}
            </td>
            <td className="px-6 py-4 text-sm font-semibold text-neutral whitespace-nowrap flex items-center gap-2">
              <span className="text-neutral/40 font-bold w-4 text-right">{idx + 1}.</span>
              <span>{d.name}</span>
            </td>
            <td className="px-6 py-4 text-sm font-bold text-neutral whitespace-nowrap text-right">
              {d.currentCount}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-neutral/60 whitespace-nowrap text-right">
              {d.previousCount}
            </td>
            <td className="px-6 py-4 text-sm whitespace-nowrap text-right">
              <YoYVariationBadge diff={d.diff} percentChange={d.percentChange} />
            </td>
            <td className="px-6 py-4 text-sm font-medium text-neutral/70 whitespace-nowrap text-right">
              <div className="flex items-center justify-end gap-2">
                <span>{d.currentPercentage}%</span>
                <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{ width: `${(d.currentCount / maxCount) * 100}%` }}
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

interface DistrictTableStandardProps {
  districts: GeographicItem[];
  maxCount: number;
}

const DistrictTableStandard: React.FC<DistrictTableStandardProps> = ({
  districts,
  maxCount
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse font-sans">
      <thead>
        <tr className="bg-primary/10 border-b border-primary/20">
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider">Región</th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider">Distrito</th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">Total Reconocimientos</th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">% del Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {districts.map((d, idx) => (
          <tr key={d.id || d.name} className="hover:bg-primary/5 transition-colors bg-white">
            <td className="px-6 py-4 text-sm text-neutral/70 font-medium whitespace-nowrap">
              {d.parentName ?? '-'}
            </td>
            <td className="px-6 py-4 text-sm font-semibold text-neutral whitespace-nowrap flex items-center gap-2">
              <span className="text-neutral/40 font-bold w-4 text-right">{idx + 1}.</span>
              <span>{d.name}</span>
            </td>
            <td className="px-6 py-4 text-sm font-bold text-neutral whitespace-nowrap text-right">
              {d.count}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-neutral/70 whitespace-nowrap text-right">
              <div className="flex items-center justify-end gap-2">
                <span>{d.percentage}%</span>
                <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{ width: `${(d.count / maxCount) * 100}%` }}
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

export const DistrictSummaryTable: React.FC<DistrictSummaryTableProps> = ({ districts, yoy }) => {
  const [showAll, setShowAll] = useState(false);

  const hasYoY = Boolean(yoy?.hasPreviousYearData);
  const itemsCount = hasYoY && yoy ? yoy.districts.length : districts.length;
  const maxCount = computeDistrictMaxCount(districts, yoy, hasYoY);

  const displayedYoYDistricts = hasYoY && yoy
    ? (showAll ? yoy.districts : yoy.districts.slice(0, 5))
    : [];

  const displayedStandardDistricts = !hasYoY
    ? (showAll ? districts : districts.slice(0, 5))
    : [];

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
              Reconocimientos entregados por Distrito
            </h3>
            <p className="text-xs text-neutral/60">
              Distribución territorial por distrito y región scout
              {hasYoY && yoy && ` • Comparativa ${yoy.previousYear} vs ${yoy.currentYear}`}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-neutral/50 bg-gray-100 px-2.5 py-1 rounded-full">
          {itemsCount} {itemsCount === 1 ? 'distrito' : 'distritos'}
        </span>
      </div>

      {/* Table Content */}
      {itemsCount === 0 ? (
        <div className="py-8 text-center text-neutral/50 text-xs">
          No hay registros disponibles por distrito para los filtros seleccionados.
        </div>
      ) : hasYoY && yoy ? (
        <DistrictTableYoY
          districts={displayedYoYDistricts}
          currentYear={yoy.currentYear}
          previousYear={yoy.previousYear}
          maxCount={maxCount}
        />
      ) : (
        <DistrictTableStandard
          districts={displayedStandardDistricts}
          maxCount={maxCount}
        />
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
                Ver todos ({itemsCount})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

