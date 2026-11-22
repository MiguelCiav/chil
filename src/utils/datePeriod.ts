export type DatePeriodFilter =
  | 'all'
  | 'this-year'
  | 'this-month'
  | 'last-30'
  | 'last-90'
  | 'custom';

export const DATE_PERIOD_OPTIONS: ReadonlyArray<{
  readonly value: DatePeriodFilter;
  readonly label: string;
}> = [
  { value: 'all', label: 'Todo el histórico' },
  { value: 'this-year', label: 'Este Año' },
  { value: 'this-month', label: 'Este Mes' },
  { value: 'last-30', label: 'Últimos 30 días' },
  { value: 'last-90', label: 'Últimos 90 días' },
  { value: 'custom', label: 'Rango Personalizado' }
];

function matchesCustomDateRange(itemDate: Date, startDate: string, endDate: string): boolean {
  if (startDate && endDate) {
    const sDate = new Date(`${startDate}T00:00:00.000`);
    const eDate = new Date(`${endDate}T23:59:59.999`);
    return itemDate >= sDate && itemDate <= eDate;
  }
  if (startDate) {
    const sDate = new Date(`${startDate}T00:00:00.000`);
    return itemDate >= sDate;
  }
  if (endDate) {
    const eDate = new Date(`${endDate}T23:59:59.999`);
    return itemDate <= eDate;
  }
  return true;
}

function matchesRelativePeriod(itemDate: Date, period: string): boolean {
  const now = new Date();
  if (period === 'this-year') {
    return itemDate.getFullYear() === now.getFullYear();
  }
  if (period === 'this-month') {
    return (
      itemDate.getFullYear() === now.getFullYear() &&
      itemDate.getMonth() === now.getMonth()
    );
  }
  if (period === 'last-30') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    return itemDate >= thirtyDaysAgo && itemDate <= now;
  }
  if (period === 'last-90') {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    ninetyDaysAgo.setHours(0, 0, 0, 0);
    return itemDate >= ninetyDaysAgo && itemDate <= now;
  }
  return true;
}

/**
 * Evaluates whether a timestamp falls within the selected predefined or custom date period.
 */
export function matchesDateRange(
  createdAt: string,
  period: string,
  startDate = '',
  endDate = ''
): boolean {
  if (period === 'all') return true;
  if (!createdAt) return false;
  const itemDate = new Date(createdAt);
  if (Number.isNaN(itemDate.getTime())) return false;

  if (period === 'custom') {
    return matchesCustomDateRange(itemDate, startDate, endDate);
  }
  return matchesRelativePeriod(itemDate, period);
}
