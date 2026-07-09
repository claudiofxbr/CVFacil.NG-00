import { NextRequest, NextResponse } from 'next/server';
import QueueManager from '@/lib/gemini/queue-manager';
import { PrismaClient } from '@prisma/client';
import { geminiLogger } from '@/lib/gemini/logger';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

function adminAuth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    const p = verifyToken(token);
    return p.role === 'Administrador' ? p : null;
  } catch { return null; }
}

/**
 * GET /api/quota-status
 * Dashboard de uso de quota em tempo real (apenas admin)
 */
export async function GET(request: NextRequest) {
  if (!adminAuth(request)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  try {
    const quotaState = await QueueManager.getQuotaState();
    const dailyUsage = await QueueManager.getQuotaUsageToday();

    // Obter estatísticas de fila
    const queueStats = await prisma.importJob.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const stats = {
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
    };

    queueStats.forEach((item: any) => {
      stats[item.status.toLowerCase() as keyof typeof stats] = item._count.id;
    });

    // Alertas
    const tokenUsagePercent = quotaState
      ? (Number(quotaState.tokensThisMinute) / 1_000_000) * 100
      : 0;
    const dailyPercent = (dailyUsage / 300_000) * 100;

    return NextResponse.json({
      status: 'ok',
      quota: {
        // Por minuto
        thisMinute: {
          requests: `${quotaState?.requestsThisMinute || 0}/12`,
          tokens: `${(quotaState?.tokensThisMinute || 0n).toString()}/1,000,000`,
          percentage: `${tokenUsagePercent.toFixed(1)}%`,
          status:
            tokenUsagePercent > 100
              ? 'EXCEEDED'
              : tokenUsagePercent > 80
                ? 'CRITICAL'
                : 'OK',
        },
        // Por dia
        thisDay: {
          requests: `${Math.floor(dailyUsage / 3_000)}/300`, // Aproximado
          tokens: `${dailyUsage.toLocaleString()}/300,000`,
          percentage: `${dailyPercent.toFixed(1)}%`,
          status:
            dailyPercent > 100
              ? 'EXCEEDED'
              : dailyPercent > 80
                ? 'CRITICAL'
                : 'OK',
        },
      },
      queue: {
        stats,
        totalProcessed: stats.success + stats.failed,
        successRate:
          stats.success + stats.failed > 0
            ? ((stats.success / (stats.success + stats.failed)) * 100)
                .toFixed(1) + '%'
            : 'N/A',
      },
      alerts: {
        level80PercentSent: quotaState?.alertSent80Percent || false,
        level100PercentSent: quotaState?.alertSent100Percent || false,
      },
      nextMinuteResetAt: quotaState
        ? new Date(quotaState.minuteResetAt.getTime() + 60000).toISOString()
        : new Date(Date.now() + 60000).toISOString(),
    });
  } catch (error) {
    geminiLogger.error('Erro ao obter status de quota', error as Error);
    return NextResponse.json(
      {
        error: 'Erro ao obter quota status',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
