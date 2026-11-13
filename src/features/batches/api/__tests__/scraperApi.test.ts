import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { httpsCallable } from 'firebase/functions';
import {
  getScraperSessionStatus,
  saveScraperSession,
  clearScraperSession,
  getMemberStatus,
  isScraperSessionError,
  purgeLegacyScraperStorage
} from '../scraperApi';

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn()
}));

const mockGetIdToken = vi.fn().mockResolvedValue('firebase-id-token-123');

vi.mock('../../../../lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'uid-123',
      getIdToken: () => mockGetIdToken()
    }
  },
  functions: { app: {} }
}));

describe('scraperApi (Dual Transport: Firebase Callable + Vercel API)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue('firebase-id-token-123');
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  describe('Firebase Callable Transport (VITE_SCRAPER_API_URL empty)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_SCRAPER_API_URL', '');
    });

    it('calls getScraperSessionStatus callable and removes legacy storage', async () => {
      window.localStorage.setItem('chil_scraper_credentials', 'secret');
      window.sessionStorage.setItem('chil_scraper_credentials', 'secret');
      const mockCallable = vi.fn().mockResolvedValueOnce({
        data: {
          connected: true,
          status: 'active',
          impeesaEmail: 'scout@scouts.org.ve',
          updatedAt: '2026-11-12T10:00:00.000Z'
        }
      });
      vi.mocked(httpsCallable).mockReturnValueOnce(
        mockCallable as unknown as ReturnType<typeof httpsCallable>
      );

      const status = await getScraperSessionStatus();

      expect(httpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'getScraperSessionStatus'
      );
      expect(status.connected).toBe(true);
      expect(window.localStorage.getItem('chil_scraper_credentials')).toBeNull();
      expect(window.sessionStorage.getItem('chil_scraper_credentials')).toBeNull();
    });

    it('calls saveScraperSession without persisting credentials client-side', async () => {
      const mockCallable = vi.fn().mockResolvedValueOnce({
        data: {
          connected: true,
          status: 'active',
          impeesaEmail: 'scout@scouts.org.ve',
          updatedAt: '2026-11-12T10:00:00.000Z'
        }
      });
      vi.mocked(httpsCallable).mockReturnValueOnce(
        mockCallable as unknown as ReturnType<typeof httpsCallable>
      );

      const result = await saveScraperSession({
        email: 'scout@scouts.org.ve',
        password: 'my-secret-password'
      });

      expect(httpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'saveScraperSession'
      );
      expect(mockCallable).toHaveBeenCalledWith({
        email: 'scout@scouts.org.ve',
        password: 'my-secret-password'
      });
      expect(result.impeesaEmail).toBe('scout@scouts.org.ve');
      expect(window.sessionStorage.getItem('chil_scraper_credentials')).toBeNull();
    });

    it('calls clearScraperSession callable', async () => {
      const mockCallable = vi.fn().mockResolvedValueOnce({
        data: {
          connected: false,
          status: 'none',
          impeesaEmail: null,
          updatedAt: null
        }
      });
      vi.mocked(httpsCallable).mockReturnValueOnce(
        mockCallable as unknown as ReturnType<typeof httpsCallable>
      );

      const result = await clearScraperSession();

      expect(httpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'clearScraperSession'
      );
      expect(result.status).toBe('none');
    });

    it('calls getMemberStatus with cedula only (no client credentials)', async () => {
      const memberData = {
        nombre_completo: 'Robert Baden-Powell',
        status: 'Activo',
        telefono: '04141234567',
        correo_electronico: 'bp@scouts.org.ve',
        fecha_nacimiento: '1857-02-22'
      };
      const mockCallable = vi.fn().mockResolvedValueOnce({ data: memberData });
      vi.mocked(httpsCallable).mockReturnValueOnce(
        mockCallable as unknown as ReturnType<typeof httpsCallable>
      );

      const res = await getMemberStatus('V-18570222');

      expect(httpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'getMemberStatus'
      );
      expect(mockCallable).toHaveBeenCalledWith({ cedula: 'V-18570222' });
      expect(res).toEqual(memberData);
    });

    it('maps SCRAPER_NOT_CONFIGURED and SCRAPER_SESSION_EXPIRED to ScraperSessionError', async () => {
      const mockCallableNotConfigured = vi.fn().mockRejectedValueOnce({
        code: 'functions/failed-precondition',
        message: 'No hay una sesión de Impeesa configurada',
        details: { reason: 'SCRAPER_NOT_CONFIGURED' }
      });
      vi.mocked(httpsCallable).mockReturnValueOnce(
        mockCallableNotConfigured as unknown as ReturnType<typeof httpsCallable>
      );

      await getMemberStatus('12345678').catch((err) => {
        expect(isScraperSessionError(err)).toBe(true);
        expect(err.reason).toBe('SCRAPER_NOT_CONFIGURED');
      });

      const mockCallableExpired = vi.fn().mockRejectedValueOnce({
        code: 'functions/failed-precondition',
        message: 'Tu sesión de Impeesa expiró.',
        details: { reason: 'SCRAPER_SESSION_EXPIRED' }
      });
      vi.mocked(httpsCallable).mockReturnValueOnce(
        mockCallableExpired as unknown as ReturnType<typeof httpsCallable>
      );

      await getMemberStatus('12345678').catch((err) => {
        expect(isScraperSessionError(err)).toBe(true);
        expect(err.reason).toBe('SCRAPER_SESSION_EXPIRED');
      });

      purgeLegacyScraperStorage();
    });
  });

  describe('Vercel API Transport (VITE_SCRAPER_API_URL set)', () => {
    beforeEach(() => {
      vi.stubEnv(
        'VITE_SCRAPER_API_URL',
        'https://chil-scraper-api.vercel.app/api/'
      );
    });

    it('sends Bearer ID token to getScraperSessionStatus, saveScraperSession, clearScraperSession, and getMemberStatus', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            connected: false,
            status: 'none',
            impeesaEmail: null,
            updatedAt: null
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            connected: true,
            status: 'active',
            impeesaEmail: 'scout@scouts.org.ve',
            updatedAt: '2026-11-12T10:00:00.000Z'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              nombre_completo: 'Robert Baden-Powell',
              status: 'Activo',
              telefono: '04141234567',
              correo_electronico: 'bp@scouts.org.ve',
              fecha_nacimiento: '1857-02-22'
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            connected: false,
            status: 'none',
            impeesaEmail: null,
            updatedAt: null
          })
        });
      global.fetch = fetchMock;

      await getScraperSessionStatus();
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://chil-scraper-api.vercel.app/api/getScraperSessionStatus',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer firebase-id-token-123'
          })
        })
      );

      await saveScraperSession({
        email: 'scout@scouts.org.ve',
        password: 'secret'
      });
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://chil-scraper-api.vercel.app/api/saveScraperSession',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer firebase-id-token-123'
          }),
          body: JSON.stringify({ email: 'scout@scouts.org.ve', password: 'secret' })
        })
      );

      const member = await getMemberStatus('18570222');
      expect(member.nombre_completo).toBe('Robert Baden-Powell');
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        'https://chil-scraper-api.vercel.app/api/getMemberStatus',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ cedula: '18570222' })
        })
      );

      await clearScraperSession();
      expect(fetchMock).toHaveBeenNthCalledWith(
        4,
        'https://chil-scraper-api.vercel.app/api/clearScraperSession',
        expect.objectContaining({ method: 'POST' })
      );
      expect(httpsCallable).not.toHaveBeenCalled();
    });

    it('maps HTTP 412 from Vercel API to ScraperSessionError', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 412,
        json: async () => ({
          error: 'Tu sesión de Impeesa expiró.',
          reason: 'SCRAPER_SESSION_EXPIRED'
        })
      });

      await getMemberStatus('12345678').catch((err) => {
        expect(isScraperSessionError(err)).toBe(true);
        expect(err.reason).toBe('SCRAPER_SESSION_EXPIRED');
      });
    });

    it('throws HTTP 401 invalid credentials and HTTP 404 directly without double mapping', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({
            error: 'Credenciales de Impeesa incorrectas o inicio de sesión fallido',
            reason: 'IMPEESA_INVALID_CREDENTIALS'
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({
            error: 'No registrado'
          })
        });

      await saveScraperSession({ email: 'a@b.com', password: 'bad' }).catch((err) => {
        expect(err).toBeInstanceOf(Error);
        expect(isScraperSessionError(err)).toBe(false);
        expect(err.message).toBe('Credenciales de Impeesa incorrectas o inicio de sesión fallido');
        expect((err as Error & { cause?: unknown }).cause).toBeUndefined();
      });

      await getMemberStatus('99999999').catch((err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('No registrado');
        expect((err as Error & { cause?: unknown }).cause).toBeUndefined();
      });
    });
  });
});
