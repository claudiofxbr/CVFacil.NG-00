-- CreateIndex
CREATE INDEX "resumes_userId_isPinned_lastUpdated_idx" ON "resumes"("userId", "isPinned", "lastUpdated");
