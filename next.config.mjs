// Tailwind agora e compilado em build-time (tailwind.config.cjs +
// postcss.config.cjs, ver M6 em SECURITY.md) -- o Play CDN (cdn.tailwindcss.com)
// e o <script>/<style> inline que ele exigia foram removidos de app/layout.tsx,
// entao o host do CDN saiu do script-src. 'unsafe-inline' em script-src
// PRECISA continuar, porem, por um motivo diferente e nao relacionado ao
// Tailwind: o proprio Next.js App Router injeta o payload de hidratacao RSC
// via <script>self.__next_f.push(...)</script> inline em toda pagina -- sem
// 'unsafe-inline' (ou uma CSP baseada em nonce, que exigiria gerar o nonce
// por requisicao via proxy/middleware, mudanca maior e fora do escopo aqui),
// a hidratacao e bloqueada pelo navegador e a pagina fica em branco (raiz do
// achado M6 ia alem do CDN -- confirmado testando visualmente apos a
// primeira tentativa de remove-lo).
// 'unsafe-eval' so em dev: o React usa eval() para reconstruir stack traces
// no modo de desenvolvimento (nunca em producao, conforme o proprio React
// avisa no console) -- sem isso, `next dev` quebra com CSP.
const scriptSrcEval = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${scriptSrcEval}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://api.dicebear.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Disable strict mode if it causes double-renders that confuse the user (optional)
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
