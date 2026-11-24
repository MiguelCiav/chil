import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useAuth } from '../features/auth';
import {
  getScraperSessionStatus,
  purgeLegacyScraperStorage,
  ScraperSessionStatus,
} from '../features/batches/api';

export const SCRAPER_STATUS_STORAGE_PREFIX = 'chil_scraper_status_';
export const SCRAPER_STATUS_TTL_MS = 60 * 60 * 1000; // 60 minutes

export interface ScraperSettingsContextValue {
  isOpen: boolean;
  sessionStatus: ScraperSessionStatus | null;
  isLoadingStatus: boolean;
  openModal: () => void;
  closeModal: () => void;
  refreshSessionStatus: () => Promise<ScraperSessionStatus | null>;
  setSessionStatus: React.Dispatch<
    React.SetStateAction<ScraperSessionStatus | null>
  >;
}

const DEFAULT_CONTEXT: ScraperSettingsContextValue = {
  isOpen: false,
  sessionStatus: null,
  isLoadingStatus: false,
  openModal: () => {},
  closeModal: () => {},
  refreshSessionStatus: async () => {
    try {
      return await getScraperSessionStatus();
    } catch {
      return null;
    }
  },
  setSessionStatus: () => {},
};

const ScraperSettingsContext =
  createContext<ScraperSettingsContextValue>(DEFAULT_CONTEXT);

const inFlightStatusByUid = new Map<string, Promise<ScraperSessionStatus>>();

function fetchScraperSessionStatusDeduplicated(uid: string): Promise<ScraperSessionStatus> {
  const existing = inFlightStatusByUid.get(uid);
  if (existing) {
    return existing;
  }
  const promise = getScraperSessionStatus().finally(() => {
    inFlightStatusByUid.delete(uid);
  });
  inFlightStatusByUid.set(uid, promise);
  return promise;
}

function getStorageKey(uid: string): string {
  return `${SCRAPER_STATUS_STORAGE_PREFIX}${uid}`;
}

function readCachedScraperStatus(uid: string | null): ScraperSessionStatus | null {
  if (!uid || typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(getStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      status?: ScraperSessionStatus;
      cachedAt?: number;
    };
    if (
      !parsed?.status ||
      typeof parsed.cachedAt !== 'number' ||
      Date.now() - parsed.cachedAt >= SCRAPER_STATUS_TTL_MS
    ) {
      window.localStorage.removeItem(getStorageKey(uid));
      return null;
    }
    return parsed.status;
  } catch {
    return null;
  }
}

function writeCachedScraperStatus(
  uid: string | null,
  status: ScraperSessionStatus | null
): void {
  if (!uid || typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    if (!status) {
      window.localStorage.removeItem(getStorageKey(uid));
      return;
    }
    window.localStorage.setItem(
      getStorageKey(uid),
      JSON.stringify({ status, cachedAt: Date.now() })
    );
  } catch {
    // Ignore storage quota or privacy mode errors
  }
}

export const ScraperSettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const currentUid = user?.uid ?? null;
  const [prevUid, setPrevUid] = useState<string | null>(currentUid);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionStatus, setSessionStatusState] =
    useState<ScraperSessionStatus | null>(() => readCachedScraperStatus(currentUid));
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  if (currentUid !== prevUid) {
    setPrevUid(currentUid);
    setSessionStatusState(readCachedScraperStatus(currentUid));
    setIsLoadingStatus(false);
  }

  const setSessionStatus: React.Dispatch<
    React.SetStateAction<ScraperSessionStatus | null>
  > = useCallback(
    (updater) => {
      setSessionStatusState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        writeCachedScraperStatus(currentUid, next);
        return next;
      });
    },
    [currentUid]
  );

  const refreshSessionStatus = useCallback(async () => {
    purgeLegacyScraperStorage();

    if (!currentUid) {
      setSessionStatusState(null);
      return null;
    }

    setIsLoadingStatus(true);
    try {
      const status = await fetchScraperSessionStatusDeduplicated(currentUid);
      setSessionStatusState(status);
      writeCachedScraperStatus(currentUid, status);
      return status;
    } catch (error) {
      console.warn('Could not load scraper session status:', error);
      return null;
    } finally {
      setIsLoadingStatus(false);
    }
  }, [currentUid]);

  useEffect(() => {
    purgeLegacyScraperStorage();
  }, [currentUid]);

  const openModal = useCallback(() => {
    setIsOpen(true);
    if (currentUid && !sessionStatus) {
      void refreshSessionStatus();
    }
  }, [currentUid, sessionStatus, refreshSessionStatus]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo<ScraperSettingsContextValue>(
    () => ({
      isOpen,
      sessionStatus,
      isLoadingStatus,
      openModal,
      closeModal,
      refreshSessionStatus,
      setSessionStatus,
    }),
    [
      isOpen,
      sessionStatus,
      isLoadingStatus,
      openModal,
      closeModal,
      refreshSessionStatus,
      setSessionStatus,
    ]
  );

  return (
    <ScraperSettingsContext.Provider value={value}>
      {children}
    </ScraperSettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useScraperSettings(): ScraperSettingsContextValue {
  return useContext(ScraperSettingsContext);
}
