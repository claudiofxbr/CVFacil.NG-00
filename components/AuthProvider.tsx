'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, removeToken, ApiError } from '../lib/apiClient';
import { authLogger } from '../lib/auth-logger';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  status: string;
  credits: number;
  avatar: string | null;
  created_at: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, avatar?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Constantes de validação
const VALIDATION_TIMEOUT = 5000; // 5 segundos
const MAX_VALIDATION_ATTEMPTS = 3;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationAttempts, setValidationAttempts] = useState(0);

  const isAdmin = user?.role === 'Administrador';

  /**
   * refreshUser - Valida token e busca dados do usuário
   *
   * Implementa:
   * - Timeout de 5 segundos
   * - Retry logic (máx 3 tentativas)
   * - Logging estruturado
   */
  const refreshUser = async () => {
    const token = getToken();

    if (!token) {
      authLogger.log('token_check_not_found');
      setLoading(false);
      setUser(null);
      return;
    }

    authLogger.log('token_check_found');

    try {
      authLogger.startTimer('refresh_user');
      authLogger.log('refresh_user_start');

      // Implementar timeout de 5 segundos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('VALIDATION_TIMEOUT')), VALIDATION_TIMEOUT)
      );

      const fetchPromise = api.get('/api/auth/me');
      const result = await Promise.race([fetchPromise, timeoutPromise]) as any;

      authLogger.endTimer('refresh_user', 'refresh_user_success', {
        userEmail: result.user?.email,
      });

      console.log('[AuthProvider] User validated:', result.user?.email);
      setUser(result.user);
      setError(null);
      setValidationAttempts(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const event = errorMessage === 'VALIDATION_TIMEOUT'
        ? 'refresh_user_timeout'
        : 'refresh_user_error';

      authLogger.endTimer('refresh_user', event, {
        error: errorMessage,
      });

      // Token inválido, expirado ou apontando para um usuário que não existe mais:
      // é uma falha definitiva (nunca vai funcionar numa nova tentativa), então
      // desloga imediatamente em vez de gastar 3 tentativas com retry.
      const isDefinitiveAuthFailure = err instanceof ApiError && (err.status === 401 || err.status === 404);

      if (isDefinitiveAuthFailure) {
        authLogger.log('validation_blocked', { error: errorMessage });
        console.warn('[AuthProvider] Sessão inválida, efetuando logout:', errorMessage);
        removeToken();
        setUser(null);
        setError(null);
        setValidationAttempts(0);
        setLoading(false);
        return;
      }

      console.error('[AuthProvider] Token validation failed:', errorMessage);

      // Retry apenas para falhas transitórias (timeout, rede, erro de servidor)
      const newAttempts = validationAttempts + 1;
      setValidationAttempts(newAttempts);

      if (newAttempts >= MAX_VALIDATION_ATTEMPTS) {
        authLogger.log('validation_blocked', { error: errorMessage });
        console.error('[AuthProvider] Validation failed 3 times, blocking');
        removeToken();
        setUser(null);
        setError('Validação de autenticação falhou. Faça login novamente.');
      } else {
        // Tentar novamente em 1 segundo
        setTimeout(() => refreshUser(), 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Executar validação na montagem
  useEffect(() => {
    authLogger.log('guard_validating');
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      authLogger.log('login_start', { userEmail: email });

      const { token, user: u } = await api.post('/api/auth/login', { email, password });

      authLogger.log('login_success', { userEmail: u.email });
      console.log('[AuthProvider] Login successful:', u.email);

      setToken(token);
      setUser(u);
      setError(null);
      setValidationAttempts(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      authLogger.log('login_error', { error: errorMessage });
      // Credenciais inválidas é uma falha de validação esperada (já exibida ao
      // usuário via setError), não um bug da aplicação — console.warn evita
      // que apareça como erro vermelho no DevTools a cada senha digitada errada.
      console.warn('[AuthProvider] Login error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, avatar?: string) => {
    try {
      setLoading(true);
      const body: Record<string, string> = { name, email, password };
      if (avatar) body.avatar = avatar;

      const { token, user: u } = await api.post('/api/auth/register', body);

      authLogger.log('login_success', { userEmail: u.email });
      console.log('[AuthProvider] Registration successful:', u.email);

      setToken(token);
      setUser(u);
      setError(null);
      setValidationAttempts(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      authLogger.log('login_error', { error: errorMessage });
      // Mesmo motivo do login: falha de validação esperada (ex.: e-mail já
      // cadastrado), já exibida ao usuário — não é um bug da aplicação.
      console.warn('[AuthProvider] Registration error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authLogger.log('logout_requested', { userEmail: user?.email });
    console.log('[AuthProvider] Logout requested');
    removeToken();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
