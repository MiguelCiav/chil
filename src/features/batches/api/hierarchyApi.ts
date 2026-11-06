import {
  collection,
  doc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import hierarchyData from '../../../data/hierarchy.json';
import { Region, District, ScoutGroup } from '../types';

async function seedHierarchyCollection<T extends { id: number }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const item of items) {
    batch.set(doc(db, collectionName, String(item.id)), item);
  }
  await batch.commit();
}

async function seedHierarchy(): Promise<{ regions: Region[]; districts: District[]; groups: ScoutGroup[] }> {
  console.log("Firestore hierarchy collections empty. Seeding...");
  await seedHierarchyCollection("regions", hierarchyData.regions);
  await seedHierarchyCollection("districts", hierarchyData.districts);
  await seedHierarchyCollection("groups", hierarchyData.groups);
  console.log("Seeding complete!");
  return {
    regions: hierarchyData.regions,
    districts: hierarchyData.districts,
    groups: hierarchyData.groups
  };
}

function normalizeHierarchyItems<T extends { id: number; name: string }>(
  items: T[],
  fallbackItem: T
): T[] {
  const copy = [...items];
  if (!copy.some(item => item.id === 0)) {
    copy.unshift(fallbackItem);
  }
  return copy.sort((a, b) => a.id - b.id);
}

export async function getHierarchyData(): Promise<{ regions: Region[]; districts: District[]; groups: ScoutGroup[] }> {
  try {
    const [regionsSnap, districtsSnap, groupsSnap] = await Promise.all([
      getDocs(collection(db, "regions")),
      getDocs(collection(db, "districts")),
      getDocs(collection(db, "groups")),
    ]);

    const regions = regionsSnap.docs.map(d => d.data() as Region);
    const districts = districtsSnap.docs.map(d => d.data() as District);
    const groups = groupsSnap.docs.map(d => d.data() as ScoutGroup);

    if (regions.length === 0) {
      return await seedHierarchy();
    }

    return {
      regions: normalizeHierarchyItems(regions, { id: 0, name: "No aplica" }),
      districts: normalizeHierarchyItems(districts, { id: 0, name: "No aplica", region_id: 0 }),
      groups: normalizeHierarchyItems(groups, { id: 0, name: "No aplica", district_id: 0 })
    };
  } catch (error) {
    console.error("Failed to fetch hierarchy from Firestore, falling back to local JSON:", error);
    return hierarchyData;
  }
}
