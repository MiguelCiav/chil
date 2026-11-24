import React from 'react';
import { Users, User, UserCheck } from 'lucide-react';
import { Card, CardBody } from '../../../../components';
import { DemographicsData, YoYComparisonData } from '../../types';
import { YoYVariationBadge } from '../YoYVariationBadge';

interface DemographicsDonutProps {
  data: DemographicsData;
  yoy?: YoYComparisonData;
}

export const DemographicsDonut: React.FC<DemographicsDonutProps> = ({ data, yoy }) => {
  const {
    youngCount,
    adultCount,
    totalCount,
    youngPercentage,
    adultPercentage
  } = data;

  const hasYoY = Boolean(yoy?.hasPreviousYearData);

  const youngDisplay = hasYoY && yoy ? yoy.demographics.young.current : youngCount;
  const adultDisplay = hasYoY && yoy ? yoy.demographics.adult.current : adultCount;
  const totalDisplay = hasYoY && yoy ? yoy.demographics.total.current : totalCount;
  const youngPct = hasYoY && yoy ? yoy.demographics.young.currentPercentage : youngPercentage;
  const adultPct = hasYoY && yoy ? yoy.demographics.adult.currentPercentage : adultPercentage;

  const radius = 38;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  // Calculate arc lengths matching the displayed table values
  const youngOffset = 0;
  const youngArc = (youngPct / 100) * circumference;

  const adultOffset = -youngArc;
  const adultArc = (adultPct / 100) * circumference;

  return (
    <Card>
      <CardBody className="p-5 space-y-4 font-sans">
        {/* Card Header */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-500/10 text-sky-700 rounded-xl" aria-hidden="true">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-neutral text-base tracking-tight">
            Resumen de reconocimientos entregados a Jóvenes y Adultos
          </h3>
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
                aria-label={`Gráfico circular demográfico: ${youngPct}% Jóvenes, ${adultPct}% Adultos`}
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
                {youngDisplay > 0 && (
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
                {adultDisplay > 0 && (
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
                  {totalDisplay}
                </span>
                <span className="text-xs font-semibold text-neutral/75 uppercase tracking-wider mt-0.5">
                  Total
                </span>
              </div>
            </div>
          </div>

          {/* Demographics Summary Table (8 cols) */}
          <div className="md:col-span-8 overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-primary/20 bg-primary/10">
                  <th className="px-4 py-2.5 font-bold text-neutral uppercase tracking-wider">Categoría</th>
                  <th className="px-4 py-2.5 font-bold text-neutral uppercase tracking-wider text-right">
                    {hasYoY && yoy ? `Total (${yoy.currentYear})` : 'Total Reconocimientos'}
                  </th>
                  {hasYoY && yoy && (
                    <>
                      <th className="px-4 py-2.5 font-bold text-neutral uppercase tracking-wider text-right">
                        Año Anterior ({yoy.previousYear})
                      </th>
                      <th className="px-4 py-2.5 font-bold text-neutral uppercase tracking-wider text-right">
                        Variación
                      </th>
                    </>
                  )}
                  <th className="px-4 py-2.5 font-bold text-neutral uppercase tracking-wider text-right">
                    % del Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-sky-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] inline-block" />
                    <User className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
                    <span>Jóvenes</span>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-neutral text-right">{youngDisplay}</td>
                  {hasYoY && yoy && (
                    <>
                      <td className="px-4 py-2.5 font-medium text-neutral/75 text-right">
                        {yoy.demographics.young.previous}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <YoYVariationBadge
                          diff={yoy.demographics.young.diff}
                          percentChange={yoy.demographics.young.percentChange}
                        />
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2.5 text-right font-medium text-neutral/75">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-bold text-sky-900">{youngPct}%</span>
                      <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="bg-sky-600 h-full rounded-full"
                          style={{ width: `${youngPct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-amber-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block" />
                    <UserCheck className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                    <span>Adultos</span>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-neutral text-right">{adultDisplay}</td>
                  {hasYoY && yoy && (
                    <>
                      <td className="px-4 py-2.5 font-medium text-neutral/75 text-right">
                        {yoy.demographics.adult.previous}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <YoYVariationBadge
                          diff={yoy.demographics.adult.diff}
                          percentChange={yoy.demographics.adult.percentChange}
                        />
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2.5 text-right font-medium text-neutral/75">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-bold text-amber-900">{adultPct}%</span>
                      <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="bg-amber-500 h-full rounded-full"
                          style={{ width: `${adultPct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>

                <tr className="bg-primary/5 font-bold border-t border-primary/20">
                  <td className="px-4 py-2.5 text-neutral">Total</td>
                  <td className="px-4 py-2.5 text-neutral text-right">{totalDisplay}</td>
                  {hasYoY && yoy && (
                    <>
                      <td className="px-4 py-2.5 text-neutral/75 text-right">
                        {yoy.demographics.total.previous}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <YoYVariationBadge
                          diff={yoy.demographics.total.diff}
                          percentChange={yoy.demographics.total.percentChange}
                        />
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2.5 text-neutral text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
