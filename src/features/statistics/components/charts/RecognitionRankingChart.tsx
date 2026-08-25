import React, { useState } from 'react';
import { Award, ChevronDown, ChevronUp } from 'lucide-react';
import { RecognitionRankingData } from '../../types';

interface RecognitionRankingChartProps {
  data: RecognitionRankingData[];
}

export const RecognitionRankingChart: React.FC<RecognitionRankingChartProps> = ({ data }) => {
  const [showAll, setShowAll] = useState(false);

  const displayedData = showAll ? data : data.slice(0, 5);
  const maxCount = data.length > 0 ? Math.max(...data.map(d => d.count), 1) : 1;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
      {/* Card Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral text-base tracking-tight">
                Ranking de Reconocimientos
              </h3>
              <p className="text-xs text-neutral/60">
                Tipos de diplomas más emitidos
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-neutral/50 bg-gray-100 px-2.5 py-1 rounded-full">
            {data.length} {data.length === 1 ? 'tipo' : 'tipos'}
          </span>
        </div>

        {/* Empty State */}
        {data.length === 0 ? (
          <div className="py-8 text-center text-neutral/50 text-xs">
            No hay registros de reconocimientos para los filtros aplicados.
          </div>
        ) : (
          /* Ranking List */
          <div className="space-y-3.5">
            {displayedData.map((item, index) => {
              const barWidthPercent = (item.count / maxCount) * 100;
              return (
                <div key={item.id || item.name} className="group">
                  <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-neutral/40 text-[11px] w-4 text-right">
                        {index + 1}.
                      </span>
                      <span
                        className={`truncate font-semibold px-2 py-0.5 rounded-md text-[11px] ${item.badgeStyle.pillClass}`}
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
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
                      className="bg-primary h-full rounded-full transition-all duration-500 group-hover:opacity-85"
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
      {data.length > 5 && (
        <div className="mt-4 pt-3 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Ver todos ({data.length})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
