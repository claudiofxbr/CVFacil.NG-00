'use client';

/**
 * ============================================================================
 * CVFacil.NG - Initialization Script
 * ============================================================================
 *
 * Componente que executa a inicialização do app
 * Deve rodar ANTES do AuthProvider
 */

import { useEffect } from 'react';
import { globalExceptionHandler } from '@/lib/initialization/global-exception-handler';
import { logger } from '@/lib/logger';

/**
 * Initialization Script Component
 *
 * Este componente é responsável por:
 * 1. Instalar Global Exception Handler
 * 2. Inicializar o app com AppInitializer
 * 3. Lidar com eventos de sessão invalidada
 */
export function InitializationScript(): null {
  useEffect(() => {
    const initializeApplication = async (): Promise<void> => {
      try {
        logger.info('[InitializationScript] Starting app initialization...');

        // PASSO 1: Instalar Global Exception Handler
        globalExceptionHandler.install();
        logger.info('[InitializationScript] Global Exception Handler installed');

        // PASSO 2: AppInitializer desabilitado temporariamente
        // O AuthProvider em app/layout.tsx já valida a sessão
        logger.info('[InitializationScript] App initialization skipped (using AuthProvider)');
      } catch (error) {
        const errorMessage = error instanceof Error ? error : new Error(String(error));
        logger.error('[InitializationScript] Unexpected error', errorMessage);
      }
    };

    initializeApplication();

    // PASSO 4: Lidar com eventos de sessão invalidada
    const handleSessionInvalidated = (): void => {
      logger.warn('[InitializationScript] Session invalidated event received');

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    };

    window.addEventListener('sessionInvalidated', handleSessionInvalidated);

    // PASSO 5: Lidar com logout externo
    const handleExternalLogout = (): void => {
      logger.warn('[InitializationScript] External logout event received');

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    };

    window.addEventListener('externalLogout', handleExternalLogout);

    // Cleanup
    return () => {
      window.removeEventListener('sessionInvalidated', handleSessionInvalidated);
      window.removeEventListener('externalLogout', handleExternalLogout);
    };
  }, []);

  // Este componente não renderiza nada, apenas executa efeitos colaterais
  return null;
}
