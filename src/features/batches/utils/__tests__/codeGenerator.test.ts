import { describe, it, expect } from 'vitest';
import {
  AUTO_CODE_PATTERN,
  generateRecognitionCode,
  assignBatchRecognitionCodes,
  inferBatchCodeMode,
  generateUniqueRecognitionCode,
  validateManualRecognitionCode
} from '../codeGenerator';
import { ScoutMember } from '../../types';

describe('codeGenerator utility', () => {
  describe('generateRecognitionCode', () => {
    it('generates a code with default REC prefix and 6-char hash', () => {
      const code = generateRecognitionCode();
      expect(code).toMatch(/^REC-[A-Z2-9]{6}$/);
    });

    it('respects custom prefix and length', () => {
      const code = generateRecognitionCode('SCOUT', 4);
      expect(code).toMatch(/^SCOUT-[A-Z2-9]{4}$/);
    });

    it('excludes ambiguous characters 0, O, 1, I from hash', () => {
      const ambiguous = ['0', 'O', '1', 'I'];
      for (let i = 0; i < 50; i++) {
        const code = generateRecognitionCode('TEST', 10);
        const hash = code.replace('TEST-', '');
        for (const char of ambiguous) {
          expect(hash).not.toContain(char);
        }
      }
    });

    it('handles empty or whitespace prefix by falling back to REC', () => {
      const code = generateRecognitionCode('');
      expect(code.startsWith('REC-')).toBe(true);
    });
  });

  describe('assignBatchRecognitionCodes', () => {
    const mockMembers: ScoutMember[] = [
      {
        identity: 'V-11111111',
        first_names: 'Ana',
        last_names: 'Perez',
        birth_date: '2005-01-01',
        member_type: 'young',
        status: 'active',
        batch_id: 101
      },
      {
        identity: 'V-22222222',
        first_names: 'Luis',
        last_names: 'Gomez',
        birth_date: '2004-05-15',
        member_type: 'young',
        status: 'active',
        batch_id: 101
      },
      {
        identity: 'V-33333333',
        first_names: 'Carlos',
        last_names: 'Blanco',
        birth_date: '1990-10-10',
        member_type: 'adult',
        status: 'pending',
        batch_id: 101
      }
    ];

    it('auto mode assigns unique codes to active and exceptional members and empty to pending members', () => {
      const mixedMembers: ScoutMember[] = [
        mockMembers[0], // active
        {
          identity: 'V-44444444',
          first_names: 'Elena',
          last_names: 'Excepcional',
          birth_date: '2003-01-01',
          member_type: 'young',
          status: 'exceptional',
          batch_id: 101
        },
        mockMembers[2] // pending
      ];

      const result = assignBatchRecognitionCodes(mixedMembers, 'auto');
      expect(result).toHaveLength(3);

      expect(result[0].recognition_code).toMatch(/^REC-[A-Z2-9]{6}$/);
      expect(result[1].recognition_code).toMatch(/^REC-[A-Z2-9]{6}$/);
      expect(result[0].recognition_code).not.toBe(result[1].recognition_code);

      expect(result[2].recognition_code).toBe('');
    });

    it('manual mode clears recognition codes for manual entry', () => {
      const membersWithCodes: ScoutMember[] = [
        { ...mockMembers[0], recognition_code: 'REC-OLD1' },
        { ...mockMembers[1], recognition_code: 'REC-OLD2' }
      ];

      const result = assignBatchRecognitionCodes(membersWithCodes, 'manual');
      expect(result[0].recognition_code).toBe('');
      expect(result[1].recognition_code).toBe('');
    });

    it('respects custom prefix in batch assignment', () => {
      const result = assignBatchRecognitionCodes(mockMembers, 'auto', 'DIST-CARACAS');
      expect(result[0].recognition_code).toMatch(/^DIST-CARACAS-[A-Z2-9]{6}$/);
    });

    it('generates completely unique codes with zero duplicates across large batches', () => {
      const largeMemberList: ScoutMember[] = Array.from({ length: 100 }, (_, i) => ({
        identity: `V-${10000000 + i}`,
        first_names: `Member ${i}`,
        last_names: `Scout`,
        birth_date: '2005-01-01',
        member_type: 'young',
        status: 'active',
        batch_id: 101
      }));

      const result = assignBatchRecognitionCodes(largeMemberList, 'auto');
      const codes = result.map(m => m.recognition_code);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(100);
    });
  });

  describe('inferBatchCodeMode', () => {
    const baseMember: ScoutMember = {
      identity: '12345678',
      first_names: 'Ana',
      last_names: 'Perez',
      birth_date: '2005-01-01',
      member_type: 'young',
      status: 'active',
      batch_id: 101
    };

    it('uses explicit batch.code_mode when present', () => {
      expect(
        inferBatchCodeMode([{ ...baseMember, recognition_code: 'REC-ABCDEF' }], {
          code_mode: 'manual'
        })
      ).toBe('manual');
      expect(
        inferBatchCodeMode([{ ...baseMember, recognition_code: 'SP-001' }], {
          code_mode: 'auto'
        })
      ).toBe('auto');
    });

    it('infers auto for empty/all-pending batches, 6-char REC codes, and legacy 4-digit/EXC exceptional codes', () => {
      expect(inferBatchCodeMode([{ ...baseMember, status: 'pending', recognition_code: '' }])).toBe(
        'auto'
      );
      expect(
        inferBatchCodeMode([
          { ...baseMember, recognition_code: 'REC-8F3A2B' },
          { ...baseMember, identity: '222', status: 'exceptional', recognition_code: 'REC-1234' },
          { ...baseMember, identity: '333', status: 'exceptional', recognition_code: 'REC-EXC' }
        ])
      ).toBe('auto');
    });

    it('infers manual when any assigned code does not match auto/legacy patterns', () => {
      expect(
        inferBatchCodeMode([
          { ...baseMember, recognition_code: 'REC-8F3A2B' },
          { ...baseMember, identity: '222', recognition_code: 'SP-5Y-001' }
        ])
      ).toBe('manual');
    });
  });

  describe('generateUniqueRecognitionCode', () => {
    it('generates a 6-char auto code distinct from existing and excluded codes', () => {
      const code = generateUniqueRecognitionCode(['REC-AAAAAA', 'REC-BBBBBB'], ['REC-CCCCCC']);
      expect(code).toMatch(AUTO_CODE_PATTERN);
      expect(['REC-AAAAAA', 'REC-BBBBBB', 'REC-CCCCCC']).not.toContain(code);
    });
  });

  describe('validateManualRecognitionCode', () => {
    it('normalizes valid codes and rejects empty, excluded, and duplicate codes', () => {
      expect(validateManualRecognitionCode(' sp-001 ', ['SP-002'], ['SP-OLD'])).toEqual({
        normalized: 'SP-001',
        error: null
      });
      expect(validateManualRecognitionCode('   ', []).error).toBe(
        'Debe ingresar un código de reconocimiento.'
      );
      expect(validateManualRecognitionCode('sp-old', [], ['SP-OLD']).error).toBe(
        'El nuevo código no puede ser igual al código excepcional anterior.'
      );
      expect(validateManualRecognitionCode('sp-002', ['SP-002']).error).toBe(
        'Este código ya está asignado a otro miembro del lote.'
      );
    });
  });
});
