import { NextResponse } from 'next/server';

/**
 * Este app é um SPA (Single Page App) que renderiza tudo através de app/page.tsx;
 * App.tsx gerencia roteamento interno (Dashboard, Editor, etc.) via React state,
 * não Next.js routes. O middleware aqui não faz mais gate de autenticação: uma
 * lista PROTECTED_ROUTES paralela cobria só 2 de ~20 rotas de API reais e havia
 * apodrecido (chegou a referenciar /api/import-resume-v2, hoje um stub 410),
 * dando falsa sensação de proteção centralizada. Cada rota de API já valida seu
 * próprio token via getTokenFromRequest/verifyToken (lib/auth.ts) — essa é a
 * fonte real da verdade de autorização, e não precisa ser duplicada aqui.
 */
export function middleware() {
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
