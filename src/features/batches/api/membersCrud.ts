import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  deleteDoc,
  DocumentReference,
  DocumentData,
  WriteBatch
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { createKeyedSessionCache } from '../../../lib/sessionCache';
import {
  deletePersistentEntry,
  getPersistentEntry,
  setPersistentEntry
} from '../../../lib/persistentCache';
import { ScoutMember } from '../types';
import {
  isGenericIdentity,
  getMemberDocId,
  normalizeCedula
} from '../utils/memberIdentity';
import { commitChunkedBatches } from './batchesCrud';

export { isGenericIdentity, getMemberDocId };

const membersByUserCache = createKeyedSessionCache<string, ScoutMember[]>();
const coldMembersByBatchCache = createKeyedSessionCache<number, ScoutMember[]>();
const legacyDocIdByCanonicalKey = createKeyedSessionCache<string, string>();

interface PersistedMembersSnapshot {
  members: ScoutMember[];
  legacyDocIds: Record<string, string>;
}

function getMembersPersistentKey(uid: string): string {
  return `members:${uid}`;
}

function getBatchMembersPersistentKey(uid: string, batchId: number): string {
  return `batch_members:${uid}:${batchId}`;
}

function serializeLegacyDocIdsForMembers(members: ScoutMember[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const member of members) {
    const canonical = getMemberDocId(member);
    const legacy = legacyDocIdByCanonicalKey.get(canonical);
    if (legacy && legacy !== canonical) {
      result[canonical] = legacy;
    }
  }
  return result;
}

function restoreLegacyDocIds(legacyDocIds?: Record<string, string>): void {
  if (!legacyDocIds) return;
  for (const [canonical, actual] of Object.entries(legacyDocIds)) {
    if (canonical && actual && actual !== canonical) {
      legacyDocIdByCanonicalKey.set(canonical, actual);
    }
  }
}

async function persistMembersSnapshot(
  uid: string,
  members: ScoutMember[],
  notifyTabs = true
): Promise<void> {
  if (!uid) return;
  await setPersistentEntry<PersistedMembersSnapshot>(
    getMembersPersistentKey(uid),
    uid,
    {
      members,
      legacyDocIds: serializeLegacyDocIdsForMembers(members)
    },
    undefined,
    notifyTabs
  );
}

async function persistColdBatchMembersSnapshot(
  batchId: number,
  uid: string,
  members: ScoutMember[],
  notifyTabs = false
): Promise<void> {
  if (Number.isNaN(batchId) || !uid) return;
  await setPersistentEntry<PersistedMembersSnapshot>(
    getBatchMembersPersistentKey(uid, batchId),
    uid,
    {
      members,
      legacyDocIds: serializeLegacyDocIdsForMembers(members)
    },
    undefined,
    notifyTabs
  );
}

interface FirestoreDocLike {
  id?: string;
  ref?: DocumentReference<DocumentData>;
  data?: () => unknown;
}

export interface MemberUpdateEntry {
  previous?: ScoutMember;
  next: ScoutMember;
}

export function buildMembersQueryForBatch(batchId: number) {
  return query(collection(db, 'scout_members'), where('batch_id', '==', batchId));
}

export function buildMembersQueryForBatchChunk(batchIds: number[]) {
  return query(collection(db, 'scout_members'), where('batch_id', 'in', batchIds));
}

export function buildMembersQueryForUser(userId: string) {
  return query(collection(db, 'scout_members'), where('user_id', '==', userId));
}

const OPTIONAL_MEMBER_STRING_FIELDS = [
  'unit',
  'region_name',
  'district_name',
  'group_name',
  'position_in_group',
  'institutional_position',
  'member_category',
  'scout_progression',
  'solvent_until',
  'avatar_url',
  'impeesa_uuid',
  'admission_date',
  'entry_date',
  'promise_date',
  'email',
  'phone',
  'recognition_code',
  'exceptional_reason'
] as const;

const OPTIONAL_MEMBER_NUMBER_FIELDS = [
  'region_id',
  'district_id',
  'group_id',
  'unit_id',
  'batch_id'
] as const;

export function sanitizeMemberForSave(member: ScoutMember, userId?: string): ScoutMember {
  const targetUserId = member.user_id ?? userId ?? auth.currentUser?.uid ?? '';
  const sanitized: ScoutMember = {
    identity: member.identity,
    first_names: member.first_names,
    last_names: member.last_names,
    birth_date: member.birth_date,
    member_type: member.member_type,
    status: member.status,
    verified_in_registry: Boolean(member.verified_in_registry)
  };

  const targetRecord = sanitized as unknown as Record<string, unknown>;
  const sourceRecord = member as unknown as Record<string, unknown>;

  for (const key of OPTIONAL_MEMBER_STRING_FIELDS) {
    const val = sourceRecord[key];
    if (val) {
      targetRecord[key] = val;
    }
  }

  for (const key of OPTIONAL_MEMBER_NUMBER_FIELDS) {
    const val = sourceRecord[key];
    if (typeof val === 'number' && !Number.isNaN(val)) {
      targetRecord[key] = val;
    }
  }

  if (member.is_solvent !== undefined) {
    sanitized.is_solvent = member.is_solvent;
  }

  if (targetUserId) {
    sanitized.user_id = targetUserId;
  }

  return sanitized;
}

function recordLegacyDocIdIfNeeded(docSnapshot: FirestoreDocLike, member: ScoutMember): void {
  if (!docSnapshot.id) return;
  const canonical = getMemberDocId(member);
  if (docSnapshot.id !== canonical) {
    legacyDocIdByCanonicalKey.set(canonical, docSnapshot.id);
  }
}

export function resolveActualFirestoreDocId(member: ScoutMember): string {
  const canonical = getMemberDocId(member);
  return legacyDocIdByCanonicalKey.get(canonical) ?? canonical;
}

function deduplicateMembersByBatch(allRaw: ScoutMember[]): ScoutMember[] {
  const byBatch = new Map<number, ScoutMember[]>();
  for (const m of allRaw) {
    const bId = m.batch_id ?? 0;
    const batchGroup = byBatch.get(bId);
    if (batchGroup) {
      batchGroup.push(m);
    } else {
      byBatch.set(bId, [m]);
    }
  }

  const result: ScoutMember[] = [];
  for (const [, batchMembers] of byBatch.entries()) {
    result.push(...deduplicateBatchMembers(batchMembers));
  }
  return result;
}

function mergeMembersIntoList(existing: ScoutMember[], incoming: ScoutMember[]): ScoutMember[] {
  const incomingByDocId = new Map<string, ScoutMember>();
  for (const member of incoming) {
    incomingByDocId.set(getMemberDocId(member), member);
  }

  const merged: ScoutMember[] = [];
  for (const member of existing) {
    const docId = getMemberDocId(member);
    if (!incomingByDocId.has(docId)) {
      merged.push(member);
    }
  }
  merged.push(...incoming);
  return deduplicateMembersByBatch(merged);
}

async function removeDocIdsFromCache(docIds: Set<string>, userId?: string): Promise<void> {
  if (docIds.size === 0) {
    return;
  }

  const targetUserId = auth.currentUser?.uid ?? userId ?? '';
  const persistedUids = new Set<string>();
  const affectedBatchIds = new Set<number>();
  for (const [uid, list] of membersByUserCache.entries()) {
    const filtered = list.filter((m) => {
      const keep = !docIds.has(getMemberDocId(m));
      if (!keep && m.batch_id !== undefined && !Number.isNaN(m.batch_id)) {
        affectedBatchIds.add(m.batch_id);
      }
      return keep;
    });
    if (filtered.length !== list.length) {
      membersByUserCache.set(uid, filtered);
      persistedUids.add(uid);
    }
  }

  for (const [cachedBatchId, list] of coldMembersByBatchCache.entries()) {
    const filtered = list.filter((m) => !docIds.has(getMemberDocId(m)));
    if (filtered.length !== list.length) {
      coldMembersByBatchCache.set(cachedBatchId, filtered);
      affectedBatchIds.delete(cachedBatchId);
      if (targetUserId && !membersByUserCache.has(targetUserId)) {
        await persistColdBatchMembersSnapshot(cachedBatchId, targetUserId, filtered, true);
      } else if (targetUserId) {
        await deletePersistentEntry(
          getBatchMembersPersistentKey(targetUserId, cachedBatchId),
          targetUserId,
          false
        );
      }
    }
  }

  for (const batchId of affectedBatchIds) {
    if (targetUserId) {
      await deletePersistentEntry(
        getBatchMembersPersistentKey(targetUserId, batchId),
        targetUserId,
        false
      );
    }
  }

  for (const uid of persistedUids) {
    const updated = membersByUserCache.get(uid);
    if (updated) {
      await persistMembersSnapshot(uid, updated);
    }
  }

  if (targetUserId && !persistedUids.has(targetUserId) && !membersByUserCache.has(targetUserId)) {
    const persisted = await getPersistentEntry<PersistedMembersSnapshot>(
      getMembersPersistentKey(targetUserId)
    );
    if (persisted && Array.isArray(persisted.members)) {
      restoreLegacyDocIds(persisted.legacyDocIds);
      const filtered = persisted.members.filter((m) => {
        const keep = !docIds.has(getMemberDocId(m));
        if (!keep && m.batch_id !== undefined && !Number.isNaN(m.batch_id)) {
          affectedBatchIds.add(m.batch_id);
        }
        return keep;
      });
      if (filtered.length !== persisted.members.length) {
        await persistMembersSnapshot(targetUserId, filtered);
        for (const batchId of affectedBatchIds) {
          await deletePersistentEntry(
            getBatchMembersPersistentKey(targetUserId, batchId),
            targetUserId,
            false
          );
        }
      }
    }
  }
}

export function seedBatchMembersCache(batchId: number, members: ScoutMember[]): void {
  const numericBatchId = Number(batchId);
  if (Number.isNaN(numericBatchId)) return;
  coldMembersByBatchCache.set(numericBatchId, deduplicateBatchMembers(members));
}

export function getCachedMembersForBatch(batchId: number): ScoutMember[] | null {
  const numericBatchId = Number(batchId);
  const currentUid = auth.currentUser?.uid;
  if (currentUid && membersByUserCache.has(currentUid)) {
    const userMembers = membersByUserCache.get(currentUid) ?? [];
    return deduplicateBatchMembers(userMembers.filter((m) => m.batch_id === numericBatchId));
  }
  if (coldMembersByBatchCache.has(numericBatchId)) {
    return coldMembersByBatchCache.get(numericBatchId) ?? [];
  }
  return null;
}

export async function resolveCachedMembersForBatch(
  batchId: number,
  userId?: string
): Promise<ScoutMember[] | null> {
  const numericBatchId = Number(batchId);
  if (Number.isNaN(numericBatchId)) return null;

  const targetUid = auth.currentUser?.uid ?? userId ?? '';
  if (targetUid) {
    if (membersByUserCache.has(targetUid)) {
      const userMembers = membersByUserCache.get(targetUid) ?? [];
      return deduplicateBatchMembers(userMembers.filter((m) => m.batch_id === numericBatchId));
    }

    const inFlightUser = membersByUserCache.getInFlight(targetUid);
    if (inFlightUser) {
      const userMembers = await inFlightUser;
      return deduplicateBatchMembers(userMembers.filter((m) => m.batch_id === numericBatchId));
    }

    const persistedUser = await getPersistentEntry<PersistedMembersSnapshot>(
      getMembersPersistentKey(targetUid)
    );
    if (persistedUser && Array.isArray(persistedUser.members)) {
      restoreLegacyDocIds(persistedUser.legacyDocIds);
      membersByUserCache.set(targetUid, persistedUser.members);
      return deduplicateBatchMembers(
        persistedUser.members.filter((m) => m.batch_id === numericBatchId)
      );
    }
  }

  if (coldMembersByBatchCache.has(numericBatchId)) {
    return coldMembersByBatchCache.get(numericBatchId) ?? [];
  }

  const inFlightCold = coldMembersByBatchCache.getInFlight(numericBatchId);
  if (inFlightCold) {
    return await inFlightCold;
  }

  if (targetUid) {
    const persistedCold = await getPersistentEntry<PersistedMembersSnapshot>(
      getBatchMembersPersistentKey(targetUid, numericBatchId)
    );
    if (persistedCold && Array.isArray(persistedCold.members)) {
      restoreLegacyDocIds(persistedCold.legacyDocIds);
      coldMembersByBatchCache.set(numericBatchId, persistedCold.members);
      return persistedCold.members;
    }
  }

  return null;
}

export async function upsertMembersInCache(members: ScoutMember[], userId?: string): Promise<void> {
  if (!members || members.length === 0) {
    return;
  }

  const targetUserId = userId ?? members[0]?.user_id ?? auth.currentUser?.uid ?? '';
  const persistentScopeUid = auth.currentUser?.uid ?? targetUserId;
  let updatedUserMembers: ScoutMember[] | null = null;
  if (targetUserId && membersByUserCache.has(targetUserId)) {
    const existing = membersByUserCache.get(targetUserId) ?? [];
    updatedUserMembers = mergeMembersIntoList(existing, members);
    membersByUserCache.set(targetUserId, updatedUserMembers);
  }

  const byBatch = new Map<number, ScoutMember[]>();
  for (const member of members) {
    if (member.batch_id !== undefined && !Number.isNaN(member.batch_id)) {
      const list = byBatch.get(member.batch_id);
      if (list) {
        list.push(member);
      } else {
        byBatch.set(member.batch_id, [member]);
      }
    }
  }

  let persistedCold = false;
  if (targetUserId && updatedUserMembers) {
    await persistMembersSnapshot(targetUserId, updatedUserMembers);
  } else if (targetUserId && !membersByUserCache.has(targetUserId)) {
    const persisted = await getPersistentEntry<PersistedMembersSnapshot>(
      getMembersPersistentKey(targetUserId)
    );
    if (persisted && Array.isArray(persisted.members)) {
      restoreLegacyDocIds(persisted.legacyDocIds);
      const merged = mergeMembersIntoList(persisted.members, members);
      await persistMembersSnapshot(targetUserId, merged);
      updatedUserMembers = merged;
    }
  }

  for (const [batchId, batchIncoming] of byBatch.entries()) {
    if (coldMembersByBatchCache.has(batchId)) {
      const existing = coldMembersByBatchCache.get(batchId) ?? [];
      const mergedCold = mergeMembersIntoList(existing, batchIncoming);
      coldMembersByBatchCache.set(batchId, mergedCold);
      if (updatedUserMembers && persistentScopeUid) {
        await deletePersistentEntry(
          getBatchMembersPersistentKey(persistentScopeUid, batchId),
          persistentScopeUid,
          false
        );
      } else if (persistentScopeUid) {
        await persistColdBatchMembersSnapshot(batchId, persistentScopeUid, mergedCold, true);
        persistedCold = true;
      }
    } else if (updatedUserMembers && persistentScopeUid) {
      await deletePersistentEntry(
        getBatchMembersPersistentKey(persistentScopeUid, batchId),
        persistentScopeUid,
        false
      );
    } else if (persistentScopeUid) {
      const existingCold = await getPersistentEntry<PersistedMembersSnapshot>(
        getBatchMembersPersistentKey(persistentScopeUid, batchId)
      );
      if (existingCold && Array.isArray(existingCold.members)) {
        restoreLegacyDocIds(existingCold.legacyDocIds);
        const mergedCold = mergeMembersIntoList(existingCold.members, batchIncoming);
        coldMembersByBatchCache.set(batchId, mergedCold);
        await persistColdBatchMembersSnapshot(
          batchId,
          persistentScopeUid,
          mergedCold,
          !persistedCold
        );
        persistedCold = true;
      }
    }
  }
}

export async function removeMembersByBatchIdFromCache(
  batchId: number,
  userId?: string
): Promise<void> {
  coldMembersByBatchCache.delete(batchId);
  const targetUserId = auth.currentUser?.uid ?? userId ?? '';
  if (targetUserId) {
    await deletePersistentEntry(getBatchMembersPersistentKey(targetUserId, batchId), targetUserId, false);
  }

  const persistedUids = new Set<string>();
  for (const [uid, list] of membersByUserCache.entries()) {
    const filtered = list.filter((m) => m.batch_id !== batchId);
    if (filtered.length !== list.length) {
      membersByUserCache.set(uid, filtered);
      persistedUids.add(uid);
    }
  }

  for (const uid of persistedUids) {
    const updated = membersByUserCache.get(uid);
    if (updated) {
      await persistMembersSnapshot(uid, updated);
    }
  }

  const listUid = userId ?? targetUserId;
  if (listUid && !persistedUids.has(listUid) && !membersByUserCache.has(listUid)) {
    const persisted = await getPersistentEntry<PersistedMembersSnapshot>(
      getMembersPersistentKey(listUid)
    );
    if (persisted && Array.isArray(persisted.members)) {
      restoreLegacyDocIds(persisted.legacyDocIds);
      const filtered = persisted.members.filter((m) => m.batch_id !== batchId);
      if (filtered.length !== persisted.members.length) {
        await persistMembersSnapshot(listUid, filtered);
      }
    }
  }
}

export async function createMember(member: ScoutMember, userId?: string): Promise<ScoutMember> {
  const newMember = sanitizeMemberForSave(member, userId);
  const docId = getMemberDocId(newMember);
  await setDoc(doc(db, 'scout_members', docId), newMember);
  await upsertMembersInCache([newMember], newMember.user_id ?? userId);
  return newMember;
}

export async function updateMember(member: ScoutMember, userId?: string): Promise<ScoutMember> {
  const updatedMember = sanitizeMemberForSave(member, userId);
  const targetDocId = getMemberDocId(updatedMember);
  await setDoc(doc(db, 'scout_members', targetDocId), updatedMember);
  await upsertMembersInCache([updatedMember], updatedMember.user_id ?? userId);
  return updatedMember;
}

export async function saveBatchMemberUpdates(
  updates: MemberUpdateEntry[],
  userId?: string,
  chunkSize = 450
): Promise<ScoutMember[]> {
  if (!updates || updates.length === 0) {
    return [];
  }

  const sanitizedMembers: ScoutMember[] = [];
  const operations: ((batch: WriteBatch) => void)[] = [];
  const removedCanonicalDocIds = new Set<string>();
  const targetDocIds = new Set<string>();

  for (const entry of updates) {
    const sanitized = sanitizeMemberForSave(entry.next, userId);
    const newDocId = getMemberDocId(sanitized);
    sanitizedMembers.push(sanitized);
    targetDocIds.add(newDocId);

    const newDocRef = doc(db, 'scout_members', newDocId);
    operations.push((batch) => batch.set(newDocRef, sanitized));

    if (entry.previous) {
      const prevCanonical = getMemberDocId(entry.previous);
      const oldActualDocId = resolveActualFirestoreDocId(entry.previous);
      if (oldActualDocId !== newDocId) {
        const oldDocRef = doc(db, 'scout_members', oldActualDocId);
        operations.push((batch) => batch.delete(oldDocRef));
        legacyDocIdByCanonicalKey.delete(prevCanonical);
      }
      if (prevCanonical !== newDocId) {
        removedCanonicalDocIds.add(prevCanonical);
      }
    }
  }

  // Never evict a doc ID that is also being written in the same update set
  for (const kept of targetDocIds) {
    removedCanonicalDocIds.delete(kept);
  }

  await commitChunkedBatches(operations, chunkSize);

  const resolvedUserId = userId ?? sanitizedMembers[0]?.user_id;
  await removeDocIdsFromCache(removedCanonicalDocIds, resolvedUserId);
  await upsertMembersInCache(sanitizedMembers, resolvedUserId);
  return sanitizedMembers;
}

export async function batchUpdateMembers(
  members: ScoutMember[],
  userId?: string,
  chunkSize = 450
): Promise<ScoutMember[]> {
  if (!members || members.length === 0) {
    return [];
  }
  return saveBatchMemberUpdates(
    members.map((next) => ({ next })),
    userId,
    chunkSize
  );
}

export const batchSaveMembers = batchUpdateMembers;

export async function deleteBatchMember(member: ScoutMember): Promise<void> {
  const canonicalDocId = getMemberDocId(member);
  const actualDocId = resolveActualFirestoreDocId(member);
  await deleteDoc(doc(db, 'scout_members', actualDocId));
  legacyDocIdByCanonicalKey.delete(canonicalDocId);
  await removeDocIdsFromCache(new Set([canonicalDocId]), member.user_id);
}

function filterUniqueDraftMembers(
  withoutCode: ScoutMember[],
  excludedIdentities: Set<string>
): ScoutMember[] {
  const seenDraftIdentities = new Set<string>();
  const drafts: ScoutMember[] = [];

  for (const m of withoutCode) {
    if (isGenericIdentity(m.identity)) {
      drafts.push(m);
      continue;
    }
    const normalizedId = normalizeCedula(m.identity);
    if (!excludedIdentities.has(normalizedId) && !seenDraftIdentities.has(normalizedId)) {
      seenDraftIdentities.add(normalizedId);
      drafts.push(m);
    }
  }

  return drafts;
}

function deduplicateBatchMembers(batchMembers: ScoutMember[]): ScoutMember[] {
  const withCode = batchMembers.filter((m) => Boolean(m.recognition_code?.trim()));
  const withoutCode = batchMembers.filter((m) => !m.recognition_code?.trim());

  if (withCode.length === 0) {
    return filterUniqueDraftMembers(withoutCode, new Set<string>());
  }

  const seenCodedIdentities = new Set<string>();
  const finalized: ScoutMember[] = [];
  const finalizedIdentities = new Set<string>();

  for (const m of withCode) {
    if (isGenericIdentity(m.identity)) {
      // Preserve all generic-identity coded members without collapsing them
      finalized.push(m);
      continue;
    }
    const normalizedId = normalizeCedula(m.identity);
    if (!seenCodedIdentities.has(normalizedId)) {
      seenCodedIdentities.add(normalizedId);
      finalized.push(m);
    }
    finalizedIdentities.add(normalizedId);
  }

  const remainingDrafts = filterUniqueDraftMembers(withoutCode, finalizedIdentities);
  return [...finalized, ...remainingDrafts];
}

export async function getMembersByBatchId(batchId: number): Promise<ScoutMember[]> {
  const numericBatchId = Number(batchId);
  const currentUid = auth.currentUser?.uid;
  if (currentUid) {
    if (membersByUserCache.has(currentUid)) {
      const userMembers = membersByUserCache.get(currentUid) ?? [];
      return deduplicateBatchMembers(userMembers.filter((m) => m.batch_id === numericBatchId));
    }

    const inFlightUserMembers = membersByUserCache.getInFlight(currentUid);
    if (inFlightUserMembers) {
      const userMembers = await inFlightUserMembers;
      return deduplicateBatchMembers(userMembers.filter((m) => m.batch_id === numericBatchId));
    }

    const persisted = await getPersistentEntry<PersistedMembersSnapshot>(
      getMembersPersistentKey(currentUid)
    );
    if (persisted && Array.isArray(persisted.members)) {
      restoreLegacyDocIds(persisted.legacyDocIds);
      membersByUserCache.set(currentUid, persisted.members);
      return deduplicateBatchMembers(
        persisted.members.filter((m) => m.batch_id === numericBatchId)
      );
    }
  }

  return coldMembersByBatchCache.getOrLoad(numericBatchId, async () => {
    if (currentUid) {
      const persistedCold = await getPersistentEntry<PersistedMembersSnapshot>(
        getBatchMembersPersistentKey(currentUid, numericBatchId)
      );
      if (persistedCold && Array.isArray(persistedCold.members)) {
        restoreLegacyDocIds(persistedCold.legacyDocIds);
        return persistedCold.members;
      }
    }

    const q = buildMembersQueryForBatch(numericBatchId);
    const querySnapshot = await getDocs(q);

    const rawDocs: FirestoreDocLike[] = [];
    if (Array.isArray(querySnapshot?.docs)) {
      rawDocs.push(...querySnapshot.docs);
    } else if (typeof querySnapshot?.forEach === 'function') {
      querySnapshot.forEach((docSnap) => rawDocs.push(docSnap));
    }

    const members = rawDocs.map((docSnapshot) => {
      const rawData =
        typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
      const member = rawData as ScoutMember;
      recordLegacyDocIdIfNeeded(docSnapshot, member);
      return member;
    });

    const deduped = deduplicateBatchMembers(members);
    const readerUid = currentUid ?? deduped[0]?.user_id ?? '';
    await persistColdBatchMembersSnapshot(numericBatchId, readerUid, deduped, false);
    return deduped;
  });
}

export async function getAllMembers(userId?: string): Promise<ScoutMember[]> {
  const targetUserId = userId ?? auth.currentUser?.uid ?? '';
  if (!targetUserId) {
    return [];
  }

  return membersByUserCache.getOrLoad(targetUserId, async () => {
    const persisted = await getPersistentEntry<PersistedMembersSnapshot>(
      getMembersPersistentKey(targetUserId)
    );
    if (persisted && Array.isArray(persisted.members)) {
      restoreLegacyDocIds(persisted.legacyDocIds);
      return persisted.members;
    }

    const q = buildMembersQueryForUser(targetUserId);
    const snap = await getDocs(q);
    const snapDocs: FirestoreDocLike[] = [];
    if (Array.isArray(snap?.docs)) {
      snapDocs.push(...snap.docs);
    } else if (typeof snap?.forEach === 'function') {
      snap.forEach((docSnap) => snapDocs.push(docSnap));
    }

    const allRaw = snapDocs.map((docSnapshot) => {
      const member = (
        typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot
      ) as ScoutMember;
      recordLegacyDocIdIfNeeded(docSnapshot, member);
      return member;
    });

    const deduped = deduplicateMembersByBatch(allRaw);
    await persistMembersSnapshot(targetUserId, deduped, false);
    return deduped;
  });
}
