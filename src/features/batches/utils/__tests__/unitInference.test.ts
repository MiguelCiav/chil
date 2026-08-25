import { describe, it, expect } from 'vitest';
import { calculateAge, inferYouthUnitByAge, inferBatchMemberUnits } from '../unitInference';
import { ScoutMember, ScoutUnit } from '../../types';

describe('unitInference utility', () => {
  describe('calculateAge', () => {
    it('returns null for empty or invalid birth dates', () => {
      expect(calculateAge(undefined)).toBeNull();
      expect(calculateAge('')).toBeNull();
      expect(calculateAge('invalid-date')).toBeNull();
    });

    it('calculates age correctly from YYYY-MM-DD', () => {
      const today = new Date();
      const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
      const formatted = `${tenYearsAgo.getFullYear()}-${String(tenYearsAgo.getMonth() + 1).padStart(2, '0')}-${String(tenYearsAgo.getDate()).padStart(2, '0')}`;
      expect(calculateAge(formatted)).toBe(10);
    });

    it('calculates age correctly from DD/MM/YYYY and DD-MM-YYYY', () => {
      const today = new Date();
      const fifteenYearsAgo = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate());
      const dd = String(fifteenYearsAgo.getDate()).padStart(2, '0');
      const mm = String(fifteenYearsAgo.getMonth() + 1).padStart(2, '0');
      const yyyy = fifteenYearsAgo.getFullYear();

      expect(calculateAge(`${dd}/${mm}/${yyyy}`)).toBe(15);
      expect(calculateAge(`${dd}-${mm}-${yyyy}`)).toBe(15);
    });
  });

  describe('inferYouthUnitByAge', () => {
    it('maps ages correctly to youth units', () => {
      expect(inferYouthUnitByAge(7)).toBe('manada');
      expect(inferYouthUnitByAge(10)).toBe('manada');
      expect(inferYouthUnitByAge(11)).toBe('tropa');
      expect(inferYouthUnitByAge(14)).toBe('tropa');
      expect(inferYouthUnitByAge(15)).toBe('tropa');
      expect(inferYouthUnitByAge(16)).toBe('caminantes');
      expect(inferYouthUnitByAge(18)).toBe('caminantes');
      expect(inferYouthUnitByAge(19)).toBe('clan');
      expect(inferYouthUnitByAge(21)).toBe('clan');
      expect(inferYouthUnitByAge(22)).toBe('institucional');
      expect(inferYouthUnitByAge(null)).toBe('tropa');
    });
  });

  describe('inferBatchMemberUnits', () => {
    const createMember = (
      identity: string,
      member_type: 'young' | 'adult',
      birth_date: string,
      unit?: ScoutUnit
    ): ScoutMember => ({
      identity,
      first_names: `Name ${identity}`,
      last_names: 'Scout',
      birth_date,
      member_type,
      status: 'active',
      unit
    });

    it('returns empty array when members array is empty', () => {
      expect(inferBatchMemberUnits([])).toEqual([]);
    });

    it('assigns unitScope to all members when unit_scope is not mixed', () => {
      const members = [
        createMember('1', 'young', '2015-05-10'),
        createMember('2', 'adult', '1985-05-10')
      ];
      const result = inferBatchMemberUnits(members, 'manada');
      expect(result[0].unit).toBe('manada');
      expect(result[1].unit).toBe('manada');
    });

    it('infers youth units by age in mixed batch and assigns most frequent youth unit to adult', () => {
      const todayYear = new Date().getFullYear();
      const members = [
        // 2 tropa (age 13)
        createMember('1', 'young', `${todayYear - 13}-01-01`),
        createMember('2', 'young', `${todayYear - 13}-01-01`),
        // 1 manada (age 8)
        createMember('3', 'young', `${todayYear - 8}-01-01`),
        // 1 adult (age 30)
        createMember('4', 'adult', `${todayYear - 30}-01-01`)
      ];

      const result = inferBatchMemberUnits(members, 'mixed');
      expect(result[0].unit).toBe('tropa');
      expect(result[1].unit).toBe('tropa');
      expect(result[2].unit).toBe('manada');
      expect(result[3].unit).toBe('tropa'); // most frequent unit among youth
    });

    it('defaults adult to institucional when youth units are tied', () => {
      const todayYear = new Date().getFullYear();
      const members = [
        // 1 manada (age 8)
        createMember('1', 'young', `${todayYear - 8}-01-01`),
        // 1 caminantes (age 17)
        createMember('2', 'young', `${todayYear - 17}-01-01`),
        // 1 adult (age 35)
        createMember('3', 'adult', `${todayYear - 35}-01-01`)
      ];

      const result = inferBatchMemberUnits(members, 'mixed');
      expect(result[0].unit).toBe('manada');
      expect(result[1].unit).toBe('caminantes');
      expect(result[2].unit).toBe('institucional'); // tied -> institucional
    });

    it('defaults adult to institucional when only adults are in the batch', () => {
      const todayYear = new Date().getFullYear();
      const members = [
        createMember('1', 'adult', `${todayYear - 35}-01-01`),
        createMember('2', 'adult', '')
      ];

      const result = inferBatchMemberUnits(members, 'mixed');
      expect(result[0].unit).toBe('institucional');
      expect(result[1].unit).toBe('institucional');
    });

    it('preserves no_scout unit and active status', () => {
      const members = [
        createMember('1', 'adult', '1990-01-01', 'no_scout')
      ];

      const result = inferBatchMemberUnits(members, 'mixed');
      expect(result[0].unit).toBe('no_scout');
      expect(result[0].status).toBe('active');
    });
  });
});
