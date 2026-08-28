import { ScoutMember, ScoutUnit, BatchUnitScope } from '../types';

export type YouthScoutUnit = 'manada' | 'tropa' | 'caminantes' | 'clan';

const YOUTH_SCOUT_UNITS: YouthScoutUnit[] = ['manada', 'tropa', 'caminantes', 'clan'];

/**
 * Parses a birth date string into a Date object.
 * Supports formats: 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY', and ISO strings.
 */
export function parseBirthDate(birthDateStr?: string): Date | null {
  if (!birthDateStr || typeof birthDateStr !== 'string') return null;
  const trimmed = birthDateStr.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      return new Date(year, month, day);
    }
    if (parts[2].length === 4) {
      const day = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const year = Number(parts[2]);
      return new Date(year, month, day);
    }
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Calculates the age in whole years from a birth date string.
 */
export function calculateAge(birthDateStr?: string): number | null {
  const d = parseBirthDate(birthDateStr);
  if (!d || Number.isNaN(d.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * Infers unit for a young scout member based on their age:
 * - Age < 11 (e.g. 7-10): 'manada'
 * - Age 11 to 15: 'tropa'
 * - Age 16 to 18: 'caminantes'
 * - Age 19 to 21: 'clan'
 */
export function inferYouthUnitByAge(age: number | null): ScoutUnit {
  if (age === null) return 'tropa';
  if (age < 11) return 'manada';
  if (age <= 15) return 'tropa';
  if (age <= 18) return 'caminantes';
  if (age <= 21) return 'clan';
  return 'institucional';
}

export const inferUnitByAge = inferYouthUnitByAge;

/**
 * Resolves whether a member is an adult candidate or has a direct youth unit.
 */
export function resolveMemberYouthUnitOrAdult(member: ScoutMember): {
  inferredUnit?: ScoutUnit;
  isAdultCandidate: boolean;
} {
  if (member.unit === 'no_scout') {
    return { inferredUnit: 'no_scout', isAdultCandidate: false };
  }

  const age = calculateAge(member.birth_date);
  if (age !== null) {
    if (age <= 21) {
      return { inferredUnit: inferYouthUnitByAge(age), isAdultCandidate: false };
    }
    return { isAdultCandidate: true };
  }

  if (member.member_type === 'adult') {
    return { isAdultCandidate: true };
  }

  return { inferredUnit: 'tropa', isAdultCandidate: false };
}

/**
 * Computes the mode (most frequent) unit among non-adults in the batch.
 */
export function computeBatchModeUnit(youthUnits: (ScoutUnit | undefined)[]): ScoutUnit {
  const unitCounts: Record<YouthScoutUnit, number> = {
    manada: 0,
    tropa: 0,
    caminantes: 0,
    clan: 0
  };

  for (const u of youthUnits) {
    if (u && (u === 'manada' || u === 'tropa' || u === 'caminantes' || u === 'clan')) {
      unitCounts[u as YouthScoutUnit]++;
    }
  }

  let mostFrequentUnit: ScoutUnit = 'institucional';
  let maxCount = 0;
  let isTied = false;

  for (const u of YOUTH_SCOUT_UNITS) {
    const count = unitCounts[u];
    if (count > maxCount) {
      maxCount = count;
      mostFrequentUnit = u;
      isTied = false;
    } else if (count > 0 && count === maxCount) {
      isTied = true;
    }
  }

  return (isTied || maxCount === 0) ? 'institucional' : mostFrequentUnit;
}

/**
 * Infers single member unit based on batch context.
 */
export function inferMemberUnit(
  member: ScoutMember,
  inferredUnit: ScoutUnit | undefined,
  isAdultCandidate: boolean,
  batchModeUnit: ScoutUnit
): ScoutUnit {
  if (isAdultCandidate) {
    return batchModeUnit;
  }
  return inferredUnit ?? member.unit ?? 'tropa';
}

/**
 * Infers and normalizes member units for a whole batch according to business rules.
 */
export function inferBatchMemberUnits(
  members: ScoutMember[],
  unitScope?: BatchUnitScope
): ScoutMember[] {
  if (!members || members.length === 0) return [];

  if (unitScope && unitScope !== 'mixed') {
    return members.map(m => ({
      ...m,
      unit: unitScope as ScoutUnit,
      status: unitScope === 'no_scout' ? ('active' as const) : m.status
    }));
  }

  const intermediate = members.map(member => ({
    member,
    ...resolveMemberYouthUnitOrAdult(member)
  }));

  const modeUnit = computeBatchModeUnit(intermediate.map(i => i.inferredUnit));

  return intermediate.map(({ member, inferredUnit, isAdultCandidate }) => {
    const unit = inferMemberUnit(member, inferredUnit, isAdultCandidate, modeUnit);
    return {
      ...member,
      unit,
      status: unit === 'no_scout' ? ('active' as const) : member.status
    };
  });
}
