// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const crypto = require('crypto');

const authLib = require('../lib/auth');
const lookupLib = require('../lib/lookup');
const cryptoLib = require('../lib/crypto');
const firebaseAdminLib = require('../lib/firebaseAdmin');
const sessionStore = require('../lib/sessionStore');

const saveScraperSessionHandler = require('../api/saveScraperSession');
const getScraperSessionStatusHandler = require('../api/getScraperSessionStatus');
const clearScraperSessionHandler = require('../api/clearScraperSession');
const getMemberStatusHandler = require('../api/getMemberStatus');

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader: vi.fn((k, v) => {
      res.headers[k] = v;
    }),
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload) => {
      res.body = payload;
      return res;
    }),
    end: vi.fn(() => {
      res.ended = true;
      return res;
    })
  };
  return res;
}

describe('scraper-api Vercel HTTP handlers', () => {
  const testKeyBase64 = crypto.randomBytes(32).toString('base64');

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.SCRAPER_ENCRYPTION_KEY = testKeyBase64;
  });

  afterEach(() => {
    delete process.env.SCRAPER_ENCRYPTION_KEY;
  });

  it('does not expose mutable global cookie cache helpers on auth.js', () => {
    expect(authLib.getCachedCookies).toBeUndefined();
    expect(authLib.setCachedCookies).toBeUndefined();
    expect(authLib.getCredentialsKey).toBeUndefined();
  });

  it('returns 200 for OPTIONS preflight with Authorization header allowed', async () => {
    const req = { method: 'OPTIONS', headers: {} };
    const res = createMockRes();

    await saveScraperSessionHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.ended).toBe(true);
    expect(res.headers['Access-Control-Allow-Headers']).toContain('Authorization');
  });

  it('rejects requests without a valid Firebase Bearer token with 401', async () => {
    const req = { method: 'GET', headers: {} };
    const res = createMockRes();

    await getScraperSessionStatusHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ reason: 'UNAUTHENTICATED' });
  });

  it('saveScraperSession verifies Bearer token, encrypts cookies, and saves without password', async () => {
    vi.spyOn(firebaseAdminLib, 'verifyBearerToken').mockResolvedValueOnce('uid-1');
    vi.spyOn(authLib, 'performLogin').mockResolvedValueOnce({
      _session_id: 'cookie_val'
    });
    const saveSpy = vi
      .spyOn(sessionStore, 'saveSession')
      .mockResolvedValueOnce(undefined);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { email: 'scout@scouts.org.ve', password: 'secret-password' }
    };
    const res = createMockRes();

    await saveScraperSessionHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      connected: true,
      status: 'active',
      impeesaEmail: 'scout@scouts.org.ve'
    });
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [savedUid, savedPayload] = saveSpy.mock.calls[0];
    expect(savedUid).toBe('uid-1');
    expect(savedPayload).not.toHaveProperty('password');
    expect(
      cryptoLib.decryptSessionPayload('uid-1', savedPayload.encrypted)
    ).toEqual({
      _session_id: 'cookie_val'
    });
  });

  it('saveScraperSession returns 401 IMPEESA_INVALID_CREDENTIALS when Impeesa rejects login', async () => {
    vi.spyOn(firebaseAdminLib, 'verifyBearerToken').mockResolvedValueOnce('uid-1');
    vi.spyOn(authLib, 'performLogin').mockRejectedValueOnce(
      new Error('Credenciales incorrectas o inicio de sesión fallido')
    );

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { email: 'scout@scouts.org.ve', password: 'wrong' }
    };
    const res = createMockRes();

    await saveScraperSessionHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.reason).toBe('IMPEESA_INVALID_CREDENTIALS');
  });

  it('getScraperSessionStatus returns session metadata for verified UID', async () => {
    vi.spyOn(firebaseAdminLib, 'verifyBearerToken').mockResolvedValueOnce('uid-1');
    vi.spyOn(sessionStore, 'getSessionMetadata').mockResolvedValueOnce({
      connected: true,
      status: 'active',
      impeesaEmail: 'scout@scouts.org.ve',
      updatedAt: '2026-11-12T10:00:00.000Z'
    });

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' }
    };
    const res = createMockRes();

    await getScraperSessionStatusHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      connected: true,
      status: 'active',
      impeesaEmail: 'scout@scouts.org.ve',
      updatedAt: '2026-11-12T10:00:00.000Z'
    });
  });

  it('clearScraperSession deletes session and returns disconnected status', async () => {
    vi.spyOn(firebaseAdminLib, 'verifyBearerToken').mockResolvedValueOnce('uid-1');
    const deleteSpy = vi
      .spyOn(sessionStore, 'deleteSession')
      .mockResolvedValueOnce(undefined);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' }
    };
    const res = createMockRes();

    await clearScraperSessionHandler(req, res);

    expect(deleteSpy).toHaveBeenCalledWith('uid-1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      connected: false,
      status: 'none',
      impeesaEmail: null,
      updatedAt: null
    });
  });

  it('getMemberStatus returns 412 SCRAPER_NOT_CONFIGURED when session is missing', async () => {
    vi.spyOn(firebaseAdminLib, 'verifyBearerToken').mockResolvedValueOnce('uid-1');
    vi.spyOn(sessionStore, 'getSessionEnvelope').mockResolvedValueOnce(null);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { cedula: '12345678' }
    };
    const res = createMockRes();

    await getMemberStatusHandler(req, res);

    expect(res.statusCode).toBe(412);
    expect(res.body.reason).toBe('SCRAPER_NOT_CONFIGURED');
  });

  it('getMemberStatus decrypts cookies and returns 200 { data: member }', async () => {
    vi.spyOn(firebaseAdminLib, 'verifyBearerToken').mockResolvedValueOnce('uid-1');
    const encrypted = cryptoLib.encryptSessionPayload('uid-1', {
      _session_id: 'valid_cookie'
    });
    vi.spyOn(sessionStore, 'getSessionEnvelope').mockResolvedValueOnce({
      status: 'active',
      impeesaEmail: 'scout@scouts.org.ve',
      encrypted
    });
    vi.spyOn(lookupLib, 'fetchMemberStatusWithCookies').mockResolvedValueOnce({
      nombre_completo: 'Maria Perez',
      status: 'Activo',
      telefono: '0412',
      correo_electronico: 'm@p.com',
      fecha_nacimiento: '2000-01-01'
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { cedula: '12345678' }
    };
    const res = createMockRes();

    await getMemberStatusHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.nombre_completo).toBe('Maria Perez');
  });

  it('getMemberStatus marks session expired and returns 412 when Impeesa rejects cookies', async () => {
    vi.spyOn(firebaseAdminLib, 'verifyBearerToken').mockResolvedValueOnce('uid-1');
    const encrypted = cryptoLib.encryptSessionPayload('uid-1', {
      _session_id: 'stale_cookie'
    });
    vi.spyOn(sessionStore, 'getSessionEnvelope').mockResolvedValueOnce({
      status: 'active',
      impeesaEmail: 'scout@scouts.org.ve',
      encrypted
    });
    const markSpy = vi
      .spyOn(sessionStore, 'markSessionExpired')
      .mockResolvedValueOnce(undefined);
    vi.spyOn(lookupLib, 'fetchMemberStatusWithCookies').mockRejectedValueOnce(
      new Error('Sesión de scraper no autenticada o expirada')
    );

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { cedula: '12345678' }
    };
    const res = createMockRes();

    await getMemberStatusHandler(req, res);

    expect(markSpy).toHaveBeenCalledWith('uid-1');
    expect(res.statusCode).toBe(412);
    expect(res.body.reason).toBe('SCRAPER_SESSION_EXPIRED');
  });
});
