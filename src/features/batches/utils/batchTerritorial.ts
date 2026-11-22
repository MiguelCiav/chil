import type { Batch } from '../../../types/batch';
import type { ScoutMember } from '../../../types/member';
import {
  type HierarchyLookup,
  resolveMemberHierarchy
} from '../../../utils/memberHierarchy';

export type TerritorialTokenKind = 'id' | 'national' | 'no_scout' | 'none';

export interface TerritorialToken {
  kind: TerritorialTokenKind;
  key: string;
  id?: number;
  label: string;
  count: number;
}

export type CompletenessStatus = 'complete' | 'pending' | 'empty';

export interface BatchTerritorialProjection {
  regionTokens: TerritorialToken[];
  districtTokens: TerritorialToken[];
  groupTokens: TerritorialToken[];
  completenessStatus: CompletenessStatus;
  completenessLabel: string;
  pendingCount: number;
  eligibleCount: number;
  memberCount: number;
}

export interface TerritorialBreakdownItem {
  id: number | string;
  name: string;
  count: number;
  percentage: number;
}

export interface BatchTerritorialBreakdown {
  regions: TerritorialBreakdownItem[];
  districts: TerritorialBreakdownItem[];
  groups: TerritorialBreakdownItem[];
  noScoutCount: number;
  noScoutPercentage: number;
  ungroupedScoutCount: number;
  ungroupedScoutPercentage: number;
  totalMembers: number;
}

function createNoneToken(count = 0): TerritorialToken {
  return {
    kind: 'none',
    key: '0',
    id: 0,
    label: 'No aplica',
    count
  };
}

function finalizeColumnTokens(
  idMap: Map<number, TerritorialToken>,
  specialTokens: TerritorialToken[],
  fallbackCount: number
): TerritorialToken[] {
  const sortedIdTokens = Array.from(idMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return (a.id ?? 0) - (b.id ?? 0);
  });

  const nonNoneSpecials = specialTokens.filter((t) => t.kind !== 'none' && t.count > 0);
  const combinedNonNone = [...sortedIdTokens, ...nonNoneSpecials];

  if (combinedNonNone.length > 0) {
    return combinedNonNone;
  }

  return [createNoneToken(fallbackCount)];
}

function resolveCompletenessSummary(
  memberCount: number,
  pendingCount: number
): { completenessStatus: CompletenessStatus; completenessLabel: string } {
  if (memberCount === 0) {
    return { completenessStatus: 'empty', completenessLabel: 'Sin miembros' };
  }
  if (pendingCount > 0) {
    return {
      completenessStatus: 'pending',
      completenessLabel: `Registros pendientes (${pendingCount})`
    };
  }
  return { completenessStatus: 'complete', completenessLabel: 'Todos registrados' };
}

function incrementTerritorialIdToken(
  idMap: Map<number, TerritorialToken>,
  id: number,
  items: ReadonlyArray<{ id: number; name: string }>,
  fallbackPrefix: string
): void {
  if (id <= 0) return;
  const existing = idMap.get(id);
  if (existing) {
    existing.count += 1;
    return;
  }
  const label = items.find((item) => item.id === id)?.name ?? `${fallbackPrefix} ${id}`;
  idMap.set(id, {
    kind: 'id',
    key: `id:${id}`,
    id,
    label,
    count: 1
  });
}

export function deriveBatchTerritorialProjection(
  batchMembers: ScoutMember[],
  batch: Batch | null | undefined,
  hierarchy: HierarchyLookup = {}
): BatchTerritorialProjection {
  const memberCount = batchMembers.length;
  const pendingCount = batchMembers.filter((m) => m.status === 'pending').length;
  const eligibleCount = batchMembers.filter(
    (m) => m.status === 'active' || m.status === 'exceptional'
  ).length;
  const { completenessStatus, completenessLabel } = resolveCompletenessSummary(
    memberCount,
    pendingCount
  );

  if (memberCount === 0) {
    return {
      regionTokens: [createNoneToken(0)],
      districtTokens: [createNoneToken(0)],
      groupTokens: [createNoneToken(0)],
      completenessStatus,
      completenessLabel,
      pendingCount,
      eligibleCount: 0,
      memberCount
    };
  }

  const allNoScout = batchMembers.every((m) => m.unit === 'no_scout');
  if (allNoScout) {
    return {
      regionTokens: [createNoneToken(memberCount)],
      districtTokens: [createNoneToken(memberCount)],
      groupTokens: [
        {
          kind: 'no_scout',
          key: 'no_scout',
          label: 'No scout',
          count: memberCount
        }
      ],
      completenessStatus,
      completenessLabel,
      pendingCount,
      eligibleCount,
      memberCount
    };
  }

  const regions = hierarchy.regions ?? [];
  const districts = hierarchy.districts ?? [];
  const groups = hierarchy.groups ?? [];

  const effectiveMembers = batchMembers.filter((m) => m.unit !== 'no_scout');

  const regionIdMap = new Map<number, TerritorialToken>();
  const districtIdMap = new Map<number, TerritorialToken>();
  const groupIdMap = new Map<number, TerritorialToken>();
  let nationalCount = 0;

  for (const member of effectiveMembers) {
    const resolved = resolveMemberHierarchy(member, batch, hierarchy);

    if (resolved.isNationalInstitutional) {
      nationalCount += 1;
      continue;
    }

    incrementTerritorialIdToken(regionIdMap, resolved.regionId, regions, 'Región');
    incrementTerritorialIdToken(districtIdMap, resolved.districtId, districts, 'Distrito');
    incrementTerritorialIdToken(groupIdMap, resolved.groupId, groups, 'Grupo');
  }

  const regionSpecials: TerritorialToken[] =
    nationalCount > 0
      ? [
          {
            kind: 'national',
            key: 'nacional',
            label: 'Nacional',
            count: nationalCount
          }
        ]
      : [];

  return {
    regionTokens: finalizeColumnTokens(regionIdMap, regionSpecials, effectiveMembers.length),
    districtTokens: finalizeColumnTokens(districtIdMap, [], effectiveMembers.length),
    groupTokens: finalizeColumnTokens(groupIdMap, [], effectiveMembers.length),
    completenessStatus,
    completenessLabel,
    pendingCount,
    eligibleCount,
    memberCount
  };
}

export function consolidateMergedGroupTokens(
  batchGroupTokenLists: TerritorialToken[][]
): string {
  const allTokens = batchGroupTokenLists.flat();
  if (allTokens.length === 0) {
    return 'No aplica';
  }

  const idTokenMap = new Map<string, TerritorialToken>();
  let hasNoneToken = false;
  let hasNoScoutToken = false;

  for (const token of allTokens) {
    if (token.kind === 'id') {
      const existing = idTokenMap.get(token.key);
      if (existing) {
        existing.count += token.count;
      } else {
        idTokenMap.set(token.key, { ...token });
      }
    } else if (token.kind === 'no_scout') {
      hasNoScoutToken = true;
    } else if (token.kind === 'none') {
      hasNoneToken = true;
    }
  }

  if (idTokenMap.size > 0) {
    return Array.from(idTokenMap.values())
      .map((t) => t.label)
      .join(', ');
  }

  if (hasNoScoutToken && !hasNoneToken) {
    return 'No scout';
  }

  return 'No aplica';
}

function toPercentage(count: number, total: number): number {
  if (total <= 0 || count <= 0) return 0;
  return Number(((count / total) * 100).toFixed(1));
}

function sortBreakdownItems(items: TerritorialBreakdownItem[]): TerritorialBreakdownItem[] {
  return items.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name, 'es');
  });
}

function incrementBreakdownCounter<K extends number | string>(
  map: Map<K, { id: K; name: string; count: number }>,
  id: K,
  resolveName: () => string
): void {
  const existing = map.get(id);
  if (existing) {
    existing.count += 1;
    return;
  }
  map.set(id, {
    id,
    name: resolveName(),
    count: 1
  });
}

export function calculateBatchTerritorialBreakdown(
  members: ScoutMember[],
  batch: Batch | null | undefined,
  hierarchy: HierarchyLookup = {}
): BatchTerritorialBreakdown {
  const totalMembers = members.length;
  const regions = hierarchy.regions ?? [];
  const districts = hierarchy.districts ?? [];
  const groups = hierarchy.groups ?? [];

  const regionMap = new Map<number | string, { id: number | string; name: string; count: number }>();
  const districtMap = new Map<number, { id: number; name: string; count: number }>();
  const groupMap = new Map<number, { id: number; name: string; count: number }>();

  let noScoutCount = 0;
  let ungroupedScoutCount = 0;

  for (const member of members) {
    if (member.unit === 'no_scout') {
      noScoutCount += 1;
      continue;
    }

    const resolved = resolveMemberHierarchy(member, batch, hierarchy);

    if (resolved.groupId === 0) {
      ungroupedScoutCount += 1;
    } else {
      incrementBreakdownCounter(
        groupMap,
        resolved.groupId,
        () => groups.find((g) => g.id === resolved.groupId)?.name ?? `Grupo ${resolved.groupId}`
      );
    }

    if (resolved.districtId > 0) {
      incrementBreakdownCounter(
        districtMap,
        resolved.districtId,
        () =>
          districts.find((d) => d.id === resolved.districtId)?.name ??
          `Distrito ${resolved.districtId}`
      );
    }

    if (resolved.isNationalInstitutional) {
      incrementBreakdownCounter(regionMap, 'nacional', () => 'Nacional');
    } else if (resolved.regionId > 0) {
      incrementBreakdownCounter(
        regionMap,
        resolved.regionId,
        () => regions.find((r) => r.id === resolved.regionId)?.name ?? `Región ${resolved.regionId}`
      );
    }
  }

  const regionItems = sortBreakdownItems(
    Array.from(regionMap.values()).map((item) => ({
      ...item,
      percentage: toPercentage(item.count, totalMembers)
    }))
  );

  const districtItems = sortBreakdownItems(
    Array.from(districtMap.values()).map((item) => ({
      ...item,
      percentage: toPercentage(item.count, totalMembers)
    }))
  );

  const groupItems = sortBreakdownItems(
    Array.from(groupMap.values()).map((item) => ({
      ...item,
      percentage: toPercentage(item.count, totalMembers)
    }))
  );

  return {
    regions: regionItems,
    districts: districtItems,
    groups: groupItems,
    noScoutCount,
    noScoutPercentage: toPercentage(noScoutCount, totalMembers),
    ungroupedScoutCount,
    ungroupedScoutPercentage: toPercentage(ungroupedScoutCount, totalMembers),
    totalMembers
  };
}
