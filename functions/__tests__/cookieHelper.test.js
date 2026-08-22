// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { extractCookies, serializeCookies } from '../scraper/cookieHelper';

describe('cookieHelper', () => {
  describe('extractCookies', () => {
    it('returns empty object when setCookieHeader is undefined or null', () => {
      expect(extractCookies(undefined)).toEqual({});
      expect(extractCookies(null)).toEqual({});
    });

    it('extracts cookies from a single header string', () => {
      const header = '_session_id=abc123xyz; path=/; HttpOnly';
      const result = extractCookies(header);
      expect(result).toEqual({ _session_id: 'abc123xyz' });
    });

    it('extracts and merges cookies from an array of header strings', () => {
      const headers = [
        '_session_id=abc123xyz; path=/; HttpOnly',
        'remember_user_token=token456; path=/; expires=Sun, 21 Aug 2027 00:00:00 GMT',
        'locale=es'
      ];
      const result = extractCookies(headers);
      expect(result).toEqual({
        _session_id: 'abc123xyz',
        remember_user_token: 'token456',
        locale: 'es'
      });
    });

    it('handles headers with empty or malformed parts', () => {
      const headers = ['invalidheader', '=valueonly', 'key='];
      const result = extractCookies(headers);
      expect(result).toEqual({
        '': 'valueonly',
        key: ''
      });
    });
  });

  describe('serializeCookies', () => {
    it('serializes a cookie dictionary into a semicolon-separated string', () => {
      const cookies = {
        _session_id: 'abc123xyz',
        locale: 'es'
      };
      const result = serializeCookies(cookies);
      expect(result).toBe('_session_id=abc123xyz; locale=es');
    });

    it('returns empty string for empty cookie dictionary', () => {
      expect(serializeCookies({})).toBe('');
    });
  });
});
