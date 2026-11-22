import React, { useMemo } from 'react';
import { Select } from '../../components';
import { District, Region, ScoutGroup } from '../../types/hierarchy';
import { getAvailableDistricts, getAvailableGroups } from '../../utils/memberHierarchy';

export interface HierarchyFilterSelectsProps {
  readonly regions: readonly Region[];
  readonly districts: readonly District[];
  readonly groups?: readonly ScoutGroup[];
  readonly regionId: string;
  readonly districtId: string;
  readonly groupId?: string;
  readonly showGroup?: boolean;
  readonly includeNoAplicaAlways?: boolean;
  readonly includeNoScoutInGroup?: boolean;
  readonly onRegionChange: (regionId: string) => void;
  readonly onDistrictChange: (districtId: string) => void;
  readonly onGroupChange?: (groupId: string) => void;
}

/**
 * String-keyed cascading Region / District / optional Group filter selectors.
 */
export const HierarchyFilterSelects: React.FC<HierarchyFilterSelectsProps> = ({
  regions,
  districts,
  groups = [],
  regionId,
  districtId,
  groupId = '',
  showGroup = false,
  includeNoAplicaAlways = false,
  includeNoScoutInGroup = false,
  onRegionChange,
  onDistrictChange,
  onGroupChange
}) => {
  const validRegions = useMemo(() => regions.filter(r => r.id !== 0), [regions]);
  const availableDistricts = useMemo(
    () => getAvailableDistricts(districts, regionId, { allowAllWhenUnset: true }),
    [districts, regionId]
  );
  const availableGroups = useMemo(
    () =>
      showGroup
        ? getAvailableGroups(groups, districts, regionId, districtId, { allowAllWhenUnset: true })
        : [],
    [showGroup, groups, districts, regionId, districtId]
  );

  const showNoAplicaInDistricts = includeNoAplicaAlways || regionId !== '';
  const showNoAplicaInGroups = includeNoAplicaAlways || districtId !== '' || regionId !== '';

  const handleRegionChange = (value: string) => {
    onRegionChange(value);
    if (districtId !== '') {
      onDistrictChange('');
    }
    if (showGroup && onGroupChange && groupId !== '') {
      onGroupChange('');
    }
  };

  const handleDistrictChange = (value: string) => {
    onDistrictChange(value);
    if (showGroup && onGroupChange && groupId !== '') {
      onGroupChange('');
    }
  };

  return (
    <>
      <Select
        label="Región"
        size="sm"
        aria-label="Filtrar por región"
        value={regionId}
        onChange={e => handleRegionChange(e.target.value)}
      >
        <option value="">Todas las regiones</option>
        <option value="nacional">Nacional</option>
        <option value="0">No aplica</option>
        {validRegions.map(r => (
          <option key={r.id} value={String(r.id)}>
            {r.name}
          </option>
        ))}
      </Select>

      <Select
        label="Distrito"
        size="sm"
        aria-label="Filtrar por distrito"
        value={districtId}
        onChange={e => handleDistrictChange(e.target.value)}
        disabled={regionId === 'nacional' || regionId === '0'}
      >
        <option value="">Todos los distritos</option>
        {showNoAplicaInDistricts && <option value="0">No aplica</option>}
        {availableDistricts.map(d => (
          <option key={d.id} value={String(d.id)}>
            {d.name}
          </option>
        ))}
      </Select>

      {showGroup && onGroupChange && (
        <Select
          label="Grupo Scout"
          size="sm"
          aria-label="Filtrar por grupo"
          value={groupId}
          onChange={e => onGroupChange(e.target.value)}
          disabled={
            regionId === 'nacional' ||
            (!includeNoScoutInGroup && (regionId === '0' || districtId === '0'))
          }
        >
          <option value="">Todos los grupos</option>
          {showNoAplicaInGroups && <option value="0">No aplica</option>}
          {includeNoScoutInGroup && <option value="no_scout">No scout</option>}
          {availableGroups.map(g => (
            <option key={g.id} value={String(g.id)}>
              {g.name}
            </option>
          ))}
        </Select>
      )}
    </>
  );
};
