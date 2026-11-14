import { describe, it, expect } from 'vitest';
import {
  calculateBatchTerritorialBreakdown,
  consolidateMergedGroupTokens,
  deriveBatchTerritorialProjection
} from '../batchTerritorial';
import type { Batch } from '../../../../types/batch';
import type { District, Region, ScoutGroup } from '../../../../types/hierarchy';
import type { ScoutMember } from '../../../../types/member';

const mockRegions: Region[] = [
  { id: 1, name: 'Metropolitana' },
  { id: 2, name: 'Aragua' },
  { id: 3, name: 'Zulia' },
  { id: 4, name: 'Lara' }
];

const mockDistricts: District[] = [
  { id: 10, name: 'Avila', region_id: 1 },
  { id: 20, name: 'Maracay', region_id: 2 },
  { id: 30, name: 'Maracaibo', region_id: 3 },
  { id: 40, name: 'Iribarren', region_id: 4 }
];

const mockGroups: ScoutGroup[] = [
  { id: 100, name: 'Alfa', district_id: 10 },
  { id: 200, name: 'Beta', district_id: 20 },
  { id: 300, name: 'Gamma', district_id: 30 },
  { id: 400, name: 'Delta', district_id: 40 }
];

const hierarchy = {
  regions: mockRegions,
  districts: mockDistricts,
  groups: mockGroups
};

const emptyBatch: Batch = {
  id: 1,
  region_id: 0,
  district_id: 0,
  group_id: 0,
  created_at: '2026-01-01T00:00:00.000Z'
};

function makeMember(overrides: Partial<ScoutMember>, idx = 1): ScoutMember {
  return {
    identity: `V-${idx}`,
    first_names: `Nombre ${idx}`,
    last_names: `Apellido ${idx}`,
    birth_date: '2000-01-01',
    member_type: 'young',
    unit: 'tropa',
    status: 'active',
    region_id: 0,
    district_id: 0,
    group_id: 0,
    ...overrides
  };
}

describe('batchTerritorial', () => {
  describe('deriveBatchTerritorialProjection (Cases A-I)', () => {
    it('Case A: projects grouped Scouts sorted descending by member count with tie-break ascending ID', () => {
      const members = [
        makeMember({ group_id: 200 }, 1),
        makeMember({ group_id: 200 }, 2),
        makeMember({ group_id: 100 }, 3)
      ];

      const proj = deriveBatchTerritorialProjection(members, emptyBatch, hierarchy);
      expect(proj.regionTokens.map((t) => t.label)).toEqual(['Aragua', 'Metropolitana']);
      expect(proj.districtTokens.map((t) => t.label)).toEqual(['Maracay', 'Avila']);
      expect(proj.groupTokens.map((t) => t.label)).toEqual(['Beta', 'Alfa']);
      expect(proj.completenessStatus).toBe('complete');
      expect(proj.completenessLabel).toBe('Todos registrados');
    });

    it('Case B: projects partial institutional (region > 0, 0, 0) alone as Region, No aplica, No aplica', () => {
      const members = [
        makeMember({ unit: 'institucional', region_id: 1, district_id: 0, group_id: 0 }, 1)
      ];

      const proj = deriveBatchTerritorialProjection(members, emptyBatch, hierarchy);
      expect(proj.regionTokens.map((t) => t.key)).toEqual(['id:1']);
      expect(proj.districtTokens.map((t) => t.key)).toEqual(['0']);
      expect(proj.groupTokens.map((t) => t.key)).toEqual(['0']);
    });

    it('Case C: projects national institutional (0, 0, 0) alone as Nacional, No aplica, No aplica', () => {
      const members = [
        makeMember({ unit: 'institucional', region_id: 0, district_id: 0, group_id: 0 }, 1)
      ];

      const proj = deriveBatchTerritorialProjection(members, emptyBatch, hierarchy);
      expect(proj.regionTokens).toEqual([
        { kind: 'national', key: 'nacional', label: 'Nacional', count: 1 }
      ]);
      expect(proj.districtTokens.map((t) => t.label)).toEqual(['No aplica']);
      expect(proj.groupTokens.map((t) => t.label)).toEqual(['No aplica']);
    });

    it('Case D: places Nacional last in Region and suppresses No aplica in District/Group alongside grouped Scouts', () => {
      const members = [
        makeMember({ unit: 'institucional', region_id: 0, district_id: 0, group_id: 0 }, 1),
        makeMember({ unit: 'institucional', region_id: 0, district_id: 0, group_id: 0 }, 2),
        makeMember({ group_id: 100 }, 3)
      ];

      const proj = deriveBatchTerritorialProjection(members, emptyBatch, hierarchy);
      expect(proj.regionTokens.map((t) => t.label)).toEqual(['Metropolitana', 'Nacional']);
      expect(proj.districtTokens.map((t) => t.label)).toEqual(['Avila']);
      expect(proj.groupTokens.map((t) => t.label)).toEqual(['Alfa']);
    });

    it('Case E: projects all no_scout batch as No aplica, No aplica, No scout', () => {
      const members = [
        makeMember({ unit: 'no_scout' }, 1),
        makeMember({ unit: 'no_scout' }, 2)
      ];

      const proj = deriveBatchTerritorialProjection(members, emptyBatch, hierarchy);
      expect(proj.regionTokens.map((t) => t.label)).toEqual(['No aplica']);
      expect(proj.districtTokens.map((t) => t.label)).toEqual(['No aplica']);
      expect(proj.groupTokens).toEqual([
        { kind: 'no_scout', key: 'no_scout', label: 'No scout', count: 2 }
      ]);
    });

    it('Case F: excludes no_scout from BatchList tokens when any non-no_scout member exists (Rule X)', () => {
      const members = [
        makeMember({ group_id: 100 }, 1),
        makeMember({ unit: 'no_scout' }, 2),
        makeMember({ unit: 'no_scout' }, 3)
      ];

      const proj = deriveBatchTerritorialProjection(members, emptyBatch, hierarchy);
      expect(proj.regionTokens.map((t) => t.label)).toEqual(['Metropolitana']);
      expect(proj.districtTokens.map((t) => t.label)).toEqual(['Avila']);
      expect(proj.groupTokens.map((t) => t.label)).toEqual(['Alfa']);
      expect(proj.memberCount).toBe(3);
    });

    it('Case G: projects all ungrouped non-institutional (0, 0, 0) as No aplica across all 3 columns', () => {
      const members = [makeMember({ unit: 'tropa', region_id: 0, district_id: 0, group_id: 0 }, 1)];

      const proj = deriveBatchTerritorialProjection(members, emptyBatch, hierarchy);
      expect(proj.regionTokens.map((t) => t.label)).toEqual(['No aplica']);
      expect(proj.districtTokens.map((t) => t.label)).toEqual(['No aplica']);
      expect(proj.groupTokens.map((t) => t.label)).toEqual(['No aplica']);
    });

    it('Case H: retains insolvent pending Scouts with positive IDs, suppresses 0,0,0 pending noise, and tracks pending count', () => {
      const members = [
        makeMember({ group_id: 100, status: 'active' }, 1),
        makeMember({ group_id: 200, status: 'pending' }, 2),
        makeMember({ group_id: 0, district_id: 0, region_id: 0, status: 'pending' }, 3)
      ];

      const proj = deriveBatchTerritorialProjection(members, emptyBatch, hierarchy);
      expect(proj.groupTokens.map((t) => t.label)).toEqual(['Alfa', 'Beta']);
      expect(proj.completenessStatus).toBe('pending');
      expect(proj.completenessLabel).toBe('Registros pendientes (2)');
      expect(proj.pendingCount).toBe(2);
    });

    it('Case I: projects 0 members as No aplica across all columns and Sin miembros completeness', () => {
      const proj = deriveBatchTerritorialProjection([], emptyBatch, hierarchy);
      expect(proj.regionTokens.map((t) => t.label)).toEqual(['No aplica']);
      expect(proj.districtTokens.map((t) => t.label)).toEqual(['No aplica']);
      expect(proj.groupTokens.map((t) => t.label)).toEqual(['No aplica']);
      expect(proj.completenessStatus).toBe('empty');
      expect(proj.completenessLabel).toBe('Sin miembros');
    });
  });

  describe('consolidateMergedGroupTokens', () => {
    it('joins distinct positive group labels and drops No scout / No aplica when positive groups exist', () => {
      const label = consolidateMergedGroupTokens([
        [{ kind: 'id', key: 'id:100', id: 100, label: 'Alfa', count: 2 }],
        [{ kind: 'no_scout', key: 'no_scout', label: 'No scout', count: 1 }],
        [
          { kind: 'id', key: 'id:100', id: 100, label: 'Alfa', count: 1 },
          { kind: 'id', key: 'id:200', id: 200, label: 'Beta', count: 1 }
        ]
      ]);

      expect(label).toBe('Alfa, Beta');
    });

    it('returns No scout when all batches are no_scout-only and No aplica when mixed with ungrouped', () => {
      expect(
        consolidateMergedGroupTokens([
          [{ kind: 'no_scout', key: 'no_scout', label: 'No scout', count: 2 }],
          [{ kind: 'no_scout', key: 'no_scout', label: 'No scout', count: 1 }]
        ])
      ).toBe('No scout');

      expect(
        consolidateMergedGroupTokens([
          [{ kind: 'no_scout', key: 'no_scout', label: 'No scout', count: 2 }],
          [{ kind: 'none', key: '0', id: 0, label: 'No aplica', count: 1 }]
        ])
      ).toBe('No aplica');
    });
  });

  describe('calculateBatchTerritorialBreakdown', () => {
    it('satisfies reconciliation equation and computes percentages over total members.length', () => {
      const members = [
        makeMember({ group_id: 200 }, 1),
        makeMember({ group_id: 100 }, 2),
        makeMember({ unit: 'institucional', region_id: 0, district_id: 0, group_id: 0 }, 3),
        makeMember({ unit: 'institucional', region_id: 1, district_id: 0, group_id: 0 }, 4),
        makeMember({ unit: 'no_scout' }, 5)
      ];

      const breakdown = calculateBatchTerritorialBreakdown(members, emptyBatch, hierarchy);
      expect(breakdown.totalMembers).toBe(5);
      expect(breakdown.noScoutCount).toBe(1);
      expect(breakdown.noScoutPercentage).toBe(20);
      expect(breakdown.ungroupedScoutCount).toBe(2);
      expect(breakdown.ungroupedScoutPercentage).toBe(40);

      const sumGroups = breakdown.groups.reduce((acc, g) => acc + g.count, 0);
      expect(sumGroups + breakdown.ungroupedScoutCount + breakdown.noScoutCount).toBe(
        members.length
      );

      // Regions: Metropolitana (2 -> 40%), Aragua (1 -> 20%), Nacional (1 -> 20%)
      // Tie between Aragua and Nacional broken by 'es' locale ('Aragua' before 'Nacional')
      expect(breakdown.regions.map((r) => ({ name: r.name, count: r.count, pct: r.percentage }))).toEqual([
        { name: 'Metropolitana', count: 2, pct: 40 },
        { name: 'Aragua', count: 1, pct: 20 },
        { name: 'Nacional', count: 1, pct: 20 }
      ]);

      // Groups: Alfa (1), Beta (1) sorted 'es' locale alphabetically
      expect(breakdown.groups.map((g) => g.name)).toEqual(['Alfa', 'Beta']);
    });
  });
});
