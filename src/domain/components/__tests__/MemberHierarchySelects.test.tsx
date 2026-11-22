import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemberHierarchySelects } from '../MemberHierarchySelects';
import { District, Region, ScoutGroup } from '../../../types/hierarchy';

const regions: Region[] = [
  { id: 1, name: 'Capital' },
  { id: 2, name: 'Aragua' }
];

const districts: District[] = [
  { id: 10, name: 'Chacao', region_id: 1 },
  { id: 20, name: 'NO APLICA', region_id: 2 }
];

const groups: ScoutGroup[] = [
  { id: 100, name: 'Don Bosco', district_id: 10 },
  { id: 200, name: 'Sin Distrito', district_id: 20 }
];

describe('MemberHierarchySelects component', () => {
  it('hides when hideWhenEmpty is true and regions are empty', () => {
    const { container } = render(
      <MemberHierarchySelects
        regions={[]}
        districts={[]}
        groups={[]}
        regionId={0}
        districtId={0}
        groupId={0}
        hideWhenEmpty={true}
        onChange={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('clears downward on region change and resolves upward on group selection', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MemberHierarchySelects
        regions={regions}
        districts={districts}
        groups={groups}
        regionId={1}
        districtId={10}
        groupId={100}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Región Scout'), { target: { value: '0' } });
    expect(onChange).toHaveBeenCalledWith({
      region_id: 0,
      region_name: '',
      district_id: 0,
      district_name: '',
      group_id: 0,
      group_name: ''
    });

    onChange.mockClear();
    rerender(
      <MemberHierarchySelects
        regions={regions}
        districts={districts}
        groups={groups}
        regionId={0}
        districtId={0}
        groupId={0}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Grupo Scout'), { target: { value: '200' } });
    expect(onChange).toHaveBeenCalledWith({
      region_id: 2,
      region_name: 'Aragua',
      district_id: 0,
      district_name: '',
      group_id: 200,
      group_name: 'Sin Distrito'
    });
  });
});
