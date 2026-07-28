/**
 * Circuit Breaker Pattern
 * Previne cascading failures quando a API está com problemas
 *
 * Estados:
 * - CLOSED: Normal, todas requisições passam
 * - OPEN: API está com problemas, requisições são rejeitadas
 * - HALF_OPEN: Testando se API voltou, permite requisições de teste
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Número de falhas antes de abrir
  successThreshold: number; // Número de sucessos para fechar (no estado HALF_OPEN)
  timeoutMs: number;         // Tempo antes de tentar transição OPEN -> HALF_OPEN
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 30000, // 30 segundos
};

export class CircuitBreakerError extends Error {
  constructor(state: CircuitState) {
    super(`Circuit breaker is ${state}. Service unavailable.`);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;
  // Garante que, ao expirar o timeout em OPEN, apenas uma requisição por vez
  // seja admitida como teste de recuperação (HALF_OPEN) — sem isso, todas as
  // chamadas concorrentes que observam OPEN no mesmo instante transicionam e
  // disparam a chamada real simultaneamente, inundando uma API possivelmente
  // ainda instável em vez de testá-la com cautela.
  private halfOpenTrialInFlight: boolean = false;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  /**
   * Executa função com proteção do circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let admittedAsTrial = false;

    if (this.state === CircuitState.OPEN) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure < this.config.timeoutMs) {
        throw new CircuitBreakerError(this.state);
      }
      // Timeout expirou: só a primeira chamada a chegar aqui vira o trial;
      // as demais concorrentes são rejeitadas até o trial resolver.
      if (this.halfOpenTrialInFlight) {
        throw new CircuitBreakerError(this.state);
      }
      this.halfOpenTrialInFlight = true;
      admittedAsTrial = true;
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      console.log('🔶 Circuit breaker: Transitioning to HALF_OPEN');
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Já em HALF_OPEN: só admite chamadas adicionais se não houver trial em curso.
      if (this.halfOpenTrialInFlight) {
        throw new CircuitBreakerError(this.state);
      }
      this.halfOpenTrialInFlight = true;
      admittedAsTrial = true;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    } finally {
      if (admittedAsTrial) {
        this.halfOpenTrialInFlight = false;
      }
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      console.log(`✅ Circuit breaker: Success ${this.successCount}/${this.config.successThreshold}`);

      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        console.log('🟢 Circuit breaker: Closed (service recovered)');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      console.log('🔴 Circuit breaker: Reopened (service still failing)');
    } else if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log(`🔴 Circuit breaker: Opened after ${this.failureCount} failures`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenTrialInFlight = false;
    console.log('🔄 Circuit breaker reset');
  }
}

// Instância global para Gemini API
export const geminiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  successThreshold: 2,
  timeoutMs: 20000,
});
