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
    adultPercentage,
    youngActive,
    adultActive
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-500/10 text-sky-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral text-base tracking-tight">
              Demografía
            </h3>
            <p className="text-xs text-neutral/60">
              Jóvenes vs Adultos
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-neutral/50 bg-gray-100 px-2.5 py-1 rounded-full">
          {totalCount} total
        </span>
      </div>

      {/* Donut & Stats Container */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 my-auto py-2">
        {/* SVG Donut Ring */}
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
              Scouts
            </span>
          </div>
        </div>

        {/* Legend Cards */}
        <div className="w-full sm:w-auto space-y-2.5 flex-1 min-w-[140px]">
          {/* Young scouts item */}
          <div className="p-2.5 bg-sky-50/60 border border-sky-100 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 font-bold text-sky-900">
                <User className="w-3.5 h-3.5 text-sky-600" />
                Jóvenes
              </span>
              <span className="font-extrabold text-sky-900">
                {youngPercentage}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-sky-700/80 font-medium">
              <span>{youngCount} scouts</span>
              <span>({youngActive} válidos)</span>
            </div>
          </div>

          {/* Adult scouts item */}
          <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 font-bold text-amber-900">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                Adultos
              </span>
              <span className="font-extrabold text-amber-900">
                {adultPercentage}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-amber-700/80 font-medium">
              <span>{adultCount} dirigentes</span>
              <span>({adultActive} válidos)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
