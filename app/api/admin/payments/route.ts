import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { toCsv } from '@/lib/csv';

function adminAuth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    const p = verifyToken(token);
    return p.role === 'Administrador' ? p : null;
  } catch { return null; }
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// GET /api/admin/payments — extrato de pagamentos de todos os usuários (admin).
// Query params: userId, from, to (opcionais), format ('json' padrão | 'csv').
export async function GET(req: Request) {
  if (!adminAuth(req)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const from = parseDate(url.searchParams.get('from'));
  const to = parseDate(url.searchParams.get('to'));
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json';

  const rows = await sql`
    SELECT p.id, p.plan, p.amount, p.currency, p.method, p.status, p."createdAt",
           u.id AS "userId", u.name AS "userName", u.email AS "userEmail"
    FROM payments p
    JOIN users u ON u.id = p."userId"
    WHERE (${userId}::text        IS NULL OR p."userId" = ${userId}::text)
      AND (${from}::timestamptz   IS NULL OR p."createdAt" >= ${from}::timestamptz)
      AND (${to}::timestamptz     IS NULL OR p."createdAt" <= ${to}::timestamptz)
    ORDER BY p."createdAt" DESC
  `;

  if (format === 'csv') {
    const csv = toCsv(rows as any[], [
      { key: 'createdAt', header: 'Data' },
      { key: 'userName', header: 'Usuário' },
      { key: 'userEmail', header: 'E-mail' },
      { key: 'plan', header: 'Plano' },
      { key: 'amount', header: 'Valor (centavos)' },
      { key: 'currency', header: 'Moeda' },
      { key: 'method', header: 'Método' },
      { key: 'status', header: 'Status' },
    ]);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pagamentos-cvfacil-admin.csv"',
      },
    });
  }

  return NextResponse.json({ payments: rows });
}
