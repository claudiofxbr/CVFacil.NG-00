/**
 * ============================================================================
 * CVFacil.NG - Crash Report API Endpoint
 * ============================================================================
 *
 * Recebe e processa relatórios de crash do cliente
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';

export interface CrashReportPayload {
  timestamp: number;
  message: string;
  stack: string;
  url: string;
  userAgent: string;
  cause: string;
  context?: Record<string, unknown>;
}

/**
 * POST /api/crash-report
 *
 * Recebe um relatório de crash do GlobalExceptionHandler
 * Armazena no banco de dados para análise
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rota publica, sem autenticacao (relatorios de crash podem ocorrer antes
    // do login). Limite generoso por IP: contra flood/log injection, sem
    // travar reports legitimos em sessoes com varios erros em sequencia.
    const okIp = await checkRateLimit(`crash-report:ip:${clientIp(request)}`, 30, 600);
    if (!okIp) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, { status: 429 });
    }

    // Parse do corpo da requisição
    const payload: CrashReportPayload = await request.json();

    // Validação básica
    if (!payload.message || !payload.stack || !payload.cause) {
      logger.warn('[CrashReport API] Invalid crash report payload');
      return NextResponse.json(
        { error: 'Invalid crash report payload' },
        { status: 400 }
      );
    }

    // Log do crash report recebido
    logger.error('[CrashReport API] Crash report received', {
      cause: payload.cause,
      message: payload.message,
      url: payload.url,
      timestamp: new Date(payload.timestamp).toISOString(),
    });

    // Tentar armazenar no banco de dados
    // Nota: Esta tabela pode ser criada mais tarde para análise detalhada
    // Por enquanto, apenas logamos
    try {
      // Opcional: Armazenar em banco de dados (requer adicionar modelo ao Prisma)
      // const crashEntry = await prisma.crashReport.create({
      //   data: {
      //     timestamp: new Date(payload.timestamp),
      //     message: payload.message,
      //     stack: payload.stack,
      //     url: payload.url,
      //     userAgent: payload.userAgent,
      //     cause: payload.cause,
      //     context: payload.context ? JSON.stringify(payload.context) : null,
      //   },
      // });
      // logger.debug('[CrashReport API] Crash stored in database', { id: crashEntry.id });
    } catch (dbError) {
      // Erro ao armazenar no BD não deve impedir a resposta
      logger.warn('[CrashReport API] Failed to store crash in database', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    // Responder com sucesso ao cliente
    return NextResponse.json(
      {
        success: true,
        message: 'Crash report received',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error('[CrashReport API] Error processing crash report', errorMessage);

    return NextResponse.json(
      { error: 'Failed to process crash report' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/crash-report
 *
 * Retorna lista de crashes recentes (requer autenticação em produção)
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Nota: Em produção, adicionar autenticação aqui
    // Exemplo: const token = request.headers.get('authorization');
    // if (!token) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    logger.info('[CrashReport API] Fetching crash reports');

    // Tentar buscar do banco de dados
    // const crashes = await prisma.crashReport.findMany({
    //   orderBy: { timestamp: 'desc' },
    //   take: 50,
    // });

    // Por enquanto, retornar dados vazios até a tabela ser criada
    return NextResponse.json(
      {
        success: true,
        crashes: [],
        message: 'No crash reports available',
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error('[CrashReport API] Error fetching crash reports', errorMessage);

    return NextResponse.json(
      { error: 'Failed to fetch crash reports' },
      { status: 500 }
    );
  }
}
