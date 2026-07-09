import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { generateUUID } from '@/services/resumeService';

function auth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

function adminAuth(req: Request) {
  const payload = auth(req);
  return payload?.role === 'Administrador' ? payload : null;
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;
  const isAdmin = payload.role === 'Administrador';
  const isSelf = payload.sub === id;
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const body = await req.json();
  // Usuário comum só pode editar o próprio nome/e-mail/avatar; campos de privilégio/billing exigem admin.
  const name = body.name;
  const email = isSelf || isAdmin ? body.email : undefined;
  const avatar = isSelf || isAdmin ? body.avatar : undefined;
  const role = isAdmin ? body.role : undefined;
  const plan = isAdmin ? body.plan : undefined;
  const status = isAdmin ? body.status : undefined;
  const credits = isAdmin ? body.credits : undefined;

  // Um admin não pode revogar o próprio papel (evita ficar sem nenhum admin por engano).
  if (isSelf && role && role !== 'Administrador' && payload.role === 'Administrador') {
    return NextResponse.json({ error: 'Você não pode remover seu próprio acesso de administrador.' }, { status: 400 });
  }

  // Regra: sempre deve existir ao menos 1 administrador ativo no sistema.
  const willLoseAdmin = (role && role !== 'Administrador') || (status && status !== 'Ativo');
  if (isAdmin && willLoseAdmin) {
    const current = await sql`SELECT role, status FROM users WHERE id = ${id}`;
    if (current.length && current[0].role === 'Administrador' && current[0].status === 'Ativo') {
      const activeAdmins = await sql`
        SELECT COUNT(*) as total FROM users WHERE role = 'Administrador' AND status = 'Ativo' AND id != ${id}
      `;
      if (Number(activeAdmins[0].total) === 0) {
        return NextResponse.json({ error: 'Deve existir ao menos um administrador ativo no sistema.' }, { status: 400 });
      }
    }
  }

  // Snapshot do papel anterior, para registrar em log caso mude nesta chamada.
  const beforeRows = isAdmin && role ? await sql`SELECT role, email FROM users WHERE id = ${id}` : null;

  const rows = await sql`
    UPDATE users SET
      name    = COALESCE(${name},    name),
      email   = COALESCE(${email},   email),
      avatar  = COALESCE(${avatar},  avatar),
      role    = COALESCE(${role},    role),
      plan    = COALESCE(${plan},    plan),
      status  = COALESCE(${status},  status),
      credits = COALESCE(${credits}, credits)
    WHERE id = ${id}
    RETURNING id, name, email, role, plan, status, credits, avatar,
              "lastLogin" AS last_login, "createdAt" AS created_at
  `;
  if (!rows.length) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

  // Log de auditoria: toda promoção ou revogação de admin fica registrada.
  if (beforeRows?.length && beforeRows[0].role !== rows[0].role) {
    await sql`
      INSERT INTO admin_audit_logs (id, "actorId", "actorEmail", "targetId", "targetEmail", "previousRole", "newRole")
      VALUES (${generateUUID()}, ${payload.sub}, ${payload.email}, ${id}, ${rows[0].email}, ${beforeRows[0].role}, ${rows[0].role})
    `;
  }

  return NextResponse.json({ user: rows[0] });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const payload = adminAuth(req);
  if (!payload) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  const { id } = await context.params;

  // Regra: sempre deve existir ao menos 1 administrador ativo — não permite
  // excluir o único admin ativo restante (protege contra o caso geral, não
  // só um e-mail fixo de "admin master").
  const target = await sql`SELECT role, status FROM users WHERE id = ${id}`;
  if (target.length && target[0].role === 'Administrador' && target[0].status === 'Ativo') {
    const activeAdmins = await sql`
      SELECT COUNT(*) as total FROM users WHERE role = 'Administrador' AND status = 'Ativo' AND id != ${id}
    `;
    if (Number(activeAdmins[0].total) === 0) {
      return NextResponse.json({ error: 'Deve existir ao menos um administrador ativo no sistema.' }, { status: 400 });
    }
  }

  await sql`DELETE FROM users WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
