import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
  }

  // Busca o currículo com o token de compartilhamento
  const rows = await sql`
    SELECT * FROM resumes WHERE "sharedToken" = ${token}
  `;

  if (!rows.length) {
    return NextResponse.json({ error: 'Currículo não encontrado ou compartilhamento desativado.' }, { status: 404 });
  }

  const resume = rows[0];

  // Retorna apenas os dados públicos do currículo (formato ResumeData, sem userId)
  return NextResponse.json({
    resume: {
      id: resume.id,
      fullName: resume.fullName,
      role: resume.role,
      email: resume.email,
      phone: resume.phone,
      linkedin: resume.linkedin,
      portfolio: resume.portfolio,
      summary: resume.summary,
      experiences: resume.experiences,
      education: resume.education,
      skills: resume.skills,
      languages: resume.languages,
      hobbies: resume.hobbies,
      avatarUrl: resume.avatarUrl,
      templateId: resume.templateId,
      themeMode: resume.themeMode,
      lastUpdated: resume.lastUpdated,
    }
  });
}
