import React, { createContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { clearAllSessionCaches } from '../../../lib/sessionCache';
import {
  clearBrowserStorageByPrefix,
  clearPersistentCacheForUid,
  registerCrossTabCacheListener
} from '../../../lib/persistentCache';
import {
  AuthContextType,
  AuthUser,
  LoginCredentials,
  RegisterCredentials
} from '../types';
import {
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  resetPasswordEmail,
  onAuthStateChangedListener
} from '../api';

const SCRAPER_STATUS_STORAGE_PREFIX = 'chil_scraper_status_';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const activeUidRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChangedListener((authUser) => {
      const prevUid = activeUidRef.current;
      const nextUid = authUser?.uid ?? null;
      if (prevUid !== nextUid) {
        clearAllSessionCaches();
        if (prevUid !== null) {
          void clearPersistentCacheForUid(prevUid);
          clearBrowserStorageByPrefix(SCRAPER_STATUS_STORAGE_PREFIX);
        }
        activeUidRef.current = nextUid;
      }
      setUser(authUser);
      setLoading(false);
    });

    const unsubscribeCrossTab = registerCrossTabCacheListener(() => {
      clearAllSessionCaches();
    });

    return () => {
      unsubscribeAuth();
      unsubscribeCrossTab();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const authUser = await loginWithEmail(credentials);
    const prevUid = activeUidRef.current;
    if (prevUid !== null && prevUid !== authUser.uid) {
      clearAllSessionCaches();
      void clearPersistentCacheForUid(prevUid);
      clearBrowserStorageByPrefix(SCRAPER_STATUS_STORAGE_PREFIX);
    }
    activeUidRef.current = authUser.uid;
    setUser(authUser);
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const authUser = await registerWithEmail(credentials);
    const prevUid = activeUidRef.current;
    if (prevUid !== null && prevUid !== authUser.uid) {
      clearAllSessionCaches();
      void clearPersistentCacheForUid(prevUid);
      clearBrowserStorageByPrefix(SCRAPER_STATUS_STORAGE_PREFIX);
    }
    activeUidRef.current = authUser.uid;
    setUser(authUser);
  }, []);

  const logout = useCallback(async () => {
    const prevUid = activeUidRef.current;
    // Clear activeUidRef before logoutUser() so onAuthStateChangedListener does not
    // duplicate persistent-cache eviction while we await full cleanup here.
    activeUidRef.current = null;
    clearAllSessionCaches();
    clearBrowserStorageByPrefix(SCRAPER_STATUS_STORAGE_PREFIX);
    await logoutUser();
    if (prevUid) {
      await clearPersistentCacheForUid(prevUid);
    }
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await resetPasswordEmail(email);
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      resetPassword
    }),
    [user, loading, login, register, logout, resetPassword]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
