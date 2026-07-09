import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

function adminAuth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    const p = verifyToken(token);
    return p.role === 'Administrador' ? p : null;
  } catch { return null; }
}

export async function GET(req: Request) {
  const payload = adminAuth(req);
  if (!payload) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  const url = new URL(req.url);
  const page  = parseInt(url.searchParams.get('page')  ?? '1');
  const limit = parseInt(url.searchParams.get('limit') ?? '20');
  const search = url.searchParams.get('search') ?? '';
  const offset = (page - 1) * limit;

  const [countRow, users] = await Promise.all([
    sql`SELECT COUNT(*) as total FROM users WHERE name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'}`,
    sql`
      SELECT id, name, email, role, plan, status, credits, avatar,
             "lastLogin" AS last_login, "createdAt" AS created_at
      FROM users
      WHERE name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  ]);

  return NextResponse.json({ users, total: Number(countRow[0].total), page, limit });
}
