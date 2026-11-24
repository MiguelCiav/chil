import { describe, it, expect } from 'vitest';
import {
  isGenericIdentity,
  hasInvalidDocPathChars,
  normalizeCedula,
  isSameIdentity,
  getMemberDocId
} from '../memberIdentity';

describe('memberIdentity utilities', () => {
  describe('isGenericIdentity', () => {
    it('identifies empty and generic placeholders case-insensitively', () => {
      expect(isGenericIdentity(undefined)).toBe(true);
      expect(isGenericIdentity('')).toBe(true);
      expect(isGenericIdentity('   ')).toBe(true);
      expect(isGenericIdentity('s/c')).toBe(true);
      expect(isGenericIdentity('S/C')).toBe(true);
      expect(isGenericIdentity('n/a')).toBe(true);
      expect(isGenericIdentity('NO_DISPONIBLE')).toBe(true);
      expect(isGenericIdentity('sin cedula')).toBe(true);
      expect(isGenericIdentity('NONE')).toBe(true);
    });

    it('returns false for real cedulas and alphanumeric identifiers', () => {
      expect(isGenericIdentity('12345678')).toBe(false);
      expect(isGenericIdentity('V-12345678')).toBe(false);
      expect(isGenericIdentity('EXT-001')).toBe(false);
    });
  });

  describe('hasInvalidDocPathChars', () => {
    it('detects forward slashes that would break Firestore document paths', () => {
      expect(hasInvalidDocPathChars('123/456')).toBe(true);
      expect(hasInvalidDocPathChars('S/N')).toBe(true);
      expect(hasInvalidDocPathChars('V-12.345.678')).toBe(false);
      expect(hasInvalidDocPathChars('')).toBe(false);
      expect(hasInvalidDocPathChars(undefined)).toBe(false);
    });
  });

  describe('normalizeCedula', () => {
    it('normalizes prefixed and formatted numeric cedulas to digits only', () => {
      expect(normalizeCedula('V-12.345.678')).toBe('12345678');
      expect(normalizeCedula('e-12345678')).toBe('12345678');
      expect(normalizeCedula('J-98.765.432')).toBe('98765432');
      expect(normalizeCedula('G12345678')).toBe('12345678');
      expect(normalizeCedula('P-1234567')).toBe('1234567');
      expect(normalizeCedula('  12 345 678  ')).toBe('12345678');
    });

    it('preserves trimmed uppercase for non-numeric identifiers and generic tokens', () => {
      expect(normalizeCedula(' ext-001 ')).toBe('EXT-001');
      expect(normalizeCedula('s/c')).toBe('S/C');
      expect(normalizeCedula('')).toBe('');
      expect(normalizeCedula(undefined)).toBe('');
    });
  });

  describe('isSameIdentity', () => {
    it('matches equivalent formatted cedulas', () => {
      expect(isSameIdentity('V-12.345.678', '12345678')).toBe(true);
      expect(isSameIdentity('e-99887766', '99.887.766')).toBe(true);
      expect(isSameIdentity('12345678', '87654321')).toBe(false);
    });

    it('never matches generic identities with each other or real cedulas', () => {
      expect(isSameIdentity('S/C', 'S/C')).toBe(false);
      expect(isSameIdentity('N/A', 'S/C')).toBe(false);
      expect(isSameIdentity('', '')).toBe(false);
      expect(isSameIdentity('S/C', '12345678')).toBe(false);
    });
  });

  describe('getMemberDocId', () => {
    it('keys non-generic members by batch_id and trimmed identity', () => {
      expect(
        getMemberDocId({ identity: ' V-12345678 ', batch_id: 101, recognition_code: 'REC-ABCDEF' })
      ).toBe('101_V-12345678');
    });

    it('falls back to recognition_code, then name, then SC for generic identities', () => {
      expect(
        getMemberDocId({ identity: 'S/C', batch_id: 101, recognition_code: 'REC-ABCDEF' })
      ).toBe('101_REC-ABCDEF');
      expect(
        getMemberDocId({
          identity: 'S/C',
          batch_id: 101,
          first_names: 'Juan Carlos',
          last_names: 'Perez'
        })
      ).toBe('101_SC_JUAN_CARLOS_PEREZ');
      expect(getMemberDocId({ identity: 'S/C', batch_id: 101 })).toBe('101_SC');
    });
  });
});
