import React, { useState } from 'react';
import { Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { GeographicItem } from '../../types';

interface GroupSummaryTableProps {
  groups?: GeographicItem[];
}

function getProgressColor(count: number, maxCount: number): string {
  if (maxCount <= 0) return 'bg-indigo-600';
  const ratio = count / maxCount;
  if (ratio > 0.75) return 'bg-indigo-600';
  if (ratio > 0.4) return 'bg-indigo-500';
  return 'bg-indigo-400';
}

function getGroupCountLabel(count: number): string {
  return count === 1 ? 'grupo' : 'grupos';
}

function computeGroupMaxCount(groups: GeographicItem[]): number {
  if (groups.length > 0) {
    return Math.max(...groups.map(g => g.count), 1);
  }
  return 1;
}

interface GroupTableStandardProps {
  groups: GeographicItem[];
  maxCount: number;
}

const GroupTableStandard: React.FC<GroupTableStandardProps> = ({
  groups,
  maxCount
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse font-sans">
      <thead>
        <tr className="bg-primary/10 border-b border-primary/20">
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider">Distrito</th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider">Grupo Scout</th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">Total Reconocimientos</th>
          <th className="px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider text-right">% del Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {groups.map((g, idx) => (
          <tr key={g.id || g.name} className="hover:bg-primary/5 transition-colors bg-white">
            <td className="px-6 py-4 text-sm text-neutral/70 font-medium whitespace-nowrap">
              {g.parentName ?? '-'}
            </td>
            <td className="px-6 py-4 text-sm font-semibold text-neutral whitespace-nowrap flex items-center gap-2">
              <span className="text-neutral/40 font-bold w-4 text-right">{idx + 1}.</span>
              <span>{g.name}</span>
            </td>
            <td className="px-6 py-4 text-sm font-bold text-neutral whitespace-nowrap text-right">
              {g.count}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-neutral/70 whitespace-nowrap text-right">
              <div className="flex items-center justify-end gap-2">
                <span>{g.percentage}%</span>
                <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className={`${getProgressColor(g.count, maxCount)} h-full rounded-full`}
                    style={{ width: `${(g.count / maxCount) * 100}%` }}
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

export const GroupSummaryTable: React.FC<GroupSummaryTableProps> = ({ groups = [] }) => {
  const [showAll, setShowAll] = useState(false);

  const itemsCount = groups.length;
  const maxCount = computeGroupMaxCount(groups);
  const displayedGroups = showAll ? groups : groups.slice(0, 5);

  return (
    <div className="bg-white border border-primary/20 rounded-2xl p-5 space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral text-base tracking-tight">
              Reconocimientos entregados por Grupo Scout
            </h3>
            <p className="text-xs text-neutral/60">
              Distribución territorial por grupo scout y distrito correspondiente
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-neutral/50 bg-gray-100 px-2.5 py-1 rounded-full">
          {itemsCount} {getGroupCountLabel(itemsCount)}
        </span>
      </div>

      {/* Table Content */}
      {itemsCount === 0 ? (
        <div className="py-8 text-center text-neutral/50 text-xs">
          No hay registros disponibles por grupo scout para los filtros seleccionados.
        </div>
      ) : (
        <GroupTableStandard groups={displayedGroups} maxCount={maxCount} />
      )}

      {/* Show more toggle */}
      {itemsCount > 5 && (
        <div className="pt-2 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 inline-flex items-center gap-1 transition-colors"
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
