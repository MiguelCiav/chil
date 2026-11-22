import type { Batch } from '../types/batch';
import type { District, Region, ScoutGroup } from '../types/hierarchy';
import type { ScoutMember } from '../types/member';

export const NO_APLICA_DISTRICT_NAME = 'NO APLICA';

export interface HierarchyLookup {
  regions?: Region[];
  districts?: District[];
  groups?: ScoutGroup[];
}

export interface ResolvedMemberHierarchy {
  regionId: number;
  districtId: number;
  groupId: number;
  isNationalInstitutional: boolean;
}

export function isNoAplicaDistrict(district?: { name?: string } | null): boolean {
  return Boolean(
    district?.name && district.name.trim().toUpperCase() === NO_APLICA_DISTRICT_NAME
  );
}

function resolveFiniteId(memberVal?: number, batchVal?: number): number {
  if (memberVal !== undefined && memberVal !== null && Number.isFinite(memberVal) && memberVal >= 0) {
    return memberVal;
  }
  if (
    (memberVal === undefined || memberVal === null || Number.isNaN(memberVal)) &&
    batchVal !== undefined &&
    batchVal !== null &&
    Number.isFinite(batchVal) &&
    batchVal >= 0
  ) {
    return batchVal;
  }
  return 0;
}

export function resolveMemberHierarchy(
  member: ScoutMember,
  batch?: Batch | null,
  hierarchy: HierarchyLookup = {}
): ResolvedMemberHierarchy {
  if (member.unit === 'no_scout') {
    return {
      regionId: 0,
      districtId: 0,
      groupId: 0,
      isNationalInstitutional: false
    };
  }

  const districts = hierarchy.districts ?? [];
  const groups = hierarchy.groups ?? [];

  const groupId = resolveFiniteId(member.group_id, batch?.group_id);

  if (groupId > 0) {
    const matchedGroup = groups.find((g) => g.id === groupId);
    if (matchedGroup) {
      const rawDistrictId =
        Number.isFinite(matchedGroup.district_id) && matchedGroup.district_id > 0
          ? matchedGroup.district_id
          : 0;
      const matchedDistrict =
        rawDistrictId > 0 ? districts.find((d) => d.id === rawDistrictId) : undefined;
      const districtId =
        rawDistrictId > 0 && !isNoAplicaDistrict(matchedDistrict) ? rawDistrictId : 0;

      const regionId =
        matchedDistrict && Number.isFinite(matchedDistrict.region_id) && matchedDistrict.region_id > 0
          ? matchedDistrict.region_id
          : resolveFiniteId(member.region_id, batch?.region_id);

      return {
        regionId,
        districtId,
        groupId,
        isNationalInstitutional: false
      };
    }
  }

  const rawDistrictId = resolveFiniteId(member.district_id, batch?.district_id);
  const matchedDistrict =
    rawDistrictId > 0 ? districts.find((d) => d.id === rawDistrictId) : undefined;
  const isNoAplicaDist = rawDistrictId > 0 && isNoAplicaDistrict(matchedDistrict);
  const districtId = isNoAplicaDist ? 0 : rawDistrictId;

  let regionId = 0;
  if (districtId > 0 && matchedDistrict && matchedDistrict.region_id > 0) {
    regionId = matchedDistrict.region_id;
  } else {
    const directRegionId = resolveFiniteId(member.region_id, batch?.region_id);
    if (directRegionId > 0) {
      regionId = directRegionId;
    } else if (isNoAplicaDist && matchedDistrict && matchedDistrict.region_id > 0) {
      regionId = matchedDistrict.region_id;
    }
  }

  const isNationalInstitutional =
    member.unit === 'institucional' && regionId === 0 && districtId === 0 && groupId === 0;

  return {
    regionId,
    districtId,
    groupId,
    isNationalInstitutional
  };
}

/**
 * Filters Scout districts belonging to a selected region, excluding sentinel `id === 0`
 * and optionally positive-ID `NO APLICA` districts.
 */
export function getAvailableDistricts(
  districts: readonly District[],
  regionId: string | number | undefined,
  options?: { includeNoAplicaDistrict?: boolean }
): District[] {
  if (
    regionId === undefined ||
    regionId === null ||
    regionId === '' ||
    regionId === 'nacional' ||
    regionId === '0' ||
    regionId === 0
  ) {
    return [];
  }

  const numericRegionId = Number(regionId);
  if (!Number.isFinite(numericRegionId) || numericRegionId <= 0) {
    return [];
  }

  return districts.filter(
    d =>
      d.region_id === numericRegionId &&
      d.id !== 0 &&
      (options?.includeNoAplicaDistrict || !isNoAplicaDistrict(d))
  );
}

/**
 * Filters Scout groups by selected district or parent region, excluding sentinel `id === 0`.
 */
export function getAvailableGroups(
  groups: readonly ScoutGroup[],
  districts: readonly District[],
  regionId: string | number | undefined,
  districtId: string | number | undefined,
  options?: { allowAllWhenUnset?: boolean }
): ScoutGroup[] {
  if (regionId === 'nacional' || regionId === '0' || districtId === '0') {
    return [];
  }

  const numericDistrictId =
    districtId !== undefined && districtId !== null && districtId !== '' ? Number(districtId) : 0;
  if (Number.isFinite(numericDistrictId) && numericDistrictId > 0) {
    return groups.filter(g => g.district_id === numericDistrictId && g.id !== 0);
  }

  const numericRegionId =
    regionId !== undefined && regionId !== null && regionId !== '' ? Number(regionId) : 0;
  if (Number.isFinite(numericRegionId) && numericRegionId > 0) {
    const regionDistrictIds = new Set(
      districts.filter(d => d.region_id === numericRegionId && d.id !== 0).map(d => d.id)
    );
    return groups.filter(g => g.id !== 0 && regionDistrictIds.has(g.district_id));
  }

  if (options?.allowAllWhenUnset) {
    return groups.filter(g => g.id !== 0);
  }

  return [];
}

/**
 * Resolves parent region and normalized district fields when selecting a positive district or group.
 */
export function resolveParentHierarchyForSelection(
  level: 'district' | 'group',
  selectedId: number,
  hierarchy: { regions: readonly Region[]; districts: readonly District[]; groups: readonly ScoutGroup[] }
): {
  region_id: number;
  region_name: string;
  district_id: number;
  district_name: string;
  group_id?: number;
  group_name?: string;
} {
  if (selectedId <= 0) {
    return level === 'group'
      ? { region_id: 0, region_name: '', district_id: 0, district_name: '', group_id: 0, group_name: '' }
      : { region_id: 0, region_name: '', district_id: 0, district_name: '' };
  }

  if (level === 'district') {
    const dist = hierarchy.districts.find(d => d.id === selectedId);
    const regionId = dist?.region_id ?? 0;
    const reg = regionId > 0 ? hierarchy.regions.find(r => r.id === regionId) : undefined;
    const isNoAplica = isNoAplicaDistrict(dist);

    return {
      region_id: reg?.id ?? regionId,
      region_name: reg?.name ?? '',
      district_id: dist && !isNoAplica ? dist.id : 0,
      district_name: dist && !isNoAplica ? dist.name : ''
    };
  }

  const grp = hierarchy.groups.find(g => g.id === selectedId);
  const rawDist = grp ? hierarchy.districts.find(d => d.id === grp.district_id) : undefined;
  const isNoAplica = isNoAplicaDistrict(rawDist);
  const districtId = rawDist && !isNoAplica ? rawDist.id : 0;
  const districtName = rawDist && !isNoAplica ? rawDist.name : '';
  const regionId = rawDist?.region_id ?? 0;
  const reg = regionId > 0 ? hierarchy.regions.find(r => r.id === regionId) : undefined;

  return {
    region_id: reg?.id ?? regionId,
    region_name: reg?.name ?? '',
    district_id: districtId,
    district_name: districtName,
    group_id: grp?.id ?? selectedId,
    group_name: grp?.name ?? ''
  };
}
