import { NextResponse } from 'next/server';
import { sql, sqlTransaction } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { generateUUID } from '@/services/resumeService';

function auth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function GET(req: Request) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const rows = await sql`
    SELECT * FROM resumes WHERE "userId" = ${payload.sub} ORDER BY "isPinned" DESC, "lastUpdated" DESC
  `;
  return NextResponse.json({ resumes: rows });
}

export async function POST(req: Request) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const isAdmin = payload.role === 'Administrador';

  // Administrador tem criação ilimitada; demais usuários consomem 1 crédito por currículo criado.
  if (!isAdmin) {
    const userRows = await sql`SELECT credits FROM users WHERE id = ${payload.sub}`;
    const credits = userRows[0]?.credits ?? 0;
    if (credits <= 0) {
      return NextResponse.json(
        { error: 'Você atingiu o limite de currículos do seu plano. Peça a um administrador para conceder mais créditos.' },
        { status: 403 },
      );
    }
  }

  const body = await req.json();
  const {
    templateId = 'original', themeMode = 'light', fullName = '', role = '',
    email = '', phone = '', linkedin = '', portfolio = '', summary = '',
    experiences = [], education = [], skills = [], languages = [], hobbies = [],
    avatarUrl = null, isPinned = false, isImported = false,
  } = body;

  const insertQuery = sql`
    INSERT INTO resumes (
      id, "userId", "templateId", "themeMode", "fullName", role, email, phone,
      linkedin, portfolio, summary, experiences, education, skills, languages,
      hobbies, "avatarUrl", "isPinned", "isImported", "lastUpdated"
    ) VALUES (
      ${generateUUID()}, ${payload.sub}, ${templateId}, ${themeMode}, ${fullName}, ${role}, ${email}, ${phone},
      ${linkedin}, ${portfolio}, ${summary}, ${JSON.stringify(experiences)}, ${JSON.stringify(education)},
      ${JSON.stringify(skills)}, ${JSON.stringify(languages)}, ${JSON.stringify(hobbies)},
      ${avatarUrl}, ${isPinned}, ${isImported}, NOW()
    ) RETURNING *
  `;

  // Cria o currículo e debita o crédito na mesma transação: se a criação falhar, o crédito não é consumido.
  const rows = isAdmin
    ? await insertQuery
    : (await sqlTransaction([
        insertQuery,
        sql`UPDATE users SET credits = credits - 1 WHERE id = ${payload.sub}`,
      ]))[0];

  return NextResponse.json({ resume: rows[0] }, { status: 201 });
}
