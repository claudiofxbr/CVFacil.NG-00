import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { sql } from '@/lib/db';

// Comparação em tempo constante: string !== normal vaza timing (retorna assim
// que o primeiro caractere diferente é encontrado), permitindo em teoria
// adivinhar o segredo caractere a caractere por medição de latência.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

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

  if (!expected || !provided || !safeEqual(provided, expected)) {
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
