import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  writeBatch,
  WriteBatch
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { createKeyedSessionCache } from '../../../lib/sessionCache';
import { Batch, BatchCreationParams, ScoutMember } from '../types';
import {
  getMembersByBatchId,
  getMemberDocId,
  sanitizeMemberForSave,
  upsertMembersInCache,
  removeMembersByBatchIdFromCache
} from './membersCrud';

const batchesByUserCache = createKeyedSessionCache<string, Batch[]>();

function sortBatchesDescending(batches: Batch[]): Batch[] {
  return [...batches].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function findCachedBatchById(id: number): Batch | null {
  for (const batches of batchesByUserCache.values()) {
    const found = batches.find((b) => b.id === id);
    if (found) {
      return found;
    }
  }
  return null;
}

function upsertBatchInCache(batch: Batch, userId?: string): void {
  const targetUserId = batch.user_id ?? userId ?? auth.currentUser?.uid ?? '';
  if (targetUserId && batchesByUserCache.has(targetUserId)) {
    const existing = batchesByUserCache.get(targetUserId) ?? [];
    const filtered = existing.filter((b) => b.id !== batch.id);
    batchesByUserCache.set(targetUserId, sortBatchesDescending([batch, ...filtered]));
    return;
  }

  for (const [uid, list] of batchesByUserCache.entries()) {
    if (list.some((b) => b.id === batch.id)) {
      const updated = list.map((b) => (b.id === batch.id ? batch : b));
      batchesByUserCache.set(uid, sortBatchesDescending(updated));
    }
  }
}

function removeBatchesFromCache(batchIds: number[]): void {
  const idSet = new Set(batchIds);
  for (const [uid, list] of batchesByUserCache.entries()) {
    const filtered = list.filter((b) => !idSet.has(b.id));
    if (filtered.length !== list.length) {
      batchesByUserCache.set(uid, filtered);
    }
  }
}

export function generateSecureBatchId(): number {
  const MIN_BATCH_ID = 100_000_000;
  const RANGE = 900_000_000; // 100_000_000 to 999_999_999
  const array = new Uint32Array(1);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
    return (array[0] % RANGE) + MIN_BATCH_ID;
  }
  return (Date.now() % RANGE) + MIN_BATCH_ID;
}

export async function commitChunkedBatches(
  operations: ((batch: WriteBatch) => void)[],
  chunkSize = 450
): Promise<void> {
  if (!operations || operations.length === 0) {
    return;
  }
  const safeChunkSize = chunkSize > 0 ? chunkSize : 450;

  async function commitNextChunk(startIndex: number): Promise<void> {
    if (startIndex >= operations.length) {
      return;
    }
    const batch = writeBatch(db);
    const chunk = operations.slice(startIndex, startIndex + safeChunkSize);
    chunk.forEach((op) => op(batch));
    await batch.commit();
    await commitNextChunk(startIndex + safeChunkSize);
  }

  await commitNextChunk(0);
}

export function buildBatchQueryForUser(userId: string) {
  return query(collection(db, "batches"), where("user_id", "==", userId));
}

function buildBatchRecord(numericId: number, params: BatchCreationParams, userId?: string): Batch {
  const targetUserId = params.user_id ?? userId ?? auth.currentUser?.uid ?? '';
  const regionId = typeof params.region_id === 'number' && !Number.isNaN(params.region_id) ? params.region_id : 0;
  const districtId = typeof params.district_id === 'number' && !Number.isNaN(params.district_id) ? params.district_id : 0;
  const groupId = typeof params.group_id === 'number' && !Number.isNaN(params.group_id) ? params.group_id : 0;

  return {
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
}

export async function createBatch(params: BatchCreationParams, userId?: string): Promise<Batch> {
  const numericId = generateSecureBatchId();
  const newBatch = buildBatchRecord(numericId, params, userId);

  await setDoc(doc(db, "batches", String(numericId)), newBatch);
  upsertBatchInCache(newBatch, newBatch.user_id ?? userId);
  return newBatch;
}

export async function createBatchWithMembers(
  params: BatchCreationParams,
  members: ScoutMember[],
  userId?: string,
  chunkSize = 450
): Promise<{ batch: Batch; members: ScoutMember[] }> {
  const numericId = generateSecureBatchId();
  const newBatch = buildBatchRecord(numericId, params, userId);
  const targetUserId = newBatch.user_id ?? userId ?? auth.currentUser?.uid ?? '';

  const sanitizedMembers = members.map((member) =>
    sanitizeMemberForSave(
      {
        ...member,
        batch_id: numericId
      },
      targetUserId
    )
  );

  const operations: ((batchOp: WriteBatch) => void)[] = [];
  const batchDocRef = doc(db, "batches", String(numericId));
  operations.push((batchOp) => batchOp.set(batchDocRef, newBatch));

  for (const sanitized of sanitizedMembers) {
    const memberRef = doc(db, "scout_members", getMemberDocId(sanitized));
    operations.push((batchOp) => batchOp.set(memberRef, sanitized));
  }

  await commitChunkedBatches(operations, chunkSize);

  upsertBatchInCache(newBatch, targetUserId);
  upsertMembersInCache(sanitizedMembers, targetUserId);

  return { batch: newBatch, members: sanitizedMembers };
}

export async function updateBatch(id: number, params: BatchCreationParams, userId?: string): Promise<Batch> {
  const batchRef = doc(db, "batches", String(id));
  let existingData = findCachedBatchById(id);
  if (!existingData) {
    const docSnap = await getDoc(batchRef);
    existingData = docSnap.exists() ? (docSnap.data() as Batch) : null;
  }
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
  upsertBatchInCache(updatedBatch, targetUserId);
  return updatedBatch;
}

export async function deleteBatch(batchId: number): Promise<void> {
  const membersQuery = query(collection(db, "scout_members"), where("batch_id", "==", batchId));
  const membersSnapshot = await getDocs(membersQuery);

  const operations: ((batch: WriteBatch) => void)[] = [];
  if (Array.isArray(membersSnapshot?.docs)) {
    membersSnapshot.docs.forEach((docSnapshot) => {
      operations.push((batchOp) => batchOp.delete(docSnapshot.ref));
    });
  } else if (typeof membersSnapshot?.forEach === 'function') {
    membersSnapshot.forEach((docSnapshot) => {
      operations.push((batchOp) => batchOp.delete(docSnapshot.ref));
    });
  }

  const batchDocRef = doc(db, "batches", String(batchId));
  operations.push((batchOp) => batchOp.delete(batchDocRef));

  await commitChunkedBatches(operations);
  removeBatchesFromCache([batchId]);
  removeMembersByBatchIdFromCache(batchId);
}

export async function getAllBatches(userId?: string): Promise<Batch[]> {
  const targetUserId = userId ?? auth.currentUser?.uid ?? '';
  if (!targetUserId) {
    return [];
  }

  return batchesByUserCache.getOrLoad(targetUserId, async () => {
    const q = buildBatchQueryForUser(targetUserId);
    const querySnapshot = await getDocs(q);
    const batches: Batch[] = [];
    querySnapshot.forEach((docSnapshot) => {
      batches.push(docSnapshot.data() as Batch);
    });
    return sortBatchesDescending(batches);
  });
}

export async function getBatchById(id: number): Promise<Batch | null> {
  const cached = findCachedBatchById(id);
  if (cached) {
    return cached;
  }

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

function computeLatestBatchTimestamp(existingBatches: Batch[]): string {
  const timestamps = existingBatches.map(b => new Date(b.created_at).getTime());
  const validTimestamps = timestamps.filter(t => !Number.isNaN(t));
  if (validTimestamps.length === 0) {
    return new Date().toISOString();
  }
  return new Date(Math.max(...validTimestamps)).toISOString();
}

function buildMergedBatchRecord(
  existingBatches: Batch[],
  params: MergeBatchesParams,
  userId?: string
): { mergedBatch: Batch; targetUserId: string } {
  const first = existingBatches[0];
  const allSameRegion = existingBatches.every(b => b.region_id === first.region_id);
  const allSameDistrict = existingBatches.every(b => b.district_id === first.district_id);
  const allSameGroup = existingBatches.every(b => b.group_id === first.group_id);
  const allSameType = existingBatches.every(b => b.recognition_type === first.recognition_type);
  const allSameUnit = existingBatches.every(b => b.unit_scope === first.unit_scope);
  const allSameDuration = existingBatches.every(
    b => b.recognition_duration === first.recognition_duration
  );

  const targetUserId =
    params.user_id ?? userId ?? first.user_id ?? auth.currentUser?.uid ?? '';
  const newNumericId = generateSecureBatchId();

  const mergedBatch: Batch = {
    id: newNumericId,
    comment: params.newComment ?? '',
    region_id: allSameRegion ? first.region_id : 0,
    district_id: allSameRegion && allSameDistrict ? first.district_id : 0,
    group_id: allSameGroup ? first.group_id : 0,
    unit_scope: allSameUnit && first.unit_scope ? first.unit_scope : 'mixed',
    recognition_type: allSameType ? first.recognition_type : (first.recognition_type ?? ''),
    recognition_duration: allSameDuration ? first.recognition_duration : '',
    created_at: computeLatestBatchTimestamp(existingBatches),
    ...(targetUserId ? { user_id: targetUserId } : {})
  };

  return { mergedBatch, targetUserId };
}

function resolveMergedMemberGroupId(member: ScoutMember, sourceBatch: Batch): number {
  if (member.group_id !== undefined && !Number.isNaN(member.group_id)) {
    return member.group_id;
  }
  if (sourceBatch.group_id !== undefined && !Number.isNaN(sourceBatch.group_id)) {
    return sourceBatch.group_id;
  }
  return 0;
}

export async function mergeBatches(params: MergeBatchesParams, userId?: string): Promise<Batch> {
  const { batchIds } = params;
  if (!batchIds || batchIds.length < 2) {
    throw new Error('Se requieren al menos 2 lotes para fusionar');
  }

  // Fetch all batches
  const fetchedBatches = await Promise.all(batchIds.map(id => getBatchById(id)));
  const existingBatches = fetchedBatches.filter((b): b is Batch => b !== null);

  if (existingBatches.length < 2) {
    throw new Error('No se encontraron suficientes lotes válidos para fusionar');
  }

  const { mergedBatch, targetUserId } = buildMergedBatchRecord(existingBatches, params, userId);
  const newNumericId = mergedBatch.id;

  const membersByBatch = await Promise.all(
    existingBatches.map(async b => {
      const members = await getMembersByBatchId(b.id);
      return { batch: b, members };
    })
  );

  const operations: ((batch: WriteBatch) => void)[] = [];

  // 1. Create the new merged batch
  const newBatchRef = doc(db, 'batches', String(newNumericId));
  operations.push((batchOp) => batchOp.set(newBatchRef, mergedBatch));

  // 2. Member reassignment
  const reassignedMembers: ScoutMember[] = [];
  for (const { batch: sourceBatch, members } of membersByBatch) {
    for (const member of members) {
      const memberGroupId = resolveMergedMemberGroupId(member, sourceBatch);

      const updatedMember: ScoutMember = {
        ...member,
        batch_id: newNumericId,
        group_id: memberGroupId,
        ...(targetUserId ? { user_id: targetUserId } : {})
      };
      reassignedMembers.push(updatedMember);
      const newDocId = getMemberDocId(updatedMember);
      const memberRef = doc(db, 'scout_members', newDocId);
      operations.push((batchOp) => batchOp.set(memberRef, updatedMember));

      const oldDocId = getMemberDocId({
        ...member,
        batch_id: member.batch_id ?? sourceBatch.id
      });
      if (oldDocId !== newDocId) {
        const oldMemberRef = doc(db, 'scout_members', oldDocId);
        operations.push((batchOp) => batchOp.delete(oldMemberRef));
      }
    }
  }

  // 3. Delete original batches
  for (const sourceBatch of existingBatches) {
    const oldBatchRef = doc(db, 'batches', String(sourceBatch.id));
    operations.push((batchOp) => batchOp.delete(oldBatchRef));
  }

  await commitChunkedBatches(operations);

  const sourceBatchIds = existingBatches.map((b) => b.id);
  removeBatchesFromCache(sourceBatchIds);
  for (const sourceId of sourceBatchIds) {
    removeMembersByBatchIdFromCache(sourceId);
  }
  upsertBatchInCache(mergedBatch, targetUserId);
  upsertMembersInCache(reassignedMembers, targetUserId);

  return mergedBatch;
}
