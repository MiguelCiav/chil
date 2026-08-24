import { ScoutMember } from '../types';

/**
 * Generates a short unique uppercase alphanumeric hash (e.g. REC-8F3A2B or REC-A8F2)
 * Excludes ambiguous characters (0, O, 1, I).
 */
export function generateRecognitionCode(prefix: string = 'REC', length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude ambiguous 0/O, 1/I
  let hash = '';
  for (let i = 0; i < length; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const cleanPrefix = prefix ? prefix.trim().toUpperCase() : 'REC';
  return `${cleanPrefix}-${hash}`;
}

/**
 * Batch-wide recognition code assignment helper.
 * - In 'auto' mode: generates unique recognition codes for active members.
 * - In 'manual' mode: sets recognition_code to empty string for manual entry.
 */
export function assignBatchRecognitionCodes(
  members: ScoutMember[],
  mode: 'auto' | 'manual',
  customPrefix: string = 'REC'
): ScoutMember[] {
  const generatedCodes = new Set<string>();

  return members.map((member) => {
    if (mode === 'auto') {
      if (member.status === 'active') {
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
