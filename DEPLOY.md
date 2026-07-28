# CVFacil.NG — Guia de Deploy na Hostinger VPS

> Este documento descrevia originalmente um deploy bare-metal via PM2 — método
> abandonado (ver `SECURITY.md`, histórico de 12/07). O deploy real hoje é via
> imagem Docker publicada no GHCR e recriada na VPS por `scripts/deploy-ssh-puro.ps1`
> (`docker run` direto, sem Swarm/EasyPanel gerenciando nada). Este arquivo foi
> atualizado para refletir isso.

## Pré-requisitos

| Recurso | Mínimo recomendado |
|---------|-------------------|
| Hostinger | VPS KVM 2 ou Cloud Startup |
| Docker | instalado na VPS |
| RAM | 1 GB |
| Disco | 10 GB |

---

## 1. Fluxo de deploy

1. `git push` para `main` — dispara `.github/workflows/deploy.yml`, que builda a imagem Docker e publica em `ghcr.io/claudiofxbr/cvfacil.ng:latest`.
2. Rodar localmente: `powershell -File scripts/deploy-ssh-puro.ps1` — aguarda o build do GitHub Actions, envia o `.env` para a VPS via SSH, garante a rede Docker `cvfacil-net`, roda `npx prisma@5.21.0 migrate deploy` num container efêmero, recria o container `cvfacil-ng` na rede, e faz health-check via HTTPS real.
3. URL pública de produção: `https://xavierbr-vps.tech:8443`.

Detalhes de configuração de firewall, TLS (Let's Encrypt via DNS-01), Redis e backups automatizados estão documentados em `SECURITY.md`, não aqui — aquele arquivo é o registro vivo do estado real da infraestrutura.

---

## 2. Variáveis de ambiente

Preencha com base no `.env.example` (o `scripts/deploy-ssh-puro.ps1` envia o `.env` local para a VPS automaticamente, não precisa editar nada manualmente lá):

```env
GEMINI_API_KEY=sua_chave_gemini

# Neon (ver DATABASE_URL pooled + DIRECT_URL direto em SETUP_NEON_MIGRATIONS.md)
DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require
DIRECT_URL=postgresql://.../neondb?sslmode=require

JWT_SECRET=seu_jwt_secret_muito_secreto_aqui
ADMIN_SEED_EMAIL=seu-email-de-admin@dominio.com

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://xavierbr-vps.tech:8443

CRON_SECRET=segredo_para_o_endpoint_de_expurgo_de_notificacoes
```

---

## 3. Configurar Webhook do Stripe

No [Stripe Dashboard](https://dashboard.stripe.com/webhooks):

1. **Add endpoint** → URL: `https://xavierbr-vps.tech:8443/api/webhook`
2. Eventos: marque `checkout.session.completed`, `checkout.session.async_payment_succeeded` e `checkout.session.async_payment_failed`
   (os dois últimos são necessários para métodos assíncronos como Pix — sem eles, o usuário nunca é creditado quando paga via Pix)
3. Copie o **Signing secret** → coloque em `STRIPE_WEBHOOK_SECRET`

---

## 4. Expurgo agendado de notificações

Notificações lidas com mais de 90 dias de usuários sem login há mais de 60 dias
são removidas por um crontab na VPS chamando o endpoint protegido por segredo
(`CRON_SECRET`, ver `.env.example`). Configure no VPS:

```bash
crontab -e
```

Adicione (roda a cada 60 dias, às 3h):

```
0 3 */60 * * curl -s -X POST https://xavierbr-vps.tech:8443/api/admin/purge-notifications -H "x-cron-secret: SEU_CRON_SECRET_AQUI"
```

Usuários que ainda usam o app não dependem disso — suas notificações lidas já são
limpas automaticamente (com retenção de 90 dias) a cada vez que abrem a lista de notificações.

---

## 5. Verificação pós-deploy

```bash
# Ver logs do container em tempo real
ssh usuario@vps "docker logs -f cvfacil-ng"

# Testar API de checkout
curl -X POST https://xavierbr-vps.tech:8443/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"plan":"padrao","userId":"teste","userEmail":"teste@teste.com"}'
```
