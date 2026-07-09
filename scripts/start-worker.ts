/**
 * Script para iniciar o worker de processamento de PDFs
 * Execução: npx ts-node scripts/start-worker.ts
 * Ou: npm run worker
 */

import { startWorker } from '../lib/gemini/worker';
import { geminiLogger } from '../lib/gemini/logger';

// Iniciar worker
startWorker().catch((error) => {
  geminiLogger.error('Erro ao iniciar worker', error as Error);
  process.exit(1);
});
