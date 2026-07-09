-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "language" TEXT DEFAULT 'pt-BR',
ADD COLUMN     "sharedToken" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'Free',
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'Cliente',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Ativo';

-- CreateIndex
CREATE UNIQUE INDEX "resumes_sharedToken_key" ON "resumes"("sharedToken");

