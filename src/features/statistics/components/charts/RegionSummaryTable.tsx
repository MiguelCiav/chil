import React from 'react';
import { MapPin } from 'lucide-react';
import { GeographicItem, YoYComparisonData } from '../../types';
import { TerritorialSummaryTable } from './TerritorialSummaryTable';

interface RegionSummaryTableProps {
  regions: GeographicItem[];
  yoy?: YoYComparisonData;
}

export const RegionSummaryTable: React.FC<RegionSummaryTableProps> = ({ regions, yoy }) => {
  const hasYoY = Boolean(yoy?.hasPreviousYearData);

  return (
    <TerritorialSummaryTable
      title="Reconocimientos entregados por Región"
      subtitle="Distribución territorial consolidada por región scout"
      icon={<MapPin className="w-5 h-5" />}
      items={regions}
      yoyItems={hasYoY && yoy ? yoy.regions : undefined}
      yoyYears={
        hasYoY && yoy
          ? { currentYear: yoy.currentYear, previousYear: yoy.previousYear }
          : undefined
      }
      entityLabel="Región"
      countLabelSingular="región"
      countLabelPlural="regiones"
      showAllLabel="Ver todas"
      accentColor="emerald"
      emptyMessage="No hay registros disponibles por región para los filtros seleccionados."
    />
  );
};
