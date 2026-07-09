import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET!;

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const signToken = (payload: object) => jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
export const verifyToken = (token: string) => jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
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
