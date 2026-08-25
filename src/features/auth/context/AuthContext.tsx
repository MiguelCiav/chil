import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const authUser = await loginWithEmail(credentials);
    setUser(authUser);
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const authUser = await registerWithEmail(credentials);
    setUser(authUser);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await resetPasswordEmail(email);
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
