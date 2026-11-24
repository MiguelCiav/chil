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

function resolveActualFirestoreDocId(member: ScoutMember): string {
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

function removeDocIdsFromCache(docIds: Set<string>): void {
  if (docIds.size === 0) {
    return;
  }

  for (const [uid, list] of membersByUserCache.entries()) {
    const filtered = list.filter((m) => !docIds.has(getMemberDocId(m)));
    if (filtered.length !== list.length) {
      membersByUserCache.set(uid, filtered);
    }
  }

  for (const [cachedBatchId, list] of coldMembersByBatchCache.entries()) {
    const filtered = list.filter((m) => !docIds.has(getMemberDocId(m)));
    if (filtered.length !== list.length) {
      coldMembersByBatchCache.set(cachedBatchId, filtered);
    }
  }
}

export function upsertMembersInCache(members: ScoutMember[], userId?: string): void {
  if (!members || members.length === 0) {
    return;
  }

  const targetUserId = userId ?? members[0]?.user_id ?? auth.currentUser?.uid ?? '';
  if (targetUserId && membersByUserCache.has(targetUserId)) {
    const existing = membersByUserCache.get(targetUserId) ?? [];
    membersByUserCache.set(targetUserId, mergeMembersIntoList(existing, members));
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

  for (const [batchId, batchIncoming] of byBatch.entries()) {
    if (coldMembersByBatchCache.has(batchId)) {
      const existing = coldMembersByBatchCache.get(batchId) ?? [];
      coldMembersByBatchCache.set(batchId, mergeMembersIntoList(existing, batchIncoming));
    }
  }
}

export function removeMembersByBatchIdFromCache(batchId: number): void {
  coldMembersByBatchCache.delete(batchId);
  for (const [uid, list] of membersByUserCache.entries()) {
    const filtered = list.filter((m) => m.batch_id !== batchId);
    if (filtered.length !== list.length) {
      membersByUserCache.set(uid, filtered);
    }
  }
}

export async function createMember(member: ScoutMember, userId?: string): Promise<ScoutMember> {
  const newMember = sanitizeMemberForSave(member, userId);
  const docId = getMemberDocId(newMember);
  await setDoc(doc(db, 'scout_members', docId), newMember);
  upsertMembersInCache([newMember], newMember.user_id ?? userId);
  return newMember;
}

export async function updateMember(member: ScoutMember, userId?: string): Promise<ScoutMember> {
  const updatedMember = sanitizeMemberForSave(member, userId);
  const targetDocId = getMemberDocId(updatedMember);
  await setDoc(doc(db, 'scout_members', targetDocId), updatedMember);
  upsertMembersInCache([updatedMember], updatedMember.user_id ?? userId);
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

  removeDocIdsFromCache(removedCanonicalDocIds);
  upsertMembersInCache(sanitizedMembers, userId);
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
  removeDocIdsFromCache(new Set([canonicalDocId]));
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
  if (currentUid && membersByUserCache.has(currentUid)) {
    const userMembers = membersByUserCache.get(currentUid) ?? [];
    return deduplicateBatchMembers(userMembers.filter((m) => m.batch_id === numericBatchId));
  }

  for (const [, userMembers] of membersByUserCache.entries()) {
    return deduplicateBatchMembers(userMembers.filter((m) => m.batch_id === numericBatchId));
  }

  return coldMembersByBatchCache.getOrLoad(numericBatchId, async () => {
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

    return deduplicateBatchMembers(members);
  });
}

export async function getAllMembers(userId?: string): Promise<ScoutMember[]> {
  const targetUserId = userId ?? auth.currentUser?.uid ?? '';
  if (!targetUserId) {
    return [];
  }

  return membersByUserCache.getOrLoad(targetUserId, async () => {
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

    return deduplicateMembersByBatch(allRaw);
  });
}
