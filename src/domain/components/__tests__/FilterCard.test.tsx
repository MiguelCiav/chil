import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterCard } from '../FilterCard';
import { buildCommonFilterBadges } from '../filterBadges';

describe('FilterCard component', () => {
  it('starts collapsed and expands the filter panel on clicking Filtros toggle', () => {
    const onSearchChange = vi.fn();
    const onPeriodChange = vi.fn();
    const onCustomStartDateChange = vi.fn();
    const onCustomEndDateChange = vi.fn();
    const onResetFilters = vi.fn();

    const { rerender } = render(
      <FilterCard
        searchId="test-search"
        searchValue=""
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar registros..."
        searchAriaLabel="Búsqueda global"
        period="all"
        onPeriodChange={onPeriodChange}
        periodSelectId="test-period"
        customStartDate=""
        customEndDate=""
        onCustomStartDateChange={onCustomStartDateChange}
        onCustomEndDateChange={onCustomEndDateChange}
        customStartId="test-start"
        customEndId="test-end"
        hasActiveFilters={false}
        onResetFilters={onResetFilters}
        resetAriaLabel="Limpiar filtros"
      >
        <div data-testid="custom-child">Campo</div>
      </FilterCard>
    );

    const toggleBtn = screen.getByRole('button', { name: /Filtros/i });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('custom-child')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Filtrar por período')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Búsqueda global'), { target: { value: 'Capital' } });
    expect(onSearchChange).toHaveBeenCalledWith('Capital');

    // Expand panel
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por período')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filtrar por período'), { target: { value: 'custom' } });
    expect(onPeriodChange).toHaveBeenCalledWith('custom');

    rerender(
      <FilterCard
        searchId="test-search"
        searchValue="Capital"
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar registros..."
        searchAriaLabel="Búsqueda global"
        period="custom"
        onPeriodChange={onPeriodChange}
        periodSelectId="test-period"
        customStartDate="2026-01-01"
        customEndDate="2026-12-31"
        onCustomStartDateChange={onCustomStartDateChange}
        onCustomEndDateChange={onCustomEndDateChange}
        customStartId="test-start"
        customEndId="test-end"
        hasActiveFilters={true}
        onResetFilters={onResetFilters}
        resetAriaLabel="Limpiar filtros"
      >
        <div data-testid="custom-child">Campo</div>
      </FilterCard>
    );

    fireEvent.click(screen.getByLabelText('Limpiar búsqueda'));
    expect(onSearchChange).toHaveBeenCalledWith('');

    fireEvent.change(screen.getByLabelText('Fecha inicio personalizado'), {
      target: { value: '2026-02-01' }
    });
    expect(onCustomStartDateChange).toHaveBeenCalledWith('2026-02-01');

    fireEvent.change(screen.getByLabelText('Fecha fin personalizado'), {
      target: { value: '2026-02-28' }
    });
    expect(onCustomEndDateChange).toHaveBeenCalledWith('2026-02-28');

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });

  it('displays active count badge and removable summary chips when collapsed', () => {
    const onRemoveRegion = vi.fn();
    const onResetFilters = vi.fn();

    render(
      <FilterCard
        searchValue=""
        onSearchChange={vi.fn()}
        searchPlaceholder="Buscar..."
        searchAriaLabel="Buscar"
        period="this-year"
        onPeriodChange={vi.fn()}
        periodSelectId="p"
        customStartDate=""
        customEndDate=""
        onCustomStartDateChange={vi.fn()}
        onCustomEndDateChange={vi.fn()}
        customStartId="s"
        customEndId="e"
        hasActiveFilters={true}
        onResetFilters={onResetFilters}
        activeFilters={[
          { id: 'region', label: 'Región', value: 'Capital', onRemove: onRemoveRegion },
          { id: 'period', label: 'Período', value: 'Este Año', onRemove: vi.fn() }
        ]}
      />
    );

    expect(screen.getByRole('button', { name: /^Filtros/i })).toHaveTextContent('2');
    expect(screen.getByText('Filtros activos:')).toBeInTheDocument();
    expect(screen.getByText('Región:')).toBeInTheDocument();
    expect(screen.getByText('Capital')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Quitar filtro Región'));
    expect(onRemoveRegion).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });

  it('builds common filter badges resolving territory sentinels, recognition, and custom periods', () => {
    const badges = buildCommonFilterBadges({
      recognition: { id: 'r1', options: [{ id: 'r1', name: 'Go Solar' }], onRemove: vi.fn() },
      region: { id: 'nacional', options: [], onRemove: vi.fn() },
      district: { id: '0', options: [], onRemove: vi.fn() },
      group: { id: 'no_scout', options: [], onRemove: vi.fn() },
      period: { value: 'custom', startDate: '2026-01-01', endDate: '2026-01-31', onRemove: vi.fn() }
    });

    expect(badges.map(b => `${b.label}:${b.value}`)).toEqual([
      'Reconocimiento:Go Solar',
      'Región:Nacional',
      'Distrito:No aplica',
      'Grupo Scout:No scout',
      'Período:2026-01-01 a 2026-01-31'
    ]);
  });
});
