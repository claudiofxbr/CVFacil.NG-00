import { geminiLogger } from './logger';

/**
 * Fila de Processamento para Gemini API
 * Controla requisições simultâneas e limites de token
 */

export interface QueueTask<T = any> {
  id: string;
  priority: number;
  data: T;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retry';
  retries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: Error;
  result?: any;
}

export interface QueueConfig {
  maxConcurrent: number;
  maxRetriesPerTask: number;
  tokenLimitPerMinute: number;
  requestLimitPerMinute: number;
  retryBackoffMs: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrent: 1,
  maxRetriesPerTask: 5,
  tokenLimitPerMinute: 900_000, // 90% do limite
  requestLimitPerMinute: 12, // 80% do limite
  retryBackoffMs: 1000,
};

export class ProcessingQueue<T = any> {
  private queue: QueueTask<T>[] = [];
  private activeTaskCount = 0;
  private minuteMetrics = {
    tokensUsed: 0,
    requestsUsed: 0,
    startTime: Date.now(),
  };
  private config: QueueConfig;
  private taskCallbacks: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
    }
  > = new Map();

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Adicionar tarefa à fila
   */
  async enqueue<R = any>(
    taskId: string,
    data: T,
    priority: number = 0
  ): Promise<R> {
    const task: QueueTask<T> = {
      id: taskId,
      priority,
      data,
      status: 'pending',
      retries: 0,
      createdAt: new Date(),
    };

    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);

    geminiLogger.debug(`📥 Tarefa enfileirada: ${taskId} (prioridade: ${priority})`);

    // Retornar promise que será resolvida quando tarefa completar
    return new Promise<R>((resolve, reject) => {
      this.taskCallbacks.set(taskId, { resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Processar fila
   */
  private async processQueue(): Promise<void> {
    while (
      this.queue.length > 0 &&
      this.activeTaskCount < this.config.maxConcurrent
    ) {
      await this.checkAndResetMinuteMetrics();

      const task = this.queue[0];

      // Verificar se há recursos disponíveis
      const canProcess = this.canProcessTask(task);

      if (!canProcess) {
        const waitTime = this.getWaitTimeMs();
        geminiLogger.warn(
          `⏳ Fila pausada por ${waitTime}ms - aguardando reset de limite`
        );
        await this.delay(waitTime);
        continue;
      }

      this.queue.shift();
      this.activeTaskCount++;
      task.status = 'processing';
      task.startedAt = new Date();

      this.processTask(task).finally(() => {
        this.activeTaskCount--;
        this.processQueue();
      });
    }
  }

  /**
   * Verificar se tarefa pode ser processada
   */
  private canProcessTask(task: QueueTask<T>): boolean {
    // Verificar limite de requisições por minuto
    if (this.minuteMetrics.requestsUsed >= this.config.requestLimitPerMinute) {
      return false;
    }

    // Verificar limite de tokens por minuto
    // Estimativa: task.data pode ter propriedade 'estimatedTokens'
    const estimatedTokens = (task.data as any)?.estimatedTokens || 12500;
    if (
      this.minuteMetrics.tokensUsed + estimatedTokens >
      this.config.tokenLimitPerMinute
    ) {
      return false;
    }

    return true;
  }

  /**
   * Obter tempo de espera até reset de limite
   */
  private getWaitTimeMs(): number {
    const elapsedMs = Date.now() - this.minuteMetrics.startTime;
    const waitMs = Math.max(60_000 - elapsedMs, 100);
    return waitMs;
  }

  /**
   * Processar tarefa individual
   */
  private async processTask(task: QueueTask<T>): Promise<void> {
    try {
      geminiLogger.info(`▶️  Processando: ${task.id}`);

      // Simular processamento (será override em route.ts)
      const result = await this.executeTask(task);

      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;

      // Atualizar métricas
      const estimatedTokens = (task.data as any)?.estimatedTokens || 12500;
      this.minuteMetrics.tokensUsed += estimatedTokens;
      this.minuteMetrics.requestsUsed += 1;

      geminiLogger.info(`✅ Concluído: ${task.id}`);

      const callback = this.taskCallbacks.get(task.id);
      if (callback) {
        callback.resolve(result);
        this.taskCallbacks.delete(task.id);
      }
    } catch (error) {
      await this.handleTaskError(task, error as Error);
    }
  }

  /**
   * Executar tarefa (override em subclasses)
   */
  protected async executeTask(_task: QueueTask<T>): Promise<any> {
    // Será implementado em route.ts
    throw new Error('executeTask deve ser implementado');
  }

  /**
   * Tratar erro de tarefa com retry
   */
  private async handleTaskError(task: QueueTask<T>, error: Error): Promise<void> {
    task.error = error;
    task.retries++;

    const isRetryable =
      error.message.includes('429') ||
      error.message.includes('5') ||
      error.message.includes('timeout');

    if (isRetryable && task.retries < this.config.maxRetriesPerTask) {
      task.status = 'retry';
      const backoffMs = this.calculateBackoff(task.retries);

      geminiLogger.warn(
        `🔄 Retry ${task.retries}/${this.config.maxRetriesPerTask} para ${task.id} em ${backoffMs}ms`
      );

      await this.delay(backoffMs);
      this.queue.unshift(task); // Reinsert na fila
      this.processQueue();
    } else {
      task.status = 'failed';
      task.completedAt = new Date();

      geminiLogger.error(
        `❌ Falha final: ${task.id} após ${task.retries} tentativas - ${error.message}`
      );

      const callback = this.taskCallbacks.get(task.id);
      if (callback) {
        callback.reject(error);
        this.taskCallbacks.delete(task.id);
      }
    }
  }

  /**
   * Calcular backoff exponencial
   */
  private calculateBackoff(retryCount: number): number {
    const exponential = this.config.retryBackoffMs * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 1000;
    return exponential + jitter;
  }

  /**
   * Verificar e resetar métricas de minuto
   */
  private async checkAndResetMinuteMetrics(): Promise<void> {
    const now = Date.now();
    const elapsedMs = now - this.minuteMetrics.startTime;

    if (elapsedMs > 60_000) {
      geminiLogger.debug(
        `🔄 Reset de métricas de minuto: ${this.minuteMetrics.requestsUsed} req, ${this.minuteMetrics.tokensUsed} tokens`
      );
      this.minuteMetrics = {
        tokensUsed: 0,
        requestsUsed: 0,
        startTime: now,
      };
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Obter status da fila
   */
  getStatus() {
    return {
      pending: this.queue.filter((t) => t.status === 'pending').length,
      processing: this.activeTaskCount,
      metrics: {
        requestsThisMinute: `${this.minuteMetrics.requestsUsed}/${this.config.requestLimitPerMinute}`,
        tokensThisMinute: `${this.minuteMetrics.tokensUsed.toLocaleString()}/${this.config.tokenLimitPerMinute.toLocaleString()}`,
      },
    };
  }

  /**
   * Limpar fila (útil para testes)
   */
  clear(): void {
    this.queue = [];
    this.minuteMetrics = {
      tokensUsed: 0,
      requestsUsed: 0,
      startTime: Date.now(),
    };
    this.activeTaskCount = 0;
  }
}

/**
 * Fila singleton global
 */
let globalQueue: ProcessingQueue | null = null;

export function getProcessingQueue(
  config?: Partial<QueueConfig>
): ProcessingQueue {
  if (!globalQueue) {
    globalQueue = new ProcessingQueue(config);
  }
  return globalQueue;
}

export function resetProcessingQueue(): void {
  globalQueue = null;
}
