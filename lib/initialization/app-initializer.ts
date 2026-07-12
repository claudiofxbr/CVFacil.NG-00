/**
 * ============================================================================
 * CVFacil.NG - App Initializer
 * ============================================================================
 *
 * Responsável por inicializar a aplicação de forma segura
 * Garante que login é sempre a rota inicial em qualquer cenário
 *
 * Features:
 * - Limpeza de navegação persistida
 * - Validação de sessão
 * - Detecção de crash anterior
 * - Logout seguro
 * - Inicialização forçada para login
 */

import { logger } from '@/lib/logger';

export interface InitializationResult {
  success: boolean;
  requiresLogin: boolean;
  error?: string;
  timestamp: number;
}

/**
 * App Initializer - Classe responsável pela inicialização segura
 */
export class AppInitializer {
  private static instance: AppInitializer;
  private isInitialized = false;
  private initStartTime: number = 0;

  /**
   * Singleton pattern - obter instância única
   */
  static getInstance(): AppInitializer {
    if (!AppInitializer.instance) {
      AppInitializer.instance = new AppInitializer();
    }
    return AppInitializer.instance;
  }

  /**
   * PASSO 1: Inicializar aplicação
   * Chamado uma única vez quando o app é lançado
   */
  async initializeApp(): Promise<InitializationResult> {
    try {
      if (this.isInitialized) {
        logger.info('[AppInitializer] Already initialized');
        return {
          success: true,
          requiresLogin: false,
          timestamp: Date.now(),
        };
      }

      this.initStartTime = Date.now();
      logger.info('[AppInitializer] Starting initialization...');

      // 1.1 Limpar navegação persistida
      await this.clearPersistedNavigation();
      logger.info('[AppInitializer] Navigation cleared');

      // 1.2 Verificar se app restarted após crash
      const hasCrashed = this.detectPreviousCrash();
      if (hasCrashed) {
        await this.clearCrashState();
        logger.warn('[AppInitializer] Previous crash detected, cleared');
      }

      // 1.3 Validar sessão existente
      const sessionValid = await this.validateSession();
      logger.info(`[AppInitializer] Session valid: ${sessionValid}`);

      // 1.4 Se sessão inválida, fazer logout seguro
      if (!sessionValid) {
        await this.performSecureLogout();
        logger.warn('[AppInitializer] Session invalid, logged out');
      }

      // 1.5 Iniciar validação periódica
      this.startPeriodicValidation();

      // 1.6 Marcar como inicializado
      this.isInitialized = true;

      const duration = Date.now() - this.initStartTime;
      logger.info(
        `[AppInitializer] Initialization complete (${duration}ms)`,
        { requiresLogin: !sessionValid }
      );

      return {
        success: true,
        requiresLogin: !sessionValid,
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error(String(error));
      logger.error('[AppInitializer] Initialization failed', errorMessage);

      // Em caso de erro, sempre forçar login
      await this.performSecureLogout();

      return {
        success: false,
        requiresLogin: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * PASSO 2: Limpar navegação persistida
   * Previne que o app carregue a última rota anterior
   */
  private async clearPersistedNavigation(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      // Limpar localStorage de navegação
      const navigationKeys = [
        'lastRoute',
        'navigationState',
        'deepLinkPending',
        'routerState',
      ];

      navigationKeys.forEach((key) => {
        localStorage.removeItem(`nav_${key}`);
      });

      // Limpar sessionStorage
      sessionStorage.clear();

      logger.debug('[AppInitializer] Persisted navigation cleared');
    } catch (error) {
      const errorObj = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
      logger.warn('[AppInitializer] Error clearing navigation', errorObj);
      // Continuar mesmo com erro
    }
  }

  /**
   * PASSO 3: Detectar se app restarted após crash anterior
   */
  private detectPreviousCrash(): boolean {
    try {
      if (typeof window === 'undefined') return false;

      const crashMarker = localStorage.getItem('app_crash_detected');
      return crashMarker === 'true';
    } catch {
      return false;
    }
  }

  /**
   * PASSO 4: Limpar estado deixado por crash
   */
  private async clearCrashState(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      localStorage.removeItem('app_crash_detected');
      localStorage.removeItem('crash_timestamp');
      localStorage.removeItem('last_active_route');

      logger.info('[AppInitializer] Crash state cleared');
    } catch (error) {
      const errorObj = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
      logger.warn('[AppInitializer] Error clearing crash state', errorObj);
    }
  }

  /**
   * PASSO 5: Validar sessão existente
   * Verifica se há token válido no localStorage
   */
  private async validateSession(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      // 5.1 Verificar se token existe
      const token = localStorage.getItem('auth-token');
      if (!token) {
        logger.debug('[AppInitializer] No token found');
        return false;
      }

      // 5.2 Verificar se token está malformado
      if (!this.isValidTokenFormat(token)) {
        logger.warn('[AppInitializer] Invalid token format');
        return false;
      }

      // 5.3 Validar token remotamente
      const isValid = await this.validateTokenRemote(token);

      if (!isValid) {
        logger.warn('[AppInitializer] Token validation failed');
        return false;
      }

      logger.debug('[AppInitializer] Session validated');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error(String(error));
      logger.error('[AppInitializer] Error validating session', errorMessage);
      // Em caso de erro, considerar não autenticado
      return false;
    }
  }

  /**
   * Verificar se token tem formato JWT válido
   */
  private isValidTokenFormat(token: string): boolean {
    // JWT tem 3 partes separadas por pontos
    const parts = token.split('.');
    return parts.length === 3 && parts.every((part) => part.length > 0);
  }

  /**
   * PASSO 6: Validar token remotamente no servidor
   */
  private async validateTokenRemote(token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        logger.warn(
          `[AppInitializer] Token validation failed: ${response.status}`
        );
        return false;
      }

      const data = await response.json();
      logger.debug('[AppInitializer] Remote validation successful', {
        userEmail: data.user?.email,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error(String(error));
      logger.error('[AppInitializer] Remote validation error', errorMessage);
      // Fail-closed: se não conseguir validar, considerar inválido
      return false;
    }
  }

  /**
   * PASSO 7: Logout seguro
   * Limpa TODOS os dados sensíveis
   */
  async performSecureLogout(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      logger.info('[AppInitializer] Performing secure logout...');

      // 7.0 Limpar o cookie httpOnly de sessao no servidor -- a sessao vive
      // nesse cookie desde a migracao de localStorage para cookie httpOnly;
      // os passos 7.1+ abaixo (localStorage/sessionStorage/document.cookie)
      // nao alcancam um cookie httpOnly, por isso essa chamada e necessaria.
      fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});

      // 7.1 Deletar token
      localStorage.removeItem('auth-token');
      sessionStorage.removeItem('auth-token');

      // 7.2 Limpar dados do usuário
      const userDataKeys = [
        'user',
        'user_profile',
        'user_preferences',
        'user_settings',
      ];
      userDataKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // 7.3 Limpar cache de aplicação
      this.clearApplicationCache();

      // 7.4 Limpar cookies
      this.clearAllCookies();

      // 7.5 Fechar qualquer conexão ativa
      await this.closeActiveSessions();

      logger.info('[AppInitializer] Secure logout complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error(String(error));
      logger.error('[AppInitializer] Error during logout', errorMessage);
      // Continuar mesmo com erro - logout é crítico
    }
  }

  /**
   * Limpar cache de aplicação
   */
  private clearApplicationCache(): void {
    try {
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            caches.delete(cacheName);
          });
        });
      }

      // Limpar IndexedDB (async, não bloqueia)
      if (indexedDB && indexedDB.databases) {
        indexedDB.databases()
          .then((databases) => {
            databases.forEach((db) => {
              if (db.name) {
                indexedDB.deleteDatabase(db.name);
              }
            });
          })
          .catch(() => {
            // Ignorar erros ao limpar IndexedDB
          });
      }

      logger.debug('[AppInitializer] Application cache cleared');
    } catch (error) {
      const errorObj = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
      logger.warn('[AppInitializer] Error clearing cache', errorObj);
    }
  }

  /**
   * Limpar todos os cookies
   */
  private clearAllCookies(): void {
    try {
      document.cookie.split(';').forEach((cookie) => {
        const eqPos = cookie.indexOf('=');
        const name =
          eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });

      logger.debug('[AppInitializer] All cookies cleared');
    } catch (error) {
      const errorObj = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
      logger.warn('[AppInitializer] Error clearing cookies', errorObj);
    }
  }

  /**
   * Fechar conexões ativas (WebSocket, etc)
   */
  private async closeActiveSessions(): Promise<void> {
    try {
      // Fechar qualquer WebSocket conectado
      const wsUrl = (window as any).WS_CONNECTION;
      if (wsUrl) {
        (window as any).WS_CONNECTION = null;
      }

      logger.debug('[AppInitializer] Active sessions closed');
    } catch (error) {
      const errorObj = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
      logger.warn('[AppInitializer] Error closing sessions', errorObj);
    }
  }

  /**
   * PASSO 8: Iniciar validação periódica
   * Verifica a cada 5 minutos se sessão ainda é válida
   */
  private startPeriodicValidation(): void {
    if (typeof window === 'undefined') return;

    const validationInterval = 5 * 60 * 1000; // 5 minutos

    const performValidation = async () => {
      try {
        const token = localStorage.getItem('auth-token');

        if (!token) {
          // Sem token = logout
          await this.handleInvalidSession();
          return;
        }

        const isValid = await this.validateTokenRemote(token);

        if (!isValid) {
          logger.warn('[AppInitializer] Periodic validation failed');
          await this.handleInvalidSession();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error : new Error(String(error));
        logger.error(
          '[AppInitializer] Error in periodic validation',
          errorMessage
        );
        // Em caso de erro, fazer logout por segurança
        await this.handleInvalidSession();
      }
    };

    // Agendar validações periódicas
    const timerId = setInterval(performValidation, validationInterval);

    // Salvar ID para poder cancelar se necessário
    (window as any).__validationTimerId = timerId;

    logger.info(
      '[AppInitializer] Periodic validation scheduled (every 5 minutes)'
    );
  }

  /**
   * Lidar com sessão inválida detectada em validação periódica
   */
  private async handleInvalidSession(): Promise<void> {
    logger.warn('[AppInitializer] Session invalidated during periodic check');

    // Fazer logout seguro
    await this.performSecureLogout();

    // Notificar interface
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sessionInvalidated', {
          detail: {
            reason: 'periodic_validation_failed',
            timestamp: Date.now(),
          },
        })
      );
    }

    // Redirecionar para login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  /**
   * Cancelar validação periódica
   */
  stopPeriodicValidation(): void {
    if (typeof window === 'undefined') return;

    const timerId = (window as any).__validationTimerId;
    if (timerId) {
      clearInterval(timerId);
      (window as any).__validationTimerId = null;
      logger.info('[AppInitializer] Periodic validation stopped');
    }
  }

  /**
   * Reset da instância (para testes)
   */
  reset(): void {
    this.isInitialized = false;
    this.stopPeriodicValidation();
    logger.debug('[AppInitializer] Instance reset');
  }
}

/**
 * Export para uso em toda aplicação
 */
export const appInitializer = AppInitializer.getInstance();
