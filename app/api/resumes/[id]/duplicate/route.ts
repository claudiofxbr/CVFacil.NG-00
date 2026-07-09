import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { generateUUID } from '@/services/resumeService';

function auth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;

  // Busca o currículo original
  const originalRows = await sql`
    SELECT * FROM resumes WHERE id = ${id} AND "userId" = ${payload.sub}
  `;

  if (!originalRows.length) {
    return NextResponse.json({ error: 'Currículo não encontrado.' }, { status: 404 });
  }

  const original = originalRows[0];
  const newId = generateUUID();
  const newName = `${original.fullName} (Cópia)`;

  // Cria novo currículo baseado no original
  const newResume = await sql`
    INSERT INTO resumes (
      id, "userId", "templateId", "themeMode", "fullName", role, email, phone,
      linkedin, portfolio, summary, experiences, education, skills, languages,
      hobbies, "avatarUrl", "isPinned", "isImported", "lastUpdated", "sharedToken"
    ) VALUES (
      ${newId}, ${payload.sub}, ${original.templateId}, ${original.themeMode},
      ${newName}, ${original.role}, ${original.email}, ${original.phone},
      ${original.linkedin}, ${original.portfolio}, ${original.summary},
      ${JSON.stringify(original.experiences)}, ${JSON.stringify(original.education)}, ${JSON.stringify(original.skills)},
      ${JSON.stringify(original.languages)}, ${JSON.stringify(original.hobbies)}, ${original.avatarUrl},
      false, ${original.isImported}, NOW(), NULL
    )
    RETURNING *
  `;

  return NextResponse.json({
    resume: newResume[0],
    message: `Currículo duplicado com sucesso como "${newName}"`
  }, { status: 201 });
}
