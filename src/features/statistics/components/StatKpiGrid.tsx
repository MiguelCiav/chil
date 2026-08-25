import React from 'react';
import { Award, CheckCircle2, Users, MapPin, Layers } from 'lucide-react';
import { KpiMetrics } from '../types';

interface StatKpiGridProps {
  metrics: KpiMetrics;
}

export const StatKpiGrid: React.FC<StatKpiGridProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Diplomas */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral/60 uppercase tracking-wider">
            Diplomas Emitidos
          </span>
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-black text-neutral tracking-tight">
            {metrics.totalDiplomas}
          </p>
          <p className="text-[11px] text-neutral/50 mt-1 font-medium">
            de {metrics.totalMembers} miembros procesados
          </p>
        </div>
      </div>

      {/* 2. Validation Rate */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral/60 uppercase tracking-wider">
            Registro Válido
          </span>
          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">
            {metrics.validationRate}%
          </p>
          <p className="text-[11px] text-neutral/50 mt-1 font-medium truncate">
            {metrics.activeCount} válidos, {metrics.exceptionalCount} excepcionales
          </p>
        </div>
      </div>

      {/* 3. Demographics */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral/60 uppercase tracking-wider">
            Demografía
          </span>
          <div className="p-2 bg-sky-500/10 text-sky-600 rounded-xl">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-black text-sky-700 tracking-tight">
            {metrics.youngPercentage}% <span className="text-sm font-semibold text-neutral/60">Jóvenes</span>
          </p>
          <p className="text-[11px] text-neutral/50 mt-1 font-medium">
            {metrics.youngCount} jóvenes / {metrics.adultCount} adultos ({metrics.adultPercentage}%)
          </p>
        </div>
      </div>

      {/* 4. Territorial Coverage */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral/60 uppercase tracking-wider">
            Cobertura
          </span>
          <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
            <MapPin className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-black text-purple-700 tracking-tight">
            {metrics.activeRegionsCount} <span className="text-sm font-semibold text-neutral/60">Regiones</span>
          </p>
          <p className="text-[11px] text-neutral/50 mt-1 font-medium">
            en {metrics.activeDistrictsCount} distritos y {metrics.activeGroupsCount} grupos
          </p>
        </div>
      </div>

      {/* 5. Batches */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral/60 uppercase tracking-wider">
            Lotes Registrados
          </span>
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-black text-amber-700 tracking-tight">
            {metrics.totalBatches} <span className="text-sm font-semibold text-neutral/60">Lotes</span>
          </p>
          <p className="text-[11px] text-neutral/50 mt-1 font-medium">
            Promedio: {metrics.avgMembersPerBatch} miembros/lote
          </p>
        </div>
      </div>
    </div>
  );
};
