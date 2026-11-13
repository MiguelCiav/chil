// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const crypto = require('crypto');
const cryptoModule = require('../scraper/crypto');

const {
  SCRAPER_ENCRYPTION_KEY,
  KEY_VERSION,
  encryptSessionPayload,
  decryptSessionPayload
} = cryptoModule;

describe('scraper crypto module (AES-256-GCM)', () => {
  const validKeyBase64 = crypto.randomBytes(32).toString('base64');

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(SCRAPER_ENCRYPTION_KEY, 'value').mockReturnValue(validKeyBase64);
  });

  it('encrypts and decrypts cookie payload round-trip bound to UID', () => {
    const uid = 'firebase-user-123';
    const cookies = { _session_id: 'abc123', remember_user_token: 'xyz987' };

    const envelope = encryptSessionPayload(uid, cookies);

    expect(envelope.keyVersion).toBe(KEY_VERSION);
    expect(typeof envelope.iv).toBe('string');
    expect(typeof envelope.authTag).toBe('string');
    expect(typeof envelope.ciphertext).toBe('string');
    expect(envelope.ciphertext).not.toContain('abc123');

    const decrypted = decryptSessionPayload(uid, envelope);
    expect(decrypted).toEqual(cookies);
  });

  it('generates unique IVs and ciphertexts on repeated encryption', () => {
    const uid = 'firebase-user-123';
    const cookies = { _session_id: 'same-cookie' };

    const first = encryptSessionPayload(uid, cookies);
    const second = encryptSessionPayload(uid, cookies);

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it('rejects decryption with a different UID (AAD mismatch)', () => {
    const cookies = { _session_id: 'secret-cookie' };
    const envelope = encryptSessionPayload('user-A', cookies);

    expect(() => decryptSessionPayload('user-B', envelope)).toThrow();
  });

  it('rejects tampered ciphertext or authTag', () => {
    const uid = 'user-A';
    const envelope = encryptSessionPayload(uid, { _session_id: 'secret' });
    const tamperedCipher = {
      ...envelope,
      ciphertext: Buffer.from('tampered-bytes').toString('base64')
    };

    expect(() => decryptSessionPayload(uid, tamperedCipher)).toThrow();
  });

  it('throws clear error when secret key is missing or invalid length', () => {
    vi.spyOn(SCRAPER_ENCRYPTION_KEY, 'value').mockReturnValue('');
    expect(() =>
      encryptSessionPayload('user-A', { _session_id: '1' })
    ).toThrow('SCRAPER_ENCRYPTION_KEY');

    vi.spyOn(SCRAPER_ENCRYPTION_KEY, 'value').mockReturnValue(
      Buffer.from('short-key').toString('base64')
    );
    expect(() =>
      encryptSessionPayload('user-A', { _session_id: '1' })
    ).toThrow('32 bytes');
  });
});
