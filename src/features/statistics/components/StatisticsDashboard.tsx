import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useStatisticsData } from '../hooks/useStatisticsData';
import { StatKpiGrid } from './StatKpiGrid';
import { FilterBar } from './FilterBar';
import { RegionSummaryTable } from './charts/RegionSummaryTable';
import { DistrictSummaryTable } from './charts/DistrictSummaryTable';
import { UnitDistributionCard } from './charts/UnitDistributionCard';
import { DemographicsDonut } from './charts/DemographicsDonut';
import { MonthlyTrendChart } from './charts/MonthlyTrendChart';
import { Button } from '../../../components/Button';

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
      <div className="max-w-7xl mx-auto space-y-6 font-sans py-2">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-4 w-96 bg-gray-200 animate-pulse rounded-lg" />
        </div>

        {/* Filter Bar Skeleton */}
        <div className="h-32 bg-gray-100 animate-pulse rounded-2xl border border-gray-200" />

        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-2xl border border-gray-200" />
          ))}
        </div>

        {/* Tables Skeleton */}
        <div className="space-y-6">
          <div className="h-64 bg-gray-100 animate-pulse rounded-2xl border border-gray-200" />
          <div className="h-64 bg-gray-100 animate-pulse rounded-2xl border border-gray-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-16 p-6 bg-white border border-red-200 rounded-2xl shadow-sm text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-neutral">Error al cargar estadísticas</h2>
        <p className="text-xs text-neutral/70">{error}</p>
        <Button variant="primary" onClick={refresh} className="mx-auto flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight">
            Estadísticas y Análisis
          </h1>
          <p className="text-xs sm:text-sm text-neutral/70 mt-1">
            Métricas consolidadas, tendencias temporales y cobertura de reconocimientos emitidos.
          </p>
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
        stats={stats}
        getFilterSummaryLabels={getFilterSummaryLabels}
      />

      {/* Top 5 KPI Metrics Grid */}
      <StatKpiGrid metrics={stats.kpis} yoy={yoyComparison} />

      {/* Section 1: Tabla de reconocimientos entregados por Región */}
      <div>
        <RegionSummaryTable regions={stats.geographic.regions} yoy={yoyComparison} />
      </div>

      {/* Section 2: Tabla de reconocimientos entregados por Distrito */}
      <div>
        <DistrictSummaryTable districts={stats.geographic.districts} yoy={yoyComparison} />
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

