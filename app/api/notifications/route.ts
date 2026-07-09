import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

function auth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

// GET /api/notifications
// Lista as notificações do usuário autenticado. Como efeito colateral, expurga
// (só deste usuário) notificações já lidas com mais de 90 dias — expurgo
// oportunista que não exige nenhum agendador rodando em background.
export async function GET(req: Request) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  await sql`
    DELETE FROM notifications
    WHERE "userId" = ${payload.sub} AND read = true AND "createdAt" < NOW() - INTERVAL '90 days'
  `;

  const rows = await sql`
    SELECT * FROM notifications WHERE "userId" = ${payload.sub} ORDER BY "createdAt" DESC LIMIT 50
  `;
  return NextResponse.json({ notifications: rows });
}
