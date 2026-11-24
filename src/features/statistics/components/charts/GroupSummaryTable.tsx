import React from 'react';
import { Flag } from 'lucide-react';
import { GeographicItem, YoYComparisonData } from '../../types';
import { TerritorialSummaryTable } from './TerritorialSummaryTable';

interface GroupSummaryTableProps {
  groups?: GeographicItem[];
  yoy?: YoYComparisonData;
}

export const GroupSummaryTable: React.FC<GroupSummaryTableProps> = ({ groups = [], yoy }) => {
  const hasYoY = Boolean(yoy?.hasPreviousYearData && yoy.groups);

  return (
    <TerritorialSummaryTable
      title="Reconocimientos entregados por Grupo Scout"
      icon={<Flag className="w-5 h-5" />}
      items={groups}
      yoyItems={hasYoY && yoy ? yoy.groups : undefined}
      yoyYears={
        hasYoY && yoy
          ? { currentYear: yoy.currentYear, previousYear: yoy.previousYear }
          : undefined
      }
      entityLabel="Grupo Scout"
      parentLabel="Distrito"
      totalLabel="Total de grupos"
      showAllLabel="Ver todos"
      accentColor="indigo"
      emptyMessage="No hay registros disponibles por grupo scout para los filtros seleccionados."
    />
  );
};
