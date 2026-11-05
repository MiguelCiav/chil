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
import { ScoutMember } from '../types';
import { commitChunkedBatches } from './batchesCrud';

export function isGenericIdentity(id?: string): boolean {
  if (!id) return true;
  const clean = id.trim().toUpperCase();
  return (
    clean === '' ||
    clean === 'S/C' ||
    clean === 'N/A' ||
    clean === 'NO_DISPONIBLE' ||
    clean === 'SIN CEDULA' ||
    clean === 'NONE'
  );
}

export function getMemberDocId(
  member: Pick<ScoutMember, 'identity' | 'batch_id' | 'recognition_code'> &
    Partial<Pick<ScoutMember, 'first_names' | 'last_names'>>
): string {
  const hasValidBatchId = member.batch_id !== undefined && !Number.isNaN(member.batch_id);
  const batchPrefix = hasValidBatchId ? `${member.batch_id}_` : '';
  const cleanId = member.identity?.trim() ?? '';

  if (!isGenericIdentity(cleanId)) {
    return `${batchPrefix}${cleanId}`;
  }

  const cleanCode = member.recognition_code?.trim() ?? '';
  if (cleanCode !== '') {
    return `${batchPrefix}${cleanCode}`;
  }

  const nameParts = `${member.first_names ?? ''}_${member.last_names ?? ''}`
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
  if (nameParts && nameParts !== '_') {
    return `${batchPrefix}SC_${nameParts}`;
  }

  return `${batchPrefix}SC`;
}

interface FirestoreDocLike {
  id?: string;
  ref?: DocumentReference<DocumentData>;
  data?: () => unknown;
}

export function buildMembersQueryForBatch(batchId: number) {
  return query(collection(db, "scout_members"), where("batch_id", "==", batchId));
}

export function buildMembersQueryForBatchChunk(batchIds: number[]) {
  return query(collection(db, "scout_members"), where("batch_id", "in", batchIds));
}

export function buildMembersQueryForUser(userId: string) {
  return query(collection(db, "scout_members"), where("user_id", "==", userId));
}

function sanitizeMemberForSave(member: ScoutMember, userId?: string): ScoutMember {
  const targetUserId = member.user_id ?? userId ?? auth.currentUser?.uid ?? '';
  const sanitized: ScoutMember = {
    identity: member.identity,
    first_names: member.first_names,
    last_names: member.last_names,
    birth_date: member.birth_date,
    member_type: member.member_type,
    status: member.status,
    verified_in_registry: Boolean(member.verified_in_registry),
    ...(member.unit ? { unit: member.unit } : {}),
    ...(member.region_id !== undefined && !Number.isNaN(member.region_id) ? { region_id: member.region_id } : {}),
    ...(member.district_id !== undefined && !Number.isNaN(member.district_id) ? { district_id: member.district_id } : {}),
    ...(member.group_id !== undefined && !Number.isNaN(member.group_id) ? { group_id: member.group_id } : {}),
    ...(member.unit_id !== undefined && !Number.isNaN(member.unit_id) ? { unit_id: member.unit_id } : {}),
    ...(member.batch_id !== undefined && !Number.isNaN(member.batch_id) ? { batch_id: member.batch_id } : {}),
    ...(member.email ? { email: member.email } : {}),
    ...(member.phone ? { phone: member.phone } : {}),
    ...(member.recognition_code ? { recognition_code: member.recognition_code } : {}),
    ...(member.exceptional_reason ? { exceptional_reason: member.exceptional_reason } : {})
  };

  if (targetUserId) {
    sanitized.user_id = targetUserId;
  }

  return sanitized;
}

export async function createMember(member: ScoutMember, userId?: string): Promise<ScoutMember> {
  const newMember = sanitizeMemberForSave(member, userId);
  const docId = getMemberDocId(newMember);
  await setDoc(doc(db, "scout_members", docId), newMember);
  return newMember;
}

export async function updateMember(member: ScoutMember, userId?: string): Promise<ScoutMember> {
  const updatedMember = sanitizeMemberForSave(member, userId);
  const targetDocId = getMemberDocId(updatedMember);
  await setDoc(doc(db, "scout_members", targetDocId), updatedMember);
  return updatedMember;
}

export async function batchUpdateMembers(
  members: ScoutMember[],
  userId?: string,
  chunkSize = 450
): Promise<ScoutMember[]> {
  if (!members || members.length === 0) {
    return [];
  }
  const sanitizedMembers = members.map((member) => sanitizeMemberForSave(member, userId));
  const operations = sanitizedMembers.map((sanitized) => (batch: WriteBatch) => {
    const docRef = doc(db, "scout_members", getMemberDocId(sanitized));
    batch.set(docRef, sanitized);
  });
  await commitChunkedBatches(operations, chunkSize);
  return sanitizedMembers;
}

export const batchSaveMembers = batchUpdateMembers;

export async function deleteMember(
  identityOrCode: string,
  alternativeKey?: string,
  batchId?: number
): Promise<void> {
  await deleteDoc(doc(db, "scout_members", identityOrCode));
  if (alternativeKey && alternativeKey !== identityOrCode) {
    try {
      await deleteDoc(doc(db, "scout_members", alternativeKey));
    } catch {
      // Ignore if alternative doc does not exist
    }
  }
  if (batchId !== undefined && !Number.isNaN(batchId)) {
    const compositeKey = `${batchId}_${alternativeKey || identityOrCode}`;
    if (compositeKey !== identityOrCode && compositeKey !== alternativeKey) {
      try {
        await deleteDoc(doc(db, "scout_members", compositeKey));
      } catch {
        // Ignore if composite doc does not exist
      }
    }
  }
}

function deduplicateBatchMembers(batchMembers: ScoutMember[]): ScoutMember[] {
  const withCode = batchMembers.filter((m) => Boolean(m.recognition_code && m.recognition_code.trim() !== ''));
  const withoutCode = batchMembers.filter((m) => !m.recognition_code || m.recognition_code.trim() === '');

  if (withCode.length > 0) {
    const seenCodes = new Set<string>();
    const finalized: ScoutMember[] = [];
    const finalizedIdentities = new Set<string>();

    for (const m of withCode) {
      const code = m.recognition_code?.trim();
      if (code && !seenCodes.has(code)) {
        seenCodes.add(code);
        finalized.push(m);
      }
      const id = m.identity?.trim().toUpperCase();
      if (id && !isGenericIdentity(id)) {
        finalizedIdentities.add(id);
      }
    }

    const remainingDrafts: ScoutMember[] = [];
    const seenDraftIdentities = new Set<string>();
    for (const m of withoutCode) {
      const id = m.identity?.trim().toUpperCase();
      if (id && !isGenericIdentity(id)) {
        if (!finalizedIdentities.has(id) && !seenDraftIdentities.has(id)) {
          seenDraftIdentities.add(id);
          remainingDrafts.push(m);
        }
      } else {
        remainingDrafts.push(m);
      }
    }

    return [...finalized, ...remainingDrafts];
  }

  const seenDraftIdentities = new Set<string>();
  const drafts: ScoutMember[] = [];
  for (const m of withoutCode) {
    const id = m.identity?.trim().toUpperCase();
    if (id && !isGenericIdentity(id)) {
      if (!seenDraftIdentities.has(id)) {
        seenDraftIdentities.add(id);
        drafts.push(m);
      }
    } else {
      drafts.push(m);
    }
  }

  return drafts;
}

export async function getMembersByBatchId(batchId: number): Promise<ScoutMember[]> {
  const q = buildMembersQueryForBatch(batchId);
  const querySnapshot = await getDocs(q);

  const rawDocs: FirestoreDocLike[] = [];
  if (Array.isArray(querySnapshot?.docs)) {
    rawDocs.push(...querySnapshot.docs);
  } else if (typeof querySnapshot?.forEach === 'function') {
    querySnapshot.forEach((docSnap) => rawDocs.push(docSnap));
  }

  const members = rawDocs.map((docSnapshot) => {
    const rawData = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
    return rawData as ScoutMember;
  });

  return deduplicateBatchMembers(members);
}

export async function getAllMembers(userId?: string): Promise<ScoutMember[]> {
  const targetUserId = userId ?? auth.currentUser?.uid ?? '';
  if (!targetUserId) {
    return [];
  }

  const q = buildMembersQueryForUser(targetUserId);
  const snap = await getDocs(q);
  const snapDocs: FirestoreDocLike[] = [];
  if (Array.isArray(snap?.docs)) {
    snapDocs.push(...snap.docs);
  } else if (typeof snap?.forEach === 'function') {
    snap.forEach((docSnap) => snapDocs.push(docSnap));
  }

  const allRaw = snapDocs.map(
    (docSnapshot) => (typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot) as ScoutMember
  );

  // Deduplicate per batch preserving all unique recognition codes and generic identities (e.g. S/C)
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
