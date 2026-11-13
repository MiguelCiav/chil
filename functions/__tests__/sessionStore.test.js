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

  it('saveSession persists encrypted payload without password', async () => {
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

  it('getSessionMetadata returns active state with ISO timestamp', async () => {
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
    expect(meta).toEqual({
      connected: true,
      status: 'active',
      impeesaEmail: 'scout@scouts.org.ve',
      updatedAt: '2026-11-12T10:00:00.000Z'
    });
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

  it('markSessionExpired updates existing doc status to expired', async () => {
    mockDocRef.get.mockResolvedValueOnce({ exists: true });

    await sessionStore.markSessionExpired('uid-1');
    expect(mockDocRef.update).toHaveBeenCalledWith({
      status: 'expired',
      updatedAt: 'SERVER_TIMESTAMP'
    });
  });

  it('deleteSession deletes document for UID', async () => {
    await sessionStore.deleteSession('uid-1');
    expect(mockCollection.doc).toHaveBeenCalledWith('uid-1');
    expect(mockDocRef.delete).toHaveBeenCalled();
  });
});
