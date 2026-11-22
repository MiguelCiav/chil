import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MonthlyTrendChart } from '../MonthlyTrendChart';
import { MonthlyTrendData, YoYComparisonData } from '../../../types';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const mockMonthly: MonthlyTrendData[] = MONTHS.map((label, idx) => ({
  monthKey: `2026-${String(idx + 1).padStart(2, '0')}`,
  label,
  year: 2026,
  monthIndex: idx,
  totalCount: idx === 0 ? 12 : idx === 1 ? 8 : 2,
  activeCount: idx === 0 ? 12 : idx === 1 ? 8 : 2,
  exceptionalCount: 0,
  pendingCount: 0
}));

const mockYoY: YoYComparisonData = {
  currentYear: 2026,
  previousYear: 2025,
  hasPreviousYearData: true,
  totalDiplomas: { current: 40, previous: 25, diff: 15, percentChange: 60 },
  totalBatches: { current: 8, previous: 5, diff: 3, percentChange: 60 },
  totalMembers: { current: 40, previous: 25, diff: 15, percentChange: 60 },
  demographics: {
    young: { current: 30, previous: 20, diff: 10, percentChange: 50, currentPercentage: 75, previousPercentage: 80 },
    adult: { current: 10, previous: 5, diff: 5, percentChange: 100, currentPercentage: 25, previousPercentage: 20 },
    total: { current: 40, previous: 25, diff: 15, percentChange: 60 }
  },
  regions: [],
  districts: [],
  units: [],
  monthly: MONTHS.map((label, idx) => ({
    monthIndex: idx,
    label,
    currentCount: idx === 0 ? 12 : idx === 1 ? 8 : 2,
    previousCount: idx === 0 ? 6 : idx === 1 ? 5 : 1,
    diff: idx === 0 ? 6 : idx === 1 ? 3 : 1,
    percentChange: 100
  }))
};

describe('MonthlyTrendChart component', () => {
  it('separates adjacent YoY month pairs with significantly wider inter-month gaps and dividers', () => {
    render(
      <MonthlyTrendChart data={mockMonthly} year={2026} yoy={mockYoY} />
    );

    const eneGroup = screen.getByRole('graphics-symbol', { name: /Ene: 12 \(2026\) vs 6 \(2025\)/i });
    const febGroup = screen.getByRole('graphics-symbol', { name: /Feb: 8 \(2026\) vs 5 \(2025\)/i });

    const eneRects = eneGroup.querySelectorAll('rect');
    const febRects = febGroup.querySelectorAll('rect');

    // rect[1] = current year track, rect[3] = previous year track
    const eneCurrX = Number(eneRects[1].getAttribute('x'));
    const eneCurrW = Number(eneRects[1].getAttribute('width'));
    const enePrevX = Number(eneRects[3].getAttribute('x'));
    const enePrevW = Number(eneRects[3].getAttribute('width'));
    const febCurrX = Number(febRects[1].getAttribute('x'));

    const intraMonthGap = enePrevX - (eneCurrX + eneCurrW);
    const interMonthGap = febCurrX - (enePrevX + enePrevW);

    expect(intraMonthGap).toBeCloseTo(3, 1);
    expect(interMonthGap).toBeGreaterThan(intraMonthGap * 6);

    // Subtle vertical divider exists on months after index 0
    expect(eneGroup.querySelectorAll('line').length).toBe(0);
    expect(febGroup.querySelectorAll('line').length).toBe(1);

    // SVG expanded viewBox accommodates clean month grouping
    const chartSvg = screen.getByRole('img', { name: /Gráfico de tendencia mensual/i });
    expect(chartSvg.getAttribute('viewBox')).toBe('0 0 760 232');
  });

  it('shows previous year bar value on hover and keyboard focus alongside tooltip overlay', () => {
    render(<MonthlyTrendChart data={mockMonthly} year={2026} yoy={mockYoY} />);

    const eneGroup = screen.getByRole('graphics-symbol', { name: /Ene: 12 \(2026\) vs 6 \(2025\)/i });
    fireEvent.mouseEnter(eneGroup);

    expect(screen.getByText('Ene • Comparativa')).toBeInTheDocument();

    fireEvent.mouseLeave(eneGroup);
    expect(screen.queryByText('Ene • Comparativa')).not.toBeInTheDocument();

    fireEvent.focus(eneGroup);
    expect(screen.getByText('Ene • Comparativa')).toBeInTheDocument();

    fireEvent.blur(eneGroup);
    expect(screen.queryByText('Ene • Comparativa')).not.toBeInTheDocument();
  });
});
