import React, { useMemo } from 'react';
import { Select, SelectSize } from '../../components';
import { District, Region, ScoutGroup } from '../../types/hierarchy';
import {
  getAvailableDistricts,
  getAvailableGroups,
  resolveParentHierarchyForSelection
} from '../../utils/memberHierarchy';

export interface MemberHierarchySelectsProps {
  readonly regions: readonly Region[];
  readonly districts: readonly District[];
  readonly groups: readonly ScoutGroup[];
  readonly regionId: number;
  readonly districtId: number;
  readonly groupId: number;
  readonly size?: SelectSize;
  readonly layout?: 'stacked' | 'grid';
  readonly hideWhenEmpty?: boolean;
  readonly onChange: (next: {
    region_id: number;
    region_name: string;
    district_id: number;
    district_name: string;
    group_id: number;
    group_name: string;
  }) => void;
}

/**
 * Numeric-ID cascading Region / District / Group selectors with upward parent resolution.
 */
export const MemberHierarchySelects: React.FC<MemberHierarchySelectsProps> = ({
  regions,
  districts,
  groups,
  regionId,
  districtId,
  groupId,
  size = 'md',
  layout = 'stacked',
  hideWhenEmpty = false,
  onChange
}) => {
  const validRegions = useMemo(() => regions.filter(r => r.id !== 0), [regions]);

  const availableDistricts = useMemo(() => {
    if (regionId === 0) {
      return districts.filter(d => d.id !== 0);
    }
    return getAvailableDistricts(districts, regionId);
  }, [districts, regionId]);

  const availableGroups = useMemo(
    () =>
      getAvailableGroups(groups, districts, regionId, districtId, {
        allowAllWhenUnset: true
      }),
    [groups, districts, regionId, districtId]
  );

  if (hideWhenEmpty && regions.length === 0 && districts.length === 0 && groups.length === 0) {
    return null;
  }

  const getRegionName = (id: number) => regions.find(r => r.id === id)?.name ?? '';
  const getDistrictName = (id: number) => districts.find(d => d.id === id)?.name ?? '';

  const handleRegionChange = (nextRegionId: number) => {
    onChange({
      region_id: nextRegionId,
      region_name: nextRegionId > 0 ? getRegionName(nextRegionId) : '',
      district_id: 0,
      district_name: '',
      group_id: 0,
      group_name: ''
    });
  };

  const handleDistrictChange = (nextDistrictId: number) => {
    if (nextDistrictId <= 0) {
      onChange({
        region_id: regionId,
        region_name: regionId > 0 ? getRegionName(regionId) : '',
        district_id: 0,
        district_name: '',
        group_id: 0,
        group_name: ''
      });
      return;
    }

    const resolved = resolveParentHierarchyForSelection('district', nextDistrictId, {
      regions,
      districts,
      groups
    });
    onChange({
      region_id: resolved.region_id || regionId,
      region_name: resolved.region_name || getRegionName(regionId),
      district_id: resolved.district_id,
      district_name: resolved.district_name,
      group_id: 0,
      group_name: ''
    });
  };

  const handleGroupChange = (nextGroupId: number) => {
    if (nextGroupId <= 0) {
      onChange({
        region_id: regionId,
        region_name: regionId > 0 ? getRegionName(regionId) : '',
        district_id: districtId,
        district_name: districtId > 0 ? getDistrictName(districtId) : '',
        group_id: 0,
        group_name: ''
      });
      return;
    }

    const resolved = resolveParentHierarchyForSelection('group', nextGroupId, {
      regions,
      districts,
      groups
    });
    onChange({
      region_id: resolved.region_id || regionId,
      region_name: resolved.region_name || getRegionName(regionId),
      district_id: resolved.district_id,
      district_name: resolved.district_name,
      group_id: resolved.group_id ?? nextGroupId,
      group_name: resolved.group_name ?? ''
    });
  };

  const containerClass =
    layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-3 gap-2' : 'space-y-3';

  return (
    <div className={containerClass}>
      {(!hideWhenEmpty || regions.length > 0) && (
        <Select
          label="Región Scout"
          size={size}
          value={regionId}
          onChange={e => handleRegionChange(Number(e.target.value) || 0)}
        >
          <option value={0}>Sin región / No aplica</option>
          {validRegions.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      )}

      {(!hideWhenEmpty || districts.length > 0) && (
        <Select
          label="Distrito Scout"
          size={size}
          value={districtId}
          onChange={e => handleDistrictChange(Number(e.target.value) || 0)}
        >
          <option value={0}>Sin distrito / No aplica</option>
          {availableDistricts.map(d => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      )}

      {(!hideWhenEmpty || groups.length > 0) && (
        <Select
          label="Grupo Scout"
          size={size}
          value={groupId}
          onChange={e => handleGroupChange(Number(e.target.value) || 0)}
        >
          <option value={0}>Sin grupo / No aplica</option>
          {availableGroups.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
};
