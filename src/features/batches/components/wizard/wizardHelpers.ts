import {
  createMember,
  ScraperMemberDetails
} from '../../api';
import {
  ScoutMember,
  ScoutUnit
} from '../../types';
import { splitFullName } from '../../utils/nameHelper';
import { matchHierarchy, classifyScoutUnitAndType } from '../../utils/hierarchyMatcher';
import {
  InitialMemberHierarchy,
  buildUnregisteredMemberRecord,
  buildScrapedMemberRecord
} from '../../utils/scraperVerificationPool';

export {
  splitFullName,
  matchHierarchy,
  classifyScoutUnitAndType,
  buildUnregisteredMemberRecord,
  buildScrapedMemberRecord
};
export type { InitialMemberHierarchy };

export function parseCedulasFromText(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/[,;\s]+/)
    .map((token) => token.replace(/\D/g, ''))
    .filter((digits) => digits.length > 0)
    .filter((digits, idx, arr) => arr.indexOf(digits) === idx);
}

export function getStepCircleClasses(currentStep: number, itemStep: number): string {
  if (currentStep === itemStep) {
    return 'bg-secondary border-primary text-primary ring-4 ring-primary/20 scale-105';
  }
  if (currentStep > itemStep) {
    return 'bg-emerald-50 border-emerald-300 text-emerald-700';
  }
  return 'bg-white border-gray-300 text-gray-400 hover:border-primary/50';
}

export async function saveUnregisteredMemberToDb(
  cedula: string,
  type: 'young' | 'adult' = 'young',
  memberUnit: ScoutUnit = 'tropa',
  batchId: number | null = null,
  userId?: string,
  hierarchy?: InitialMemberHierarchy
): Promise<ScoutMember | null> {
  if (!batchId) return null;
  try {
    return await createMember(
      buildUnregisteredMemberRecord(cedula, type, memberUnit, batchId, userId, hierarchy),
      userId
    );
  } catch (dbErr) {
    console.error('Database save failed for unregistered member:', dbErr);
    return null;
  }
}

export async function saveScrapedMemberToDb(
  cedula: string,
  res: ScraperMemberDetails,
  type?: 'young' | 'adult',
  memberUnit?: ScoutUnit,
  batchId?: number | null,
  userId?: string,
  hierarchy?: InitialMemberHierarchy
): Promise<ScoutMember | null> {
  if (!batchId) return null;
  try {
    return await createMember(
      buildScrapedMemberRecord(cedula, res, type, memberUnit, batchId, userId, hierarchy),
      userId
    );
  } catch (dbErr) {
    console.error('Database save failed for active/inactive member:', dbErr);
    return null;
  }
}
