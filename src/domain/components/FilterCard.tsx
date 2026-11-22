import React, { ReactNode, useId, useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { Button, Card, CardBody, Field, SearchInput, Select } from '../../components';
import { DATE_PERIOD_OPTIONS, DatePeriodFilter } from '../../utils/datePeriod';
import type { ActiveFilterBadge } from './filterBadges';

export interface FilterCardProps {
  readonly searchId?: string;
  readonly searchValue: string;
  readonly onSearchChange: (value: string) => void;
  readonly searchPlaceholder: string;
  readonly searchAriaLabel: string;
  readonly children?: ReactNode;
  readonly period: DatePeriodFilter;
  readonly onPeriodChange: (period: DatePeriodFilter) => void;
  readonly periodSelectId: string;
  readonly customStartDate: string;
  readonly customEndDate: string;
  readonly onCustomStartDateChange: (value: string) => void;
  readonly onCustomEndDateChange: (value: string) => void;
  readonly customStartId: string;
  readonly customEndId: string;
  readonly hasActiveFilters: boolean;
  readonly onResetFilters: () => void;
  readonly resetAriaLabel?: string;
  readonly activeFilters?: readonly ActiveFilterBadge[];
  readonly defaultExpanded?: boolean;
  readonly dataWalkthrough?: string;
}

/**
 * Shared titleless filter card with a compact search + Filters toggle bar, active filter pills, and collapsible filter grid.
 */
export const FilterCard: React.FC<FilterCardProps> = ({
  searchId,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  children,
  period,
  onPeriodChange,
  periodSelectId,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  customStartId,
  customEndId,
  hasActiveFilters,
  onResetFilters,
  resetAriaLabel = 'Limpiar filtros',
  activeFilters = [],
  defaultExpanded = false,
  dataWalkthrough
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const activeCount = activeFilters.length;

  return (
    <Card data-walkthrough={dataWalkthrough}>
      <CardBody padding="sm" className="sm:p-4 space-y-3 font-sans">
        {/* Compact always-visible row: global search + collapsible filters toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex-1 min-w-0">
            <SearchInput
              id={searchId}
              size="sm"
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              onClear={() => onSearchChange('')}
              placeholder={searchPlaceholder}
              aria-label={searchAriaLabel}
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              type="button"
              variant={isExpanded || activeCount > 0 ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIsExpanded(prev => !prev)}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              className="whitespace-nowrap"
            >
              <span>Filtros</span>
              {activeCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold bg-primary text-white">
                  {activeCount}
                </span>
              )}
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 opacity-75" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 opacity-75" aria-hidden="true" />
              )}
            </Button>

            {hasActiveFilters && !isExpanded && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onResetFilters}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                aria-label={resetAriaLabel}
                className="whitespace-nowrap text-red-700 border-red-300 hover:bg-red-50"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Summary pills shown when panel is collapsed and non-search filters are applied */}
        {!isExpanded && activeCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-primary/10">
            <span className="text-xs font-semibold text-neutral/75">Filtros activos:</span>
            {activeFilters.map(chip => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-neutral border border-primary/20"
              >
                <span>
                  <span className="text-neutral/75">{chip.label}:</span>{' '}
                  <span className="font-semibold text-neutral">{chip.value}</span>
                </span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Quitar filtro ${chip.label}`}
                  className="p-0.5 rounded-full hover:bg-primary/15 hover:text-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Collapsible full filter grid */}
        {isExpanded && (
          <div id={panelId} className="pt-3 border-t border-primary/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              {children}

              <Select
                id={periodSelectId}
                label="Fecha / Período"
                size="sm"
                aria-label="Filtrar por período"
                value={period}
                onChange={e => onPeriodChange(e.target.value as DatePeriodFilter)}
              >
                {DATE_PERIOD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <div className="flex items-end">
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onResetFilters}
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    aria-label={resetAriaLabel}
                    className="w-full text-red-700 border-red-300 hover:bg-red-50"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>

            {period === 'custom' && (
              <div className="pt-2 border-t border-gray-100 flex flex-wrap items-end gap-3 text-xs">
                <div className="w-40">
                  <Field
                    id={customStartId}
                    label="Desde"
                    size="sm"
                    type="date"
                    value={customStartDate}
                    onChange={e => onCustomStartDateChange(e.target.value)}
                    aria-label="Fecha inicio personalizado"
                  />
                </div>
                <div className="w-40">
                  <Field
                    id={customEndId}
                    label="Hasta"
                    size="sm"
                    type="date"
                    value={customEndDate}
                    onChange={e => onCustomEndDateChange(e.target.value)}
                    aria-label="Fecha fin personalizado"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
