import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { geminiLogger } from './logger';

export interface JobData {
  userId: string;
  fileName: string;
  filePath: string;
  estimatedTokens: number;
  uploadedAt: Date;
}

export interface JobResult {
  jobId: string;
  userId: string;
  fileName: string;
  status: 'success' | 'failed' | 'pending';
  suggestions?: string[];
  tokensUsed?: number;
  error?: string;
  retryCount?: number;
}

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

/**
 * Fila principal de processamento de PDFs
 */
export const pdfProcessingQueue = new Queue<JobData>('pdf-processing', {
  connection: redis,
  defaultJobOptions: {
    // Retry automático com exponential backoff
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000, // Começa com 2s: 2s, 4s, 8s, 16s, 32s
    },
    removeOnComplete: {
      age: 3600, // Remove jobs completados após 1 hora
    },
    removeOnFail: {
      age: 86400, // Mantém jobs falhados por 24h para auditoria
    },
  },
});

/**
 * Priority Queue para requisições urgentes
 */
export const priorityQueue = new Queue<JobData>('pdf-processing-priority', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

/**
 * Fila de Quota Management
 */
export const quotaManagementQueue = new Queue<{
  jobId: string;
  estimatedTokens: number;
}>('quota-check', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

/**
 * QueueScheduler é gerenciado automaticamente pelo BullMQ
 */

/**
 * Gerenciador da fila (enqueue, status, etc)
 */
export class QueueManager {
  /**
   * Enfileirar um PDF para processamento
   */
  static async enqueuePDF(
    userId: string,
    fileName: string,
    filePath: string,
    estimatedTokens: number
  ): Promise<string> {
    try {
      // Criar registro no Neon
      const jobRecord = await prisma.importJob.create({
        data: {
          userId,
          fileName,
          status: 'PENDING',
          estimatedTokens,
          attemptCount: 0,
          filePath,
          fileSizeBytes: 0,
        },
      });

      // Enfileirar baseado em prioridade
      let queue = pdfProcessingQueue;
      let priority = 0;

      // Se tokens excedem 50% do limite diário, usar fila de prioridade baixa
      const dailyUsage = await this.getQuotaUsageToday();
      if (dailyUsage + estimatedTokens > 500_000) {
        queue = priorityQueue;
        priority = -10; // Menor prioridade
      }

      await queue.add(
        `pdf-${jobRecord.id}`,
        {
          userId,
          fileName,
          filePath,
          estimatedTokens,
          uploadedAt: new Date(),
        },
        {
          jobId: jobRecord.id,
          priority: priority,
          delay: priority < 0 ? 30000 : 0, // Atrasar baixa prioridade 30s
        }
      );

      geminiLogger.info(`📥 PDF enfileirado: ${jobRecord.id}`, {
        fileName,
        tokens: estimatedTokens,
        queue: queue.name,
      });

      return jobRecord.id;
    } catch (error) {
      geminiLogger.error('Erro ao enfileirar PDF', error as Error);
      throw error;
    }
  }

  /**
   * Obter status de um job
   */
  static async getJobStatus(jobId: string): Promise<JobResult | null> {
    try {
      const jobRecord = await prisma.importJob.findUnique({
        where: { id: jobId },
      });

      if (!jobRecord) {
        return null;
      }

      // Se o job foi completado, retornar resultado
      if (jobRecord.status === 'SUCCESS' || jobRecord.status === 'FAILED') {
        return {
          jobId: jobRecord.id,
          userId: jobRecord.userId,
          fileName: jobRecord.fileName,
          status: jobRecord.status === 'SUCCESS' ? 'success' : 'failed',
          suggestions:
            jobRecord.suggestions && Array.isArray(jobRecord.suggestions)
              ? (jobRecord.suggestions as string[])
              : undefined,
          tokensUsed: jobRecord.actualTokensUsed || undefined,
          error: jobRecord.lastError || undefined,
          retryCount: jobRecord.attemptCount,
        };
      }

      // Se ainda está processando
      return {
        jobId,
        userId: jobRecord.userId,
        fileName: jobRecord.fileName,
        status: 'pending',
        retryCount: jobRecord.attemptCount,
      };
    } catch (error) {
      geminiLogger.error('Erro ao obter status do job', error as Error);
      return null;
    }
  }

  /**
   * Obter uso de quota do dia
   */
  static async getQuotaUsageToday(): Promise<number> {
    try {
      const result = await prisma.apiQuotaLog.aggregate({
        where: {
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
          success: true,
        },
        _sum: {
          tokensConsumed: true,
        },
      });

      return result._sum.tokensConsumed || 0;
    } catch (error) {
      geminiLogger.error('Erro ao obter quota do dia', error as Error);
      return 0;
    }
  }

  /**
   * Obter estado atual da quota
   */
  static async getQuotaState() {
    try {
      let state = await prisma.quotaState.findFirst();

      // Criar se não existir
      if (!state) {
        state = await prisma.quotaState.create({
          data: {},
        });
      }

      return state;
    } catch (error) {
      geminiLogger.error('Erro ao obter quota state', error as Error);
      return null;
    }
  }

  /**
   * Atualizar quota após requisição
   */
  static async updateQuotaAfterRequest(
    tokensConsumed: number,
    jobId: string,
    success: boolean,
    errorCode?: string
  ) {
    try {
      const state = await this.getQuotaState();

      if (!state) {
        // Criar primeira vez
        await prisma.quotaState.create({
          data: {
            requestsThisMinute: success ? 1 : 0,
            requestsThisDay: 1,
            tokensThisMinute: BigInt(tokensConsumed),
            tokensThisDay: BigInt(tokensConsumed),
            minuteResetAt: new Date(),
            dayResetAt: new Date(),
          },
        });
      } else {
        // Verificar se precisa resetar minuto
        const minuteElapsed =
          new Date().getTime() - state.minuteResetAt.getTime();
        const dayElapsed = new Date().getTime() - state.dayResetAt.getTime();

        const newRequestsMinute =
          minuteElapsed > 60000 ? (success ? 1 : 0) : state.requestsThisMinute + (success ? 1 : 0);
        const newTokensMinute =
          minuteElapsed > 60000
            ? BigInt(tokensConsumed)
            : state.tokensThisMinute + BigInt(tokensConsumed);

        await prisma.quotaState.update({
          where: { id: state.id },
          data: {
            requestsThisMinute: newRequestsMinute,
            requestsThisDay: dayElapsed > 86400000 ? 1 : state.requestsThisDay + 1,
            tokensThisMinute: newTokensMinute,
            tokensThisDay:
              dayElapsed > 86400000
                ? BigInt(tokensConsumed)
                : state.tokensThisDay + BigInt(tokensConsumed),
            minuteResetAt: minuteElapsed > 60000 ? new Date() : state.minuteResetAt,
            dayResetAt: dayElapsed > 86400000 ? new Date() : state.dayResetAt,
            alertSent80Percent:
              state.tokensThisDay >= 800_000 ? true : state.alertSent80Percent,
            alertSent100Percent:
              state.tokensThisDay >= 1_000_000
                ? true
                : state.alertSent100Percent,
          },
        });
      }

      // Registrar no audit log
      const currentState = await this.getQuotaState();
      await prisma.apiQuotaLog.create({
        data: {
          eventType: success ? 'REQUEST' : 'ERROR',
          tokensConsumed,
          success,
          errorCode,
          jobId,
          requestsThisMinute: currentState?.requestsThisMinute || 0,
          requestsThisDay: currentState?.requestsThisDay || 0,
          tokensThisMinute:
            (currentState?.tokensThisMinute || 0n) + BigInt(tokensConsumed),
          tokensThisDay:
            (currentState?.tokensThisDay || 0n) + BigInt(tokensConsumed),
        },
      });
    } catch (error) {
      geminiLogger.error('Erro ao atualizar quota', error as Error);
    }
  }

  /**
   * Limpar recursos
   */
  static async cleanup() {
    try {
      await redis.quit();
      await prisma.$disconnect();
    } catch (error) {
      geminiLogger.error('Erro ao limpar recursos', error as Error);
    }
  }
}

export default QueueManager;
