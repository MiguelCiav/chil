import React from 'react';
import { Download, RotateCcw, Filter } from 'lucide-react';
import { Button } from '../../../components/Button';
import { StatisticsFilterState, StatisticsDataset } from '../types';
import { Region, District } from '../../batches/types';
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
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 font-sans">
      {/* Top row: Section title & PDF Export button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-neutral">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold tracking-tight">
            Filtros y Segmentación de Datos
          </span>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleExportPdf}
          className="flex items-center gap-2 text-xs font-bold shadow-sm whitespace-nowrap self-start sm:self-auto"
          aria-label="Exportar Reporte Ejecutivo PDF"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Reporte Ejecutivo (PDF)</span>
        </Button>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        {/* Period Selector */}
        <div>
          <label htmlFor="stats-filter-period" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
            Período
          </label>
          <select
            id="stats-filter-period"
            aria-label="Filtrar por período"
            value={filters.period}
            onChange={e => setFilter('period', e.target.value as StatisticsFilterState['period'])}
            className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
          >
            <option value="all">Todo el histórico</option>
            <option value="this-year">Este Año</option>
            <option value="this-month">Este Mes</option>
            <option value="last-30">Últimos 30 días</option>
            <option value="last-90">Últimos 90 días</option>
            <option value="custom">Rango Personalizado</option>
          </select>
        </div>

        {/* Recognition Selector */}
        <div>
          <label htmlFor="stats-filter-rec" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
            Reconocimiento
          </label>
          <select
            id="stats-filter-rec"
            aria-label="Filtrar por tipo de reconocimiento"
            value={filters.recognitionId || ''}
            onChange={e => setFilter('recognitionId', e.target.value)}
            className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
          >
            <option value="">Todos los reconocimientos</option>
            {recognitionTypes.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Region Selector */}
        <div>
          <label htmlFor="stats-filter-region" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
            Región
          </label>
          <select
            id="stats-filter-region"
            aria-label="Filtrar por región"
            value={filters.regionId || ''}
            onChange={e => {
              setFilter('regionId', e.target.value);
              setFilter('districtId', '');
            }}
            className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
          >
            <option value="">Todas las regiones</option>
            {regions.map(r => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* District Selector */}
        <div>
          <label htmlFor="stats-filter-district" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
            Distrito
          </label>
          <select
            id="stats-filter-district"
            aria-label="Filtrar por distrito"
            value={filters.districtId || ''}
            onChange={e => setFilter('districtId', e.target.value)}
            className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
          >
            <option value="">Todos los distritos</option>
            {availableDistricts.map(d => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Member Type Selector */}
        <div>
          <label htmlFor="stats-filter-member-type" className="block font-bold text-neutral/70 uppercase tracking-wider mb-1">
            Demografía
          </label>
          <select
            id="stats-filter-member-type"
            aria-label="Filtrar por tipo demográfico"
            value={filters.memberType || 'all'}
            onChange={e => setFilter('memberType', e.target.value as 'all' | 'young' | 'adult')}
            className="w-full px-3 py-2 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-xs"
          >
            <option value="all">Todos los scouts</option>
            <option value="young">Solo Jóvenes</option>
            <option value="adult">Solo Adultos</option>
          </select>
        </div>
      </div>

      {/* Custom Date Inputs (if period === 'custom') and Reset Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {filters.period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="stats-custom-start" className="font-semibold text-neutral/70">
                Desde:
              </label>
              <input
                id="stats-custom-start"
                type="date"
                value={filters.startDate || ''}
                onChange={e => setFilter('startDate', e.target.value)}
                className="px-2.5 py-1.5 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Fecha inicio personalizado"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="stats-custom-end" className="font-semibold text-neutral/70">
                Hasta:
              </label>
              <input
                id="stats-custom-end"
                type="date"
                value={filters.endDate || ''}
                onChange={e => setFilter('endDate', e.target.value)}
                className="px-2.5 py-1.5 bg-[#faf8f5] border border-gray-200 rounded-lg text-neutral focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Fecha fin personalizado"
              />
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="ml-auto">
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-1.5 flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 transition-colors font-semibold text-xs"
              aria-label="Limpiar filtros activos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
