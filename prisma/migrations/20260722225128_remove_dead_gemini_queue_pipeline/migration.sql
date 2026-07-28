-- Remove a pipeline de fila BullMQ/worker do Gemini, confirmada como código
-- morto: nenhuma rota real (import-resume, ai-editor, suggestions) usa essas
-- tabelas; a rota real chama a Gemini de forma síncrona. Ver AUDITORIA_TECNICA
-- (achados A3, A4, A5) e devops/scripts removidos na mesma limpeza.

-- DropForeignKey
ALTER TABLE "job_retry_history" DROP CONSTRAINT IF EXISTS "job_retry_history_jobId_fkey";
ALTER TABLE "api_quota_logs" DROP CONSTRAINT IF EXISTS "api_quota_logs_jobId_fkey";
ALTER TABLE "api_quota_logs" DROP CONSTRAINT IF EXISTS "api_quota_logs_userId_fkey";
ALTER TABLE "import_jobs" DROP CONSTRAINT IF EXISTS "import_jobs_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "job_retry_history";
DROP TABLE IF EXISTS "api_quota_logs";
DROP TABLE IF EXISTS "quota_state";
DROP TABLE IF EXISTS "import_jobs";
DROP TABLE IF EXISTS "worker_health";

-- DropEnum
DROP TYPE IF EXISTS "JobStatus";
