import React from 'react';
import { Download } from 'lucide-react';
import { useStatisticsData } from '../hooks/useStatisticsData';
import { FilterBar } from './FilterBar';
import { RegionSummaryTable } from './charts/RegionSummaryTable';
import { DistrictSummaryTable } from './charts/DistrictSummaryTable';
import { GroupSummaryTable } from './charts/GroupSummaryTable';
import { UnitDistributionCard } from './charts/UnitDistributionCard';
import { DemographicsDonut } from './charts/DemographicsDonut';
import { MonthlyTrendChart } from './charts/MonthlyTrendChart';
import { Button, ErrorAlert } from '../../../components';
import { exportStatisticsPdf } from '../utils/statsPdfExport';

export const StatisticsDashboard: React.FC = () => {
  const {
    stats,
    yoyComparison,
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters,
    loading,
    error,
    refresh,
    regions,
    availableDistricts,
    recognitionTypes,
    getFilterSummaryLabels
  } = useStatisticsData();

  if (loading) {
    return (
      <output
        aria-busy="true"
        aria-label="Cargando estadísticas"
        className="block max-w-7xl mx-auto space-y-6 font-sans py-2"
      >
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-4 w-96 bg-gray-200 animate-pulse rounded-lg" />
        </div>

        {/* Filter Bar Skeleton */}
        <div className="h-32 bg-gray-100 animate-pulse rounded-2xl border border-primary/20" />

        {/* Tables Skeleton */}
        <div className="space-y-6">
          <div className="h-64 bg-gray-100 animate-pulse rounded-2xl border border-primary/20" />
          <div className="h-64 bg-gray-100 animate-pulse rounded-2xl border border-primary/20" />
        </div>
      </output>
    );
  }

  if (error) {
    return (
      <ErrorAlert
        variant="centered"
        title="Error al cargar estadísticas"
        message={error}
        onRetry={refresh}
      />
    );
  }

  const handleExportPdf = () => {
    const summary = getFilterSummaryLabels();
    exportStatisticsPdf(stats, summary);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight">
            Estadísticas y Análisis
          </h1>
          <p className="text-xs sm:text-sm text-neutral/75 mt-1">
            Métricas consolidadas, tendencias temporales y cobertura de reconocimientos emitidos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleExportPdf}
            icon={<Download className="w-4 h-4" />}
            className="whitespace-nowrap"
            aria-label="Exportar todo"
          >
            Exportar todo
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        regions={regions}
        availableDistricts={availableDistricts}
        recognitionTypes={recognitionTypes}
      />

      {/* Section 1: Tabla de reconocimientos entregados por Región */}
      <div>
        <RegionSummaryTable regions={stats.geographic.regions} yoy={yoyComparison} />
      </div>

      {/* Section 2: Tabla de reconocimientos entregados por Distrito */}
      <div>
        <DistrictSummaryTable districts={stats.geographic.districts} yoy={yoyComparison} />
      </div>

      {/* Section 2b: Tabla de reconocimientos entregados por Grupo Scout */}
      <div>
        <GroupSummaryTable groups={stats.geographic.groups} yoy={yoyComparison} />
      </div>

      {/* Section 3: Tabla de reconocimientos entregados por Unidad */}
      <div>
        <UnitDistributionCard data={stats.unitDistribution} yoy={yoyComparison} />
      </div>

      {/* Section 4: Resumen de reconocimientos entregados a Jóvenes y Adultos */}
      <div>
        <DemographicsDonut data={stats.demographics} yoy={yoyComparison} />
      </div>

      {/* Section 5: Tabla de resumen mensual de los reconocimientos, con su gráfico debajo */}
      <div>
        <MonthlyTrendChart data={stats.monthlyTrends} yoy={yoyComparison} />
      </div>
    </div>
  );
};

