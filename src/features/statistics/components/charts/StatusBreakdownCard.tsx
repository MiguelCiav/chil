import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { StatusBreakdownData } from '../../types';

interface StatusBreakdownCardProps {
  data: StatusBreakdownData;
}

export const StatusBreakdownCard: React.FC<StatusBreakdownCardProps> = ({ data }) => {
  const {
    activeCount,
    exceptionalCount,
    pendingCount,
    totalCount,
    activePercentage,
    exceptionalPercentage,
    pendingPercentage
  } = data;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral text-base tracking-tight">
              Calidad y Estatus de Validación
            </h3>
            <p className="text-xs text-neutral/60">
              Distribución de registros por tipo de validación y emisión
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-neutral/50">Tasa de Efectividad:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold">
            {activePercentage}%
          </span>
        </div>
      </div>

      {/* Segmented Stacked Progress Bar */}
      <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden flex shadow-inner">
        {activeCount > 0 && (
          <div
            className="bg-emerald-500 h-full transition-all duration-500 hover:opacity-90"
            style={{ width: `${activePercentage}%` }}
            title={`Registro Válido: ${activeCount} (${activePercentage}%)`}
          />
        )}
        {exceptionalCount > 0 && (
          <div
            className="bg-purple-500 h-full transition-all duration-500 hover:opacity-90"
            style={{ width: `${exceptionalPercentage}%` }}
            title={`Emisión Excepcional: ${exceptionalCount} (${exceptionalPercentage}%)`}
          />
        )}
        {pendingCount > 0 && (
          <div
            className="bg-rose-500 h-full transition-all duration-500 hover:opacity-90"
            style={{ width: `${pendingPercentage}%` }}
            title={`Registro Inválido / Pendiente: ${pendingCount} (${pendingPercentage}%)`}
          />
        )}
      </div>

      {/* Breakdown Cards (3 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Valid */}
        <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Registro Válido
            </span>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              {activePercentage}%
            </span>
          </div>
          <p className="text-xl font-black text-emerald-950">
            {activeCount}
          </p>
          <p className="text-[11px] text-emerald-700/80 mt-0.5">
            Verificados automáticamente contra el sistema scout
          </p>
        </div>

        {/* Exceptional */}
        <div className="p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-purple-600" />
              Emisión Excepcional
            </span>
            <span className="text-xs font-extrabold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
              {exceptionalPercentage}%
            </span>
          </div>
          <p className="text-xl font-black text-purple-950">
            {exceptionalCount}
          </p>
          <p className="text-[11px] text-purple-700/80 mt-0.5">
            Aprobados manualmente con justificación institucional
          </p>
        </div>

        {/* Pending / Invalid */}
        <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
              <XCircle className="w-4 h-4 text-rose-600" />
              Registro Inválido
            </span>
            <span className="text-xs font-extrabold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md">
              {pendingPercentage}%
            </span>
          </div>
          <p className="text-xl font-black text-rose-950">
            {pendingCount}
          </p>
          <p className="text-[11px] text-rose-700/80 mt-0.5">
            Pendientes o no registrados en padrón oficial ({totalCount} total)
          </p>
        </div>
      </div>
    </div>
  );
};
