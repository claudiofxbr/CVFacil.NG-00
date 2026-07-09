import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST /api/admin/purge-notifications
// Expurgo agendado (a cada 60 dias, via crontab da VPS — ver DEPLOY.md) para
// usuários sem uso do app: remove notificações já lidas com mais de 90 dias
// de contas cujo último login foi há mais de 60 dias (ou nunca logaram).
// Complementa o expurgo oportunista de GET /api/notifications, que só limpa
// quem efetivamente volta a abrir o app.
//
// Autenticado por segredo compartilhado (CRON_SECRET), não por sessão de
// admin: um job de crontab não tem como manter um JWT válido indefinidamente.
// Sem fallback — se CRON_SECRET não estiver configurada, o endpoint nunca autoriza.
export async function POST(req: Request) {
  const provided = req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const deleted = await sql`
    DELETE FROM notifications
    WHERE read = true
      AND "createdAt" < NOW() - INTERVAL '90 days'
      AND "userId" IN (
        SELECT id FROM users WHERE "lastLogin" < NOW() - INTERVAL '60 days' OR "lastLogin" IS NULL
      )
    RETURNING id
  `;

  return NextResponse.json({ purged: deleted.length });
}
