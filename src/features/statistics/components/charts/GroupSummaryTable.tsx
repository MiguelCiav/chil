import React from 'react';
import { Flag } from 'lucide-react';
import { GeographicItem } from '../../types';
import { TerritorialSummaryTable } from './TerritorialSummaryTable';

interface GroupSummaryTableProps {
  groups?: GeographicItem[];
}

export const GroupSummaryTable: React.FC<GroupSummaryTableProps> = ({ groups = [] }) => {
  return (
    <TerritorialSummaryTable
      title="Reconocimientos entregados por Grupo Scout"
      icon={<Flag className="w-5 h-5" />}
      items={groups}
      entityLabel="Grupo Scout"
      parentLabel="Distrito"
      totalLabel="Total de grupos"
      showAllLabel="Ver todos"
      accentColor="indigo"
      emptyMessage="No hay registros disponibles por grupo scout para los filtros seleccionados."
    />
  );
};
