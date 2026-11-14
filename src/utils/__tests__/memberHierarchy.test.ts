import { describe, it, expect } from 'vitest';
import {
  isNoAplicaDistrict,
  NO_APLICA_DISTRICT_NAME,
  resolveMemberHierarchy
} from '../memberHierarchy';
import type { Batch } from '../../types/batch';
import type { District, Region, ScoutGroup } from '../../types/hierarchy';
import type { ScoutMember } from '../../types/member';

const mockRegions: Region[] = [
  { id: 1, name: 'Metropolitana' },
  { id: 2, name: 'Aragua' },
  { id: 3, name: 'Zulia' }
];

const mockDistricts: District[] = [
  { id: 10, name: 'Avila', region_id: 1 },
  { id: 20, name: 'Maracay', region_id: 2 },
  { id: 34, name: 'NO APLICA', region_id: 2 },
  { id: 51, name: '  no aplica ', region_id: 3 }
];

const mockGroups: ScoutGroup[] = [
  { id: 100, name: 'Don Bosco', district_id: 10 },
  { id: 200, name: 'Las Delicias', district_id: 20 },
  { id: 300, name: 'Grupo Sin Distrito', district_id: 34 }
];

const hierarchy = {
  regions: mockRegions,
  districts: mockDistricts,
  groups: mockGroups
};

const baseMember: ScoutMember = {
  identity: 'V-12345678',
  first_names: 'Juan',
  last_names: 'Perez',
  birth_date: '2005-01-01',
  member_type: 'young',
  unit: 'tropa',
  status: 'active'
};

const legacyBatch: Batch = {
  id: 500,
  region_id: 3,
  district_id: 51,
  group_id: 200,
  created_at: '2026-01-01T00:00:00.000Z'
};

describe('memberHierarchy', () => {
  it('identifies positive-ID NO APLICA districts case-insensitively', () => {
    expect(NO_APLICA_DISTRICT_NAME).toBe('NO APLICA');
    expect(isNoAplicaDistrict({ name: 'NO APLICA' })).toBe(true);
    expect(isNoAplicaDistrict({ name: '  no aplica  ' })).toBe(true);
    expect(isNoAplicaDistrict({ name: 'Avila' })).toBe(false);
    expect(isNoAplicaDistrict(null)).toBe(false);
  });

  it('forces 0, 0, 0 and isNationalInstitutional: false for unit === no_scout even when legacy batch has IDs', () => {
    const resolved = resolveMemberHierarchy(
      {
        ...baseMember,
        unit: 'no_scout',
        region_id: 1,
        district_id: 10,
        group_id: 100
      },
      legacyBatch,
      hierarchy
    );

    expect(resolved).toEqual({
      regionId: 0,
      districtId: 0,
      groupId: 0,
      isNationalInstitutional: false
    });
  });

  it('derives districtId and regionId upward from groupId > 0 matching batchReports precedence', () => {
    const resolved = resolveMemberHierarchy(
      {
        ...baseMember,
        region_id: 3,
        district_id: 20,
        group_id: 100
      },
      legacyBatch,
      hierarchy
    );

    expect(resolved).toEqual({
      regionId: 1,
      districtId: 10,
      groupId: 100,
      isNationalInstitutional: false
    });
  });

  it('normalizes positive-ID NO APLICA districts to districtId: 0 while preserving parent regionId', () => {
    const resolvedFromDistrict = resolveMemberHierarchy(
      {
        ...baseMember,
        unit: 'institucional',
        region_id: 0,
        district_id: 34,
        group_id: 0
      },
      undefined,
      hierarchy
    );

    expect(resolvedFromDistrict).toEqual({
      regionId: 2,
      districtId: 0,
      groupId: 0,
      isNationalInstitutional: false
    });

    const resolvedFromGroupInNoAplicaDist = resolveMemberHierarchy(
      {
        ...baseMember,
        group_id: 300
      },
      undefined,
      hierarchy
    );

    expect(resolvedFromGroupInNoAplicaDist).toEqual({
      regionId: 2,
      districtId: 0,
      groupId: 300,
      isNationalInstitutional: false
    });
  });

  it('falls back per-field to legacy batch only when member field is null/undefined (not explicit 0)', () => {
    const explicitZeroMember = resolveMemberHierarchy(
      {
        ...baseMember,
        region_id: 0,
        district_id: 0,
        group_id: 0
      },
      { id: 1, region_id: 1, district_id: 10, group_id: 100, created_at: '2026-01-01' },
      hierarchy
    );

    expect(explicitZeroMember).toEqual({
      regionId: 0,
      districtId: 0,
      groupId: 0,
      isNationalInstitutional: false
    });

    const legacyPartialInstitutional = resolveMemberHierarchy(
      {
        ...baseMember,
        unit: 'institucional',
        region_id: undefined,
        district_id: 0,
        group_id: 0
      },
      { id: 2, region_id: 1, district_id: 0, group_id: 0, created_at: '2026-01-01' },
      hierarchy
    );

    expect(legacyPartialInstitutional).toEqual({
      regionId: 1,
      districtId: 0,
      groupId: 0,
      isNationalInstitutional: false
    });
  });

  it('classifies unit === institucional with 0, 0, 0 as isNationalInstitutional: true', () => {
    const nationalMember = resolveMemberHierarchy(
      {
        ...baseMember,
        unit: 'institucional',
        region_id: 0,
        district_id: 0,
        group_id: 0
      },
      { id: 3, region_id: 0, district_id: 0, group_id: 0, created_at: '2026-01-01' },
      hierarchy
    );

    expect(nationalMember).toEqual({
      regionId: 0,
      districtId: 0,
      groupId: 0,
      isNationalInstitutional: true
    });
  });
});
