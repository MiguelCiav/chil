import React, { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { GeographicBreakdownData } from '../../types';

interface GeographicBarChartProps {
  data: GeographicBreakdownData;
}

export const GeographicBarChart: React.FC<GeographicBarChartProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'regions' | 'districts'>('regions');
  const [showAll, setShowAll] = useState(false);

  const currentList = activeTab === 'regions' ? data.regions : data.districts;
  const displayedList = showAll ? currentList : currentList.slice(0, 5);
  const maxCount = currentList.length > 0 ? Math.max(...currentList.map(item => item.count), 1) : 1;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
      {/* Card Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral text-base tracking-tight">
                Distribución Geográfica
              </h3>
              <p className="text-xs text-neutral/60">
                Diplomas por región y distrito scout
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('regions');
                setShowAll(false);
              }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'regions'
                  ? 'bg-white text-primary shadow-xs font-bold'
                  : 'text-neutral/60 hover:text-neutral'
              }`}
            >
              Regiones ({data.regions.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('districts');
                setShowAll(false);
              }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'districts'
                  ? 'bg-white text-primary shadow-xs font-bold'
                  : 'text-neutral/60 hover:text-neutral'
              }`}
            >
              Distritos ({data.districts.length})
            </button>
          </div>
        </div>

        {/* Empty State */}
        {currentList.length === 0 ? (
          <div className="py-8 text-center text-neutral/50 text-xs">
            No hay registros geográficos disponibles para los filtros seleccionados.
          </div>
        ) : (
          /* Ranked Bar List */
          <div className="space-y-3">
            {displayedList.map((item, index) => {
              const barWidthPercent = (item.count / maxCount) * 100;
              return (
                <div key={item.id || item.name} className="group">
                  <div className="flex items-center justify-between gap-2 mb-1 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-neutral/40 text-[11px] w-4 text-right">
                        {index + 1}.
                      </span>
                      <span className="font-semibold text-neutral truncate" title={item.name}>
                        {item.name}
                      </span>
                      {item.parentName && (
                        <span className="text-[10px] text-neutral/40 truncate">
                          ({item.parentName})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-bold text-neutral">
                        {item.count}
                      </span>
                      <span className="text-[11px] text-neutral/50 font-medium">
                        ({item.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar Track */}
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500 group-hover:opacity-85"
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Show more toggle */}
      {currentList.length > 5 && (
        <div className="mt-4 pt-3 border-t border-gray-100 text-center">
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
                Ver todos ({currentList.length})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
