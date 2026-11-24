import { describe, it, expect } from 'vitest';
import { deduplicateMergedMembers, findCrossIdentityCodeConflicts } from '../memberMerge';
import { Batch, ScoutMember } from '../../types';

const makeBatch = (id: number, created_at: string, group_id = 0): Batch => ({
  id,
  region_id: 1,
  district_id: 1,
  group_id,
  recognition_type: 'servicio',
  created_at
});

const makeMember = (overrides: Partial<ScoutMember>): ScoutMember => ({
  identity: '12345678',
  first_names: 'Ana',
  last_names: 'Perez',
  birth_date: '2005-01-01',
  member_type: 'young',
  status: 'active',
  batch_id: 100,
  ...overrides
});

describe('memberMerge utilities', () => {
  it('resolves colliding non-generic cedulas by status priority (active > exceptional > pending) regardless of batch order', () => {
    const oldBatch = makeBatch(100, '2026-01-01T10:00:00.000Z');
    const midBatch = makeBatch(101, '2026-02-01T10:00:00.000Z');
    const newBatch = makeBatch(102, '2026-03-01T10:00:00.000Z');

    const activeMember = makeMember({
      identity: 'V-12.345.678',
      status: 'active',
      recognition_code: 'REC-ACTIVE',
      batch_id: 100
    });
    const exceptionalMember = makeMember({
      identity: '12345678',
      status: 'exceptional',
      recognition_code: 'REC-EXCEP1',
      batch_id: 101
    });
    const pendingMember = makeMember({
      identity: '12345678',
      first_names: 'Usuario',
      last_names: 'No Registrado',
      status: 'pending',
      batch_id: 102
    });

    const result = deduplicateMergedMembers(
      [
        { batch: newBatch, members: [pendingMember] },
        { batch: midBatch, members: [exceptionalMember] },
        { batch: oldBatch, members: [activeMember] }
      ],
      { targetBatchId: 999, targetUserId: 'uid-1' }
    );

    expect(result.survivingMembers).toHaveLength(1);
    expect(result.duplicateCount).toBe(2);
    expect(result.survivingMembers[0].status).toBe('active');
    expect(result.survivingMembers[0].identity).toBe('V-12.345.678');
    expect(result.survivingMembers[0].recognition_code).toBe('REC-ACTIVE');
    expect(result.survivingMembers[0].batch_id).toBe(999);
    expect(result.survivingMembers[0].user_id).toBe('uid-1');
    expect(result.allSourceDocIds).toEqual(
      new Set(['100_V-12.345.678', '101_12345678', '102_12345678'])
    );
  });

  it('tie-breaks equal status by newest created_at, then highest numeric batch.id', () => {
    const bOld = makeBatch(200, '2026-01-01T10:00:00.000Z');
    const bNewLowId = makeBatch(9, '2026-05-01T10:00:00.000Z');
    const bNewHighId = makeBatch(10, '2026-05-01T10:00:00.000Z');

    const result = deduplicateMergedMembers([
      { batch: bOld, members: [makeMember({ first_names: 'Old', batch_id: 200 })] },
      { batch: bNewLowId, members: [makeMember({ first_names: 'LowId', batch_id: 9 })] },
      { batch: bNewHighId, members: [makeMember({ first_names: 'HighId', batch_id: 10 })] }
    ]);

    expect(result.survivingMembers).toHaveLength(1);
    expect(result.survivingMembers[0].first_names).toBe('HighId');
  });

  it('inherits recognition_code only within the same status tier (never copying exceptional code into active)', () => {
    const oldBatch = makeBatch(100, '2026-01-01T00:00:00.000Z');
    const newBatch = makeBatch(101, '2026-02-01T00:00:00.000Z');

    // Active winner with empty code vs Exceptional loser with code -> MUST NOT inherit
    const crossTier = deduplicateMergedMembers([
      {
        batch: oldBatch,
        members: [makeMember({ status: 'exceptional', recognition_code: 'REC-EXC111', batch_id: 100 })]
      },
      {
        batch: newBatch,
        members: [makeMember({ status: 'active', recognition_code: '', batch_id: 101 })]
      }
    ]);
    expect(crossTier.survivingMembers[0].status).toBe('active');
    expect(crossTier.survivingMembers[0].recognition_code).toBe('');

    // Active winner with empty code vs Older Active loser with code -> inherits
    const sameTier = deduplicateMergedMembers([
      {
        batch: oldBatch,
        members: [makeMember({ status: 'active', recognition_code: 'REC-ACT111', batch_id: 100 })]
      },
      {
        batch: newBatch,
        members: [makeMember({ status: 'active', recognition_code: '', batch_id: 101 })]
      }
    ]);
    expect(sameTier.survivingMembers[0].recognition_code).toBe('REC-ACT111');
  });

  it('preserves all generic-identity members and disambiguates colliding generic doc IDs', () => {
    const b1 = makeBatch(100, '2026-01-01T00:00:00.000Z');
    const b2 = makeBatch(101, '2026-02-01T00:00:00.000Z');

    const m1 = makeMember({
      identity: 'S/C',
      first_names: 'Juan',
      last_names: 'Perez',
      recognition_code: 'SP-001',
      batch_id: 100
    });
    const m2 = makeMember({
      identity: 'S/C',
      first_names: 'Juan',
      last_names: 'Perez',
      recognition_code: 'SP-001',
      batch_id: 101
    });

    const result = deduplicateMergedMembers(
      [
        { batch: b1, members: [m1] },
        { batch: b2, members: [m2] }
      ],
      { targetBatchId: 500 }
    );

    expect(result.survivingMembers).toHaveLength(2);
    expect(result.duplicateCount).toBe(0);
    expect(result.survivingEntries.map((e) => e.docId)).toEqual(['500_SP-001', '500_SP-001_2']);
  });

  it('defaults undefined status rank to 0 without throwing', () => {
    const b1 = makeBatch(100, '2026-01-01T00:00:00.000Z');
    const b2 = makeBatch(101, '2026-02-01T00:00:00.000Z');

    const noStatusMember = {
      ...makeMember({ batch_id: 100 }),
      status: undefined as unknown as ScoutMember['status']
    };
    const pendingMember = makeMember({ status: 'pending', batch_id: 101 });

    const result = deduplicateMergedMembers([
      { batch: b1, members: [noStatusMember] },
      { batch: b2, members: [pendingMember] }
    ]);

    expect(result.survivingMembers[0].status).toBe('pending');
  });

  it('detects cross-identity duplicate manual recognition codes', () => {
    const m1 = makeMember({ identity: '111', recognition_code: 'SP-001' });
    const m2 = makeMember({ identity: '222', recognition_code: 'sp-001' });
    const m3 = makeMember({ identity: '333', recognition_code: 'SP-002' });

    const conflicts = findCrossIdentityCodeConflicts([m1, m2, m3]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].code).toBe('SP-001');
    expect(conflicts[0].members).toHaveLength(2);
  });
});
