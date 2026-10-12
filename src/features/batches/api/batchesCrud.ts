import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Batch, BatchCreationParams, ScoutMember } from '../types';
import { getMembersByBatchId } from './membersCrud';

function generateSecureBatchId(): number {
  const array = new Uint32Array(1);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
    return (array[0] % 1_000_000) + 1;
  }
  return (Date.now() % 1_000_000) + 1;
}

export function buildBatchQueryForUser(userId: string) {
  return query(collection(db, "batches"), where("user_id", "==", userId));
}

export async function createBatch(params: BatchCreationParams, userId?: string): Promise<Batch> {
  const numericId = generateSecureBatchId();
  const targetUserId = params.user_id ?? userId ?? auth.currentUser?.uid ?? '';
  const regionId = typeof params.region_id === 'number' && !Number.isNaN(params.region_id) ? params.region_id : 0;
  const districtId = typeof params.district_id === 'number' && !Number.isNaN(params.district_id) ? params.district_id : 0;
  const groupId = typeof params.group_id === 'number' && !Number.isNaN(params.group_id) ? params.group_id : 0;

  const newBatch: Batch = {
    id: numericId,
    comment: params.comment || '',
    region_id: regionId,
    district_id: districtId,
    group_id: groupId,
    unit_scope: params.unit_scope ?? 'mixed',
    recognition_type: params.recognition_type,
    recognition_duration: params.recognition_duration ?? '',
    created_at: new Date().toISOString(),
    ...(targetUserId ? { user_id: targetUserId } : {})
  };

  await setDoc(doc(db, "batches", String(numericId)), newBatch);
  return newBatch;
}

export async function updateBatch(id: number, params: BatchCreationParams, userId?: string): Promise<Batch> {
  const batchRef = doc(db, "batches", String(id));
  const docSnap = await getDoc(batchRef);
  const existingData = docSnap.exists() ? (docSnap.data() as Batch) : null;
  const targetUserId = params.user_id ?? userId ?? existingData?.user_id ?? auth.currentUser?.uid ?? '';
  const regionId = typeof params.region_id === 'number' && !Number.isNaN(params.region_id) ? params.region_id : (existingData?.region_id ?? 0);
  const districtId = typeof params.district_id === 'number' && !Number.isNaN(params.district_id) ? params.district_id : (existingData?.district_id ?? 0);
  const groupId = typeof params.group_id === 'number' && !Number.isNaN(params.group_id) ? params.group_id : (existingData?.group_id ?? 0);

  const updatedBatch: Batch = {
    id,
    comment: params.comment ?? existingData?.comment ?? '',
    region_id: regionId,
    district_id: districtId,
    group_id: groupId,
    unit_scope: params.unit_scope ?? existingData?.unit_scope ?? 'mixed',
    recognition_type: params.recognition_type ?? existingData?.recognition_type,
    recognition_duration: params.recognition_duration ?? existingData?.recognition_duration ?? '',
    created_at: existingData ? existingData.created_at : new Date().toISOString(),
    ...(targetUserId ? { user_id: targetUserId } : {})
  };

  await setDoc(batchRef, updatedBatch);
  return updatedBatch;
}

export async function deleteBatch(batchId: number): Promise<void> {
  const membersQuery = query(collection(db, "scout_members"), where("batch_id", "==", batchId));
  const membersSnapshot = await getDocs(membersQuery);

  const batchOp = writeBatch(db);
  membersSnapshot.forEach((docSnapshot) => {
    batchOp.delete(docSnapshot.ref);
  });

  const batchDocRef = doc(db, "batches", String(batchId));
  batchOp.delete(batchDocRef);

  await batchOp.commit();
}

export async function getAllBatches(userId?: string): Promise<Batch[]> {
  const targetUserId = userId ?? auth.currentUser?.uid ?? '';
  if (!targetUserId) {
    return [];
  }
  const q = buildBatchQueryForUser(targetUserId);
  const querySnapshot = await getDocs(q);
  const batches: Batch[] = [];
  querySnapshot.forEach((docSnapshot) => {
    batches.push(docSnapshot.data() as Batch);
  });
  // Sort batches by creation date descending
  return batches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getBatchById(id: number): Promise<Batch | null> {
  const docRef = doc(db, "batches", String(id));
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as Batch;
  }
  return null;
}

export interface MergeBatchesParams {
  batchIds: number[];
  newComment?: string;
  user_id?: string;
}

export async function mergeBatches(params: MergeBatchesParams, userId?: string): Promise<Batch> {
  const { batchIds, newComment } = params;
  if (!batchIds || batchIds.length < 2) {
    throw new Error('Se requieren al menos 2 lotes para fusionar');
  }

  // Fetch all batches
  const fetchedBatches = await Promise.all(batchIds.map(id => getBatchById(id)));
  const existingBatches = fetchedBatches.filter((b): b is Batch => b !== null);

  if (existingBatches.length < 2) {
    throw new Error('No se encontraron suficientes lotes válidos para fusionar');
  }

  // Compute latestCreatedAt: find the most recent created_at timestamp among the batches
  const timestamps = existingBatches.map(b => new Date(b.created_at).getTime());
  const maxTimestamp = Math.max(...timestamps.filter(t => !Number.isNaN(t)));
  const latestCreatedAt = Number.isNaN(maxTimestamp) || maxTimestamp === -Infinity
    ? new Date().toISOString()
    : new Date(maxTimestamp).toISOString();

  // Determine primary batch properties:
  const firstRegion = existingBatches[0].region_id;
  const allSameRegion = existingBatches.every(b => b.region_id === firstRegion);
  const region_id = allSameRegion ? firstRegion : 0;

  const firstDistrict = existingBatches[0].district_id;
  const allSameDistrict = existingBatches.every(b => b.district_id === firstDistrict);
  const district_id = (allSameRegion && allSameDistrict) ? firstDistrict : 0;

  const firstGroup = existingBatches[0].group_id;
  const allSameGroup = existingBatches.every(b => b.group_id === firstGroup);
  const group_id = allSameGroup ? firstGroup : 0;

  const firstType = existingBatches[0].recognition_type;
  const allSameType = existingBatches.every(b => b.recognition_type === firstType);
  const recognition_type = allSameType ? firstType : (firstType ?? '');

  const firstUnit = existingBatches[0].unit_scope;
  const allSameUnit = existingBatches.every(b => b.unit_scope === firstUnit);
  const unit_scope = allSameUnit && firstUnit ? firstUnit : 'mixed';

  const firstDuration = existingBatches[0].recognition_duration;
  const allSameDuration = existingBatches.every(b => b.recognition_duration === firstDuration);
  const recognition_duration = allSameDuration ? firstDuration : '';

  const targetUserId = params.user_id ?? userId ?? existingBatches[0].user_id ?? auth.currentUser?.uid ?? '';

  const newNumericId = generateSecureBatchId();
  const mergedBatch: Batch = {
    id: newNumericId,
    comment: newComment !== undefined ? newComment : '',
    region_id,
    district_id,
    group_id,
    unit_scope,
    recognition_type,
    recognition_duration,
    created_at: latestCreatedAt,
    ...(targetUserId ? { user_id: targetUserId } : {})
  };

  const membersByBatch = await Promise.all(
    existingBatches.map(async b => {
      const members = await getMembersByBatchId(b.id);
      return { batch: b, members };
    })
  );

  const batchOp = writeBatch(db);

  // 1. Create the new merged batch
  const newBatchRef = doc(db, 'batches', String(newNumericId));
  batchOp.set(newBatchRef, mergedBatch);

  // 2. Member reassignment
  for (const { batch: sourceBatch, members } of membersByBatch) {
    for (const member of members) {
      const memberRef = doc(db, 'scout_members', member.recognition_code || member.identity);
      const memberGroupId = member.group_id !== undefined && !Number.isNaN(member.group_id)
        ? member.group_id
        : (sourceBatch.group_id !== undefined && !Number.isNaN(sourceBatch.group_id) ? sourceBatch.group_id : 0);

      const updatedMember: ScoutMember = {
        ...member,
        batch_id: newNumericId,
        group_id: memberGroupId,
        ...(targetUserId ? { user_id: targetUserId } : {})
      };
      batchOp.set(memberRef, updatedMember);
    }
  }

  // 3. Delete original batches
  for (const sourceBatch of existingBatches) {
    const oldBatchRef = doc(db, 'batches', String(sourceBatch.id));
    batchOp.delete(oldBatchRef);
  }

  await batchOp.commit();

  return mergedBatch;
}
