import { describe, it, expect, vi } from 'vitest';
import { createKeyedSessionCache, clearAllSessionCaches } from '../sessionCache';

describe('sessionCache', () => {
  it('loads cold entries once and serves subsequent calls from memory', async () => {
    const cache = createKeyedSessionCache<string, string[]>();
    const loader = vi.fn().mockResolvedValue(['a', 'b']);

    const first = await cache.getOrLoad('uid-1', loader);
    const second = await cache.getOrLoad('uid-1', loader);

    expect(first).toEqual(['a', 'b']);
    expect(second).toEqual(['a', 'b']);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.has('uid-1')).toBe(true);
  });

  it('deduplicates concurrent in-flight getOrLoad calls for the same key', async () => {
    const cache = createKeyedSessionCache<string, number>();
    let resolveLoader!: (value: number) => void;
    const loader = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveLoader = resolve;
        })
    );

    const p1 = cache.getOrLoad('uid-1', loader);
    const p2 = cache.getOrLoad('uid-1', loader);

    expect(loader).toHaveBeenCalledTimes(1);
    resolveLoader(42);

    const [v1, v2] = await Promise.all([p1, p2]);
    expect(v1).toBe(42);
    expect(v2).toBe(42);
  });

  it('does not cache rejected promises and allows retry on subsequent calls', async () => {
    const cache = createKeyedSessionCache<string, string>();
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce('recovered');

    await expect(cache.getOrLoad('uid-1', loader)).rejects.toThrow('network failure');
    expect(cache.has('uid-1')).toBe(false);

    const retried = await cache.getOrLoad('uid-1', loader);
    expect(retried).toBe('recovered');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('supports set, delete, entries, values, and clearAllSessionCaches across instances', () => {
    const cacheA = createKeyedSessionCache<string, number>();
    const cacheB = createKeyedSessionCache<number, string>();

    cacheA.set('u1', 10);
    cacheB.set(1, 'batch-1');

    expect(cacheA.get('u1')).toBe(10);
    expect(Array.from(cacheA.entries())).toEqual([['u1', 10]]);
    expect(Array.from(cacheB.values())).toEqual(['batch-1']);

    cacheA.delete('u1');
    expect(cacheA.has('u1')).toBe(false);

    cacheA.set('u2', 20);
    clearAllSessionCaches();
    expect(cacheA.has('u2')).toBe(false);
    expect(cacheB.has(1)).toBe(false);
  });
});
