import { useCallback, useMemo, useState } from 'react';
import { useScraperSettings } from '../../../context/ScraperSettingsContext';
import { isScraperSessionError } from '../api';
import type { ScraperAlertModalsProps } from '../components/shared/ScraperAlertModals';

export interface UseScraperSessionGuardResult {
  ensureActiveSession: () => Promise<boolean>;
  handleScraperSessionFailure: (err: unknown) => void;
  markSessionExpired: (isNotConfigured?: boolean) => void;
  clearAuthError: () => void;
  alertModalProps: ScraperAlertModalsProps;
}

export function useScraperSessionGuard(): UseScraperSessionGuardResult {
  const { sessionStatus, refreshSessionStatus, setSessionStatus } = useScraperSettings();
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const markSessionExpired = useCallback(
    (isNotConfigured = false) => {
      setSessionStatus((prev) => ({
        connected: false,
        status: isNotConfigured ? 'none' : 'expired',
        impeesaEmail: isNotConfigured ? null : (prev?.impeesaEmail ?? null),
        updatedAt: new Date().toISOString()
      }));
    },
    [setSessionStatus]
  );

  const ensureActiveSession = useCallback(async (): Promise<boolean> => {
    const activeSession = sessionStatus ?? (await refreshSessionStatus());
    if (!activeSession?.connected) {
      setShowAuthAlert(true);
      return false;
    }
    return true;
  }, [sessionStatus, refreshSessionStatus]);

  const handleScraperSessionFailure = useCallback(
    (err: unknown) => {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      const isNotConfigured =
        isScraperSessionError(errorObj) && errorObj.reason === 'SCRAPER_NOT_CONFIGURED';
      markSessionExpired(isNotConfigured);
      if (isNotConfigured) {
        setShowAuthAlert(true);
      } else {
        setAuthError(errorObj.message);
      }
    },
    [markSessionExpired]
  );

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const onCloseAuthAlert = useCallback(() => setShowAuthAlert(false), []);
  const onCloseAuthError = useCallback(() => setAuthError(null), []);

  const alertModalProps = useMemo<ScraperAlertModalsProps>(
    () => ({
      showAuthAlert,
      onCloseAuthAlert,
      authError,
      onCloseAuthError
    }),
    [showAuthAlert, onCloseAuthAlert, authError, onCloseAuthError]
  );

  return useMemo(
    () => ({
      ensureActiveSession,
      handleScraperSessionFailure,
      markSessionExpired,
      clearAuthError,
      alertModalProps
    }),
    [
      ensureActiveSession,
      handleScraperSessionFailure,
      markSessionExpired,
      clearAuthError,
      alertModalProps
    ]
  );
}
