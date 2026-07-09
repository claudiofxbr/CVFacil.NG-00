import { NextResponse } from 'next/server';

// Rota descontinuada: era uma versão experimental, duplicada e sem autenticação
// do fluxo real de importação de currículo. O endpoint atual e autenticado é
// /api/import-resume. Mantida como stub (em vez de removida do disco) para não
// deixar uma rota pública que consumia Gemini/BullMQ sem checar o usuário.
export async function POST() {
  return NextResponse.json({ error: 'Rota descontinuada. Use /api/import-resume.' }, { status: 410 });
}

export async function GET() {
  return NextResponse.json({ error: 'Rota descontinuada. Use /api/import-resume.' }, { status: 410 });
}
