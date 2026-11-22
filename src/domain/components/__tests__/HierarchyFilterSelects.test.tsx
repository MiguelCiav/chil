import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HierarchyFilterSelects } from '../HierarchyFilterSelects';
import { District, Region, ScoutGroup } from '../../../types/hierarchy';

const regions: Region[] = [
  { id: 0, name: 'No aplica' },
  { id: 1, name: 'Capital' },
  { id: 2, name: 'Aragua' }
];

const districts: District[] = [
  { id: 10, name: 'Chacao', region_id: 1 },
  { id: 11, name: 'NO APLICA', region_id: 1 }
];

const groups: ScoutGroup[] = [
  { id: 100, name: 'Grupo 1', district_id: 10 },
  { id: 101, name: 'Grupo Sin Distrito', district_id: 11 }
];

describe('HierarchyFilterSelects component', () => {
  it('renders accessible region and district selects with showGroup={false} and cascades resets', () => {
    const onRegionChange = vi.fn();
    const onDistrictChange = vi.fn();

    render(
      <HierarchyFilterSelects
        regions={regions}
        districts={districts}
        regionId="1"
        districtId="10"
        showGroup={false}
        includeNoAplicaAlways={true}
        onRegionChange={onRegionChange}
        onDistrictChange={onDistrictChange}
      />
    );

    const regionSelect = screen.getByLabelText('Filtrar por región');
    const districtSelect = screen.getByLabelText('Filtrar por distrito');
    expect(screen.queryByLabelText('Filtrar por grupo')).not.toBeInTheDocument();

    expect(districtSelect).toContainHTML('Chacao');
    expect(districtSelect).not.toContainHTML('NO APLICA');

    fireEvent.change(regionSelect, { target: { value: '2' } });
    expect(onRegionChange).toHaveBeenCalledWith('2');
    expect(onDistrictChange).toHaveBeenCalledWith('');
  });

  it('renders group select when showGroup is true and disables dependent selects for nacional', () => {
    const onGroupChange = vi.fn();
    const { rerender } = render(
      <HierarchyFilterSelects
        regions={regions}
        districts={districts}
        groups={groups}
        regionId="1"
        districtId=""
        groupId=""
        showGroup={true}
        onRegionChange={vi.fn()}
        onDistrictChange={vi.fn()}
        onGroupChange={onGroupChange}
      />
    );

    const groupSelect = screen.getByLabelText('Filtrar por grupo');
    expect(groupSelect).toContainHTML('Grupo 1');
    expect(groupSelect).toContainHTML('Grupo Sin Distrito');

    // Shows all districts and groups even when regionId and districtId are unset
    rerender(
      <HierarchyFilterSelects
        regions={regions}
        districts={districts}
        groups={groups}
        regionId=""
        districtId=""
        groupId=""
        showGroup={true}
        onRegionChange={vi.fn()}
        onDistrictChange={vi.fn()}
        onGroupChange={onGroupChange}
      />
    );
    expect(screen.getByLabelText('Filtrar por distrito')).toContainHTML('Chacao');
    expect(screen.getByLabelText('Filtrar por grupo')).toContainHTML('Grupo 1');

    rerender(
      <HierarchyFilterSelects
        regions={regions}
        districts={districts}
        groups={groups}
        regionId="nacional"
        districtId=""
        groupId=""
        showGroup={true}
        onRegionChange={vi.fn()}
        onDistrictChange={vi.fn()}
        onGroupChange={onGroupChange}
      />
    );

    expect(screen.getByLabelText('Filtrar por distrito')).toBeDisabled();
    expect(screen.getByLabelText('Filtrar por grupo')).toBeDisabled();
  });

  it('includes no_scout in group selector when includeNoScoutInGroup is enabled', () => {
    const onGroupChange = vi.fn();
    render(
      <HierarchyFilterSelects
        regions={regions}
        districts={districts}
        groups={groups}
        regionId="0"
        districtId="0"
        groupId=""
        showGroup={true}
        includeNoAplicaAlways={true}
        includeNoScoutInGroup={true}
        onRegionChange={vi.fn()}
        onDistrictChange={vi.fn()}
        onGroupChange={onGroupChange}
      />
    );

    const groupSelect = screen.getByLabelText('Filtrar por grupo');
    expect(groupSelect).not.toBeDisabled();
    expect(screen.getByRole('option', { name: 'No scout' })).toBeInTheDocument();

    fireEvent.change(groupSelect, { target: { value: 'no_scout' } });
    expect(onGroupChange).toHaveBeenCalledWith('no_scout');
  });
});
