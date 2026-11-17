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
