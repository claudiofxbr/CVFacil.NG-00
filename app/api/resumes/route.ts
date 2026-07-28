import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { generateUUID } from '@/services/resumeService';
import { resumeCreateSchema, formatZodError } from '@/lib/validation/resumeSchema';

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
  const parsed = resumeCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }
  const {
    templateId = 'original', themeMode = 'light', fullName = '', role = '',
    email = '', phone = '', linkedin = '', portfolio = '', summary = '',
    experiences = [], education = [], skills = [], languages = [], hobbies = [],
    avatarUrl = null, isPinned = false, isImported = false,
  } = parsed.data;

  if (isAdmin) {
    const rows = await sql`
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
    return NextResponse.json({ resume: rows[0] }, { status: 201 });
  }

  // Débito e criação em uma única query atômica via CTE: o INSERT só executa
  // se o UPDATE de débito (com guarda WHERE credits > 0) afetou uma linha.
  // Isso corrige a race condition anterior, em que a checagem de saldo e o
  // débito eram operações separadas — duas criações concorrentes com saldo = 1
  // podiam ambas passar e levar o saldo a negativo.
  const rows = await sql`
    WITH debited AS (
      UPDATE users SET credits = credits - 1 WHERE id = ${payload.sub} AND credits > 0 RETURNING id
    )
    INSERT INTO resumes (
      id, "userId", "templateId", "themeMode", "fullName", role, email, phone,
      linkedin, portfolio, summary, experiences, education, skills, languages,
      hobbies, "avatarUrl", "isPinned", "isImported", "lastUpdated"
    )
    SELECT
      ${generateUUID()}, ${payload.sub}, ${templateId}, ${themeMode}, ${fullName}, ${role}, ${email}, ${phone},
      ${linkedin}, ${portfolio}, ${summary}, ${JSON.stringify(experiences)}::jsonb, ${JSON.stringify(education)}::jsonb,
      ${JSON.stringify(skills)}::jsonb, ${JSON.stringify(languages)}::jsonb, ${JSON.stringify(hobbies)}::jsonb,
      ${avatarUrl}, ${isPinned}, ${isImported}, NOW()
    WHERE EXISTS (SELECT 1 FROM debited)
    RETURNING *
  `;

  if (!rows.length) {
    return NextResponse.json(
      { error: 'Você atingiu o limite de currículos do seu plano. Peça a um administrador para conceder mais créditos.' },
      { status: 403 },
    );
  }

  return NextResponse.json({ resume: rows[0] }, { status: 201 });
}
