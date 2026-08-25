import React from 'react';
import { Award, Layers, Trophy, MapPin, Users } from 'lucide-react';
import { KpiMetrics, YoYComparisonData } from '../types';
import { YoYVariationBadge } from './YoYVariationBadge';

interface StatKpiGridProps {
  metrics: KpiMetrics;
  yoy?: YoYComparisonData;
}

export const StatKpiGrid: React.FC<StatKpiGridProps> = ({ metrics, yoy }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Reconocimientos Emitidos */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral/60 uppercase tracking-wider">
              Total Reconocimientos
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
        {yoy?.hasPreviousYearData && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-medium text-neutral/50">vs {yoy.previousYear}:</span>
            <YoYVariationBadge diff={yoy.totalDiplomas.diff} percentChange={yoy.totalDiplomas.percentChange} />
          </div>
        )}
      </div>

      {/* 2. Total Lotes Generados */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral/60 uppercase tracking-wider">
              Total Lotes
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
        {yoy?.hasPreviousYearData && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-medium text-neutral/50">vs {yoy.previousYear}:</span>
            <YoYVariationBadge diff={yoy.totalBatches.diff} percentChange={yoy.totalBatches.percentChange} />
          </div>
        )}
      </div>

      {/* 3. Reconocimiento Más Entregado */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral/60 uppercase tracking-wider">
              Más Entregado
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p
              className="text-lg font-black text-emerald-700 tracking-tight truncate"
              title={metrics.topRecognitionName || '-'}
            >
              {metrics.topRecognitionName || '-'}
            </p>
            <p className="text-[11px] text-neutral/50 mt-1 font-medium">
              {metrics.topRecognitionCount || 0} reconocimientos emitidos
            </p>
          </div>
        </div>
      </div>

      {/* 4. Regiones / Distritos Atendidos */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral/60 uppercase tracking-wider">
              Regiones y Distritos
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
      </div>

      {/* 5. Jóvenes vs Adultos */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div>
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
        {yoy?.hasPreviousYearData && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
            <span className="text-neutral/50">vs {yoy.previousYear}:</span>
            <div className="flex items-center gap-1.5 font-bold">
              <span className={yoy.demographics.young.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                Jóv: {yoy.demographics.young.diff >= 0 ? '+' : ''}{yoy.demographics.young.diff}
              </span>
              <span className="text-neutral/30">|</span>
              <span className={yoy.demographics.adult.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                Adu: {yoy.demographics.adult.diff >= 0 ? '+' : ''}{yoy.demographics.adult.diff}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

