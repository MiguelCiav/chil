export interface KeyedSessionCache<K, V> {
  get: (key: K) => V | undefined;
  has: (key: K) => boolean;
  set: (key: K, value: V) => void;
  delete: (key: K) => boolean;
  getInFlight: (key: K) => Promise<V> | undefined;
  getOrLoad: (key: K, loader: () => Promise<V>) => Promise<V>;
  entries: () => IterableIterator<[K, V]>;
  values: () => IterableIterator<V>;
  clear: () => void;
}

const registeredClearers = new Set<() => void>();

export function createKeyedSessionCache<K, V>(): KeyedSessionCache<K, V> {
  const store = new Map<K, V>();
  const inFlight = new Map<K, Promise<V>>();

  const clear = () => {
    store.clear();
    inFlight.clear();
  };

  registeredClearers.add(clear);

  return {
    get: (key: K) => store.get(key),
    has: (key: K) => store.has(key),
    set: (key: K, value: V) => {
      store.set(key, value);
    },
    delete: (key: K) => store.delete(key),
    getInFlight: (key: K) => inFlight.get(key),
    getOrLoad: (key: K, loader: () => Promise<V>): Promise<V> => {
      if (store.has(key)) {
        return Promise.resolve(store.get(key) as V);
      }
      const existingPromise = inFlight.get(key);
      if (existingPromise) {
        return existingPromise;
      }
      const promise = loader()
        .then((value) => {
          store.set(key, value);
          return value;
        })
        .finally(() => {
          inFlight.delete(key);
        });
      inFlight.set(key, promise);
      return promise;
    },
    entries: () => store.entries(),
    values: () => store.values(),
    clear
  };
}

export function clearAllSessionCaches(): void {
  for (const clear of registeredClearers) {
    clear();
  }
}
