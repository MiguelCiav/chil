// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase-admin', () => ({
  default: { initializeApp: vi.fn() },
  initializeApp: vi.fn()
}));

vi.mock('../handlers/saveScraperSession', () => ({
  saveScraperSession: vi.fn()
}));

vi.mock('../handlers/getScraperSessionStatus', () => ({
  getScraperSessionStatus: vi.fn()
}));

vi.mock('../handlers/clearScraperSession', () => ({
  clearScraperSession: vi.fn()
}));

vi.mock('../handlers/getMemberStatus', () => ({
  getMemberStatus: vi.fn()
}));

describe('functions entrypoint (index.js)', () => {
  it('exports session and member lookup callables without loginScraper', async () => {
    const functionsIndex = await import('../index.js');
    expect(functionsIndex.saveScraperSession).toBeDefined();
    expect(functionsIndex.getScraperSessionStatus).toBeDefined();
    expect(functionsIndex.clearScraperSession).toBeDefined();
    expect(functionsIndex.getMemberStatus).toBeDefined();
    expect(functionsIndex.loginScraper).toBeUndefined();
  });
});
