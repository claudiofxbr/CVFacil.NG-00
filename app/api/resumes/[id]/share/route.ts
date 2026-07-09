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

  // Busca o currículo
  const resumeRows = await sql`
    SELECT * FROM resumes WHERE id = ${id} AND "userId" = ${payload.sub}
  `;

  if (!resumeRows.length) {
    return NextResponse.json({ error: 'Currículo não encontrado.' }, { status: 404 });
  }

  const resume = resumeRows[0];

  // Se já tem token de compartilhamento, retorna o existente
  if (resume.sharedToken) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${appUrl}/share/${resume.sharedToken}`;
    return NextResponse.json({
      shared_token: resume.sharedToken,
      share_url: shareUrl,
      message: 'Link de compartilhamento já existe'
    });
  }

  // Gera novo token
  const newToken = generateUUID();

  // Atualiza o currículo com o novo token
  const updatedResume = await sql`
    UPDATE resumes SET "sharedToken" = ${newToken}
    WHERE id = ${id} AND "userId" = ${payload.sub}
    RETURNING *
  `;

  if (!updatedResume.length) {
    return NextResponse.json({ error: 'Erro ao gerar link.' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const shareUrl = `${appUrl}/share/${newToken}`;

  return NextResponse.json({
    shared_token: newToken,
    share_url: shareUrl,
    message: 'Link de compartilhamento gerado com sucesso'
  }, { status: 201 });
}

// Desativar compartilhamento
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { id } = await context.params;

  const updated = await sql`
    UPDATE resumes SET "sharedToken" = NULL
    WHERE id = ${id} AND "userId" = ${payload.sub}
    RETURNING *
  `;

  if (!updated.length) {
    return NextResponse.json({ error: 'Currículo não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    message: 'Compartilhamento desativado com sucesso'
  });
}
