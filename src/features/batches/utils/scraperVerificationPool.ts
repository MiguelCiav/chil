import type { ScraperMemberDetails } from '../api/scraperApi';
import { MemberStatus, ScoutMember, ScoutUnit } from '../types';
import { splitFullName } from './nameHelper';
import { matchHierarchy, classifyScoutUnitAndType } from './hierarchyMatcher';
import { isGenericIdentity } from './memberIdentity';

export const VERIFICATION_POOL_CONCURRENCY = 4;

export interface VerificationProgress {
  current: number;
  total: number;
}

export interface InitialMemberHierarchy {
  region_id?: number;
  district_id?: number;
  group_id?: number;
}

export function buildUnregisteredMemberRecord(
  cedula: string,
  type: 'young' | 'adult' = 'young',
  memberUnit: ScoutUnit = 'tropa',
  batchId: number | null = null,
  userId?: string,
  hierarchy?: InitialMemberHierarchy
): ScoutMember {
  return {
    identity: cedula,
    first_names: 'Usuario',
    last_names: 'No Registrado',
    birth_date: '1990-01-01',
    member_type: type,
    unit: memberUnit,
    status: 'pending',
    verified_in_registry: true,
    ...(batchId !== null && batchId !== undefined ? { batch_id: batchId } : {}),
    ...(userId ? { user_id: userId } : {}),
    region_id: hierarchy?.region_id ?? 0,
    district_id: hierarchy?.district_id ?? 0,
    group_id: hierarchy?.group_id ?? 0
  };
}

export function buildScrapedMemberRecord(
  cedula: string,
  res: ScraperMemberDetails,
  type?: 'young' | 'adult',
  memberUnit?: ScoutUnit,
  batchId?: number | null,
  userId?: string,
  hierarchy?: InitialMemberHierarchy
): ScoutMember {
  const { first_names, last_names } = splitFullName(res.nombre_completo);
  const isScrapedActive = res.status?.trim().toLowerCase() === 'activo';
  const matched = matchHierarchy(res.region, res.distrito, res.grupo);
  const classified = classifyScoutUnitAndType(res);

  const finalUnit = memberUnit || classified.unit;
  const finalType = type || classified.member_type;
  const finalRegionId =
    matched.region_id ??
    (hierarchy?.region_id && hierarchy.region_id !== 0 ? hierarchy.region_id : 0);
  const finalDistrictId =
    matched.district_id ??
    (hierarchy?.district_id && hierarchy.district_id !== 0 ? hierarchy.district_id : 0);
  const finalGroupId =
    matched.group_id ??
    (hierarchy?.group_id && hierarchy.group_id !== 0 ? hierarchy.group_id : 0);

  return {
    identity: cedula,
    first_names: first_names || cedula,
    last_names: last_names || '',
    birth_date: res.fecha_nacimiento || '1990-01-01',
    email: res.correo_electronico,
    phone: res.telefono,
    region_id: finalRegionId,
    region_name: matched.region_name,
    district_id: finalDistrictId,
    district_name: matched.district_name,
    group_id: finalGroupId,
    group_name: matched.group_name,
    member_type: finalType,
    unit: finalUnit,
    position_in_group: res.cargo_grupo,
    institutional_position: res.cargo_institucional,
    scout_progression: res.progresion_actual,
    status: isScrapedActive ? 'active' : 'pending',
    is_solvent: isScrapedActive,
    solvent_until: res.solvente_hasta,
    avatar_url: res.avatar_url,
    impeesa_uuid: res.member_uuid,
    admission_date: res.fecha_ingreso,
    promise_date: res.fecha_promesa,
    verified_in_registry: true,
    ...(batchId !== null && batchId !== undefined ? { batch_id: batchId } : {}),
    ...(userId ? { user_id: userId } : {})
  };
}

export interface RunVerificationPoolOptions<TInput, TResult> {
  items: TInput[];
  verifyItem: (item: TInput) => Promise<TResult>;
  concurrency?: number;
  shouldAbort?: (err: unknown) => boolean;
  isCancelled?: () => boolean;
  onProgress?: (progress: VerificationProgress) => void;
}

export async function runVerificationPool<TInput, TResult>(
  options: RunVerificationPoolOptions<TInput, TResult>
): Promise<{ results: Map<TInput, TResult>; sessionError: Error | null }> {
  const {
    items,
    verifyItem,
    concurrency = VERIFICATION_POOL_CONCURRENCY,
    shouldAbort,
    isCancelled,
    onProgress
  } = options;

  const results = new Map<TInput, TResult>();
  if (items.length === 0) {
    return { results, sessionError: null };
  }

  let completed = 0;
  let sessionError: Error | null = null;
  let aborted = false;

  const reportProgress = () => {
    completed += 1;
    onProgress?.({ current: completed, total: items.length });
  };

  // 1. Probe request on item 0 (warms serverless container and fails fast on expired session)
  if (isCancelled?.()) {
    return { results, sessionError: null };
  }

  try {
    const probeResult = await verifyItem(items[0]);
    results.set(items[0], probeResult);
    reportProgress();
  } catch (probeErr) {
    if (shouldAbort?.(probeErr)) {
      return {
        results,
        sessionError: probeErr instanceof Error ? probeErr : new Error(String(probeErr))
      };
    }
    throw probeErr;
  }

  // 2. Remaining items via worker concurrency pool with shared abort circuit breaker
  const remaining = items.slice(1);
  if (remaining.length === 0 || isCancelled?.()) {
    return { results, sessionError };
  }

  let nextIndex = 0;
  const runWorker = async () => {
    while (!aborted && !isCancelled?.()) {
      const currentIdx = nextIndex++;
      if (currentIdx >= remaining.length) {
        return;
      }
      const item = remaining[currentIdx];
      try {
        const result = await verifyItem(item);
        results.set(item, result);
      } catch (workerErr) {
        if (shouldAbort?.(workerErr)) {
          aborted = true;
          if (!sessionError) {
            sessionError = workerErr instanceof Error ? workerErr : new Error(String(workerErr));
          }
          return;
        }
        throw workerErr;
      } finally {
        reportProgress();
      }
    }
  };

  const safeConcurrency = concurrency > 0 ? concurrency : VERIFICATION_POOL_CONCURRENCY;
  const workerCount = Math.min(safeConcurrency, remaining.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return { results, sessionError };
}

export type ReverificationOutcomeKind = 'activated' | 'refreshed_pending' | 'unchanged';

export interface ReverificationOutcome {
  kind: ReverificationOutcomeKind;
  member: ScoutMember;
  previousCode?: string;
  previousStatus: MemberStatus;
  wasExceptional: boolean;
}

export function isReverifiableMember(member: ScoutMember): boolean {
  return (
    (member.status === 'pending' || member.status === 'exceptional') &&
    member.unit !== 'no_scout' &&
    !isGenericIdentity(member.identity)
  );
}

const COMPARED_STRING_FIELDS: ReadonlyArray<keyof ScoutMember> = [
  'identity',
  'first_names',
  'last_names',
  'birth_date',
  'email',
  'phone',
  'region_name',
  'district_name',
  'group_name',
  'unit',
  'member_type',
  'position_in_group',
  'institutional_position',
  'scout_progression',
  'status',
  'solvent_until',
  'avatar_url',
  'impeesa_uuid',
  'admission_date',
  'promise_date',
  'recognition_code',
  'exceptional_reason',
  'user_id'
];

const COMPARED_NUMBER_FIELDS: ReadonlyArray<keyof ScoutMember> = [
  'region_id',
  'district_id',
  'group_id',
  'batch_id'
];

function arePersistedMemberFieldsEqual(a: ScoutMember, b: ScoutMember): boolean {
  for (const key of COMPARED_STRING_FIELDS) {
    const valA = a[key] ? String(a[key]) : '';
    const valB = b[key] ? String(b[key]) : '';
    if (valA !== valB) return false;
  }

  for (const key of COMPARED_NUMBER_FIELDS) {
    const numA = typeof a[key] === 'number' && !Number.isNaN(a[key]) ? a[key] : undefined;
    const numB = typeof b[key] === 'number' && !Number.isNaN(b[key]) ? b[key] : undefined;
    if (numA !== numB) return false;
  }

  if (Boolean(a.verified_in_registry) !== Boolean(b.verified_in_registry)) {
    return false;
  }

  if (a.is_solvent !== b.is_solvent) {
    return false;
  }

  // Also detect stale legacy fields that should be stripped on refresh
  if (a.unit_id !== undefined || a.member_category !== undefined || a.entry_date !== undefined) {
    return false;
  }

  return true;
}

export function applyReverificationResult(
  existingMember: ScoutMember,
  scrapedDetails: ScraperMemberDetails | null,
  options?: { batchId?: number; userId?: string; newIdentity?: string }
): ReverificationOutcome {
  const previousStatus = existingMember.status;
  const wasExceptional = previousStatus === 'exceptional';
  const previousCode = existingMember.recognition_code?.trim() || undefined;

  if (scrapedDetails === null) {
    return {
      kind: 'unchanged',
      member: existingMember,
      previousCode,
      previousStatus,
      wasExceptional
    };
  }

  const isScrapedActive = scrapedDetails.status?.trim().toLowerCase() === 'activo';

  if (!isScrapedActive && wasExceptional) {
    return {
      kind: 'unchanged',
      member: existingMember,
      previousCode,
      previousStatus,
      wasExceptional
    };
  }

  const targetIdentity = options?.newIdentity ?? existingMember.identity;
  const targetBatchId = options?.batchId ?? existingMember.batch_id ?? null;
  const targetUserId = options?.userId ?? existingMember.user_id;

  const freshMember = buildScrapedMemberRecord(
    targetIdentity,
    scrapedDetails,
    undefined,
    undefined,
    targetBatchId,
    targetUserId
  );

  if (isScrapedActive) {
    return {
      kind: 'activated',
      member: {
        ...freshMember,
        status: 'active',
        recognition_code: undefined,
        exceptional_reason: undefined
      },
      previousCode,
      previousStatus,
      wasExceptional
    };
  }

  // pending + Inactivo -> refresh profile/hierarchy only if any field actually changed
  const refreshedPending: ScoutMember = {
    ...freshMember,
    status: 'pending',
    recognition_code: undefined,
    exceptional_reason: undefined
  };

  if (arePersistedMemberFieldsEqual(existingMember, refreshedPending)) {
    return {
      kind: 'unchanged',
      member: existingMember,
      previousCode,
      previousStatus,
      wasExceptional
    };
  }

  return {
    kind: 'refreshed_pending',
    member: refreshedPending,
    previousCode,
    previousStatus,
    wasExceptional
  };
}
