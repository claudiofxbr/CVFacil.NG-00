'use client';

import { ReactNode, useEffect, useState } from 'react';
import { getToken } from '@/lib/apiClient';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * AuthGuard Component
 *
 * Valida se existe token no localStorage ANTES de renderizar filhos
 * Previne renderização prematura de componentes que requerem autenticação
 *
 * Estados:
 * - validating: Verificando existência de token
 * - valid: Token existe, pode renderizar
 * - invalid: Sem token, renderizar login
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [status, setStatus] = useState<'validating' | 'valid' | 'invalid'>('validating');

  useEffect(() => {
    // Executar APENAS no cliente
    if (typeof window === 'undefined') return;

    try {
      const token = getToken();

      if (token) {
        console.log('[AuthGuard] Token found in localStorage');
        setStatus('valid');
      } else {
        console.log('[AuthGuard] No token in localStorage');
        setStatus('invalid');
      }
    } catch (error) {
      console.error('[AuthGuard] Error checking token:', error);
      setStatus('invalid');
    }
  }, []);

  // Estado validando: mostrar loader
  if (status === 'validating') {
    return (
      fallback || (
        <div className="min-h-screen bg-forest-deep flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-stone-400 font-display font-bold animate-pulse uppercase tracking-widest text-xs">
              Validando autenticação...
            </p>
          </div>
        </div>
      )
    );
  }

  // Token inválido ou não existe: AuthProvider vai renderizar login
  if (status === 'invalid') {
    console.log('[AuthGuard] User not authenticated, letting AuthProvider handle login view');
    return children;
  }

  // Token válido: renderizar children normalmente
  return children;
}
