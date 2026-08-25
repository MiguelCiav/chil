import { ScoutMember, ScoutUnit, BatchUnitScope } from '../types';

/**
 * Calculates the age in whole years from a birth date string.
 * Supports formats: 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY', and ISO strings.
 */
export function calculateAge(birthDateStr?: string): number | null {
  if (!birthDateStr || typeof birthDateStr !== 'string') return null;
  const trimmed = birthDateStr.trim();
  if (!trimmed) return null;

  let d: Date | null = null;

  // Check if DD/MM/YYYY or DD-MM-YYYY
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD or YYYY/MM/DD
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      d = new Date(year, month, day);
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY or DD/MM/YYYY
      const day = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const year = Number(parts[2]);
      d = new Date(year, month, day);
    }
  }

  if (!d || isNaN(d.getTime())) {
    d = new Date(trimmed);
  }

  if (isNaN(d.getTime())) return null;

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

/**
 * Infers and normalizes member units for a whole batch according to business rules:
 * 1. If batch has fixed unit_scope !== 'mixed', all members receive unit_scope.
 * 2. For mixed batches:
 *    - Members with unit === 'no_scout' remain 'no_scout'.
 *    - Young members with birth_date:
 *      * Age < 11: 'manada'
 *      * Age 11 to 15: 'tropa'
 *      * Age 16 to 18: 'caminantes'
 *      * Age 19 to 21: 'clan'
 *    - Young members without valid birth_date default to 'tropa'.
 *    - Adults (Age > 21 or member_type === 'adult' without young age):
 *      * Determine the most frequent unit among the other members in the batch.
 *      * If tied or only adults exist, default to 'institucional'.
 */
export function inferBatchMemberUnits(
  members: ScoutMember[],
  unitScope?: BatchUnitScope
): ScoutMember[] {
  if (!members || members.length === 0) return [];

  // Fixed unit scope
  if (unitScope && unitScope !== 'mixed') {
    return members.map(m => ({
      ...m,
      unit: unitScope as ScoutUnit,
      status: unitScope === 'no_scout' ? ('active' as const) : m.status
    }));
  }

  // Pass 1: Resolve youth units and identify adult candidates
  const intermediate: { member: ScoutMember; inferredUnit?: ScoutUnit; isAdultCandidate: boolean }[] = [];

  for (const member of members) {
    if (member.unit === 'no_scout') {
      intermediate.push({ member, inferredUnit: 'no_scout', isAdultCandidate: false });
      continue;
    }

    const age = calculateAge(member.birth_date);

    if (age !== null && age <= 21) {
      // Definite youth based on age
      const unit = inferYouthUnitByAge(age);
      intermediate.push({ member, inferredUnit: unit, isAdultCandidate: false });
    } else if (age !== null && age > 21) {
      // Definite adult based on age > 21
      intermediate.push({ member, isAdultCandidate: true });
    } else {
      // Age is unknown / not provided
      if (member.member_type === 'adult') {
        intermediate.push({ member, isAdultCandidate: true });
      } else {
        // Default young without birth date to 'tropa'
        intermediate.push({ member, inferredUnit: 'tropa', isAdultCandidate: false });
      }
    }
  }

  // Pass 2: Calculate most frequent unit among non-adults
  const unitCounts: Record<'manada' | 'tropa' | 'caminantes' | 'clan', number> = {
    manada: 0,
    tropa: 0,
    caminantes: 0,
    clan: 0
  };

  for (const item of intermediate) {
    if (item.inferredUnit && item.inferredUnit in unitCounts) {
      unitCounts[item.inferredUnit as 'manada' | 'tropa' | 'caminantes' | 'clan']++;
    }
  }

  let mostFrequentUnit: ScoutUnit = 'institucional';
  let maxCount = 0;
  let isTied = false;

  const youthUnits: ('manada' | 'tropa' | 'caminantes' | 'clan')[] = ['manada', 'tropa', 'caminantes', 'clan'];

  for (const u of youthUnits) {
    const count = unitCounts[u];
    if (count > maxCount) {
      maxCount = count;
      mostFrequentUnit = u;
      isTied = false;
    } else if (count > 0 && count === maxCount) {
      isTied = true;
    }
  }

  if (isTied || maxCount === 0) {
    mostFrequentUnit = 'institucional';
  }

  // Final mapping
  return intermediate.map(({ member, inferredUnit, isAdultCandidate }) => {
    const unit: ScoutUnit = isAdultCandidate
      ? mostFrequentUnit
      : (inferredUnit || member.unit || 'tropa');

    return {
      ...member,
      unit,
      status: unit === 'no_scout' ? ('active' as const) : member.status
    };
  });
}
