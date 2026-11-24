import { Batch, MemberStatus, ScoutMember } from '../types';
import { getMemberDocId, isGenericIdentity, normalizeCedula } from './memberIdentity';

export interface BatchMemberSourceEntry {
  batch: Batch;
  members: ScoutMember[];
}

export interface CrossIdentityCodeConflict {
  code: string;
  members: ScoutMember[];
}

export interface SurvivingMemberEntry {
  member: ScoutMember;
  docId: string;
}

export interface MergedMembersResolution {
  survivingMembers: ScoutMember[];
  survivingEntries: SurvivingMemberEntry[];
  duplicateCount: number;
  allSourceDocIds: Set<string>;
  crossIdentityCodeConflicts: CrossIdentityCodeConflict[];
}

interface CandidateRecord {
  member: ScoutMember;
  sourceBatch: Batch;
}

const STATUS_PRIORITY: Record<MemberStatus, number> = {
  active: 3,
  exceptional: 2,
  pending: 1
};

function getStatusRank(status?: MemberStatus): number {
  if (!status) return 0;
  return STATUS_PRIORITY[status] ?? 0;
}

function getBatchTimestamp(createdAt?: string): number {
  if (!createdAt) return 0;
  const ts = new Date(createdAt).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function compareCandidates(a: CandidateRecord, b: CandidateRecord): number {
  const rankDiff = getStatusRank(b.member.status) - getStatusRank(a.member.status);
  if (rankDiff !== 0) return rankDiff;

  const tsDiff = getBatchTimestamp(b.sourceBatch.created_at) - getBatchTimestamp(a.sourceBatch.created_at);
  if (tsDiff !== 0) return tsDiff;

  return b.sourceBatch.id - a.sourceBatch.id;
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

function stampSurvivor(
  member: ScoutMember,
  sourceBatch: Batch,
  options?: { targetBatchId?: number; targetUserId?: string }
): ScoutMember {
  const groupId = resolveMergedMemberGroupId(member, sourceBatch);
  return {
    ...member,
    group_id: groupId,
    ...(options?.targetBatchId !== undefined ? { batch_id: options.targetBatchId } : {}),
    ...(options?.targetUserId ? { user_id: options.targetUserId } : {})
  };
}

export function findCrossIdentityCodeConflicts(
  members: ScoutMember[]
): CrossIdentityCodeConflict[] {
  const byCode = new Map<string, ScoutMember[]>();
  for (const member of members) {
    const code = member.recognition_code?.trim().toUpperCase() ?? '';
    if (!code) continue;
    const list = byCode.get(code);
    if (list) {
      list.push(member);
    } else {
      byCode.set(code, [member]);
    }
  }

  const conflicts: CrossIdentityCodeConflict[] = [];
  for (const [code, list] of byCode.entries()) {
    if (list.length > 1) {
      conflicts.push({ code, members: list });
    }
  }
  return conflicts;
}

export function deduplicateMergedMembers(
  entries: BatchMemberSourceEntry[],
  options?: { targetBatchId?: number; targetUserId?: string }
): MergedMembersResolution {
  const allSourceDocIds = new Set<string>();
  const nonGenericGroups = new Map<string, CandidateRecord[]>();
  const genericCandidates: CandidateRecord[] = [];

  for (const { batch: sourceBatch, members } of entries) {
    for (const member of members) {
      const oldDocId = getMemberDocId({
        ...member,
        batch_id: member.batch_id ?? sourceBatch.id
      });
      allSourceDocIds.add(oldDocId);

      if (isGenericIdentity(member.identity)) {
        genericCandidates.push({ member, sourceBatch });
      } else {
        const key = normalizeCedula(member.identity);
        const group = nonGenericGroups.get(key);
        if (group) {
          group.push({ member, sourceBatch });
        } else {
          nonGenericGroups.set(key, [{ member, sourceBatch }]);
        }
      }
    }
  }

  let duplicateCount = 0;
  const survivingEntries: SurvivingMemberEntry[] = [];
  const usedDocIds = new Set<string>();

  for (const candidates of nonGenericGroups.values()) {
    const sorted = [...candidates].sort(compareCandidates);
    if (sorted.length > 1) {
      duplicateCount += sorted.length - 1;
    }

    const winner = sorted[0];
    let resolvedCode = winner.member.recognition_code?.trim() ?? '';

    if (!resolvedCode && sorted.length > 1) {
      // Only inherit recognition_code from a loser within the exact same status tier
      for (let i = 1; i < sorted.length; i++) {
        const candidate = sorted[i];
        const candidateCode = candidate.member.recognition_code?.trim() ?? '';
        if (candidate.member.status === winner.member.status && candidateCode) {
          resolvedCode = candidateCode;
          break;
        }
      }
    }

    const stamped = stampSurvivor(
      {
        ...winner.member,
        ...(resolvedCode ? { recognition_code: resolvedCode } : {})
      },
      winner.sourceBatch,
      options
    );

    const docId = getMemberDocId(stamped);
    usedDocIds.add(docId);
    survivingEntries.push({ member: stamped, docId });
  }

  for (const { member, sourceBatch } of genericCandidates) {
    const stamped = stampSurvivor(member, sourceBatch, options);
    const baseDocId = getMemberDocId(stamped);
    let docId = baseDocId;
    let suffix = 2;
    while (usedDocIds.has(docId)) {
      docId = `${baseDocId}_${suffix}`;
      suffix += 1;
    }
    usedDocIds.add(docId);
    survivingEntries.push({ member: stamped, docId });
  }

  const survivingMembers = survivingEntries.map((entry) => entry.member);
  const crossIdentityCodeConflicts = findCrossIdentityCodeConflicts(survivingMembers);

  return {
    survivingMembers,
    survivingEntries,
    duplicateCount,
    allSourceDocIds,
    crossIdentityCodeConflicts
  };
}
