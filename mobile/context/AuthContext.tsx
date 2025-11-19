import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { API_BASE_URL } from '../apiConfig';
import type { User } from '../types/api';

const AUTH_TOKEN_KEY = '@auth_token';
const AUTH_USER_KEY = '@auth_user';
const REMEMBER_EMAIL_KEY = '@remember_email';

type AuthContextValue = {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  getRememberedEmail: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved auth state on mount
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe: boolean = false) => {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.message) message = errJson.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const json = (await response.json()) as {
        token: string;
        user: User;
      };

      setToken(json.token);
      setUser(json.user);

      // Save auth state if remember me is checked
      if (rememberMe) {
        await Promise.all([
          AsyncStorage.setItem(AUTH_TOKEN_KEY, json.token),
          AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(json.user)),
          AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email),
        ]);
      } else {
        // Clear saved auth but keep email if it was saved
        await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    // Clear all saved auth data
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
  }, []);

  // Get remembered email
  const getRememberedEmail = useCallback(async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);
    } catch {
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      login,
      logout,
      getRememberedEmail,
    }),
    [token, user, isLoading, login, logout, getRememberedEmail],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

