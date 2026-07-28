/**
 * Orçamento de erro compartilhado entre os dois mecanismos de captura do app
 * (ErrorBoundary, para erros de render React, e GlobalExceptionHandler, para
 * erros globais/promises não tratadas). Antes, cada um mantinha sua própria
 * contagem: o ErrorBoundary tolerava 5 erros antes de forçar logout, mas o
 * GlobalExceptionHandler derrubava a sessão no primeiro erro não tratado —
 * uma única falha de rede sem `.catch()` já desconectava o usuário. Agora os
 * dois somam no mesmo contador, então o comportamento de tolerância é
 * consistente independente da origem do erro.
 */
class ErrorBudget {
  private static instance: ErrorBudget;
  readonly max = 5;
  count = 0;

  static getInstance(): ErrorBudget {
    if (!ErrorBudget.instance) {
      ErrorBudget.instance = new ErrorBudget();
    }
    return ErrorBudget.instance;
  }

  /** Registra um erro e retorna true quando o orçamento estourou. */
  register(): boolean {
    this.count += 1;
    return this.count >= this.max;
  }

  reset(): void {
    this.count = 0;
  }
}

export const errorBudget = ErrorBudget.getInstance();
