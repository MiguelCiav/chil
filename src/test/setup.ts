import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { clearAllSessionCaches } from '../lib/sessionCache';
import { setPersistentCacheAdapterForTests } from '../lib/persistentCache';

afterEach(() => {
  clearAllSessionCaches();
  setPersistentCacheAdapterForTests(null);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.clear();
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    }
  };
})();

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
}
if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
}
