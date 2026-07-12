import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET!;

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const signToken = (payload: object) => jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
export const verifyToken = (token: string) => jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

export const AUTH_COOKIE_NAME = 'auth-token';

// Mesmas opcoes usadas ao gravar (login/register) e ao limpar (logout) o
// cookie de sessao -- httpOnly impede leitura via JS (mitiga roubo de token
// por XSS).
//
// Secure e controlado por COOKIE_SECURE (nao por NODE_ENV=production sozinho):
// o deploy atual em producao roda em HTTP puro (sem TLS ainda, ver SECURITY.md
// "Deploy atual sem TLS"), e um cookie Secure=true e recusado pelo navegador
// em conexoes HTTP -- login quebraria de verdade no ambiente real. Defina
// COOKIE_SECURE=true assim que o TLS estiver configurado.
export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias, mesmo TTL do JWT
  };
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  // Fallback (e caminho principal agora): cookie httpOnly enviado automaticamente
  // pelo navegador, ja que o cliente nao tem mais acesso ao token via JS.
  return getCookieValue(req.headers.get('cookie'), AUTH_COOKIE_NAME);
}

// Shape esperado pelo frontend (ver components/AuthProvider.tsx -> AuthUser)
interface PrismaUserLike {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
  status: string;
  credits: number;
  avatar: string | null;
  createdAt: Date;
}

export function toAuthUser(user: PrismaUserLike) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    status: user.status,
    credits: user.credits,
    avatar: user.avatar,
    created_at: user.createdAt,
  };
}
