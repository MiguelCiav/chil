// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const axios = require('axios');
const {
  getCredentialsKey,
  getCachedCookies,
  setCachedCookies,
  performLogin
} = require('../scraper/auth');

describe('auth scraper module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('credential keys & caching', () => {
    it('returns default key when credentials are not provided', () => {
      expect(getCredentialsKey(null)).toBe('default');
      expect(getCredentialsKey(undefined)).toBe('default');
    });

    it('returns formatted key for credentials', () => {
      const key = getCredentialsKey({ email: 'scout@test.com', password: 'secretpassword' });
      expect(key).toBe('scout@test.com:secretpassword');
    });

    it('manages cached cookies properly', () => {
      const creds = { email: 'scout@test.com', password: 'secretpassword' };
      const otherCreds = { email: 'other@test.com', password: 'password123' };

      expect(getCachedCookies(creds)).toBeNull();

      const mockCookies = { _session_id: 'session123' };
      setCachedCookies(creds, mockCookies);

      expect(getCachedCookies(creds)).toEqual(mockCookies);
      expect(getCachedCookies(otherCreds)).toBeNull();
    });
  });

  describe('performLogin', () => {
    it('throws error when login page does not have authenticity_token', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        headers: { 'set-cookie': ['initial_cookie=123; path=/'] },
        data: '<html><body><form></form></body></html>'
      });

      await expect(performLogin('scout@test.com', 'password')).rejects.toThrow(
        'Failed to find authenticity_token for login'
      );
    });

    it('throws error when credentials are wrong (response still contains login form)', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        headers: { 'set-cookie': ['initial_cookie=123; path=/'] },
        data: '<html><body><input name="authenticity_token" value="tok_abc_123" /></body></html>'
      });

      vi.spyOn(axios, 'post').mockResolvedValueOnce({
        status: 200,
        headers: { 'set-cookie': ['auth_cookie=456; path=/'] },
        data: '<html><body><form><input name="user[email]" value="invalid" /><p>Invalid email or password</p></form></body></html>'
      });

      await expect(performLogin('wrong@test.com', 'wrongpassword')).rejects.toThrow(
        'Credenciales incorrectas o inicio de sesión fallido'
      );
    });

    it('successfully logs in and returns merged cookies', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        headers: { 'set-cookie': ['_session_id=init123; path=/'] },
        data: '<html><body><input name="authenticity_token" value="tok_valid_999" /></body></html>'
      });

      vi.spyOn(axios, 'post').mockResolvedValueOnce({
        status: 302,
        headers: {
          'set-cookie': [
            '_session_id=auth999; path=/',
            'remember_user_token=rem777; path=/'
          ]
        },
        data: ''
      });

      const result = await performLogin('scout@test.com', 'correctpass');

      expect(result).toEqual({
        _session_id: 'auth999',
        remember_user_token: 'rem777'
      });
    });
  });
});
