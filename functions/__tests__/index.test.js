// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase-admin', () => ({
  default: { initializeApp: vi.fn() },
  initializeApp: vi.fn()
}));

vi.mock('../handlers/loginScraper', () => ({
  loginScraper: vi.fn()
}));

vi.mock('../handlers/getMemberStatus', () => ({
  getMemberStatus: vi.fn()
}));

describe('functions entrypoint (index.js)', () => {
  it('exports loginScraper and getMemberStatus callables', async () => {
    const functionsIndex = await import('../index.js');
    expect(functionsIndex.loginScraper).toBeDefined();
    expect(functionsIndex.getMemberStatus).toBeDefined();
  });
});
