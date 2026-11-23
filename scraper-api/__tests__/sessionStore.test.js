// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const firebaseAdmin = require('../lib/firebaseAdmin');
const sessionStore = require('../lib/sessionStore');

describe('scraper-api sessionStore module', () => {
  let mockDocRef;
  let mockCollection;
  let serverTimestampMock;

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStore.clearSessionCache();
    mockDocRef = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    };
    mockCollection = {
      doc: vi.fn().mockReturnValue(mockDocRef)
    };
    serverTimestampMock = vi.fn().mockReturnValue('SERVER_TIMESTAMP');

    vi.spyOn(firebaseAdmin, 'getFirestore').mockReturnValue({
      collection: vi.fn().mockReturnValue(mockCollection)
    });
    vi.spyOn(firebaseAdmin, 'getAdmin').mockReturnValue({
      firestore: {
        FieldValue: {
          serverTimestamp: serverTimestampMock
        }
      }
    });
  });

  it('saveSession persists encrypted payload and warms in-memory cache', async () => {
    const encrypted = {
      iv: 'iv123',
      authTag: 'tag123',
      ciphertext: 'cipher123',
      keyVersion: 1
    };

    await sessionStore.saveSession('uid-1', {
      impeesaEmail: 'scout@scouts.org.ve',
      encrypted
    });

    expect(mockDocRef.set).toHaveBeenCalledWith({
      impeesaEmail: 'scout@scouts.org.ve',
      encrypted,
      status: 'active',
      updatedAt: 'SERVER_TIMESTAMP'
    });

    const envelope = await sessionStore.getSessionEnvelope('uid-1');
    expect(envelope).toEqual({
      status: 'active',
      impeesaEmail: 'scout@scouts.org.ve',
      encrypted
    });
    expect(mockDocRef.get).not.toHaveBeenCalled();
  });

  it('caches repeated reads within 2-minute TTL and coalesces concurrent reads', async () => {
    let resolveGet;
    mockDocRef.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGet = resolve;
        })
    );

    const p1 = sessionStore.getSessionMetadata('uid-ttl');
    const p2 = sessionStore.getSessionEnvelope('uid-ttl');
    expect(mockDocRef.get).toHaveBeenCalledTimes(1);

    resolveGet({
      exists: true,
      data: () => ({
        impeesaEmail: 'scout@scouts.org.ve',
        status: 'active',
        encrypted: { iv: 'a', authTag: 'b', ciphertext: 'c', keyVersion: 1 },
        updatedAt: { toDate: () => new Date('2026-11-22T12:00:00.000Z') }
      })
    });

    const [meta, env] = await Promise.all([p1, p2]);
    expect(meta.connected).toBe(true);
    expect(meta.updatedAt).toBe('2026-11-22T12:00:00.000Z');
    expect(env?.status).toBe('active');

    await sessionStore.getSessionEnvelope('uid-ttl');
    expect(mockDocRef.get).toHaveBeenCalledTimes(1);
  });

  it('markSessionExpired updates doc without get() and ignores NOT_FOUND gracefully', async () => {
    await sessionStore.saveSession('uid-1', {
      impeesaEmail: 'scout@scouts.org.ve',
      encrypted: { iv: 'a' }
    });

    await sessionStore.markSessionExpired('uid-1');
    expect(mockDocRef.get).not.toHaveBeenCalled();
    expect(mockDocRef.update).toHaveBeenCalledWith({
      status: 'expired',
      updatedAt: 'SERVER_TIMESTAMP'
    });
    const meta = await sessionStore.getSessionMetadata('uid-1');
    expect(meta.status).toBe('expired');
    expect(meta.connected).toBe(false);

    mockDocRef.update.mockRejectedValueOnce(
      Object.assign(new Error('NOT_FOUND'), { code: 5 })
    );
    await expect(sessionStore.markSessionExpired('uid-absent')).resolves.toBeUndefined();
  });

  it('deleteSession deletes document and evicts cache entry', async () => {
    await sessionStore.saveSession('uid-1', {
      impeesaEmail: 'scout@scouts.org.ve',
      encrypted: { iv: 'a' }
    });

    await sessionStore.deleteSession('uid-1');
    expect(mockDocRef.delete).toHaveBeenCalledTimes(1);

    mockDocRef.get.mockResolvedValueOnce({ exists: false });
    const meta = await sessionStore.getSessionMetadata('uid-1');
    expect(meta.status).toBe('none');
    expect(mockDocRef.get).toHaveBeenCalledTimes(1);
  });
});
