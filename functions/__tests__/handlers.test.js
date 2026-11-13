// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const crypto = require('crypto');

const auth = require('../scraper/auth');
const lookup = require('../scraper/lookup');
const cryptoModule = require('../scraper/crypto');
const sessionStore = require('../scraper/sessionStore');

const {
  saveScraperSessionHandler,
  saveScraperSession
} = require('../handlers/saveScraperSession');
const {
  getScraperSessionStatusHandler,
  getScraperSessionStatus
} = require('../handlers/getScraperSessionStatus');
const {
  clearScraperSessionHandler,
  clearScraperSession
} = require('../handlers/clearScraperSession');
const {
  getMemberStatusHandler,
  getMemberStatus
} = require('../handlers/getMemberStatus');

describe('Cloud Function Handlers', () => {
  const testKeyBase64 = crypto.randomBytes(32).toString('base64');

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(cryptoModule.SCRAPER_ENCRYPTION_KEY, 'value').mockReturnValue(
      testKeyBase64
    );
  });

  describe('saveScraperSessionHandler', () => {
    it('exports saveScraperSession onCall callable', () => {
      expect(saveScraperSession).toBeDefined();
    });

    it('throws unauthenticated when Firebase user UID is missing', async () => {
      await expect(
        saveScraperSessionHandler({
          data: { email: 'scout@test.com', password: 'secret' }
        })
      ).rejects.toMatchObject({ code: 'unauthenticated' });
    });

    it('throws invalid-argument when Impeesa email or password is missing', async () => {
      await expect(
        saveScraperSessionHandler({
          auth: { uid: 'uid-1' },
          data: { email: 'scout@test.com' }
        })
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    it('authenticates once, encrypts cookies, saves without password, and returns active status', async () => {
      vi.spyOn(auth, 'performLogin').mockResolvedValueOnce({
        _session_id: 'impeesa_cookie_123'
      });
      const saveSpy = vi
        .spyOn(sessionStore, 'saveSession')
        .mockResolvedValueOnce(undefined);

      const result = await saveScraperSessionHandler({
        auth: { uid: 'uid-1' },
        data: { email: 'scout@test.com', password: 'secretpassword' }
      });

      expect(auth.performLogin).toHaveBeenCalledWith(
        'scout@test.com',
        'secretpassword'
      );
      expect(saveSpy).toHaveBeenCalledTimes(1);
      const [savedUid, savedPayload] = saveSpy.mock.calls[0];
      expect(savedUid).toBe('uid-1');
      expect(savedPayload.impeesaEmail).toBe('scout@test.com');
      expect(savedPayload).not.toHaveProperty('password');
      expect(
        cryptoModule.decryptSessionPayload('uid-1', savedPayload.encrypted)
      ).toEqual({
        _session_id: 'impeesa_cookie_123'
      });

      expect(result).toMatchObject({
        connected: true,
        status: 'active',
        impeesaEmail: 'scout@test.com'
      });
    });

    it('throws unauthenticated when Impeesa login credentials are invalid', async () => {
      vi.spyOn(auth, 'performLogin').mockRejectedValueOnce(
        new Error('Credenciales incorrectas o inicio de sesión fallido')
      );

      await expect(
        saveScraperSessionHandler({
          auth: { uid: 'uid-1' },
          data: { email: 'scout@test.com', password: 'wrong' }
        })
      ).rejects.toMatchObject({ code: 'unauthenticated' });
    });
  });

  describe('getScraperSessionStatusHandler', () => {
    it('exports getScraperSessionStatus onCall callable', () => {
      expect(getScraperSessionStatus).toBeDefined();
    });

    it('throws unauthenticated when caller is not signed in', async () => {
      await expect(
        getScraperSessionStatusHandler({ data: {} })
      ).rejects.toMatchObject({ code: 'unauthenticated' });
    });

    it('returns non-secret metadata from sessionStore', async () => {
      const mockStatus = {
        connected: true,
        status: 'active',
        impeesaEmail: 'scout@test.com',
        updatedAt: '2026-11-12T10:00:00.000Z'
      };
      vi.spyOn(sessionStore, 'getSessionMetadata').mockResolvedValueOnce(
        mockStatus
      );

      const result = await getScraperSessionStatusHandler({
        auth: { uid: 'uid-1' },
        data: {}
      });

      expect(result).toEqual(mockStatus);
      expect(sessionStore.getSessionMetadata).toHaveBeenCalledWith('uid-1');
    });
  });

  describe('clearScraperSessionHandler', () => {
    it('exports clearScraperSession onCall callable', () => {
      expect(clearScraperSession).toBeDefined();
    });

    it('throws unauthenticated when caller is not signed in', async () => {
      await expect(clearScraperSessionHandler({ data: {} })).rejects.toMatchObject({
        code: 'unauthenticated'
      });
    });

    it('deletes session and returns disconnected status', async () => {
      const deleteSpy = vi
        .spyOn(sessionStore, 'deleteSession')
        .mockResolvedValueOnce(undefined);

      const result = await clearScraperSessionHandler({
        auth: { uid: 'uid-1' },
        data: {}
      });

      expect(deleteSpy).toHaveBeenCalledWith('uid-1');
      expect(result).toEqual({
        connected: false,
        status: 'none',
        impeesaEmail: null,
        updatedAt: null
      });
    });
  });

  describe('getMemberStatusHandler', () => {
    it('exports getMemberStatus onCall callable', () => {
      expect(getMemberStatus).toBeDefined();
    });

    it('throws unauthenticated when caller is not signed in', async () => {
      await expect(
        getMemberStatusHandler({ data: { cedula: '12345678' } })
      ).rejects.toMatchObject({ code: 'unauthenticated' });
    });

    it('throws invalid-argument when cedula is missing', async () => {
      await expect(
        getMemberStatusHandler({ auth: { uid: 'uid-1' }, data: {} })
      ).rejects.toMatchObject({
        code: 'invalid-argument',
        message: 'La cédula es requerida'
      });
    });

    it('throws failed-precondition (SCRAPER_NOT_CONFIGURED) when user has no session', async () => {
      vi.spyOn(sessionStore, 'getSessionEnvelope').mockResolvedValueOnce(null);

      await expect(
        getMemberStatusHandler({
          auth: { uid: 'uid-1' },
          data: { cedula: '12345678' }
        })
      ).rejects.toMatchObject({
        code: 'failed-precondition',
        details: { reason: 'SCRAPER_NOT_CONFIGURED' }
      });
    });

    it('throws failed-precondition (SCRAPER_SESSION_EXPIRED) when stored session is expired', async () => {
      vi.spyOn(sessionStore, 'getSessionEnvelope').mockResolvedValueOnce({
        status: 'expired',
        impeesaEmail: 'scout@test.com',
        encrypted: { iv: 'a', authTag: 'b', ciphertext: 'c', keyVersion: 1 }
      });

      await expect(
        getMemberStatusHandler({
          auth: { uid: 'uid-1' },
          data: { cedula: '12345678' }
        })
      ).rejects.toMatchObject({
        code: 'failed-precondition',
        details: { reason: 'SCRAPER_SESSION_EXPIRED' }
      });
    });

    it('decrypts cookies and returns member details on success', async () => {
      const encrypted = cryptoModule.encryptSessionPayload('uid-1', {
        _session_id: 'valid_cookie'
      });
      vi.spyOn(sessionStore, 'getSessionEnvelope').mockResolvedValueOnce({
        status: 'active',
        impeesaEmail: 'scout@test.com',
        encrypted
      });
      const lookupSpy = vi
        .spyOn(lookup, 'fetchMemberStatusWithCookies')
        .mockResolvedValueOnce({
          nombre_completo: 'Maria Perez',
          status: 'Registro válido',
          telefono: '123',
          correo_electronico: 'm@p.com',
          fecha_nacimiento: '2000-01-01'
        });

      const result = await getMemberStatusHandler({
        auth: { uid: 'uid-1' },
        data: { cedula: '12345678' }
      });

      expect(lookupSpy).toHaveBeenCalledWith(
        { _session_id: 'valid_cookie' },
        '12345678'
      );
      expect(result.nombre_completo).toBe('Maria Perez');
    });

    it('marks session expired and throws failed-precondition when Impeesa rejects cookies', async () => {
      const encrypted = cryptoModule.encryptSessionPayload('uid-1', {
        _session_id: 'stale_cookie'
      });
      vi.spyOn(sessionStore, 'getSessionEnvelope').mockResolvedValueOnce({
        status: 'active',
        impeesaEmail: 'scout@test.com',
        encrypted
      });
      const markExpiredSpy = vi
        .spyOn(sessionStore, 'markSessionExpired')
        .mockResolvedValueOnce(undefined);
      vi.spyOn(lookup, 'fetchMemberStatusWithCookies').mockRejectedValueOnce(
        new Error('Sesión de scraper no autenticada o expirada')
      );

      await expect(
        getMemberStatusHandler({
          auth: { uid: 'uid-1' },
          data: { cedula: '12345678' }
        })
      ).rejects.toMatchObject({
        code: 'failed-precondition',
        details: { reason: 'SCRAPER_SESSION_EXPIRED' }
      });

      expect(markExpiredSpy).toHaveBeenCalledWith('uid-1');
    });

    it('throws not-found when member is "No registrado"', async () => {
      const encrypted = cryptoModule.encryptSessionPayload('uid-1', {
        _session_id: 'valid_cookie'
      });
      vi.spyOn(sessionStore, 'getSessionEnvelope').mockResolvedValueOnce({
        status: 'active',
        encrypted
      });
      vi.spyOn(lookup, 'fetchMemberStatusWithCookies').mockRejectedValueOnce(
        new Error('No registrado')
      );

      await expect(
        getMemberStatusHandler({
          auth: { uid: 'uid-1' },
          data: { cedula: '99999999' }
        })
      ).rejects.toMatchObject({
        code: 'not-found',
        message: 'No registrado'
      });
    });

    it('throws internal on network failure', async () => {
      const encrypted = cryptoModule.encryptSessionPayload('uid-1', {
        _session_id: 'valid_cookie'
      });
      vi.spyOn(sessionStore, 'getSessionEnvelope').mockResolvedValueOnce({
        status: 'active',
        encrypted
      });
      vi.spyOn(lookup, 'fetchMemberStatusWithCookies').mockRejectedValueOnce(
        new Error('Network Timeout')
      );

      await expect(
        getMemberStatusHandler({
          auth: { uid: 'uid-1' },
          data: { cedula: '12345678' }
        })
      ).rejects.toMatchObject({
        code: 'internal',
        message: 'Network Timeout'
      });
    });
  });
});
