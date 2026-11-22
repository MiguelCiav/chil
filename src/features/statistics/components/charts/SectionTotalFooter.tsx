import React from 'react';

export interface SectionTotalFooterProps {
  readonly totalLabel: string;
  readonly currentTotal: number;
  readonly previousTotal?: number;
  readonly currentYear?: number;
  readonly previousYear?: number;
}

/**
 * Unified bottom-right total summary displayed at the footer of statistics cards.
 */
export const SectionTotalFooter: React.FC<SectionTotalFooterProps> = ({
  totalLabel,
  currentTotal,
  previousTotal,
  currentYear,
  previousYear
}) => {
  const showYoY =
    previousTotal !== undefined &&
    currentYear !== undefined &&
    previousYear !== undefined;

  if (showYoY) {
    return (
      <div className="text-right flex flex-wrap items-center justify-end gap-4 sm:gap-6">
        <span className="text-xs font-semibold text-neutral/75">{totalLabel}</span>
        <div className="flex items-center gap-4 sm:gap-6">
          <div>
            <span className="block text-xs font-semibold text-neutral/75">
              Año {currentYear}
            </span>
            <p className="text-lg font-extrabold text-primary leading-none mt-0.5">
              {currentTotal}
            </p>
          </div>
          <div className="border-l border-primary/20 pl-4">
            <span className="block text-xs font-semibold text-neutral/75">
              Año {previousYear}
            </span>
            <p className="text-lg font-bold text-neutral/75 leading-none mt-0.5">
              {previousTotal}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-right flex items-center justify-end">
      <div>
        <span className="block text-xs font-semibold text-neutral/75">{totalLabel}</span>
        <p className="text-lg font-extrabold text-primary leading-none mt-0.5">
          {currentTotal}
        </p>
      </div>
    </div>
  );
};
