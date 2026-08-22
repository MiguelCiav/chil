// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = require('../scraper/auth');
const lookup = require('../scraper/lookup');
const { loginScraperHandler, loginScraper } = require('../handlers/loginScraper');
const { getMemberStatusHandler, getMemberStatus } = require('../handlers/getMemberStatus');

describe('Cloud Function Handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('loginScraperHandler', () => {
    it('exports loginScraper onCall callable', () => {
      expect(loginScraper).toBeDefined();
    });

    it('throws invalid-argument when credentials are missing or incomplete', async () => {
      await expect(loginScraperHandler({ data: {} })).rejects.toMatchObject({
        code: 'invalid-argument',
        message: 'Credenciales incompletas'
      });

      await expect(
        loginScraperHandler({ data: { credentials: { email: 'a@b.com' } } })
      ).rejects.toMatchObject({
        code: 'invalid-argument',
        message: 'Credenciales incompletas'
      });
    });

    it('successfully logs in and caches cookies', async () => {
      vi.spyOn(auth, 'performLogin').mockResolvedValueOnce({ _session_id: '123' });
      const setCachedSpy = vi.spyOn(auth, 'setCachedCookies').mockReturnValue();

      const result = await loginScraperHandler({
        data: {
          credentials: { email: 'scout@test.com', password: 'secretpassword' }
        }
      });

      expect(result).toEqual({ success: true });
      expect(auth.performLogin).toHaveBeenCalledWith('scout@test.com', 'secretpassword');
      expect(setCachedSpy).toHaveBeenCalledWith(
        { email: 'scout@test.com', password: 'secretpassword' },
        { _session_id: '123' }
      );
    });

    it('throws unauthenticated when login fails', async () => {
      vi.spyOn(auth, 'performLogin').mockRejectedValueOnce(
        new Error('Credenciales incorrectas')
      );

      await expect(
        loginScraperHandler({
          data: {
            credentials: { email: 'scout@test.com', password: 'wrong' }
          }
        })
      ).rejects.toMatchObject({
        code: 'unauthenticated',
        message: 'Credenciales incorrectas'
      });
    });
  });

  describe('getMemberStatusHandler', () => {
    const validCredentials = { email: 'scout@test.com', password: 'secretpassword' };

    it('exports getMemberStatus onCall callable', () => {
      expect(getMemberStatus).toBeDefined();
    });

    it('throws invalid-argument when cedula is missing', async () => {
      await expect(
        getMemberStatusHandler({ data: { credentials: validCredentials } })
      ).rejects.toMatchObject({
        code: 'invalid-argument',
        message: 'La cédula es requerida'
      });
    });

    it('throws invalid-argument when credentials are missing or incomplete', async () => {
      await expect(
        getMemberStatusHandler({ data: { cedula: '12345678' } })
      ).rejects.toMatchObject({
        code: 'invalid-argument',
        message: 'Las credenciales del scraper son requeridas'
      });
    });

    it('uses cached cookies directly when lookup succeeds', async () => {
      vi.spyOn(auth, 'getCachedCookies').mockReturnValueOnce({ _session_id: 'cached123' });
      vi.spyOn(lookup, 'fetchMemberStatusWithCookies').mockResolvedValueOnce({
        nombre_completo: 'Maria Perez',
        status: 'Registro válido',
        telefono: '123',
        correo_electronico: 'm@p.com',
        fecha_nacimiento: '2000-01-01'
      });

      const result = await getMemberStatusHandler({
        data: { cedula: '12345678', credentials: validCredentials }
      });

      expect(result).toEqual({
        nombre_completo: 'Maria Perez',
        status: 'Registro válido',
        telefono: '123',
        correo_electronico: 'm@p.com',
        fecha_nacimiento: '2000-01-01'
      });
    });

    it('throws not-found when cached lookup returns "No registrado"', async () => {
      vi.spyOn(auth, 'getCachedCookies').mockReturnValueOnce({ _session_id: 'cached123' });
      vi.spyOn(lookup, 'fetchMemberStatusWithCookies').mockRejectedValueOnce(
        new Error('No registrado')
      );

      await expect(
        getMemberStatusHandler({
          data: { cedula: '99999999', credentials: validCredentials }
        })
      ).rejects.toMatchObject({
        code: 'not-found',
        message: 'No registrado'
      });
    });

    it('falls back to full login if cached lookup throws session expired, and then succeeds', async () => {
      // 1. Cached lookup fails with session expired
      vi.spyOn(auth, 'getCachedCookies').mockReturnValueOnce({ _session_id: 'expired123' });
      vi.spyOn(lookup, 'fetchMemberStatusWithCookies')
        .mockRejectedValueOnce(new Error('Sesión de scraper no autenticada o expirada'))
        // 2. Lookup after fresh login succeeds
        .mockResolvedValueOnce({
          nombre_completo: 'Pedro Gomez',
          status: 'Registro válido',
          telefono: '456',
          correo_electronico: 'p@g.com',
          fecha_nacimiento: '1995-05-05'
        });

      vi.spyOn(auth, 'performLogin').mockResolvedValueOnce({ _session_id: 'fresh456' });
      vi.spyOn(auth, 'setCachedCookies').mockReturnValueOnce();

      const result = await getMemberStatusHandler({
        data: { cedula: '87654321', credentials: validCredentials }
      });

      expect(auth.performLogin).toHaveBeenCalledWith('scout@test.com', 'secretpassword');
      expect(result.nombre_completo).toBe('Pedro Gomez');
    });

    it('throws not-found when full login scrape returns "No registrado"', async () => {
      vi.spyOn(auth, 'getCachedCookies').mockReturnValueOnce(null);
      vi.spyOn(auth, 'performLogin').mockResolvedValueOnce({ _session_id: 'fresh456' });
      vi.spyOn(lookup, 'fetchMemberStatusWithCookies').mockRejectedValueOnce(
        new Error('No registrado')
      );

      await expect(
        getMemberStatusHandler({
          data: { cedula: '00000000', credentials: validCredentials }
        })
      ).rejects.toMatchObject({
        code: 'not-found',
        message: 'No registrado'
      });
    });

    it('throws internal error when network or unexpected error occurs during scrape', async () => {
      vi.spyOn(auth, 'getCachedCookies').mockReturnValueOnce(null);
      vi.spyOn(auth, 'performLogin').mockRejectedValueOnce(new Error('Network Timeout'));

      await expect(
        getMemberStatusHandler({
          data: { cedula: '12345678', credentials: validCredentials }
        })
      ).rejects.toMatchObject({
        code: 'internal',
        message: 'Network Timeout'
      });
    });
  });
});
