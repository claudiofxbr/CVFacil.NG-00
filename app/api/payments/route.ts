import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { toCsv } from '@/lib/csv';

function auth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// GET /api/payments — extrato de pagamentos do próprio usuário autenticado.
// Query params: from, to (datas ISO, opcionais), format ('json' padrão | 'csv').
export async function GET(req: Request) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const url = new URL(req.url);
  const from = parseDate(url.searchParams.get('from'));
  const to = parseDate(url.searchParams.get('to'));
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json';

  const rows = await sql`
    SELECT id, plan, amount, currency, method, status, "createdAt"
    FROM payments
    WHERE "userId" = ${payload.sub}
      AND (${from}::timestamptz IS NULL OR "createdAt" >= ${from}::timestamptz)
      AND (${to}::timestamptz   IS NULL OR "createdAt" <= ${to}::timestamptz)
    ORDER BY "createdAt" DESC
  `;

  if (format === 'csv') {
    const csv = toCsv(rows as any[], [
      { key: 'createdAt', header: 'Data' },
      { key: 'plan', header: 'Plano' },
      { key: 'amount', header: 'Valor (centavos)' },
      { key: 'currency', header: 'Moeda' },
      { key: 'method', header: 'Método' },
      { key: 'status', header: 'Status' },
    ]);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pagamentos-cvfacil.csv"',
      },
    });
  }

  return NextResponse.json({ payments: rows });
}
