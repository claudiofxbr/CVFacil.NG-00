import { NextResponse } from 'next/server';
import { sql, sqlTransaction } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { generateUUID } from '@/services/resumeService';

function adminAuth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    const p = verifyToken(token);
    return p.role === 'Administrador' ? p : null;
  } catch { return null; }
}

// Concede créditos a um usuário. Soma ao saldo atual (nunca sobrescreve) e
// registra uma notificação para o usuário na mesma transação: ou as duas
// operações se aplicam, ou nenhuma se aplica.
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const payload = adminAuth(req);
  if (!payload) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  const { id } = await context.params;
  const body = await req.json();
  const amount = Number(body.amount);

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: 'A quantidade concedida deve ser um número inteiro positivo.' }, { status: 400 });
  }

  const target = await sql`SELECT id, email FROM users WHERE id = ${id}`;
  if (!target.length) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  const message = `Você recebeu ${amount} crédito${amount > 1 ? 's' : ''} do administrador.`;

  const [updatedRows] = await sqlTransaction([
    sql`UPDATE users SET credits = credits + ${amount} WHERE id = ${id} RETURNING id, credits`,
    sql`
      INSERT INTO notifications (id, "userId", type, message, data)
      VALUES (${generateUUID()}, ${id}, 'credit_grant', ${message}, ${JSON.stringify({ amount, grantedByAdminId: payload.sub })})
    `,
  ]);

  return NextResponse.json({ user: updatedRows[0] }, { status: 200 });
}
