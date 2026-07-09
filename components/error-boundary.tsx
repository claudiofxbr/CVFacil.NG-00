'use client';

/**
 * ============================================================================
 * CVFacil.NG - Error Boundary
 * ============================================================================
 *
 * Captura erros de rendering em React
 * Garante que erros de componentes não quebram o app inteiro
 */

import React, { ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { appInitializer } from '@/lib/initialization/app-initializer';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorCount: number;
}

/**
 * Error Boundary Component
 */
export class ErrorBoundary extends React.Component<Props, State> {
  private readonly maxErrorsBeforeLockdown = 5;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('[ErrorBoundary] React error caught', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Incrementar contador de erros
    const newCount = this.state.errorCount + 1;
    this.setState({ errorCount: newCount });

    // Se muitos erros ocorreram, fazer logout por segurança
    if (newCount >= this.maxErrorsBeforeLockdown) {
      this.handleCriticalError();
    }
  }

  /**
   * Lidar com erro crítico
   */
  private async handleCriticalError(): Promise<void> {
    logger.error('[ErrorBoundary] CRITICAL ERROR - Too many errors detected');

    // Fazer logout seguro
    await appInitializer.performSecureLogout();

    // Redirecionar para login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  /**
   * Tentar recuperar do erro
   */
  private handleRetry = async (): Promise<void> => {
    logger.info('[ErrorBoundary] Retrying after error');
    this.setState({ hasError: false, error: undefined, errorCount: 0 });
  };

  /**
   * Fazer logout
   */
  private handleLogout = async (): Promise<void> => {
    logger.info('[ErrorBoundary] User initiated logout');
    await appInitializer.performSecureLogout();

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f3f4f6',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              padding: '40px',
              maxWidth: '500px',
              textAlign: 'center',
            }}
          >
            {/* Header */}
            <div
              style={{
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#fee2e2',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                }}
              >
                <svg
                  style={{ width: '32px', height: '32px', color: '#dc2626' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4v2m0 4v2M6.447 8.894a9 9 0 1112.106 0M12 20a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>
              </div>

              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: '0 0 8px 0',
                }}
              >
                Oops! Algo deu errado
              </h1>

              <p
                style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '0 0 16px 0',
                }}
              >
                Desculpe, uma erro inesperado ocorreu. Por favor, tente novamente
                ou faça login novamente.
              </p>
            </div>

            {/* Error Details (apenas em desenvolvimento) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '20px',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#6b7280',
                  cursor: 'pointer',
                }}
              >
                <summary style={{ fontWeight: '600', marginBottom: '8px' }}>
                  Detalhes do Erro
                </summary>
                <pre
                  style={{
                    overflow: 'auto',
                    margin: '8px 0 0 0',
                    fontSize: '11px',
                    color: '#991b1b',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Error Count Warning */}
            {this.state.errorCount >= this.maxErrorsBeforeLockdown - 1 && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: '#991b1b',
                }}
              >
                <strong>⚠️ Aviso:</strong> Múltiplos erros detectados. Por segurança,
                você será desconectado em breve.
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    '#2563eb';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    '#3b82f6';
                }}
              >
                Tentar Novamente
              </button>

              <button
                onClick={this.handleLogout}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    '#ef4444';
                }}
              >
                Desconectar
              </button>
            </div>

            {/* Footer */}
            <p
              style={{
                fontSize: '12px',
                color: '#9ca3af',
                margin: '20px 0 0 0',
              }}
            >
              Se o problema persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
