import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

function adminAuth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    const p = verifyToken(token);
    return p.role === 'Administrador' ? p : null;
  } catch { return null; }
}

/**
 * POST /api/monitoring/auth
 * Recebe eventos de autenticação do cliente para monitoramento
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log apenas para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('[monitoring:auth]', {
        event: body.event,
        email: body.userEmail,
        duration: body.duration,
        error: body.error,
      });
    }

    // Em produção, salvar em banco de dados para análise
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implementar salvamento em DB para auditoria
      // await prisma.authLog.create({ data: body });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[monitoring:auth] Error:', error);
    return NextResponse.json(
      { error: 'Failed to log auth event' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/monitoring/auth
 * Retorna logs de autenticação (apenas admin)
 */
export async function GET(request: NextRequest) {
  try {
    if (!adminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Auth monitoring endpoint',
      status: 'operational',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve auth logs' },
      { status: 500 }
    );
  }
}
