import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPassword, signToken, toAuthUser, AUTH_COOKIE_NAME, authCookieOptions } from '@/lib/auth';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';

const prisma = new PrismaClient();

// Créditos concedidos automaticamente a toda conta nova, para permitir criar
// pelo menos um currículo antes de decidir comprar um plano. Sem isso, o
// primeiro clique em "Salvar" de qualquer usuário novo falha com 403 (ver
// checagem de crédito em app/api/resumes/route.ts).
const FREE_SIGNUP_CREDITS = 3;

export async function POST(req: Request) {
  try {
    const { name, email, password, avatar } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    // Limite: 5 cadastros por IP a cada 10 minutos, contra criação de contas em massa.
    const okIp = await checkRateLimit(`register:ip:${clientIp(req)}`, 5, 600);
    if (!okIp) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, { status: 429 });
    }

    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const isSeedAdmin = !!process.env.ADMIN_SEED_EMAIL && email === process.env.ADMIN_SEED_EMAIL;
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        credits: FREE_SIGNUP_CREDITS,
        ...(avatar ? { avatar } : {}),
        ...(isSeedAdmin ? { role: 'Administrador' } : {}),
      }
    });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({ user: toAuthUser(user) }, { status: 201 });
    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
    return response;
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
