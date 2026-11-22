import React from 'react';
import { MapPin } from 'lucide-react';
import { GeographicItem, YoYComparisonData } from '../../types';
import { TerritorialSummaryTable } from './TerritorialSummaryTable';

interface DistrictSummaryTableProps {
  districts: GeographicItem[];
  yoy?: YoYComparisonData;
}

export const DistrictSummaryTable: React.FC<DistrictSummaryTableProps> = ({ districts, yoy }) => {
  const hasYoY = Boolean(yoy?.hasPreviousYearData);

  return (
    <TerritorialSummaryTable
      title="Reconocimientos entregados por Distrito"
      subtitle="Distribución territorial por distrito y región scout"
      icon={<MapPin className="w-5 h-5" />}
      items={districts}
      yoyItems={hasYoY && yoy ? yoy.districts : undefined}
      yoyYears={
        hasYoY && yoy
          ? { currentYear: yoy.currentYear, previousYear: yoy.previousYear }
          : undefined
      }
      entityLabel="Distrito"
      parentLabel="Región"
      countLabelSingular="distrito"
      countLabelPlural="distritos"
      showAllLabel="Ver todos"
      accentColor="emerald"
      emptyMessage="No hay registros disponibles por distrito para los filtros seleccionados."
    />
  );
};
