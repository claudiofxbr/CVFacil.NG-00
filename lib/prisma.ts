import { PrismaClient } from '@prisma/client';

// Reutiliza a mesma instância entre hot-reloads em dev (evita esgotar o pool
// de conexões do Neon a cada recarga de módulo) e entre requests em produção.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
