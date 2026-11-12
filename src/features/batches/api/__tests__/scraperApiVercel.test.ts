import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveScraperCredentials } from '../scraperApi';

describe('scraperApi with Vercel API endpoint', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls Vercel endpoint for loginScraper and succeeds', async () => {
    vi.stubEnv('VITE_SCRAPER_API_URL', 'https://chil-scraper-api.vercel.app/api');
    await saveScraperCredentials({ email: 'scout@test.com', password: 'secretpassword' });

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    global.fetch = fetchMock;

    // Dynamically re-import to pick up stubEnv
    const { loginScraper: loginWithVercel } = await vi.importActual<typeof import('../scraperApi')>('../scraperApi');

    await loginWithVercel();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://chil-scraper-api.vercel.app/api/loginScraper',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: { email: 'scout@test.com', password: 'secretpassword' }
        })
      })
    );
    vi.unstubAllEnvs();
  });

  it('handles Vercel endpoint error in loginScraper', async () => {
    vi.stubEnv('VITE_SCRAPER_API_URL', 'https://chil-scraper-api.vercel.app/api');
    await saveScraperCredentials({ email: 'scout@test.com', password: 'wrong' });

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Credenciales incorrectas o inicio de sesión fallido' })
    });
    global.fetch = fetchMock;

    const { loginScraper: loginWithVercel } = await vi.importActual<typeof import('../scraperApi')>('../scraperApi');

    await expect(loginWithVercel()).rejects.toThrow('Credenciales incorrectas o inicio de sesión fallido');
    vi.unstubAllEnvs();
  });

  it('calls Vercel endpoint for getMemberStatus and returns member data', async () => {
    vi.stubEnv('VITE_SCRAPER_API_URL', 'https://chil-scraper-api.vercel.app/api');
    await saveScraperCredentials({ email: 'scout@test.com', password: 'secretpassword' });

    const memberData = {
      nombre_completo: 'Robert Baden-Powell',
      status: 'Activo',
      telefono: '04141234567',
      correo_electronico: 'bp@scouts.org.ve',
      fecha_nacimiento: '1857-02-22'
    };

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: memberData })
    });
    global.fetch = fetchMock;

    const { getMemberStatus: getStatusWithVercel } = await vi.importActual<typeof import('../scraperApi')>('../scraperApi');

    const result = await getStatusWithVercel('V-18570222');
    expect(result).toEqual(memberData);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://chil-scraper-api.vercel.app/api/getMemberStatus',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cedula: 'V-18570222',
          credentials: { email: 'scout@test.com', password: 'secretpassword' }
        })
      })
    );
    vi.unstubAllEnvs();
  });

  it('handles not found member (404) in getMemberStatus', async () => {
    vi.stubEnv('VITE_SCRAPER_API_URL', 'https://chil-scraper-api.vercel.app/api');
    await saveScraperCredentials({ email: 'scout@test.com', password: 'secretpassword' });

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'No registrado' })
    });
    global.fetch = fetchMock;

    const { getMemberStatus: getStatusWithVercel } = await vi.importActual<typeof import('../scraperApi')>('../scraperApi');

    await expect(getStatusWithVercel('99999999')).rejects.toThrow('No registrado');
    vi.unstubAllEnvs();
  });
});
