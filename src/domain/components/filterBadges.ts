import { District, Region, ScoutGroup } from '../../types/hierarchy';
import { DATE_PERIOD_OPTIONS, DatePeriodFilter } from '../../utils/datePeriod';

export interface ActiveFilterBadge {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onRemove: () => void;
}

export interface BuildCommonFilterBadgesParams {
  recognition?: {
    id: string;
    options: ReadonlyArray<{ readonly id: string; readonly name: string }>;
    onRemove: () => void;
  };
  region?: {
    id: string;
    options: readonly Region[];
    onRemove: () => void;
  };
  district?: {
    id: string;
    options: readonly District[];
    onRemove: () => void;
  };
  group?: {
    id: string;
    options: readonly ScoutGroup[];
    onRemove: () => void;
  };
  period?: {
    value: DatePeriodFilter;
    startDate?: string;
    endDate?: string;
    onRemove: () => void;
  };
}

function resolveTerritorialBadgeValue(
  id: string,
  items: ReadonlyArray<{ readonly id: number; readonly name: string }>
): string {
  if (id === 'nacional') return 'Nacional';
  if (id === '0') return 'No aplica';
  if (id === 'no_scout') return 'No scout';
  return items.find(item => String(item.id) === id)?.name ?? id;
}

function formatCustomPeriodValue(startDate?: string, endDate?: string): string {
  if (startDate && endDate) return `${startDate} a ${endDate}`;
  if (startDate) return `Desde ${startDate}`;
  if (endDate) return `Hasta ${endDate}`;
  return 'Rango Personalizado';
}

/**
 * Builds consistent removable filter badges for shared recognition, territory, and period controls.
 */
export function buildCommonFilterBadges(
  params: BuildCommonFilterBadgesParams
): ActiveFilterBadge[] {
  const badges: ActiveFilterBadge[] = [];

  if (params.recognition?.id) {
    const recName =
      params.recognition.options.find(r => r.id === params.recognition!.id)?.name ??
      params.recognition.id;
    badges.push({
      id: 'recognition',
      label: 'Reconocimiento',
      value: recName,
      onRemove: params.recognition.onRemove
    });
  }

  if (params.region?.id) {
    badges.push({
      id: 'region',
      label: 'Región',
      value: resolveTerritorialBadgeValue(params.region.id, params.region.options),
      onRemove: params.region.onRemove
    });
  }

  if (params.district?.id) {
    badges.push({
      id: 'district',
      label: 'Distrito',
      value: resolveTerritorialBadgeValue(params.district.id, params.district.options),
      onRemove: params.district.onRemove
    });
  }

  if (params.group?.id) {
    badges.push({
      id: 'group',
      label: 'Grupo Scout',
      value: resolveTerritorialBadgeValue(params.group.id, params.group.options),
      onRemove: params.group.onRemove
    });
  }

  if (params.period && params.period.value !== 'all') {
    const periodLabel =
      params.period.value === 'custom'
        ? formatCustomPeriodValue(params.period.startDate, params.period.endDate)
        : DATE_PERIOD_OPTIONS.find(o => o.value === params.period!.value)?.label ??
          params.period.value;
    badges.push({
      id: 'period',
      label: 'Período',
      value: periodLabel,
      onRemove: params.period.onRemove
    });
  }

  return badges;
}
