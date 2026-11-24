import { Batch, BatchCodeMode, ScoutMember } from '../types';

export const AUTO_CODE_PATTERN = /^REC-[A-HJ-NP-Z2-9]{6}$/;
export const LEGACY_AUTO_CODE_PATTERN = /^REC-(?:[A-HJ-NP-Z2-9]{6}|\d{4}|EXC)$/;

/**
 * Generates a short unique uppercase alphanumeric code (e.g. REC-8F3A2B or REC-A8F2)
 * Excludes ambiguous characters (0, O, 1, I).
 */
export function generateRecognitionCode(prefix: string = 'REC', length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude ambiguous 0/O, 1/I
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  let hash = '';
  for (let i = 0; i < length; i++) {
    hash += chars[randomBytes[i] % chars.length];
  }
  const cleanPrefix = prefix ? prefix.trim().toUpperCase() : 'REC';
  return `${cleanPrefix}-${hash}`;
}

export function inferBatchCodeMode(
  members: ScoutMember[],
  batch?: Pick<Batch, 'code_mode'> | null
): BatchCodeMode {
  if (batch?.code_mode === 'auto' || batch?.code_mode === 'manual') {
    return batch.code_mode;
  }

  const assignedCodes = members
    .map((member) => member.recognition_code?.trim().toUpperCase() ?? '')
    .filter((code) => code.length > 0);

  if (assignedCodes.length === 0) {
    return 'auto';
  }

  return assignedCodes.every((code) => LEGACY_AUTO_CODE_PATTERN.test(code)) ? 'auto' : 'manual';
}

export function generateUniqueRecognitionCode(
  existingCodes: Iterable<string>,
  excludedCodes?: Iterable<string>,
  prefix: string = 'REC'
): string {
  const blocked = new Set<string>();
  for (const code of existingCodes) {
    const clean = code?.trim().toUpperCase();
    if (clean) blocked.add(clean);
  }
  if (excludedCodes) {
    for (const code of excludedCodes) {
      const clean = code?.trim().toUpperCase();
      if (clean) blocked.add(clean);
    }
  }

  let candidate = generateRecognitionCode(prefix, 6);
  while (blocked.has(candidate.toUpperCase())) {
    candidate = generateRecognitionCode(prefix, 6);
  }
  return candidate;
}

export function validateManualRecognitionCode(
  rawCode: string,
  existingCodes: Iterable<string>,
  excludedCodes?: Iterable<string>
): { normalized: string; error: string | null } {
  const normalized = rawCode.trim().toUpperCase();
  if (!normalized) {
    return { normalized: '', error: 'Debe ingresar un código de reconocimiento.' };
  }

  if (excludedCodes) {
    for (const excluded of excludedCodes) {
      if (excluded?.trim().toUpperCase() === normalized) {
        return {
          normalized,
          error: 'El nuevo código no puede ser igual al código excepcional anterior.'
        };
      }
    }
  }

  for (const existing of existingCodes) {
    if (existing?.trim().toUpperCase() === normalized) {
      return {
        normalized,
        error: 'Este código ya está asignado a otro miembro del lote.'
      };
    }
  }

  return { normalized, error: null };
}

/**
 * Batch-wide recognition code assignment helper.
 * - In 'auto' mode: generates unique recognition codes for active members.
 * - In 'manual' mode: sets recognition_code to empty string for manual entry.
 */
export function assignBatchRecognitionCodes(
  members: ScoutMember[],
  mode: BatchCodeMode,
  customPrefix: string = 'REC'
): ScoutMember[] {
  const generatedCodes = new Set<string>();

  return members.map((member) => {
    if (mode === 'auto') {
      if (member.status === 'active' || member.status === 'exceptional') {
        let code = generateRecognitionCode(customPrefix);
        while (generatedCodes.has(code)) {
          code = generateRecognitionCode(customPrefix);
        }
        generatedCodes.add(code);
        return {
          ...member,
          recognition_code: code
        };
      }
      return {
        ...member,
        recognition_code: ''
      };
    } else {
      return {
        ...member,
        recognition_code: ''
      };
    }
  });
}
