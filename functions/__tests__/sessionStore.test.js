// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const admin = require('firebase-admin');
const sessionStore = require('../scraper/sessionStore');

describe('scraper sessionStore module', () => {
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

    vi.spyOn(admin, 'firestore').mockReturnValue({
      collection: vi.fn().mockReturnValue(mockCollection)
    });
    if (admin.firestore.FieldValue) {
      vi.spyOn(admin.firestore.FieldValue, 'serverTimestamp').mockImplementation(
        serverTimestampMock
      );
    } else {
      admin.firestore.FieldValue = { serverTimestamp: serverTimestampMock };
    }
  });

  it('saveSession persists encrypted payload without password and warms cache', async () => {
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

    expect(mockCollection.doc).toHaveBeenCalledWith('uid-1');
    const savedArg = mockDocRef.set.mock.calls[0][0];
    expect(savedArg).toEqual({
      impeesaEmail: 'scout@scouts.org.ve',
      encrypted,
      status: 'active',
      updatedAt: 'SERVER_TIMESTAMP'
    });
    expect(savedArg).not.toHaveProperty('password');

    // Subsequent envelope read hits warm cache without calling Firestore get()
    const envelope = await sessionStore.getSessionEnvelope('uid-1');
    expect(envelope).toEqual({
      status: 'active',
      impeesaEmail: 'scout@scouts.org.ve',
      encrypted
    });
    expect(mockDocRef.get).not.toHaveBeenCalled();
  });

  it('getSessionMetadata returns disconnected none state when doc does not exist', async () => {
    mockDocRef.get.mockResolvedValueOnce({ exists: false });

    const meta = await sessionStore.getSessionMetadata('uid-missing');
    expect(meta).toEqual({
      connected: false,
      status: 'none',
      impeesaEmail: null,
      updatedAt: null
    });
  });

  it('getSessionMetadata returns active state with ISO timestamp and caches subsequent reads within TTL', async () => {
    mockDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        impeesaEmail: 'scout@scouts.org.ve',
        status: 'active',
        encrypted: { iv: 'a', authTag: 'b', ciphertext: 'c', keyVersion: 1 },
        updatedAt: { toDate: () => new Date('2026-11-12T10:00:00.000Z') }
      })
    });

    const meta = await sessionStore.getSessionMetadata('uid-1');
    const env = await sessionStore.getSessionEnvelope('uid-1');

    expect(meta).toEqual({
      connected: true,
      status: 'active',
      impeesaEmail: 'scout@scouts.org.ve',
      updatedAt: '2026-11-12T10:00:00.000Z'
    });
    expect(env?.status).toBe('active');
    expect(mockDocRef.get).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent reads for the same UID into a single Firestore get()', async () => {
    let resolveGet;
    mockDocRef.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGet = resolve;
        })
    );

    const p1 = sessionStore.getSessionMetadata('uid-concurrent');
    const p2 = sessionStore.getSessionEnvelope('uid-concurrent');

    expect(mockDocRef.get).toHaveBeenCalledTimes(1);
    resolveGet({
      exists: true,
      data: () => ({
        impeesaEmail: 'scout@scouts.org.ve',
        status: 'active',
        encrypted: { iv: 'a', authTag: 'b', ciphertext: 'c', keyVersion: 1 }
      })
    });

    const [meta, env] = await Promise.all([p1, p2]);
    expect(meta.connected).toBe(true);
    expect(env?.status).toBe('active');
  });

  it('getSessionMetadata returns connected=false when session is marked expired', async () => {
    mockDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        impeesaEmail: 'scout@scouts.org.ve',
        status: 'expired',
        encrypted: { iv: 'a' }
      })
    });

    const meta = await sessionStore.getSessionMetadata('uid-1');
    expect(meta.connected).toBe(false);
    expect(meta.status).toBe('expired');
    expect(meta.impeesaEmail).toBe('scout@scouts.org.ve');
  });

  it('markSessionExpired updates existing doc directly without a prior get() and updates cache', async () => {
    await sessionStore.saveSession('uid-1', {
      impeesaEmail: 'scout@scouts.org.ve',
      encrypted: { iv: 'a', authTag: 'b', ciphertext: 'c', keyVersion: 1 }
    });

    await sessionStore.markSessionExpired('uid-1');
    expect(mockDocRef.get).not.toHaveBeenCalled();
    expect(mockDocRef.update).toHaveBeenCalledWith({
      status: 'expired',
      updatedAt: 'SERVER_TIMESTAMP'
    });

    const meta = await sessionStore.getSessionMetadata('uid-1');
    expect(meta.connected).toBe(false);
    expect(meta.status).toBe('expired');
  });

  it('markSessionExpired ignores NOT_FOUND errors gracefully without creating a stub doc', async () => {
    const notFoundErr = Object.assign(new Error('5 NOT_FOUND: No document to update'), {
      code: 5
    });
    mockDocRef.update.mockRejectedValueOnce(notFoundErr);

    await expect(sessionStore.markSessionExpired('uid-missing')).resolves.toBeUndefined();
    expect(mockDocRef.set).not.toHaveBeenCalled();
  });

  it('deleteSession deletes document for UID and evicts cache', async () => {
    await sessionStore.saveSession('uid-1', {
      impeesaEmail: 'scout@scouts.org.ve',
      encrypted: { iv: 'a', authTag: 'b', ciphertext: 'c', keyVersion: 1 }
    });

    await sessionStore.deleteSession('uid-1');
    expect(mockCollection.doc).toHaveBeenCalledWith('uid-1');
    expect(mockDocRef.delete).toHaveBeenCalled();

    mockDocRef.get.mockResolvedValueOnce({ exists: false });
    const meta = await sessionStore.getSessionMetadata('uid-1');
    expect(meta.status).toBe('none');
    expect(mockDocRef.get).toHaveBeenCalledTimes(1);
  });
});
