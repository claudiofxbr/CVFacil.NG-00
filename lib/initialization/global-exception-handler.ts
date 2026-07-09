/**
 * ============================================================================
 * CVFacil.NG - Global Exception Handler
 * ============================================================================
 *
 * Captura exceções não tratadas globalmente
 * Garante que crashes não deixam o app em estado comprometido
 */

import { logger } from '@/lib/logger';
import { appInitializer } from './app-initializer';

export interface CrashReport {
  timestamp: number;
  message: string;
  stack: string;
  url: string;
  userAgent: string;
  cause: string;
  context?: Record<string, unknown>;
}

/**
 * Global Exception Handler
 */
export class GlobalExceptionHandler {
  private static instance: GlobalExceptionHandler;
  private maxCrashReports = 10;

  static getInstance(): GlobalExceptionHandler {
    if (!GlobalExceptionHandler.instance) {
      GlobalExceptionHandler.instance = new GlobalExceptionHandler();
    }
    return GlobalExceptionHandler.instance;
  }

  /**
   * Instalar handlers globais
   */
  install(): void {
    if (typeof window === 'undefined') return;

    logger.info('[GlobalExceptionHandler] Installing handlers...');

    // 1. Handle erros não capturados (Promise rejections)
    window.addEventListener('unhandledrejection', (event) => {
      this.handleUnhandledRejection(event);
    });

    // 2. Handle erros não capturados (throw/exceptions)
    window.addEventListener('error', (event) => {
      this.handleError(event);
    });

    // 3. Handle erros de recursos (imagens, scripts)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleResourceError(event);
      }
    });

    // 4. Monitorar mudanças no localStorage
    window.addEventListener('storage', (event) => {
      this.handleStorageChange(event);
    });

    logger.info('[GlobalExceptionHandler] Handlers installed successfully');
  }

  /**
   * HANDLER 1: Unhandled Promise Rejection
   */
  private async handleUnhandledRejection(event: PromiseRejectionEvent): Promise<void> {
    logger.error('[GlobalExceptionHandler] Unhandled Promise Rejection', {
      reason: event.reason,
      promise: event.promise,
    });

    // Previne comportamento padrão
    event.preventDefault();

    const reason =
      event.reason instanceof Error ? event.reason : new Error(String(event.reason));

    await this.processCrash({
      cause: 'unhandledRejection',
      message: reason.message,
      stack: reason.stack || 'No stack available',
      context: {
        promise: event.promise,
      },
    });
  }

  /**
   * HANDLER 2: Uncaught Error
   */
  private async handleError(event: ErrorEvent): Promise<void> {
    // Ignorar erros de script externo (cross-origin)
    if (event.filename?.includes('chrome-extension')) {
      return;
    }

    logger.error('[GlobalExceptionHandler] Uncaught Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    await this.processCrash({
      cause: 'uncaughtError',
      message: event.message || 'Unknown error',
      stack: `${event.filename}:${event.lineno}:${event.colno}`,
    });
  }

  /**
   * HANDLER 3: Resource Loading Error
   */
  private async handleResourceError(event: Event): Promise<void> {
    const target = event.target as HTMLElement;

    if (target.tagName === 'SCRIPT' || target.tagName === 'LINK') {
      logger.warn('[GlobalExceptionHandler] Resource loading failed', {
        tag: target.tagName,
        src: (target as any).src || (target as any).href,
      });

      // Não fazer logout para erro de recurso
      // Apenas reportar
    }
  }

  /**
   * HANDLER 4: Storage Change Detection
   * Detecta se token foi removido externamente
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'auth-token' && event.newValue === null) {
      logger.warn('[GlobalExceptionHandler] Auth token removed externally');

      // Token foi removido de outra aba/janela
      this.handleExternalLogout();
    }
  }

  /**
   * Processar crash
   */
  private async processCrash(info: {
    cause: string;
    message: string;
    stack: string;
    context?: Record<string, unknown>;
  }): Promise<void> {
    // 1. Criar relatório de crash
    const crashReport: CrashReport = {
      timestamp: Date.now(),
      message: info.message,
      stack: info.stack,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      cause: info.cause,
      context: info.context,
    };

    // 2. Armazenar relatório
    this.storeCrashReport(crashReport);

    // 3. Marcar que houve crash
    this.markCrashDetected(crashReport);

    // 4. Limpar dados sensíveis
    await this.cleanupBeforeCrash();

    // 5. Enviar relatório para servidor (assíncrono, não bloqueia)
    this.reportCrashToServer(crashReport).catch((error) => {
      logger.error('[GlobalExceptionHandler] Failed to report crash', error);
    });

    // 6. Reiniciar app para login
    this.restartAppSecurely();
  }

  /**
   * Armazenar relatório de crash em localStorage
   */
  private storeCrashReport(report: CrashReport): void {
    try {
      if (typeof window === 'undefined') return;

      const reports: CrashReport[] = [];
      const existing = localStorage.getItem('crash_reports');

      if (existing) {
        try {
          reports.push(...JSON.parse(existing));
        } catch {
          // Ignorar se JSON inválido
        }
      }

      // Adicionar novo relatório
      reports.push(report);

      // Manter apenas últimos N relatórios
      if (reports.length > this.maxCrashReports) {
        reports.splice(0, reports.length - this.maxCrashReports);
      }

      localStorage.setItem('crash_reports', JSON.stringify(reports));

      logger.debug('[GlobalExceptionHandler] Crash report stored', {
        total: reports.length,
      });
    } catch (error) {
      const errorObj = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
      logger.warn('[GlobalExceptionHandler] Failed to store crash report', errorObj);
    }
  }

  /**
   * Marcar que houve crash
   */
  private markCrashDetected(report: CrashReport): void {
    try {
      if (typeof window === 'undefined') return;

      localStorage.setItem('app_crash_detected', 'true');
      localStorage.setItem('crash_timestamp', report.timestamp.toString());
      localStorage.setItem('last_crash_message', report.message);

      logger.info('[GlobalExceptionHandler] Crash marked', {
        timestamp: report.timestamp,
      });
    } catch (error) {
      const errorObj = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
      logger.warn('[GlobalExceptionHandler] Failed to mark crash', errorObj);
    }
  }

  /**
   * Limpar dados sensíveis antes de crash
   */
  private async cleanupBeforeCrash(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      logger.info('[GlobalExceptionHandler] Cleaning up sensitive data...');

      // Usar app initializer para logout seguro
      await appInitializer.performSecureLogout();

      logger.info('[GlobalExceptionHandler] Cleanup complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error(String(error));
      logger.error('[GlobalExceptionHandler] Error during cleanup', errorMessage);
      // Continuar mesmo com erro
    }
  }

  /**
   * Enviar relatório de crash para servidor
   */
  private async reportCrashToServer(report: CrashReport): Promise<void> {
    try {
      const response = await fetch('/api/crash-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: report.timestamp,
          message: report.message,
          stack: report.stack,
          url: report.url,
          userAgent: report.userAgent,
          cause: report.cause,
          context: report.context,
        }),
      });

      if (response.ok) {
        logger.debug('[GlobalExceptionHandler] Crash report sent to server');
      } else {
        logger.warn(
          `[GlobalExceptionHandler] Failed to report crash: ${response.status}`
        );
      }
    } catch (error) {
      const errorObj = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
      logger.warn('[GlobalExceptionHandler] Error reporting crash', errorObj);
      // Não rethrow - este é assíncrono e não deve bloquear
    }
  }

  /**
   * Reiniciar app de forma segura
   */
  private restartAppSecurely(): void {
    if (typeof window === 'undefined') return;

    logger.warn('[GlobalExceptionHandler] Restarting app securely...');

    // Aguardar um pouco para permitir que logs sejam processados
    setTimeout(() => {
      // Recarregar página, que vai forçar login
      window.location.href = '/';
    }, 500);
  }

  /**
   * Lidar com logout externo (de outra aba/janela)
   */
  private handleExternalLogout(): void {
    logger.info('[GlobalExceptionHandler] External logout detected');

    // Notificar interface
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('externalLogout', {
          detail: {
            reason: 'token_removed_externally',
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
   * Obter relatórios de crash
   */
  getCrashReports(): CrashReport[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem('crash_reports');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Limpar relatórios de crash
   */
  clearCrashReports(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('crash_reports');
      logger.debug('[GlobalExceptionHandler] Crash reports cleared');
    } catch (error) {
      const errorObj = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
      logger.warn('[GlobalExceptionHandler] Error clearing reports', errorObj);
    }
  }
}

/**
 * Export para uso em toda aplicação
 */
export const globalExceptionHandler = GlobalExceptionHandler.getInstance();
