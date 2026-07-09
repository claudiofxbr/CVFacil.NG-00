-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "api_quota_logs" (
    "id" BIGSERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" TEXT NOT NULL,
    "requestsThisMinute" INTEGER,
    "requestsThisDay" INTEGER,
    "tokensThisMinute" BIGINT,
    "tokensThisDay" BIGINT,
    "jobId" TEXT,
    "tokensConsumed" INTEGER,
    "success" BOOLEAN,
    "errorCode" TEXT,
    "userId" TEXT,

    CONSTRAINT "api_quota_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "fileSizeBytes" BIGINT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "lastErrorCode" TEXT,
    "extractedTextLength" INTEGER,
    "estimatedTokens" INTEGER,
    "actualTokensUsed" INTEGER,
    "chunksCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "suggestions" JSONB,
    "resultMetadata" JSONB,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_retry_history" (
    "id" BIGSERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "retryType" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "backoffMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_retry_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "requestsThisMinute" INTEGER NOT NULL DEFAULT 0,
    "requestsThisDay" INTEGER NOT NULL DEFAULT 0,
    "tokensThisMinute" BIGINT NOT NULL DEFAULT 0,
    "tokensThisDay" BIGINT NOT NULL DEFAULT 0,
    "minuteResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dayResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertSent80Percent" BOOLEAN NOT NULL DEFAULT false,
    "alertSent100Percent" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quota_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL DEFAULT 'original',
    "themeMode" TEXT NOT NULL DEFAULT 'light',
    "fullName" TEXT,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin" TEXT,
    "portfolio" TEXT,
    "summary" TEXT,
    "experiences" JSONB DEFAULT '[]',
    "education" JSONB DEFAULT '[]',
    "skills" JSONB DEFAULT '[]',
    "languages" JSONB DEFAULT '[]',
    "hobbies" JSONB DEFAULT '[]',
    "avatarUrl" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isImported" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_health" (
    "id" SERIAL NOT NULL,
    "workerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobsProcessed" INTEGER NOT NULL DEFAULT 0,
    "jobsFailed" INTEGER NOT NULL DEFAULT 0,
    "avgProcessingTimeMs" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_quota_logs_jobId_timestamp_idx" ON "api_quota_logs"("jobId" ASC, "timestamp" DESC);

-- CreateIndex
CREATE INDEX "api_quota_logs_timestamp_idx" ON "api_quota_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "api_quota_logs_userId_timestamp_idx" ON "api_quota_logs"("userId" ASC, "timestamp" DESC);

-- CreateIndex
CREATE INDEX "import_jobs_status_createdAt_idx" ON "import_jobs"("status" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "import_jobs_userId_createdAt_idx" ON "import_jobs"("userId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "job_retry_history_jobId_attemptNumber_idx" ON "job_retry_history"("jobId" ASC, "attemptNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email" ASC);

-- CreateIndex
CREATE INDEX "worker_health_isActive_lastHeartbeat_idx" ON "worker_health"("isActive" ASC, "lastHeartbeat" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "worker_health_workerId_key" ON "worker_health"("workerId" ASC);

-- AddForeignKey
ALTER TABLE "api_quota_logs" ADD CONSTRAINT "api_quota_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_quota_logs" ADD CONSTRAINT "api_quota_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_retry_history" ADD CONSTRAINT "job_retry_history_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

