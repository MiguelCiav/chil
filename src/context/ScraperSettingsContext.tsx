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
  refreshSessionStatus: async () => null,
  setSessionStatus: () => {},
};

const ScraperSettingsContext =
  createContext<ScraperSettingsContextValue>(DEFAULT_CONTEXT);

export const ScraperSettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const currentUid = user?.uid ?? null;
  const [prevUid, setPrevUid] = useState<string | null>(currentUid);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionStatus, setSessionStatus] =
    useState<ScraperSessionStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(Boolean(currentUid));

  if (currentUid !== prevUid) {
    setPrevUid(currentUid);
    setSessionStatus(null);
    setIsLoadingStatus(Boolean(currentUid));
  }

  const refreshSessionStatus = useCallback(async () => {
    purgeLegacyScraperStorage();

    if (!user) {
      setSessionStatus(null);
      return null;
    }

    setIsLoadingStatus(true);
    try {
      const status = await getScraperSessionStatus();
      setSessionStatus(status);
      return status;
    } catch (error) {
      console.warn('Could not load scraper session status:', error);
      return null;
    } finally {
      setIsLoadingStatus(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    purgeLegacyScraperStorage();

    if (!currentUid) {
      return;
    }

    getScraperSessionStatus()
      .then((status) => {
        if (!cancelled) {
          setSessionStatus(status);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn('Could not load scraper session status:', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingStatus(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUid]);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

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
