// CSP relativamente permissiva em script/style-src: o app ainda carrega o
// Tailwind Play CDN (cdn.tailwindcss.com) em runtime, que injeta <style>
// inline via JS -- isso exige 'unsafe-inline' em style-src e o proprio host
// do CDN em script-src. Ver SECURITY.md: migrar para Tailwind compilado em
// build-time removeria essa necessidade e permitiria uma CSP bem mais estrita.
// 'unsafe-eval' so em dev: o React usa eval() para reconstruir stack traces
// no modo de desenvolvimento (nunca em producao, conforme o proprio React
// avisa no console) -- sem isso, `next dev` quebra com CSP.
const scriptSrcEval = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${scriptSrcEval} https://cdn.tailwindcss.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
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
