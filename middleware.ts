import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret');

// Rotas públicas (não requerem autenticação)
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/'];

// Rotas protegidas (requerem autenticação)
const PROTECTED_ROUTES = ['/dashboard', '/resumes', '/settings', '/api/resumes', '/api/import-resume-v2'];

// Rota raiz
const ROOT = '/';

/**
 * Verifica se o token JWT é válido
 * Retorna null se inválido ou expirado
 */
async function verifyToken(token: string): Promise<any | null> {
  try {
    const secret = JWT_SECRET;
    const verified = await jwtVerify(token, secret);
    return verified.payload;
  } catch (err) {
    console.error('[middleware] Token verification failed:', err);
    return null;
  }
}

/**
 * Extrai token do header Authorization
 */
function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Fallback: tentar obter do cookie
  const tokenCookie = req.cookies.get('auth-token')?.value;
  return tokenCookie || null;
}

/**
 * Middleware de autenticação
 *
 * IMPORTANTE: Este app é um SPA (Single Page App) que renderiza tudo através de app/page.tsx
 * O App.tsx gerencia roteamento interno (Dashboard, Editor, etc.) via React state, não Next.js routes
 *
 * O middleware deve apenas validar tokens, não redirecionar para rotas que não existem
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ===== REGRA 1: Acesso à raiz (/) - SPA ENTRY POINT
  // O root / renderiza App.tsx que gerencia tudo internamente
  if (pathname === ROOT) {
    console.log('[middleware] Root access - allowing (App.tsx handles routing)');
    return NextResponse.next();
  }

  // ===== REGRA 2: Rotas públicas
  // /login, /register, etc. são renderizadas pelo App.tsx, não por Next.js pages
  if (PUBLIC_ROUTES.some(route => pathname === route)) {
    console.log('[middleware] Public route access allowed:', pathname);
    return NextResponse.next();
  }

  // ===== REGRA 3: Rotas protegidas (API endpoints)
  // Requer autenticação válida para acessar APIs
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    const token = getTokenFromRequest(req);

    if (!token) {
      console.log('[middleware] Protected API access without token ->', pathname);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      console.log('[middleware] Protected API access with invalid token ->', pathname);
      const response = NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
      response.cookies.delete('auth-token');
      return response;
    }

    console.log('[middleware] Protected API access granted:', pathname);
    // Adicionar user info ao header para componentes acessarem
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.sub || '');
    requestHeaders.set('x-user-email', payload.email || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // ===== REGRA 4: Rotas não mapeadas
  // Permitir passar - App.tsx vai renderizar 404 page personalizada
  console.log('[middleware] Unmapped route:', pathname);
  return NextResponse.next();
}

/**
 * Configuração do Middleware
 * Define quais rotas passam pelo middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
