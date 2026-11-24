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
import {
  deletePersistentEntry,
  getPersistentEntry,
  setPersistentEntry
} from '../../../lib/persistentCache';
import { Batch, BatchCodeMode, BatchCreationParams, ScoutMember } from '../types';
import { inferBatchCodeMode } from '../utils/codeGenerator';
import { deduplicateMergedMembers } from '../utils/memberMerge';
import {
  getMembersByBatchId,
  getMemberDocId,
  sanitizeMemberForSave,
  upsertMembersInCache,
  removeMembersByBatchIdFromCache,
  seedBatchMembersCache,
  resolveCachedMembersForBatch,
  resolveActualFirestoreDocId
} from './membersCrud';

const batchesByUserCache = createKeyedSessionCache<string, Batch[]>();
const coldBatchesByIdCache = createKeyedSessionCache<number, Batch | null>();

interface PersistedColdBatchWrapper {
  batch: Batch | null;
}

function getBatchesPersistentKey(uid: string): string {
  return `batches:${uid}`;
}

function getColdBatchPersistentKey(uid: string, batchId: number): string {
  return `batch:${uid}:${batchId}`;
}

function sortBatchesDescending(batches: Batch[]): Batch[] {
  return [...batches].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function findCachedBatchById(id: number): Batch | null | undefined {
  for (const batches of batchesByUserCache.values()) {
    const found = batches.find((b) => b.id === id);
    if (found) {
      return found;
    }
  }
  if (coldBatchesByIdCache.has(id)) {
    return coldBatchesByIdCache.get(id) ?? null;
  }
  return undefined;
}

async function resolveCachedBatchById(id: number, userId?: string): Promise<Batch | null | undefined> {
  const ramHit = findCachedBatchById(id);
  if (ramHit !== undefined) {
    return ramHit;
  }

  const targetUid = auth.currentUser?.uid ?? userId ?? '';
  if (targetUid) {
    const inFlightBatches = batchesByUserCache.getInFlight(targetUid);
    if (inFlightBatches) {
      const list = await inFlightBatches;
      const found = list.find((b) => b.id === id);
      if (found) {
        return found;
      }
    }

    if (!batchesByUserCache.has(targetUid)) {
      const persisted = await getPersistentEntry<Batch[]>(getBatchesPersistentKey(targetUid));
      if (Array.isArray(persisted)) {
        const sorted = sortBatchesDescending(persisted);
        batchesByUserCache.set(targetUid, sorted);
        const found = sorted.find((b) => b.id === id);
        if (found) {
          return found;
        }
      }
    }
  }

  const inFlightCold = coldBatchesByIdCache.getInFlight(id);
  if (inFlightCold) {
    return await inFlightCold;
  }

  if (targetUid) {
    const persistedCold = await getPersistentEntry<PersistedColdBatchWrapper>(
      getColdBatchPersistentKey(targetUid, id)
    );
    if (persistedCold && 'batch' in persistedCold) {
      coldBatchesByIdCache.set(id, persistedCold.batch);
      return persistedCold.batch;
    }
  }

  return undefined;
}

async function upsertBatchInCache(batch: Batch, userId?: string): Promise<void> {
  coldBatchesByIdCache.set(batch.id, batch);

  const targetUserId = batch.user_id ?? userId ?? auth.currentUser?.uid ?? '';
  if (targetUserId && batchesByUserCache.has(targetUserId)) {
    const existing = batchesByUserCache.get(targetUserId) ?? [];
    const filtered = existing.filter((b) => b.id !== batch.id);
    const next = sortBatchesDescending([batch, ...filtered]);
    batchesByUserCache.set(targetUserId, next);
    await setPersistentEntry(getBatchesPersistentKey(targetUserId), targetUserId, next);
    await deletePersistentEntry(
      getColdBatchPersistentKey(targetUserId, batch.id),
      targetUserId,
      false
    );
    return;
  }

  const persistedUids: string[] = [];
  for (const [uid, list] of batchesByUserCache.entries()) {
    if (list.some((b) => b.id === batch.id)) {
      const updated = sortBatchesDescending(list.map((b) => (b.id === batch.id ? batch : b)));
      batchesByUserCache.set(uid, updated);
      persistedUids.push(uid);
    }
  }
  for (const uid of persistedUids) {
    const list = batchesByUserCache.get(uid);
    if (list) {
      await setPersistentEntry(getBatchesPersistentKey(uid), uid, list);
      await deletePersistentEntry(getColdBatchPersistentKey(uid, batch.id), uid, false);
    }
  }

  let updatedUserList = false;
  if (targetUserId && persistedUids.length === 0 && !batchesByUserCache.has(targetUserId)) {
    const persisted = await getPersistentEntry<Batch[]>(getBatchesPersistentKey(targetUserId));
    if (Array.isArray(persisted)) {
      const filtered = persisted.filter((b) => b.id !== batch.id);
      const next = sortBatchesDescending([batch, ...filtered]);
      await setPersistentEntry(getBatchesPersistentKey(targetUserId), targetUserId, next);
      await deletePersistentEntry(
        getColdBatchPersistentKey(targetUserId, batch.id),
        targetUserId,
        false
      );
      updatedUserList = true;
    }
  }

  if (targetUserId && !updatedUserList && persistedUids.length === 0) {
    await setPersistentEntry<PersistedColdBatchWrapper>(
      getColdBatchPersistentKey(targetUserId, batch.id),
      targetUserId,
      { batch },
      undefined,
      true
    );
  }
}

async function removeBatchesFromCache(batchIds: number[], userId?: string): Promise<void> {
  const idSet = new Set(batchIds);
  const targetUserId = auth.currentUser?.uid ?? userId ?? '';
  for (const id of batchIds) {
    coldBatchesByIdCache.delete(id);
    if (targetUserId) {
      await deletePersistentEntry(getColdBatchPersistentKey(targetUserId, id), targetUserId, false);
    }
  }

  const persistedUids = new Set<string>();
  for (const [uid, list] of batchesByUserCache.entries()) {
    const filtered = list.filter((b) => !idSet.has(b.id));
    if (filtered.length !== list.length) {
      batchesByUserCache.set(uid, filtered);
      persistedUids.add(uid);
    }
  }

  for (const uid of persistedUids) {
    const list = batchesByUserCache.get(uid);
    if (list) {
      await setPersistentEntry(getBatchesPersistentKey(uid), uid, list);
    }
  }

  if (targetUserId && !persistedUids.has(targetUserId) && !batchesByUserCache.has(targetUserId)) {
    const persisted = await getPersistentEntry<Batch[]>(getBatchesPersistentKey(targetUserId));
    if (Array.isArray(persisted)) {
      const filtered = persisted.filter((b) => !idSet.has(b.id));
      if (filtered.length !== persisted.length) {
        await setPersistentEntry(getBatchesPersistentKey(targetUserId), targetUserId, filtered);
      }
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
  return query(collection(db, 'batches'), where('user_id', '==', userId));
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
    ...(params.code_mode ? { code_mode: params.code_mode } : {}),
    created_at: new Date().toISOString(),
    ...(targetUserId ? { user_id: targetUserId } : {})
  };
}

export async function createBatch(params: BatchCreationParams, userId?: string): Promise<Batch> {
  const numericId = generateSecureBatchId();
  const newBatch = buildBatchRecord(numericId, params, userId);

  await setDoc(doc(db, 'batches', String(numericId)), newBatch);
  await upsertBatchInCache(newBatch, newBatch.user_id ?? userId);
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
  const batchDocRef = doc(db, 'batches', String(numericId));
  operations.push((batchOp) => batchOp.set(batchDocRef, newBatch));

  for (const sanitized of sanitizedMembers) {
    const memberRef = doc(db, 'scout_members', getMemberDocId(sanitized));
    operations.push((batchOp) => batchOp.set(memberRef, sanitized));
  }

  await commitChunkedBatches(operations, chunkSize);

  seedBatchMembersCache(numericId, sanitizedMembers);
  await upsertBatchInCache(newBatch, targetUserId);
  await upsertMembersInCache(sanitizedMembers, targetUserId);

  return { batch: newBatch, members: sanitizedMembers };
}

export async function updateBatch(id: number, params: BatchCreationParams, userId?: string): Promise<Batch> {
  const batchRef = doc(db, 'batches', String(id));
  const resolved = await resolveCachedBatchById(id, userId ?? params.user_id);
  let existingData = resolved === undefined ? null : resolved;
  if (resolved === undefined) {
    const docSnap = await getDoc(batchRef);
    existingData = docSnap.exists() ? (docSnap.data() as Batch) : null;
  }
  const targetUserId = params.user_id ?? userId ?? existingData?.user_id ?? auth.currentUser?.uid ?? '';
  const regionId = typeof params.region_id === 'number' && !Number.isNaN(params.region_id) ? params.region_id : (existingData?.region_id ?? 0);
  const districtId = typeof params.district_id === 'number' && !Number.isNaN(params.district_id) ? params.district_id : (existingData?.district_id ?? 0);
  const groupId = typeof params.group_id === 'number' && !Number.isNaN(params.group_id) ? params.group_id : (existingData?.group_id ?? 0);
  const resolvedCodeMode = params.code_mode ?? existingData?.code_mode;

  const updatedBatch: Batch = {
    id,
    comment: params.comment ?? existingData?.comment ?? '',
    region_id: regionId,
    district_id: districtId,
    group_id: groupId,
    unit_scope: params.unit_scope ?? existingData?.unit_scope ?? 'mixed',
    recognition_type: params.recognition_type ?? existingData?.recognition_type,
    recognition_duration: params.recognition_duration ?? existingData?.recognition_duration ?? '',
    ...(resolvedCodeMode ? { code_mode: resolvedCodeMode } : {}),
    created_at: existingData ? existingData.created_at : new Date().toISOString(),
    ...(targetUserId ? { user_id: targetUserId } : {})
  };

  await setDoc(batchRef, updatedBatch);
  await upsertBatchInCache(updatedBatch, targetUserId);
  return updatedBatch;
}

export async function deleteBatch(batchId: number, userId?: string): Promise<void> {
  const operations: ((batch: WriteBatch) => void)[] = [];
  const cachedMembers = await resolveCachedMembersForBatch(batchId, userId);

  if (cachedMembers !== null) {
    const seenDocIds = new Set<string>();
    for (const member of cachedMembers) {
      const actualDocId = resolveActualFirestoreDocId(member);
      if (!seenDocIds.has(actualDocId)) {
        seenDocIds.add(actualDocId);
        const memberRef = doc(db, 'scout_members', actualDocId);
        operations.push((batchOp) => batchOp.delete(memberRef));
      }
    }
  } else {
    const membersQuery = query(collection(db, 'scout_members'), where('batch_id', '==', batchId));
    const membersSnapshot = await getDocs(membersQuery);

    if (Array.isArray(membersSnapshot?.docs)) {
      membersSnapshot.docs.forEach((docSnapshot) => {
        operations.push((batchOp) => batchOp.delete(docSnapshot.ref));
      });
    } else if (typeof membersSnapshot?.forEach === 'function') {
      membersSnapshot.forEach((docSnapshot) => {
        operations.push((batchOp) => batchOp.delete(docSnapshot.ref));
      });
    }
  }

  const batchDocRef = doc(db, 'batches', String(batchId));
  operations.push((batchOp) => batchOp.delete(batchDocRef));

  await commitChunkedBatches(operations);
  await removeBatchesFromCache([batchId], userId);
  await removeMembersByBatchIdFromCache(batchId, userId);
}

export async function getAllBatches(userId?: string): Promise<Batch[]> {
  const targetUserId = userId ?? auth.currentUser?.uid ?? '';
  if (!targetUserId) {
    return [];
  }

  return batchesByUserCache.getOrLoad(targetUserId, async () => {
    const persisted = await getPersistentEntry<Batch[]>(getBatchesPersistentKey(targetUserId));
    if (Array.isArray(persisted)) {
      return sortBatchesDescending(persisted);
    }

    const q = buildBatchQueryForUser(targetUserId);
    const querySnapshot = await getDocs(q);
    const batches: Batch[] = [];
    querySnapshot.forEach((docSnapshot) => {
      batches.push(docSnapshot.data() as Batch);
    });
    const sorted = sortBatchesDescending(batches);
    await setPersistentEntry(getBatchesPersistentKey(targetUserId), targetUserId, sorted, undefined, false);
    return sorted;
  });
}

export async function getBatchById(id: number): Promise<Batch | null> {
  const resolved = await resolveCachedBatchById(id);
  if (resolved !== undefined) {
    return resolved;
  }

  return coldBatchesByIdCache.getOrLoad(id, async () => {
    const docRef = doc(db, 'batches', String(id));
    const docSnap = await getDoc(docRef);
    const result = docSnap.exists() ? (docSnap.data() as Batch) : null;
    const readerUid = auth.currentUser?.uid ?? result?.user_id ?? '';
    if (readerUid) {
      await setPersistentEntry<PersistedColdBatchWrapper>(
        getColdBatchPersistentKey(readerUid, id),
        readerUid,
        { batch: result },
        undefined,
        false
      );
    }
    return result;
  });
}

export interface MergeBatchesParams {
  batchIds: number[];
  newComment?: string;
  user_id?: string;
}

function computeLatestBatchTimestamp(existingBatches: Batch[]): string {
  const timestamps = existingBatches.map((b) => new Date(b.created_at).getTime());
  const validTimestamps = timestamps.filter((t) => !Number.isNaN(t));
  if (validTimestamps.length === 0) {
    return new Date().toISOString();
  }
  return new Date(Math.max(...validTimestamps)).toISOString();
}

function buildMergedBatchRecord(
  existingBatches: Batch[],
  params: MergeBatchesParams,
  mergedCodeMode: BatchCodeMode,
  userId?: string
): { mergedBatch: Batch; targetUserId: string } {
  const first = existingBatches[0];
  const allSameRegion = existingBatches.every((b) => b.region_id === first.region_id);
  const allSameDistrict = existingBatches.every((b) => b.district_id === first.district_id);
  const allSameGroup = existingBatches.every((b) => b.group_id === first.group_id);
  const allSameType = existingBatches.every((b) => b.recognition_type === first.recognition_type);
  const allSameUnit = existingBatches.every((b) => b.unit_scope === first.unit_scope);
  const allSameDuration = existingBatches.every(
    (b) => b.recognition_duration === first.recognition_duration
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
    code_mode: mergedCodeMode,
    created_at: computeLatestBatchTimestamp(existingBatches),
    ...(targetUserId ? { user_id: targetUserId } : {})
  };

  return { mergedBatch, targetUserId };
}

export async function mergeBatches(params: MergeBatchesParams, userId?: string): Promise<Batch> {
  const uniqueBatchIds = Array.from(new Set(params.batchIds ?? []));
  if (uniqueBatchIds.length < 2) {
    throw new Error('Se requieren al menos 2 lotes para fusionar');
  }

  // Fetch all source batches
  const fetchedBatches = await Promise.all(uniqueBatchIds.map((id) => getBatchById(id)));
  const existingBatches = fetchedBatches.filter((b): b is Batch => b !== null);

  if (existingBatches.length < 2) {
    throw new Error('No se encontraron suficientes lotes válidos para fusionar');
  }

  // Fetch members for all source batches first so merged code_mode can be resolved accurately
  const membersByBatch = await Promise.all(
    existingBatches.map(async (b) => {
      const members = await getMembersByBatchId(b.id);
      return { batch: b, members };
    })
  );

  const sourceModes = membersByBatch.map(({ batch, members }) =>
    inferBatchCodeMode(members, batch)
  );
  const mergedCodeMode: BatchCodeMode = sourceModes.every((m) => m === sourceModes[0])
    ? sourceModes[0]
    : 'manual';

  const { mergedBatch, targetUserId } = buildMergedBatchRecord(
    existingBatches,
    params,
    mergedCodeMode,
    userId
  );
  const newNumericId = mergedBatch.id;

  const resolution = deduplicateMergedMembers(membersByBatch, {
    targetBatchId: newNumericId,
    targetUserId
  });

  const sanitizedEntries = resolution.survivingEntries.map(({ member, docId }) => ({
    docId,
    member: sanitizeMemberForSave(member, targetUserId)
  }));
  const survivingDocIds = new Set(sanitizedEntries.map((entry) => entry.docId));

  const createOps: ((batch: WriteBatch) => void)[] = [];
  const newBatchRef = doc(db, 'batches', String(newNumericId));
  createOps.push((batchOp) => batchOp.set(newBatchRef, mergedBatch));

  for (const { docId, member } of sanitizedEntries) {
    const memberRef = doc(db, 'scout_members', docId);
    createOps.push((batchOp) => batchOp.set(memberRef, member));
  }

  const deleteOps: ((batch: WriteBatch) => void)[] = [];
  for (const oldDocId of resolution.allSourceDocIds) {
    if (!survivingDocIds.has(oldDocId)) {
      const oldMemberRef = doc(db, 'scout_members', oldDocId);
      deleteOps.push((batchOp) => batchOp.delete(oldMemberRef));
    }
  }
  for (const sourceBatch of existingBatches) {
    const oldBatchRef = doc(db, 'batches', String(sourceBatch.id));
    deleteOps.push((batchOp) => batchOp.delete(oldBatchRef));
  }

  // Single atomic WriteBatch fast path when <= 450 ops; create-before-delete chunk barrier otherwise
  if (createOps.length + deleteOps.length <= 450) {
    await commitChunkedBatches([...createOps, ...deleteOps]);
  } else {
    await commitChunkedBatches(createOps);
    await commitChunkedBatches(deleteOps);
  }

  const sourceBatchIds = existingBatches.map((b) => b.id);
  const survivingMembers = sanitizedEntries.map((entry) => entry.member);
  seedBatchMembersCache(mergedBatch.id, survivingMembers);
  await removeBatchesFromCache(sourceBatchIds, targetUserId);
  for (const sourceId of sourceBatchIds) {
    await removeMembersByBatchIdFromCache(sourceId, targetUserId);
  }
  await upsertBatchInCache(mergedBatch, targetUserId);
  await upsertMembersInCache(survivingMembers, targetUserId);

  return mergedBatch;
}
