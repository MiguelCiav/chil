import { describe, it, expect, vi } from 'vitest';
import {
  runVerificationPool,
  applyReverificationResult,
  isReverifiableMember
} from '../scraperVerificationPool';
import type { ScraperMemberDetails } from '../../api/scraperApi';
import { ScoutMember } from '../../types';

const basePending: ScoutMember = {
  identity: 'V-12345678',
  first_names: 'Usuario',
  last_names: 'No Registrado',
  birth_date: '1990-01-01',
  member_type: 'young',
  unit: 'tropa',
  status: 'pending',
  verified_in_registry: true,
  batch_id: 101,
  user_id: 'user-1',
  region_id: 0,
  district_id: 0,
  group_id: 0
};

const activeScraped: ScraperMemberDetails = {
  cedula: '12345678',
  nombre_completo: 'Ana Maria Perez Gomez',
  status: 'Activo',
  fecha_nacimiento: '2008-03-15',
  correo_electronico: '',
  telefono: '',
  region: 'Metropolitana',
  distrito: 'Chacao',
  grupo: 'San Jorge',
  unidad: 'Tropa',
  solvente_hasta: '2026-12-31'
};

const inactiveScraped: ScraperMemberDetails = {
  ...activeScraped,
  status: 'Inactivo',
  solvente_hasta: ''
};

describe('scraperVerificationPool utilities', () => {
  describe('runVerificationPool', () => {
    it('returns empty results immediately for empty input', async () => {
      const verifyItem = vi.fn();
      const { results, sessionError } = await runVerificationPool({
        items: [],
        verifyItem
      });
      expect(results.size).toBe(0);
      expect(sessionError).toBeNull();
      expect(verifyItem).not.toHaveBeenCalled();
    });

    it('runs item 0 as a probe and fails fast without starting worker pool on abort error', async () => {
      const probeError = new Error('session expired');
      const verifyItem = vi.fn().mockRejectedValue(probeError);
      const { results, sessionError } = await runVerificationPool({
        items: ['1', '2', '3', '4'],
        verifyItem,
        shouldAbort: (err) => err === probeError
      });

      expect(verifyItem).toHaveBeenCalledTimes(1);
      expect(verifyItem).toHaveBeenCalledWith('1');
      expect(results.size).toBe(0);
      expect(sessionError).toBe(probeError);
    });

    it('processes remaining items with bounded concurrency and reports progress', async () => {
      const progressCalls: Array<{ current: number; total: number }> = [];
      const verifyItem = vi.fn(async (id: string) => `res-${id}`);

      const { results, sessionError } = await runVerificationPool({
        items: ['1', '2', '3', '4', '5'],
        verifyItem,
        concurrency: 2,
        onProgress: (p) => progressCalls.push(p)
      });

      expect(sessionError).toBeNull();
      expect(results.size).toBe(5);
      expect(results.get('5')).toBe('res-5');
      expect(progressCalls).toHaveLength(5);
      expect(progressCalls[4]).toEqual({ current: 5, total: 5 });
    });

    it('preserves completed results when mid-batch abort triggers', async () => {
      const abortErr = new Error('expired mid-batch');
      const verifyItem = vi.fn(async (id: string) => {
        if (id === '2') throw abortErr;
        return `ok-${id}`;
      });

      const { results, sessionError } = await runVerificationPool({
        items: ['1', '2', '3', '4'],
        verifyItem,
        concurrency: 1,
        shouldAbort: (err) => err === abortErr
      });

      expect(results.get('1')).toBe('ok-1');
      expect(results.has('3')).toBe(false);
      expect(sessionError).toBe(abortErr);
    });

    it('stops dequeuing when isCancelled returns true', async () => {
      let cancelled = false;
      const verifyItem = vi.fn(async (id: string) => {
        if (id === '1') cancelled = true;
        return `ok-${id}`;
      });

      const { results, sessionError } = await runVerificationPool({
        items: ['1', '2', '3'],
        verifyItem,
        isCancelled: () => cancelled
      });

      expect(results.size).toBe(1);
      expect(results.get('1')).toBe('ok-1');
      expect(sessionError).toBeNull();
    });
  });

  describe('isReverifiableMember', () => {
    it('allows non-generic pending and exceptional Scout members', () => {
      expect(isReverifiableMember(basePending)).toBe(true);
      expect(isReverifiableMember({ ...basePending, status: 'exceptional' })).toBe(true);
    });

    it('excludes active, no_scout, and generic-identity members', () => {
      expect(isReverifiableMember({ ...basePending, status: 'active' })).toBe(false);
      expect(isReverifiableMember({ ...basePending, unit: 'no_scout' })).toBe(false);
      expect(isReverifiableMember({ ...basePending, identity: 'S/C' })).toBe(false);
    });
  });

  describe('applyReverificationResult', () => {
    it('activates pending member, preserves legacy V- identity, overwrites empty contact fields, and drops legacy fields', () => {
      const pendingWithManualFields: ScoutMember = {
        ...basePending,
        email: 'manual@example.com',
        phone: '04141112222',
        unit_id: 99,
        member_category: 'old-cat',
        entry_date: '2020-01-01'
      };

      const outcome = applyReverificationResult(pendingWithManualFields, activeScraped);
      expect(outcome.kind).toBe('activated');
      expect(outcome.wasExceptional).toBe(false);
      expect(outcome.member.identity).toBe('V-12345678');
      expect(outcome.member.status).toBe('active');
      expect(outcome.member.first_names).toBe('Ana Maria');
      expect(outcome.member.last_names).toBe('Perez Gomez');
      expect(outcome.member.email).toBe('');
      expect(outcome.member.phone).toBe('');
      expect(outcome.member.recognition_code).toBeUndefined();
      expect(outcome.member.unit_id).toBeUndefined();
      expect(outcome.member.member_category).toBeUndefined();
      expect(outcome.member.entry_date).toBeUndefined();
    });

    it('activates exceptional member, clears exceptional_reason, and carries previousCode', () => {
      const exceptionalMember: ScoutMember = {
        ...basePending,
        status: 'exceptional',
        recognition_code: 'REC-OLD999',
        exceptional_reason: 'Autorizado por comisaria'
      };

      const outcome = applyReverificationResult(exceptionalMember, activeScraped);
      expect(outcome.kind).toBe('activated');
      expect(outcome.wasExceptional).toBe(true);
      expect(outcome.previousCode).toBe('REC-OLD999');
      expect(outcome.member.status).toBe('active');
      expect(outcome.member.exceptional_reason).toBeUndefined();
      expect(outcome.member.recognition_code).toBeUndefined();
    });

    it('refreshes pending placeholder on Inactivo and detects unchanged no-op on second pass', () => {
      const first = applyReverificationResult(basePending, inactiveScraped);
      expect(first.kind).toBe('refreshed_pending');
      expect(first.member.status).toBe('pending');
      expect(first.member.first_names).toBe('Ana Maria');
      expect(first.member.recognition_code).toBeUndefined();

      const second = applyReverificationResult(first.member, inactiveScraped);
      expect(second.kind).toBe('unchanged');
      expect(second.member).toBe(first.member);
    });

    it('leaves pending unchanged when Impeesa returns null (No registrado)', () => {
      const outcome = applyReverificationResult(basePending, null);
      expect(outcome.kind).toBe('unchanged');
      expect(outcome.member).toBe(basePending);
    });

    it('leaves exceptional untouched when Impeesa returns Inactivo or null', () => {
      const exceptionalMember: ScoutMember = {
        ...basePending,
        first_names: 'Nombre Manual',
        status: 'exceptional',
        recognition_code: 'SP-001',
        exceptional_reason: 'Motivo valido'
      };

      const onInactive = applyReverificationResult(exceptionalMember, inactiveScraped);
      expect(onInactive.kind).toBe('unchanged');
      expect(onInactive.member).toBe(exceptionalMember);

      const onNotFound = applyReverificationResult(exceptionalMember, null);
      expect(onNotFound.kind).toBe('unchanged');
      expect(onNotFound.member).toBe(exceptionalMember);
    });
  });
});
