# CVFacil.NG — Guia de Deploy na Hostinger VPS

## Pré-requisitos

| Recurso | Mínimo recomendado |
|---------|-------------------|
| Hostinger | VPS KVM 2 ou Cloud Startup |
| Node.js | v20+ |
| RAM | 1 GB |
| Disco | 10 GB |

> **Por quê VPS?** O app usa API Routes do Next.js (Stripe Checkout, Webhooks) que exigem execução de Node.js no servidor. O Shared Hosting não suporta isso.

---

## 1. Preparar o VPS (1ª vez)

Acesse o VPS via SSH pelo painel da Hostinger e execute:

```bash
# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Instalar PM2 (gerenciador de processos)
npm install -g pm2

# Criar pasta do projeto
mkdir -p /var/www/cvfacil.ng/logs
```

---

## 2. Configurar variáveis de ambiente no VPS

Crie o arquivo `/var/www/cvfacil.ng/.env.local` com seus valores reais:

```bash
nano /var/www/cvfacil.ng/.env.local
```

Preencha com base no `.env.example`:

```env
GEMINI_API_KEY=sua_chave_gemini

# Neon (ver DATABASE_URL pooled + DIRECT_URL direto em SETUP_NEON_MIGRATIONS.md)
DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require
DIRECT_URL=postgresql://.../neondb?sslmode=require

JWT_SECRET=seu_jwt_secret_muito_secreto_aqui
ADMIN_SEED_EMAIL=seu-email-de-admin@dominio.com

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://cvfacil.ng
```

A VPS Hostinger fica sempre ativa — a conexão pooled do Neon (`DATABASE_URL`) funciona bem com o Prisma Client padrão nesse cenário, sem necessidade de driver serverless/edge.

---

## 3. Configurar Nginx como Proxy Reverso

```bash
apt-get install -y nginx
```

Crie `/etc/nginx/sites-available/cvfacil`:

```nginx
server {
    listen 80;
    server_name cvfacil.ng www.cvfacil.ng;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/cvfacil /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 4. HTTPS com Let's Encrypt

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d cvfacil.ng -d www.cvfacil.ng
```

---

## 5. Fazer o deploy

### Opção A — Script automático

Edite `VPS_HOST` em `scripts/deploy-hostinger.sh` e execute localmente:

```bash
bash scripts/deploy-hostinger.sh
```

### Opção B — Manual

No seu computador local:

```bash
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
```

Faça upload da pasta `.next/standalone/` + `ecosystem.config.cjs` + a pasta `prisma/` (schema + migrations, necessária para o `prisma migrate deploy` abaixo) para `/var/www/cvfacil.ng/` via FTP (SFTP/Filezilla) ou `scp`.

No VPS:

```bash
cd /var/www/cvfacil.ng

# Aplica migrations pendentes no Neon antes de subir a nova versão
npx prisma migrate deploy

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # Habilita reinício automático após reboot
```

---

## 6. Configurar Webhook do Stripe

No [Stripe Dashboard](https://dashboard.stripe.com/webhooks):

1. **Add endpoint** → URL: `https://cvfacil.ng/api/webhook`
2. Eventos: marque `checkout.session.completed`, `checkout.session.async_payment_succeeded` e `checkout.session.async_payment_failed`
   (os dois últimos são necessários para métodos assíncronos como Pix — sem eles, o usuário nunca é creditado quando paga via Pix)
3. Copie o **Signing secret** → coloque em `STRIPE_WEBHOOK_SECRET`

---

## 7. Verificação pós-deploy

```bash
# Ver status do app
pm2 status

# Ver logs em tempo real
pm2 logs cvfacil-ng

# Testar API de checkout
curl -X POST https://cvfacil.ng/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"plan":"padrao","userId":"teste","userEmail":"teste@teste.com"}'
```

---

## Expurgo agendado de notificações

Notificações lidas com mais de 90 dias de usuários sem login há mais de 60 dias
são removidas por um crontab na VPS chamando o endpoint protegido por segredo
(`CRON_SECRET`, ver `.env.example`). Configure no VPS:

```bash
crontab -e
```

Adicione (roda a cada 60 dias, às 3h):

```
0 3 */60 * * curl -s -X POST https://cvfacil.ng/api/admin/purge-notifications -H "x-cron-secret: SEU_CRON_SECRET_AQUI"
```

Usuários que ainda usam o app não dependem disso — suas notificações lidas já são
limpas automaticamente (com retenção de 90 dias) a cada vez que abrem a lista de notificações.

---

## Atualizar uma nova versão

```bash
# Localmente
bash scripts/deploy-hostinger.sh

# Ou no VPS diretamente
cd /var/www/cvfacil.ng
# (substitua os arquivos manualmente)
npx prisma migrate deploy
pm2 reload cvfacil-ng
```

---

## Estrutura no VPS após o deploy

```
/var/www/cvfacil.ng/
├── .next/standalone/     ← build da aplicação
│   ├── server.js         ← ponto de entrada Next.js
│   ├── public/           ← assets estáticos
│   └── .next/static/
├── ecosystem.config.cjs  ← configuração PM2
├── .env.local            ← variáveis de ambiente (NÃO commitar)
└── logs/
    ├── out.log
    └── error.log
```
