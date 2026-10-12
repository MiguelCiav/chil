import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  deleteDoc,
  DocumentReference,
  DocumentData
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { ScoutMember } from '../types';
import { getAllBatches } from './batchesCrud';

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

export async function createMember(member: ScoutMember, userId?: string): Promise<ScoutMember> {
  const targetUserId = member.user_id ?? userId ?? auth.currentUser?.uid ?? '';
  const newMember: ScoutMember = {
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
    newMember.user_id = targetUserId;
  }

  // Use member.recognition_code or identity as document key to perform safe upserts
  await setDoc(doc(db, "scout_members", member.recognition_code || member.identity), newMember);
  return newMember;
}

export async function updateMember(member: ScoutMember, userId?: string): Promise<ScoutMember> {
  const targetUserId = member.user_id ?? userId ?? auth.currentUser?.uid ?? '';
  const updatedMember: ScoutMember = {
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
    updatedMember.user_id = targetUserId;
  }

  const targetDocId = member.recognition_code || member.identity;
  await setDoc(doc(db, "scout_members", targetDocId), updatedMember);

  // If this member now has a recognition_code that differs from identity,
  // delete any pre-existing document keyed by identity for this batch to prevent duplicate records
  if (member.recognition_code && member.identity && member.recognition_code !== member.identity) {
    try {
      const tempDocRef = doc(db, "scout_members", member.identity);
      const tempDocSnap = await getDoc(tempDocRef);
      if (tempDocSnap && typeof tempDocSnap.exists === 'function' && tempDocSnap.exists()) {
        const data = tempDocSnap.data();
        if (data && data.batch_id === member.batch_id) {
          await deleteDoc(tempDocRef);
        }
      }
    } catch (cleanErr) {
      console.warn("Failed to check/cleanup temporary member doc:", cleanErr);
    }
  }

  return updatedMember;
}

export async function deleteMember(identityOrCode: string, alternativeKey?: string): Promise<void> {
  await deleteDoc(doc(db, "scout_members", identityOrCode));
  if (alternativeKey && alternativeKey !== identityOrCode) {
    try {
      await deleteDoc(doc(db, "scout_members", alternativeKey));
    } catch {
      // Ignore if alternative doc does not exist
    }
  }
}

export async function getMembersByBatchId(batchId: number): Promise<ScoutMember[]> {
  const q = buildMembersQueryForBatch(batchId);
  const querySnapshot = await getDocs(q);

  const rawDocs: FirestoreDocLike[] = [];
  if (Array.isArray(querySnapshot?.docs)) {
    rawDocs.push(...querySnapshot.docs);
  } else if (typeof querySnapshot?.forEach === 'function') {
    querySnapshot.forEach(docSnap => rawDocs.push(docSnap));
  }

  const docs = rawDocs.map(docSnapshot => {
    const rawData = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
    return {
      docId: docSnapshot.id || '',
      docRef: docSnapshot.ref,
      member: rawData as ScoutMember
    };
  });

  const withCode = docs.filter(d => Boolean(d.member.recognition_code && d.member.recognition_code.trim() !== ''));
  const withoutCode = docs.filter(d => !d.member.recognition_code || d.member.recognition_code.trim() === '');

  if (withCode.length > 0) {
    // Collect finalized recognition codes (unique by recognition_code)
    const finalizedMap = new Map<string, ScoutMember>();
    for (const d of withCode) {
      if (!finalizedMap.has(d.member.recognition_code!)) {
        finalizedMap.set(d.member.recognition_code!, d.member);
      }
    }

    // Set of finalized identities (excluding generic placeholders like 'S/C')
    const finalizedIdentities = new Set<string>();
    for (const d of withCode) {
      const id = d.member.identity?.trim().toUpperCase();
      if (id && !isGenericIdentity(id)) {
        finalizedIdentities.add(id);
      }
    }

    // Identify stale draft docs left over from Step 2 to delete and discard
    const staleDocsToDelete: DocumentReference<DocumentData>[] = [];
    const nonDuplicateWithoutCode: ScoutMember[] = [];

    for (const d of withoutCode) {
      const id = d.member.identity?.trim().toUpperCase();
      const isStale = (id && finalizedIdentities.has(id)) || finalizedIdentities.has(d.docId.trim().toUpperCase());
      if (isStale) {
        if (d.docRef) staleDocsToDelete.push(d.docRef);
      } else {
        nonDuplicateWithoutCode.push(d.member);
      }
    }

    if (staleDocsToDelete.length > 0) {
      Promise.all(staleDocsToDelete.map(ref => deleteDoc(ref))).catch(err => {
        console.warn("Failed to delete duplicate member docs:", err);
      });
    }

    return [...Array.from(finalizedMap.values()), ...nonDuplicateWithoutCode];
  }

  // If batch is still in draft mode (none have recognition_code)
  const draftMap = new Map<string, ScoutMember>();
  const genericDrafts: ScoutMember[] = [];

  for (const d of docs) {
    const id = d.member.identity?.trim().toUpperCase() || d.docId;
    if (isGenericIdentity(id)) {
      genericDrafts.push(d.member);
    } else if (!draftMap.has(id)) {
      draftMap.set(id, d.member);
    }
  }

  return [...Array.from(draftMap.values()), ...genericDrafts];
}

export async function getAllMembers(userId?: string): Promise<ScoutMember[]> {
  const targetUserId = userId ?? auth.currentUser?.uid ?? '';
  if (!targetUserId) {
    return [];
  }
  const userBatches = await getAllBatches(targetUserId);
  if (userBatches.length === 0) {
    return [];
  }
  const batchIds = userBatches.map(b => b.id);
  // Chunk batchIds in slices of 30 because Firestore 'in' operator supports max 30 items
  const chunks: number[][] = [];
  for (let i = 0; i < batchIds.length; i += 30) {
    chunks.push(batchIds.slice(i, i + 30));
  }
  const memberPromises = chunks.map(async (chunk) => {
    const q = buildMembersQueryForBatchChunk(chunk);
    const snap = await getDocs(q);
    const snapDocs: FirestoreDocLike[] = [];
    if (Array.isArray(snap?.docs)) {
      snapDocs.push(...snap.docs);
    } else if (typeof snap?.forEach === 'function') {
      snap.forEach(docSnap => snapDocs.push(docSnap));
    }
    return snapDocs.map(docSnapshot => (typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot) as ScoutMember);
  });

  const results = await Promise.all(memberPromises);
  const allRaw = results.flat();

  // Deduplicate per batch preserving all unique recognition codes and generic identities (e.g. S/C)
  const byBatch = new Map<number, ScoutMember[]>();
  for (const m of allRaw) {
    const bId = m.batch_id ?? 0;
    if (!byBatch.has(bId)) {
      byBatch.set(bId, []);
    }
    byBatch.get(bId)!.push(m);
  }

  const result: ScoutMember[] = [];
  for (const [, batchMembers] of byBatch.entries()) {
    const withCode = batchMembers.filter(m => Boolean(m.recognition_code && m.recognition_code.trim() !== ''));
    const withoutCode = batchMembers.filter(m => !m.recognition_code || m.recognition_code.trim() === '');

    if (withCode.length > 0) {
      const seenCodes = new Set<string>();
      for (const m of withCode) {
        if (!seenCodes.has(m.recognition_code!)) {
          seenCodes.add(m.recognition_code!);
          result.push(m);
        }
      }

      const finalizedIdentities = new Set<string>(
        withCode
          .map(m => m.identity?.trim().toUpperCase())
          .filter(id => Boolean(id && !isGenericIdentity(id))) as string[]
      );

      for (const m of withoutCode) {
        const id = m.identity?.trim().toUpperCase();
        if (!id || !finalizedIdentities.has(id)) {
          result.push(m);
        }
      }
    } else {
      const seenDraftIdentities = new Set<string>();
      for (const m of withoutCode) {
        const id = m.identity?.trim().toUpperCase();
        if (id && !isGenericIdentity(id)) {
          if (!seenDraftIdentities.has(id)) {
            seenDraftIdentities.add(id);
            result.push(m);
          }
        } else {
          result.push(m);
        }
      }
    }
  }

  return result;
}
