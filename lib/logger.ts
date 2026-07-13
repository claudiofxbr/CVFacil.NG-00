/**
 * ============================================================================
 * CVFacil.NG - Logger
 * ============================================================================
 *
 * Sistema de logging estruturado para debugging
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private isDevelopment =
    typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

  /**
   * Log DEBUG message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log INFO message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log WARN message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log ERROR message
   */
  error(message: string, error?: Error | Record<string, unknown>): void {
    let data: Record<string, unknown> | undefined;
    let stack: string | undefined;

    if (error instanceof Error) {
      data = { message: error.message };
      stack = error.stack;
    } else if (error && typeof error === 'object') {
      data = error as Record<string, unknown>;
    }

    this.log(LogLevel.ERROR, message, data, stack);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    stack?: string
  ): void {
    const timestamp = new Date().toISOString();

    const entry: LogEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
      ...(stack && { stack }),
    };

    // Armazenar em memória
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output para console: sempre no servidor (é o que vira `docker logs` em
    // produção — sem isso, erros do servidor ficam invisíveis pra sempre),
    // só em desenvolvimento no navegador (evita ruído no console do usuário final)
    if (typeof window === 'undefined' || this.isDevelopment) {
      this.outputToConsole(entry);
    }

    // Armazenar em localStorage para debugging
    if (typeof window !== 'undefined') {
      this.storeInLocalStorage(entry);
    }
  }

  /**
   * Output para console
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * Armazenar em localStorage
   */
  private storeInLocalStorage(entry: LogEntry): void {
    try {
      const logsKey = 'app_logs';
      const existing = localStorage.getItem(logsKey);
      const logs: LogEntry[] = existing ? JSON.parse(existing) : [];

      logs.push(entry);

      // Manter apenas últimos 50 logs
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }

      localStorage.setItem(logsKey, JSON.stringify(logs));
    } catch {
      // Falha silenciosa - não quebra o app
    }
  }

  /**
   * Obter todos os logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Obter logs do localStorage
   */
  getStoredLogs(): LogEntry[] {
    try {
      if (typeof window === 'undefined') return [];

      const stored = localStorage.getItem('app_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Limpar logs
   */
  clearLogs(): void {
    this.logs = [];

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('app_logs');
      } catch {
        // Falha silenciosa
      }
    }
  }

  /**
   * Exportar logs como JSON
   */
  exportAsJSON(): string {
    const allLogs = [
      ...this.logs,
      ...this.getStoredLogs(),
    ];

    return JSON.stringify(allLogs, null, 2);
  }

  /**
   * Exportar logs como CSV
   */
  exportAsCSV(): string {
    const allLogs = [
      ...this.logs,
      ...this.getStoredLogs(),
    ];

    const headers = ['Timestamp', 'Level', 'Message', 'Data'];
    const rows = allLogs.map((log) => [
      log.timestamp,
      log.level,
      log.message,
      JSON.stringify(log.data || ''),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return csv;
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Export para uso em toda aplicação
 */
export type { LogEntry };
export { Logger };
