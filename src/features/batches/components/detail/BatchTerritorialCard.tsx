import React, { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardBody } from '../../../../components/Card';
import {
  BatchTerritorialBreakdown,
  TerritorialBreakdownItem
} from '../../utils/batchTerritorial';

export interface BatchTerritorialCardProps {
  breakdown: BatchTerritorialBreakdown;
}

interface TerritorialColumnProps {
  title: string;
  items: TerritorialBreakdownItem[];
  emptyLabel: string;
  isExpanded: boolean;
}

const TerritorialColumn: React.FC<TerritorialColumnProps> = ({
  title,
  items,
  emptyLabel,
  isExpanded
}) => {
  const visibleItems = isExpanded ? items : items.slice(0, 3);

  return (
    <div className="bg-[#faf8f5] rounded-xl p-4 border border-gray-200/80 flex flex-col space-y-2.5">
      <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral/60">
          {title}
        </h3>
        <span className="text-xs font-bold text-neutral/50">{items.length}</span>
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-xs italic text-neutral/40 py-2">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {visibleItems.map((item) => (
            <li
              key={String(item.id)}
              className="flex items-center justify-between gap-2 text-xs sm:text-sm"
            >
              <span className="font-semibold text-neutral truncate" title={item.name}>
                {item.name}
              </span>
              <span className="flex items-center gap-1.5 flex-shrink-0 font-mono text-xs">
                <span className="font-bold text-neutral">{item.count}</span>
                <span className="text-neutral/50">({item.percentage}%)</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const BatchTerritorialCard: React.FC<BatchTerritorialCardProps> = ({ breakdown }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    regions,
    districts,
    groups,
    noScoutCount,
    noScoutPercentage,
    ungroupedScoutCount,
    ungroupedScoutPercentage,
    totalMembers
  } = breakdown;

  const hasOverflow =
    regions.length > 3 || districts.length > 3 || groups.length > 3;

  return (
    <Card className="border-gray-200" data-walkthrough="batch-detail-territorial-card">
      <CardBody className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e6f7eb] text-[#1b7a37] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-bold text-neutral text-base">
                Distribución Territorial del Lote
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f5f5f4] text-neutral/70 border border-gray-200">
                {totalMembers} miembros
              </span>
            </div>
          </div>

          {hasOverflow && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <span>Ver menos</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Ver más</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TerritorialColumn
            title="Regiones"
            items={regions}
            emptyLabel="Ninguna registrada"
            isExpanded={isExpanded}
          />
          <TerritorialColumn
            title="Distritos"
            items={districts}
            emptyLabel="Ninguno registrado"
            isExpanded={isExpanded}
          />
          <TerritorialColumn
            title="Grupos"
            items={groups}
            emptyLabel="Ninguno registrado"
            isExpanded={isExpanded}
          />
        </div>

        {(noScoutCount > 0 || ungroupedScoutCount > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {noScoutCount > 0 && (
              <div className="bg-[#f5f5f4] border border-gray-200 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
                <span className="font-bold text-neutral/70">Miembros no scout</span>
                <span className="font-mono font-bold text-neutral">
                  {noScoutCount} ({noScoutPercentage}%)
                </span>
              </div>
            )}
            {ungroupedScoutCount > 0 && (
              <div className="bg-[#fff9db] border border-[#ffec99] rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
                <span className="font-bold text-[#b45309]">Sin grupo asignado</span>
                <span className="font-mono font-bold text-[#b45309]">
                  {ungroupedScoutCount} ({ungroupedScoutPercentage}%)
                </span>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
