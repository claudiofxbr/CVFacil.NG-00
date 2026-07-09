import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

function auth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

// PATCH /api/notifications/[id] — marca uma notificação do próprio usuário como lida.
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;
  const rows = await sql`
    UPDATE notifications SET read = true
    WHERE id = ${id} AND "userId" = ${payload.sub}
    RETURNING *
  `;
  if (!rows.length) return NextResponse.json({ error: 'Não encontrada.' }, { status: 404 });
  return NextResponse.json({ notification: rows[0] });
}
