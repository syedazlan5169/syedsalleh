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
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => void;
  getRememberedEmail: () => Promise<string | null>;
  updateUser: (user: User) => void;
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
        let requiresApproval = false;
        try {
          const errJson = await response.json();
          if (errJson?.message) message = errJson.message;
          if (errJson?.requires_approval) requiresApproval = true;
        } catch {
          // ignore
        }
        const error = new Error(message) as Error & { requiresApproval?: boolean };
        error.requiresApproval = requiresApproval;
        throw error;
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

  const register = useCallback(
    async (name: string, email: string, password: string, passwordConfirmation: string) => {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.message) {
            message = errJson.message;
          } else if (errJson?.errors) {
            // Handle validation errors
            const errorMessages = Object.values(errJson.errors).flat() as string[];
            message = errorMessages.join(', ');
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const json = (await response.json()) as {
        message: string;
        user: User;
      };

      // Don't auto-login after registration (user needs approval)
      // Just show success message
      return;
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

  // Update user data
  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    // Update saved user data if it exists
    AsyncStorage.getItem(AUTH_USER_KEY).then((savedUser) => {
      if (savedUser) {
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
      }
    });
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      login,
      register,
      logout,
      getRememberedEmail,
      updateUser,
    }),
    [token, user, isLoading, login, register, logout, getRememberedEmail, updateUser],
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

