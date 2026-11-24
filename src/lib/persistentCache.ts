export const PERSISTENT_CACHE_DB_NAME = 'chil_firestore_cache';
export const PERSISTENT_CACHE_STORE_NAME = 'entries';
export const PERSISTENT_CACHE_SCHEMA_VERSION = 1;
export const DEFAULT_PERSISTENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const CROSS_TAB_SYNC_KEY = 'chil_cache_sync_ping';

export interface PersistentRecord<T = unknown> {
  key: string;
  uid: string;
  version: number;
  cachedAt: number;
  expiresAt: number;
  value: T;
}

export interface PersistentCacheAdapter {
  get: (key: string) => Promise<PersistentRecord | null>;
  set: (record: PersistentRecord) => Promise<void>;
  delete: (key: string) => Promise<void>;
  deleteByUid: (uid: string) => Promise<void>;
  clear: () => Promise<void>;
}

let customAdapter: PersistentCacheAdapter | null = null;
let idbPromise: Promise<IDBDatabase | null> | null = null;

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (idbPromise) {
    return idbPromise;
  }

  idbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(PERSISTENT_CACHE_DB_NAME, PERSISTENT_CACHE_SCHEMA_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PERSISTENT_CACHE_STORE_NAME)) {
          const store = db.createObjectStore(PERSISTENT_CACHE_STORE_NAME, { keyPath: 'key' });
          store.createIndex('by_uid', 'uid', { unique: false });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          idbPromise = null;
        };
        db.onclose = () => {
          idbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        idbPromise = null;
        resolve(null);
      };
      request.onblocked = () => {
        idbPromise = null;
        resolve(null);
      };
    } catch {
      idbPromise = null;
      resolve(null);
    }
  });

  return idbPromise;
}

async function withDb<T>(
  fallback: T,
  operation: (db: IDBDatabase, resetIfSame: () => void) => Promise<T>
): Promise<T> {
  const openedPromise = openIndexedDb();
  const db = await openedPromise;
  if (!db) return fallback;
  const resetIfSame = () => {
    if (idbPromise === openedPromise) {
      idbPromise = null;
    }
  };
  return operation(db, resetIfSame);
}

const indexedDbAdapter: PersistentCacheAdapter = {
  get(key: string): Promise<PersistentRecord | null> {
    return withDb<PersistentRecord | null>(null, (db, resetIfSame) => {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(PERSISTENT_CACHE_STORE_NAME, 'readonly');
          const req = tx.objectStore(PERSISTENT_CACHE_STORE_NAME).get(key);
          req.onsuccess = () => {
            resolve((req.result as PersistentRecord | undefined) ?? null);
          };
          req.onerror = () => resolve(null);
          tx.onerror = () => resolve(null);
          tx.onabort = () => resolve(null);
        } catch {
          resetIfSame();
          resolve(null);
        }
      });
    });
  },

  set(record: PersistentRecord): Promise<void> {
    return withDb<void>(undefined, (db, resetIfSame) => {
      return new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(PERSISTENT_CACHE_STORE_NAME, 'readwrite');
          tx.objectStore(PERSISTENT_CACHE_STORE_NAME).put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        } catch {
          resetIfSame();
          resolve();
        }
      });
    });
  },

  delete(key: string): Promise<void> {
    return withDb<void>(undefined, (db, resetIfSame) => {
      return new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(PERSISTENT_CACHE_STORE_NAME, 'readwrite');
          tx.objectStore(PERSISTENT_CACHE_STORE_NAME).delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        } catch {
          resetIfSame();
          resolve();
        }
      });
    });
  },

  deleteByUid(uid: string): Promise<void> {
    return withDb<void>(undefined, (db, resetIfSame) => {
      return new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(PERSISTENT_CACHE_STORE_NAME, 'readwrite');
          const store = tx.objectStore(PERSISTENT_CACHE_STORE_NAME);
          const index = store.index('by_uid');
          const cursorReq = index.openKeyCursor(IDBKeyRange.only(uid));
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
              store.delete(cursor.primaryKey);
              cursor.continue();
            }
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        } catch {
          resetIfSame();
          resolve();
        }
      });
    });
  },

  clear(): Promise<void> {
    return withDb<void>(undefined, (db, resetIfSame) => {
      return new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(PERSISTENT_CACHE_STORE_NAME, 'readwrite');
          tx.objectStore(PERSISTENT_CACHE_STORE_NAME).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        } catch {
          resetIfSame();
          resolve();
        }
      });
    });
  }
};

function getAdapter(): PersistentCacheAdapter {
  return customAdapter ?? indexedDbAdapter;
}

export function setPersistentCacheAdapterForTests(adapter: PersistentCacheAdapter | null): void {
  customAdapter = adapter;
}

export function createInMemoryPersistentAdapter(): PersistentCacheAdapter {
  const map = new Map<string, PersistentRecord>();
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(record) {
      map.set(record.key, record);
    },
    async delete(key) {
      map.delete(key);
    },
    async deleteByUid(uid) {
      for (const [k, rec] of map.entries()) {
        if (rec.uid === uid) {
          map.delete(k);
        }
      }
    },
    async clear() {
      map.clear();
    }
  };
}

export function notifyCrossTabCacheUpdate(uid: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(
      CROSS_TAB_SYNC_KEY,
      JSON.stringify({ uid, ts: Date.now(), nonce: Math.random() })
    );
  } catch {
    // Ignore storage quota or privacy mode errors
  }
}

export function registerCrossTabCacheListener(onExternalChange: (uid: string) => void): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== CROSS_TAB_SYNC_KEY || !event.newValue) {
      return;
    }
    try {
      const parsed = JSON.parse(event.newValue) as { uid?: string };
      onExternalChange(parsed.uid ?? '');
    } catch {
      onExternalChange('');
    }
  };

  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('storage', handleStorage);
  };
}

export function clearBrowserStorageByPrefix(prefix: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

export async function getPersistentEntry<T>(key: string): Promise<T | null> {
  try {
    const record = await getAdapter().get(key);
    if (!record) {
      return null;
    }
    if (record.version !== PERSISTENT_CACHE_SCHEMA_VERSION || record.expiresAt <= Date.now()) {
      await getAdapter().delete(key);
      return null;
    }
    return record.value as T;
  } catch {
    return null;
  }
}

export async function setPersistentEntry<T>(
  key: string,
  uid: string,
  value: T,
  ttlMs: number = DEFAULT_PERSISTENT_TTL_MS,
  notifyTabs = true
): Promise<void> {
  if (!uid) {
    return;
  }
  const now = Date.now();
  const record: PersistentRecord<T> = {
    key,
    uid,
    version: PERSISTENT_CACHE_SCHEMA_VERSION,
    cachedAt: now,
    expiresAt: now + ttlMs,
    value
  };
  try {
    await getAdapter().set(record);
    if (notifyTabs) {
      notifyCrossTabCacheUpdate(uid);
    }
  } catch {
    // Degrade gracefully when storage is full or restricted
  }
}

export async function deletePersistentEntry(key: string, uid = '', notifyTabs = true): Promise<void> {
  try {
    await getAdapter().delete(key);
    if (notifyTabs) {
      notifyCrossTabCacheUpdate(uid);
    }
  } catch {
    // Ignore storage errors
  }
}

export async function clearPersistentCacheForUid(uid: string): Promise<void> {
  if (!uid) return;
  try {
    await getAdapter().deleteByUid(uid);
    notifyCrossTabCacheUpdate(uid);
  } catch {
    // Ignore storage errors
  }
}

export async function clearAllPersistentCache(): Promise<void> {
  try {
    await getAdapter().clear();
    notifyCrossTabCacheUpdate('*');
  } catch {
    // Ignore storage errors
  }
}
