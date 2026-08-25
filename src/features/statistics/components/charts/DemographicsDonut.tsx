import React from 'react';
import { Users, User, UserCheck } from 'lucide-react';
import { DemographicsData } from '../../types';

interface DemographicsDonutProps {
  data: DemographicsData;
}

export const DemographicsDonut: React.FC<DemographicsDonutProps> = ({ data }) => {
  const {
    youngCount,
    adultCount,
    totalCount,
    youngPercentage,
    adultPercentage
  } = data;

  const radius = 38;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  // Calculate arc lengths
  const youngOffset = 0;
  const youngArc = (youngPercentage / 100) * circumference;

  const adultOffset = -youngArc;
  const adultArc = (adultPercentage / 100) * circumference;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-500/10 text-sky-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral text-base tracking-tight">
              Resumen de reconocimientos entregados a Jóvenes y Adultos
            </h3>
            <p className="text-xs text-neutral/60">
              Distribución demográfica entre scouts jóvenes y dirigentes/adultos
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-neutral/50 bg-gray-100 px-2.5 py-1 rounded-full">
          {totalCount} total
        </span>
      </div>

      {/* Donut & Table Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
        {/* SVG Donut Ring (4 cols) */}
        <div className="md:col-span-4 flex items-center justify-center">
          <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full -rotate-90 transform"
              role="img"
              aria-label={`Gráfico circular demográfico: ${youngPercentage}% Jóvenes, ${adultPercentage}% Adultos`}
            >
              {/* Background circle track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />

              {/* Young arc (Sky Blue) */}
              {youngCount > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#0284c7"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${youngArc} ${circumference}`}
                  strokeDashoffset={youngOffset}
                  className="transition-all duration-700"
                />
              )}

              {/* Adult arc (Amber) */}
              {adultCount > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${adultArc} ${circumference}`}
                  strokeDashoffset={adultOffset}
                  className="transition-all duration-700"
                />
              )}
            </svg>

            {/* Central Donut Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-extrabold text-neutral leading-none">
                {totalCount}
              </span>
              <span className="text-[10px] font-semibold text-neutral/50 uppercase tracking-wider mt-0.5">
                Total
              </span>
            </div>
          </div>
        </div>

        {/* Demographics Summary Table (8 cols) */}
        <div className="md:col-span-8 overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#faf8f5]">
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider">Categoría</th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider text-right">Total Reconocimientos</th>
                <th className="px-4 py-2.5 font-bold text-neutral/70 uppercase tracking-wider text-right">% del Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50/80 transition-colors">
                <td className="px-4 py-2.5 font-semibold text-sky-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] inline-block" />
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  <span>Jóvenes</span>
                </td>
                <td className="px-4 py-2.5 font-bold text-neutral text-right">
                  {youngCount}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-neutral/70">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-bold text-sky-900">{youngPercentage}%</span>
                    <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="bg-sky-600 h-full rounded-full"
                        style={{ width: `${youngPercentage}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>

              <tr className="hover:bg-gray-50/80 transition-colors">
                <td className="px-4 py-2.5 font-semibold text-amber-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block" />
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Adultos</span>
                </td>
                <td className="px-4 py-2.5 font-bold text-neutral text-right">
                  {adultCount}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-neutral/70">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-bold text-amber-900">{adultPercentage}%</span>
                    <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${adultPercentage}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>

              <tr className="bg-[#faf8f5]/60 font-bold border-t border-gray-200">
                <td className="px-4 py-2.5 text-neutral">
                  Total
                </td>
                <td className="px-4 py-2.5 text-neutral text-right">
                  {totalCount}
                </td>
                <td className="px-4 py-2.5 text-neutral text-right">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
