import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getTokenFromRequest, verifyToken, toAuthUser } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    return NextResponse.json({ user: toAuthUser(user) });
  } catch (err) {
    console.error('[me]', err);
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  } finally {
    await prisma.$disconnect();
  }
}
