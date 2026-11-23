import hierarchyData from '../../../data/hierarchy.json';
import { Region, District, ScoutGroup } from '../types';

function normalizeHierarchyItems<T extends { id: number; name: string }>(
  items: T[],
  fallbackItem: T
): T[] {
  const copy = [...items];
  if (!copy.some((item) => item.id === 0)) {
    copy.unshift(fallbackItem);
  }
  return copy.sort((a, b) => a.id - b.id);
}

const normalizedRegions: Region[] = normalizeHierarchyItems(
  hierarchyData.regions as Region[],
  { id: 0, name: 'No aplica' }
);

const normalizedDistricts: District[] = normalizeHierarchyItems(
  hierarchyData.districts as District[],
  { id: 0, name: 'No aplica', region_id: 0 }
);

const normalizedGroups: ScoutGroup[] = normalizeHierarchyItems(
  hierarchyData.groups as ScoutGroup[],
  { id: 0, name: 'No aplica', district_id: 0 }
);

export async function getHierarchyData(): Promise<{
  regions: Region[];
  districts: District[];
  groups: ScoutGroup[];
}> {
  return {
    regions: [...normalizedRegions],
    districts: [...normalizedDistricts],
    groups: [...normalizedGroups]
  };
}
