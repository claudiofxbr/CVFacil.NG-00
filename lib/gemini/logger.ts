/**
 * Structured Logging para observabilidade da API Gemini
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  field?: string;
  retryCount?: number;
  duration?: number;
  circuitState?: string;
  error?: {
    name: string;
    message: string;
    status?: number;
  };
  metadata?: Record<string, any>;
}

export class StructuredLogger {
  private minLevel: LogLevel;
  private service: string;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 100; // Mantém últimos 100 logs em memória

  constructor(service: string, minLevel: LogLevel = LogLevel.INFO) {
    this.service = service;
    this.minLevel = minLevel;
  }

  private formatLog(level: string, message: string, data?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      ...data,
    };

    // Mantém apenas últimos N logs
    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    return entry;
  }

  debug(message: string, data?: any): void {
    if (this.minLevel <= LogLevel.DEBUG) {
      const entry = this.formatLog('DEBUG', message, data);
      console.debug(`[${entry.service}]`, message, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.minLevel <= LogLevel.INFO) {
      const entry = this.formatLog('INFO', message, data);
      console.info(`[${entry.service}]`, message, data);
    }
  }

  warn(message: string, data?: any): void {
    if (this.minLevel <= LogLevel.WARN) {
      const entry = this.formatLog('WARN', message, data);
      console.warn(`[${entry.service}]`, message, data);
    }
  }

  error(message: string, error?: Error, data?: any): void {
    if (this.minLevel <= LogLevel.ERROR) {
      const errorData = error ? {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error as any).status && { status: (error as any).status },
        },
      } : {};

      const entry = this.formatLog('ERROR', message, { ...errorData, ...data });
      console.error(`[${entry.service}] ${message}`, error, data);
    }
  }

  /**
   * Registra requisição à Gemini API
   */
  logGeminiRequest(field: string, prompt: string, language: string): void {
    this.debug('Gemini request', {
      field,
      promptLength: prompt.length,
      language,
      metadata: { operation: 'gemini_request' },
    });
  }

  /**
   * Registra resposta da Gemini API
   */
  logGeminiResponse(
    field: string,
    suggestions: string[],
    duration: number,
    retryCount: number = 0,
  ): void {
    this.info('Gemini response', {
      field,
      suggestionsCount: suggestions.length,
      duration,
      retryCount,
      metadata: {
        operation: 'gemini_response',
        success: true,
      },
    });
  }

  /**
   * Registra erro da Gemini API
   */
  logGeminiError(
    field: string,
    error: Error,
    status?: number,
    retryCount: number = 0,
    circuitState?: string,
  ): void {
    this.error('Gemini API error', error, {
      field,
      retryCount,
      circuitState,
      metadata: {
        operation: 'gemini_error',
        status,
        errorType: error.name,
      },
    });
  }

  /**
   * Retorna logs em memória (últimas N requisições)
   */
  getLogs(limit: number = 20): LogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Retorna estatísticas de uso
   */
  getStats() {
    const errors = this.logs.filter(l => l.level === 'ERROR');
    const requests = this.logs.filter(l => l.metadata?.operation === 'gemini_request');

    return {
      totalLogs: this.logs.length,
      totalRequests: requests.length,
      totalErrors: errors.length,
      errorRate: requests.length > 0 ? (errors.length / requests.length) * 100 : 0,
      averageDuration:
        requests.length > 0
          ? requests.reduce((sum, r) => sum + (r.duration || 0), 0) / requests.length
          : 0,
    };
  }

  /**
   * Limpa logs
   */
  clear(): void {
    this.logs = [];
  }
}

// Instância global
export const geminiLogger = new StructuredLogger('Gemini', LogLevel.INFO);
