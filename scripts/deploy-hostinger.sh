#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  CVFacil.NG — Script de Deploy automático para Hostinger VPS
#  Uso local: bash scripts/deploy-hostinger.sh
#  Pré-requisitos: ssh-keygen configurado e acesso SSH ao VPS
# ─────────────────────────────────────────────────────────────────────────────

set -e

# ── Configurações (ajuste conforme seu VPS) ────────────────────────────────────
VPS_USER="root"
VPS_HOST="SEU_IP_DO_VPS"          # ex: 185.XXX.XXX.XXX
VPS_PATH="/var/www/cvfacil.ng"
BUILD_DIR=".next/standalone"

echo "🔨  Gerando build de produção..."
npm run build

echo "📁  Copiando arquivos estáticos para o build standalone..."
cp -r public "$BUILD_DIR/public"
cp -r .next/static "$BUILD_DIR/.next/static"

echo "📦  Criando pacote de deploy..."
tar -czf deploy.tar.gz \
  "$BUILD_DIR" \
  ecosystem.config.cjs \
  .env.example \
  prisma

echo "🚀  Enviando para o VPS ($VPS_HOST)..."
scp deploy.tar.gz "$VPS_USER@$VPS_HOST:/tmp/cvfacil-deploy.tar.gz"

echo "⚙️   Executando instalação remota..."
ssh "$VPS_USER@$VPS_HOST" bash << 'REMOTE'
  set -e
  mkdir -p /var/www/cvfacil.ng/logs
  cd /var/www/cvfacil.ng
  tar -xzf /tmp/cvfacil-deploy.tar.gz -C .
  rm /tmp/cvfacil-deploy.tar.gz

  # Instala PM2 globalmente se não existir
  command -v pm2 >/dev/null 2>&1 || npm install -g pm2

  # Aplica migrations pendentes no Neon antes de reiniciar. O Prisma CLI lê .env
  # por padrão, não .env.local (diferente do Next.js) — exporta explicitamente.
  export DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-)"
  export DIRECT_URL="$(grep '^DIRECT_URL=' .env.local | cut -d= -f2-)"
  # Versão fixa (mesma do package.json): sem isso, "npx prisma" baixa a última
  # versão publicada, que pode ter mudado a sintaxe do schema.prisma.
  npx prisma@5.21.0 migrate deploy

  # Reinicia o app (ou inicia pela primeira vez)
  pm2 describe cvfacil-ng > /dev/null 2>&1 \
    && pm2 reload ecosystem.config.cjs \
    || pm2 start ecosystem.config.cjs

  pm2 save
  echo "✅  Deploy concluído!"
REMOTE

rm deploy.tar.gz
echo "✅  Deploy finalizado com sucesso!"
