/**
 * Auth Logger - Rastreia todos os eventos de autenticação
 * Essencial para diagnóstico de falhas
 */

export type AuthEvent =
  | 'token_check_start'
  | 'token_check_found'
  | 'token_check_not_found'
  | 'refresh_user_start'
  | 'refresh_user_success'
  | 'refresh_user_timeout'
  | 'refresh_user_error'
  | 'login_start'
  | 'login_success'
  | 'login_error'
  | 'logout_requested'
  | 'validation_blocked'
  | 'guard_validating'
  | 'guard_valid'
  | 'guard_invalid';

export interface AuthLog {
  timestamp: string;
  event: AuthEvent;
  userId?: string;
  userEmail?: string;
  error?: string;
  duration?: number;
}

class AuthLogger {
  private logs: AuthLog[] = [];
  private readonly MAX_LOGS = 100;
  private timers: Map<string, number> = new Map();

  log(event: AuthEvent, data?: Partial<Omit<AuthLog, 'timestamp' | 'event'>>) {
    const log: AuthLog = {
      timestamp: new Date().toISOString(),
      event,
      ...data,
    };

    this.logs.push(log);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    // Log em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const color = event.includes('error') ? 'color: red' :
                    event.includes('success') ? 'color: green' :
                    'color: blue';
      console.log(`%c[AUTH] ${event}`, color, data);
    }

    // Enviar para backend para monitoramento
    this.sendToBackend(log);
  }

  startTimer(id: string) {
    this.timers.set(id, Date.now());
  }

  endTimer(id: string, event: AuthEvent, data?: Partial<Omit<AuthLog, 'timestamp' | 'event'>>) {
    const start = this.timers.get(id);
    const duration = start ? Date.now() - start : undefined;
    this.timers.delete(id);

    this.log(event, { ...data, duration });
  }

  private sendToBackend(log: AuthLog) {
    if (typeof window === 'undefined') return;

    fetch('/api/monitoring/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    }).catch(() => {});
  }

  getLogs() {
    return this.logs;
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
  }
}

export const authLogger = new AuthLogger();
