import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, signToken, toAuthUser, AUTH_COOKIE_NAME, authCookieOptions } from '@/lib/auth';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    // Limite: 10 tentativas por e-mail e 20 por IP a cada 10 minutos, contra força bruta.
    const [okEmail, okIp] = await Promise.all([
      checkRateLimit(`login:email:${email}`, 10, 600),
      checkRateLimit(`login:ip:${clientIp(req)}`, 20, 600),
    ]);
    if (!okEmail || !okIp) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // Bootstrap do admin também no login, não só no registro: uma conta que já
    // existia antes de ADMIN_SEED_EMAIL ser definida não tem outra forma de
    // virar o primeiro administrador do sistema sem SQL manual.
    const isSeedAdmin = !!process.env.ADMIN_SEED_EMAIL
      && email === process.env.ADMIN_SEED_EMAIL
      && user.role !== 'Administrador';

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), ...(isSeedAdmin ? { role: 'Administrador' } : {}) },
    });

    if (isSeedAdmin) {
      await prisma.adminAuditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          targetId: user.id,
          targetEmail: user.email,
          previousRole: user.role,
          newRole: 'Administrador',
        },
      });
    }

    const token = signToken({ sub: updatedUser.id, email: updatedUser.email, role: updatedUser.role });

    const response = NextResponse.json({ user: toAuthUser(updatedUser) });
    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
    return response;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
