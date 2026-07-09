import { NextResponse } from 'next/server';
import { sql, sqlTransaction } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

function auth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;
  const rows = await sql`SELECT * FROM resumes WHERE id = ${id} AND "userId" = ${payload.sub}`;
  if (!rows.length) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  return NextResponse.json({ resume: rows[0] });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json();
  const {
    templateId, themeMode, fullName, role, email, phone, linkedin, portfolio,
    summary, experiences, education, skills, languages, hobbies, avatarUrl, isPinned,
    isAutoSave = false,
  } = body;

  const isAdmin = payload.role === 'Administrador';

  // Alterações manuais (não autosave) de usuários não-admin contam para o consumo
  // de crédito: a cada 2 alterações no mesmo currículo, 1 crédito é descontado.
  // Nunca bloqueia o salvamento, mesmo que o saldo fique negativo.
  let newEditCount: number | null = null;
  let shouldConsumeCredit = false;
  if (!isAdmin && !isAutoSave) {
    const current = await sql`SELECT "editCount" FROM resumes WHERE id = ${id} AND "userId" = ${payload.sub}`;
    if (!current.length) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
    const nextCount = (current[0].editCount ?? 0) + 1;
    shouldConsumeCredit = nextCount >= 2;
    newEditCount = shouldConsumeCredit ? 0 : nextCount;
  }

  const updateQuery = sql`
    UPDATE resumes SET
      "templateId"  = COALESCE(${templateId},  "templateId"),
      "themeMode"   = COALESCE(${themeMode},   "themeMode"),
      "fullName"    = COALESCE(${fullName},     "fullName"),
      role          = COALESCE(${role},          role),
      email         = COALESCE(${email},         email),
      phone         = COALESCE(${phone},         phone),
      linkedin      = COALESCE(${linkedin},      linkedin),
      portfolio     = COALESCE(${portfolio},     portfolio),
      summary       = COALESCE(${summary},       summary),
      experiences   = COALESCE(${experiences != null ? JSON.stringify(experiences) : null}, experiences),
      education     = COALESCE(${education   != null ? JSON.stringify(education)   : null}, education),
      skills        = COALESCE(${skills      != null ? JSON.stringify(skills)      : null}, skills),
      languages     = COALESCE(${languages   != null ? JSON.stringify(languages)   : null}, languages),
      hobbies       = COALESCE(${hobbies     != null ? JSON.stringify(hobbies)     : null}, hobbies),
      "avatarUrl"   = COALESCE(${avatarUrl},    "avatarUrl"),
      "isPinned"    = COALESCE(${isPinned},     "isPinned"),
      "editCount"   = COALESCE(${newEditCount}, "editCount"),
      "lastUpdated" = NOW()
    WHERE id = ${id} AND "userId" = ${payload.sub}
    RETURNING *
  `;

  const rows = shouldConsumeCredit
    ? (await sqlTransaction([updateQuery, sql`UPDATE users SET credits = credits - 1 WHERE id = ${payload.sub}`]))[0]
    : await updateQuery;

  if (!rows.length) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  return NextResponse.json({ resume: rows[0] });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;
  await sql`DELETE FROM resumes WHERE id = ${id} AND "userId" = ${payload.sub}`;
  return NextResponse.json({ ok: true });
}
