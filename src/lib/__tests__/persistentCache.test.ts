import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPersistentEntry,
  setPersistentEntry,
  deletePersistentEntry,
  clearPersistentCacheForUid,
  clearAllPersistentCache,
  createInMemoryPersistentAdapter,
  setPersistentCacheAdapterForTests,
  registerCrossTabCacheListener,
  clearBrowserStorageByPrefix,
  CROSS_TAB_SYNC_KEY,
  PERSISTENT_CACHE_SCHEMA_VERSION,
  type PersistentCacheAdapter
} from '../persistentCache';

describe('persistentCache', () => {
  let adapter: PersistentCacheAdapter;

  beforeEach(() => {
    adapter = createInMemoryPersistentAdapter();
    setPersistentCacheAdapterForTests(adapter);
  });

  afterEach(() => {
    setPersistentCacheAdapterForTests(null);
    vi.restoreAllMocks();
  });

  it('stores and retrieves valid entries within TTL', async () => {
    await setPersistentEntry('batches:uid-1', 'uid-1', [{ id: 101 }], 60_000);
    const result = await getPersistentEntry<Array<{ id: number }>>('batches:uid-1');
    expect(result).toEqual([{ id: 101 }]);
  });

  it('returns null and evicts expired entries', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await setPersistentEntry('batches:uid-1', 'uid-1', [{ id: 101 }], 1_000);

    nowSpy.mockReturnValue(1_001_500);
    const expired = await getPersistentEntry('batches:uid-1');
    expect(expired).toBeNull();
    expect(await adapter.get('batches:uid-1')).toBeNull();
  });

  it('returns null and evicts entries with mismatched schema version', async () => {
    await adapter.set({
      key: 'batches:uid-1',
      uid: 'uid-1',
      version: PERSISTENT_CACHE_SCHEMA_VERSION + 99,
      cachedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      value: [{ id: 101 }]
    });

    const result = await getPersistentEntry('batches:uid-1');
    expect(result).toBeNull();
    expect(await adapter.get('batches:uid-1')).toBeNull();
  });

  it('clears entries scoped to a specific UID without affecting other UIDs', async () => {
    await setPersistentEntry('batches:uid-1', 'uid-1', [1]);
    await setPersistentEntry('members:uid-1', 'uid-1', [2]);
    await setPersistentEntry('batches:uid-2', 'uid-2', [3]);

    await clearPersistentCacheForUid('uid-1');

    expect(await getPersistentEntry('batches:uid-1')).toBeNull();
    expect(await getPersistentEntry('members:uid-1')).toBeNull();
    expect(await getPersistentEntry('batches:uid-2')).toEqual([3]);

    await deletePersistentEntry('batches:uid-2', 'uid-2');
    expect(await getPersistentEntry('batches:uid-2')).toBeNull();

    await setPersistentEntry('batches:uid-3', 'uid-3', [4]);
    await clearAllPersistentCache();
    expect(await getPersistentEntry('batches:uid-3')).toBeNull();
  });

  it('degrades gracefully to null/void when storage adapter throws errors', async () => {
    const failingAdapter: PersistentCacheAdapter = {
      get: vi.fn().mockRejectedValue(new Error('QuotaExceededError')),
      set: vi.fn().mockRejectedValue(new Error('QuotaExceededError')),
      delete: vi.fn().mockRejectedValue(new Error('Storage blocked')),
      deleteByUid: vi.fn().mockRejectedValue(new Error('Storage blocked')),
      clear: vi.fn().mockRejectedValue(new Error('Storage blocked'))
    };
    setPersistentCacheAdapterForTests(failingAdapter);

    await expect(setPersistentEntry('k', 'u', { ok: true })).resolves.toBeUndefined();
    await expect(getPersistentEntry('k')).resolves.toBeNull();
    await expect(clearPersistentCacheForUid('u')).resolves.toBeUndefined();
    await expect(clearAllPersistentCache()).resolves.toBeUndefined();
  });

  it('notifies cross-tab listener on storage event and clears prefixed localStorage keys', () => {
    const onExternalChange = vi.fn();
    const unsubscribe = registerCrossTabCacheListener(onExternalChange);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: CROSS_TAB_SYNC_KEY,
        newValue: JSON.stringify({ uid: 'uid-99', ts: Date.now() })
      })
    );
    expect(onExternalChange).toHaveBeenCalledWith('uid-99');

    unsubscribe();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: CROSS_TAB_SYNC_KEY,
        newValue: JSON.stringify({ uid: 'uid-100', ts: Date.now() })
      })
    );
    expect(onExternalChange).toHaveBeenCalledTimes(1);

    window.localStorage.setItem('chil_scraper_status_uid1', '{"connected":true}');
    window.localStorage.setItem('chil_sidebar_collapsed', 'true');
    clearBrowserStorageByPrefix('chil_scraper_status_');
    expect(window.localStorage.getItem('chil_scraper_status_uid1')).toBeNull();
    expect(window.localStorage.getItem('chil_sidebar_collapsed')).toBe('true');
  });
});
