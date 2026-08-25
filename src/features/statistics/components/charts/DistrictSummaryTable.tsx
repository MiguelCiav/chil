import React, { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { GeographicItem, YoYComparisonData } from '../../types';
import { YoYVariationBadge } from '../YoYVariationBadge';

interface DistrictSummaryTableProps {
  districts: GeographicItem[];
  yoy?: YoYComparisonData;
}

export const DistrictSummaryTable: React.FC<DistrictSummaryTableProps> = ({ districts, yoy }) => {
  const [showAll, setShowAll] = useState(false);

  const hasYoY = Boolean(yoy && yoy.hasPreviousYearData);
  const itemsCount = hasYoY && yoy ? yoy.districts.length : districts.length;
  const maxCount = hasYoY && yoy
    ? Math.max(...yoy.districts.map(d => d.currentCount), 1)
    : districts.length > 0
    ? Math.max(...districts.map(d => d.count), 1)
    : 1;

  const displayedDistricts = hasYoY && yoy
    ? (showAll ? yoy.districts : yoy.districts.slice(0, 5))
    : (showAll ? districts : districts.slice(0, 5));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 font-sans">
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

      {/* Table */}
      {itemsCount === 0 ? (
        <div className="py-8 text-center text-neutral/50 text-xs">
          No hay registros disponibles por distrito para los filtros seleccionados.
        </div>
      ) : hasYoY && yoy ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#faf8f5]">
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider">Región</th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider">Distrito</th>
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
              {(displayedDistricts as typeof yoy.districts).map((d, idx) => (
                <tr key={d.id || d.name} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-2.5 text-neutral/70 font-medium">
                    {d.parentName || '-'}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-neutral flex items-center gap-2">
                    <span className="text-neutral/40 font-bold w-4 text-right">{idx + 1}.</span>
                    <span>{d.name}</span>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-neutral text-right">
                    {d.currentCount}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-neutral/60 text-right">
                    {d.previousCount}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <YoYVariationBadge diff={d.diff} percentChange={d.percentChange} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-neutral/70">
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
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#faf8f5]">
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider">Región</th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider">Distrito</th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider text-right">Total Reconocimientos</th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider text-right">% del Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(displayedDistricts as GeographicItem[]).map((d, idx) => (
                <tr key={d.id || d.name} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-2.5 text-neutral/70 font-medium">
                    {d.parentName || '-'}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-neutral flex items-center gap-2">
                    <span className="text-neutral/40 font-bold w-4 text-right">{idx + 1}.</span>
                    <span>{d.name}</span>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-neutral text-right">
                    {d.count}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-neutral/70">
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

