import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { OptimizedPDFProcessor } from './pdf-processor';
import { GeminiAPIHandler } from './gemini-handler';
import { geminiLogger } from './logger';
import QueueManager, { JobData } from './queue-manager';
import * as fs from 'fs';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

const pdfProcessor = new OptimizedPDFProcessor();
const geminiHandler = new GeminiAPIHandler();

/**
 * Worker que processa PDFs da fila
 */
export const pdfWorker = new Worker<JobData>(
  'pdf-processing',
  async (job: Job<JobData>) => {
    const { fileName, filePath, estimatedTokens } = job.data;
    const jobId = job.id || '';

    geminiLogger.info(`▶️ Iniciando processamento: ${jobId}`, {
      fileName,
      tokens: estimatedTokens,
      attempt: job.attemptsMade + 1,
    });

    try {
      // 1. Atualizar status para PROCESSING
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          attemptCount: job.attemptsMade + 1,
        },
      });

      // 2. Verificar quota antes de processar
      const quotaState = await QueueManager.getQuotaState();
      if (!quotaState) {
        throw new Error('Falha ao obter estado da quota');
      }

      const quotaPercentage =
        (Number(quotaState.tokensThisMinute) / 1_000_000) * 100;

      if (quotaPercentage > 80) {
        geminiLogger.warn(
          `⏳ Quota em ${quotaPercentage.toFixed(1)}%, agendando retry`
        );

        // Calcular tempo até próximo minuto
        const now = new Date();
        const waitMs =
          60000 -
          (now.getTime() - quotaState.minuteResetAt.getTime()) +
          1000;

        // Re-enfileirar com delay
        await job.moveToDelayed(waitMs, job.token);

        return {
          status: 'delayed',
          reason: 'QUOTA_LIMIT',
          retryIn: `${waitMs}ms`,
        };
      }

      // 3. Verificar se arquivo ainda existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      // 4. Processar PDF
      const processed = await pdfProcessor.processPDF(filePath);

      // 5. Chamar Gemini com error handling
      let suggestions: string[] = [];
      let tokensUsed = estimatedTokens;

      try {
        const result = await geminiHandler.analyzeResume(
          processed.extractedText,
          processed.estimatedTokens
        );

        suggestions = result.suggestions;
        tokensUsed = result.tokensUsed;

        // 6. Atualizar quota
        await QueueManager.updateQuotaAfterRequest(
          tokensUsed,
          jobId,
          true
        );
      } catch (geminiError: any) {
        const errorCode = geminiError?.code || 'UNKNOWN';
        const isRetryable = geminiError?.isRetryable || false;

        geminiLogger.warn(`⚠️ Erro Gemini recebido`, {
          code: errorCode,
          message: geminiError?.message,
          isRetryable,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts,
        });

        await QueueManager.updateQuotaAfterRequest(
          estimatedTokens,
          jobId,
          false,
          String(errorCode)
        );

        // Se é retryable e ainda tem tentativas, o BullMQ vai fazer retry automaticamente
        // Caso contrário, falha final
        if (isRetryable && job.attemptsMade < (job.opts.attempts || 5) - 1) {
          throw geminiError; // Re-throw para BullMQ tratar como retry
        } else {
          // Falha final
          throw geminiError;
        }
      }

      // 7. Salvar resultado
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          suggestions: suggestions,
          actualTokensUsed: tokensUsed,
          extractedTextLength: processed.extractedText.length,
          chunksCount: Math.ceil(processed.estimatedTokens / 10000),
        },
      });

      geminiLogger.info(`✅ PDF processado com sucesso: ${jobId}`, {
        tokens: tokensUsed,
        suggestions: suggestions.length,
      });

      return {
        status: 'success',
        jobId,
        suggestions,
        tokensUsed,
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro desconhecido';
      const errorCode = error?.code || error?.status || 'ERROR';

      // Atualizar tentativa no DB
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          lastError: errorMessage,
          lastErrorCode: String(errorCode),
          attemptCount: job.attemptsMade + 1,
        },
      });

      // Registrar no retry history
      await prisma.jobRetryHistory.create({
        data: {
          jobId,
          attemptNumber: job.attemptsMade + 1,
          retryType: job.attemptsMade < (job.opts.attempts || 5) - 1 ? 'EXPONENTIAL' : 'MAX_RETRIES_EXCEEDED',
          errorCode: String(errorCode),
          backoffMs: job.attemptsMade > 0 ? Math.pow(2, job.attemptsMade) * 1000 : 0,
          scheduledFor: new Date(),
        },
      });

      // Se foi última tentativa, marcar como falho
      if (job.attemptsMade >= (job.opts.attempts || 5) - 1) {
        await prisma.importJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
          },
        });

        geminiLogger.error(
          `❌ Job ${jobId} falhou após ${job.attemptsMade + 1} tentativas - ${errorMessage} (${errorCode})`
        );
      } else {
        // Re-throw para BullMQ fazer novo retry
        throw error;
      }
    } finally {
      // Limpar arquivo temporário
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        geminiLogger.warn(`Erro ao limpar arquivo temporário: ${filePath}`, cleanupError);
      }
    }
  },
  {
    connection: redis,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
    removeOnComplete: {
      age: 3600, // Remove após 1 hora
    },
    removeOnFail: {
      age: 86400, // Mantém por 24h
    },
  }
);

/**
 * Event Listeners para observabilidade
 */
pdfWorker.on('completed', (job) => {
  geminiLogger.info(`✅ Job completado: ${job.id}`);
});

pdfWorker.on('failed', (job, error) => {
  geminiLogger.error(`❌ Job falhou permanentemente: ${job?.id}`, error);
});

pdfWorker.on('active', (job) => {
  geminiLogger.debug(`⚙️ Job ativo: ${job.id}`);
});

pdfWorker.on('stalled', (jobId) => {
  geminiLogger.warn(`⚠️ Job travado (stalled): ${jobId}`);
});

pdfWorker.on('error', (error) => {
  geminiLogger.error('Erro no worker', error as Error);
});

export default pdfWorker;

/**
 * Função para iniciar o worker (chamada de um script separado)
 */
export async function startWorker() {
  geminiLogger.info('🚀 Iniciando PDF Processing Worker...');

  try {
    await pdfWorker.waitUntilReady();
    geminiLogger.info('✅ Worker pronto para processar jobs');
  } catch (error) {
    geminiLogger.error('Erro ao iniciar worker', error as Error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
  geminiLogger.info('🛑 Encerrando worker...');
  try {
    await pdfWorker.close();
    await redis.quit();
    await prisma.$disconnect();
    geminiLogger.info('✅ Worker encerrado com sucesso');
    process.exit(0);
  } catch (error) {
    geminiLogger.error('Erro ao encerrar worker', error as Error);
    process.exit(1);
  }
});
