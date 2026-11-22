import React from 'react';
import { Download, RotateCcw, Filter } from 'lucide-react';
import { Card, CardBody, Button, Select, Field } from '../../../components';
import { HierarchyFilterSelects } from '../../../domain/components';
import { StatisticsFilterState, StatisticsDataset } from '../types';
import { Region, District } from '../../../types';
import { RecognitionType } from '../../recognitions';
import { exportStatisticsPdf, FilterSummaryLabels } from '../utils/statsPdfExport';

interface FilterBarProps {
  filters: StatisticsFilterState;
  setFilter: <K extends keyof StatisticsFilterState>(key: K, value: StatisticsFilterState[K]) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  regions: Region[];
  availableDistricts: District[];
  recognitionTypes: RecognitionType[];
  stats: StatisticsDataset;
  getFilterSummaryLabels: () => FilterSummaryLabels;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilter,
  resetFilters,
  hasActiveFilters,
  regions,
  availableDistricts,
  recognitionTypes,
  stats,
  getFilterSummaryLabels
}) => {
  const handleExportPdf = () => {
    const summary = getFilterSummaryLabels();
    exportStatisticsPdf(stats, summary);
  };

  return (
    <Card>
      <CardBody padding="sm" className="sm:p-5 space-y-4 font-sans">
        {/* Top row: Section title & PDF Export button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-primary/10">
          <div className="flex items-center gap-2 text-neutral">
            <Filter className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-bold tracking-tight">
              Filtros y Segmentación de Datos
            </span>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleExportPdf}
            icon={<Download className="w-4 h-4" />}
            className="text-xs font-bold whitespace-nowrap self-start sm:self-auto"
            aria-label="Exportar Reporte Ejecutivo PDF"
          >
            Exportar Reporte Ejecutivo (PDF)
          </Button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <Select
            id="stats-filter-period"
            label="Período"
            size="sm"
            aria-label="Filtrar por período"
            value={filters.period}
            onChange={e => setFilter('period', e.target.value as StatisticsFilterState['period'])}
          >
            <option value="all">Todo el histórico</option>
            <option value="this-year">Este Año</option>
            <option value="this-month">Este Mes</option>
            <option value="last-30">Últimos 30 días</option>
            <option value="last-90">Últimos 90 días</option>
            <option value="custom">Rango Personalizado</option>
          </Select>

          <Select
            id="stats-filter-rec"
            label="Reconocimiento"
            size="sm"
            aria-label="Filtrar por tipo de reconocimiento"
            value={filters.recognitionId ?? ''}
            onChange={e => setFilter('recognitionId', e.target.value)}
          >
            <option value="">Todos los reconocimientos</option>
            {recognitionTypes.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>

          <HierarchyFilterSelects
            regions={regions}
            districts={availableDistricts}
            regionId={filters.regionId ?? ''}
            districtId={filters.districtId ?? ''}
            showGroup={false}
            includeNoAplicaAlways
            onRegionChange={val => setFilter('regionId', val)}
            onDistrictChange={val => setFilter('districtId', val)}
          />

          <Select
            id="stats-filter-member-type"
            label="Demografía"
            size="sm"
            aria-label="Filtrar por tipo demográfico"
            value={filters.memberType ?? 'all'}
            onChange={e => setFilter('memberType', e.target.value as 'all' | 'young' | 'adult')}
          >
            <option value="all">Todos los scouts</option>
            <option value="young">Solo Jóvenes</option>
            <option value="adult">Solo Adultos</option>
          </Select>
        </div>

        {/* Custom Date Inputs (if period === 'custom') and Reset Button */}
        {(filters.period === 'custom' || hasActiveFilters) && (
          <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
            {filters.period === 'custom' && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-40">
                  <Field
                    id="stats-custom-start"
                    label="Desde"
                    size="sm"
                    type="date"
                    value={filters.startDate ?? ''}
                    onChange={e => setFilter('startDate', e.target.value)}
                    aria-label="Fecha inicio personalizado"
                  />
                </div>
                <div className="w-40">
                  <Field
                    id="stats-custom-end"
                    label="Hasta"
                    size="sm"
                    type="date"
                    value={filters.endDate ?? ''}
                    onChange={e => setFilter('endDate', e.target.value)}
                    aria-label="Fecha fin personalizado"
                  />
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <div className="ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  aria-label="Limpiar filtros activos"
                  className="text-red-700 border-red-300 hover:bg-red-50"
                >
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
