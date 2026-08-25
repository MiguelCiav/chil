import React from 'react';
import { BarChart3, AlertCircle, RefreshCw } from 'lucide-react';
import { useStatisticsData } from '../hooks/useStatisticsData';
import { StatKpiGrid } from './StatKpiGrid';
import { FilterBar } from './FilterBar';
import { MonthlyTrendChart } from './charts/MonthlyTrendChart';
import { RecognitionRankingChart } from './charts/RecognitionRankingChart';
import { DemographicsDonut } from './charts/DemographicsDonut';
import { GeographicBarChart } from './charts/GeographicBarChart';
import { StatusBreakdownCard } from './charts/StatusBreakdownCard';
import { UnitDistributionCard } from './charts/UnitDistributionCard';
import { Button } from '../../../components/Button';

export const StatisticsDashboard: React.FC = () => {
  const {
    stats,
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
      <div className="max-w-7xl mx-auto space-y-6 font-sans py-4">
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

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-72 bg-gray-100 animate-pulse rounded-2xl border border-gray-200" />
          <div className="lg:col-span-4 h-72 bg-gray-100 animate-pulse rounded-2xl border border-gray-200" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral tracking-tight">
                Estadísticas y Análisis
              </h1>
              <p className="text-xs sm:text-sm text-neutral/70 mt-0.5">
                Métricas consolidadas, tendencias temporales y cobertura de diplomas emitidos.
              </p>
            </div>
          </div>
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
      <StatKpiGrid metrics={stats.kpis} />

      {/* Main Charts Row 1: Monthly Trends (8 cols) & Demographics Donut (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <MonthlyTrendChart data={stats.monthlyTrends} />
        </div>
        <div className="lg:col-span-4">
          <DemographicsDonut data={stats.demographics} />
        </div>
      </div>

      {/* Main Charts Row 2: Recognition Rankings (6 cols) & Geographic Distribution (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <RecognitionRankingChart data={stats.recognitionRankings} />
        </div>
        <div className="lg:col-span-6">
          <GeographicBarChart data={stats.geographic} />
        </div>
      </div>

      {/* Row 3: Scout Unit Distribution Card (12 cols) */}
      <div>
        <UnitDistributionCard data={stats.unitDistribution} />
      </div>

      {/* Bottom Row: Status and Data Quality Breakdown (12 cols) */}
      <div>
        <StatusBreakdownCard data={stats.statusBreakdown} />
      </div>
    </div>
  );
};
