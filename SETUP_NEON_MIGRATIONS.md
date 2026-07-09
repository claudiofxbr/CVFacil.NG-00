# 🔄 Migrations do banco (Neon + Prisma Migrate)

O projeto usa **Prisma Migrate** com histórico versionado em `prisma/migrations/`. O antigo endpoint ad-hoc `/api/migrate` (token fixo, ALTER TABLE manual) foi removido — ele nunca chegou a aplicar as colunas com sucesso e representava um risco de segurança (endpoint público de DDL).

## Variáveis necessárias (`.env.local`)

```env
DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require   # runtime da app (pooled)
DIRECT_URL=postgresql://.../neondb?sslmode=require                # usado só pelo Prisma Migrate
```

No console do Neon (https://console.neon.tech), copie a connection string **pooled** para `DATABASE_URL` e a **direta** (sem `-pooler`) para `DIRECT_URL`.

## Criar uma nova migration (ambiente local, interativo)

```bash
npx prisma migrate dev --name descreva_a_mudanca
```

Isso gera uma nova pasta em `prisma/migrations/`, aplica no banco apontado por `DIRECT_URL` e atualiza o Prisma Client.

## Aplicar migrations pendentes (produção / VPS / CI, não-interativo)

```bash
npx prisma migrate deploy
```

Rode este comando antes de subir uma nova versão da aplicação na VPS Hostinger (ver `DEPLOY.md`).

## Verificar o schema real do banco

```bash
npx prisma studio        # interface visual
# ou
npx prisma db pull --print   # introspecção rápida via terminal
```

## Histórico

- `20260705000000_baseline`: representa o schema que já existia em produção antes da adoção de migrations versionadas (criado via `db push`).
- `20260705000100_add_user_billing_fields_and_resume_sharing`: adiciona `role`, `plan`, `status`, `credits`, `avatar`, `lastLogin` em `users` e `sharedToken`, `language` em `resumes` — campos que o painel admin, o billing (Stripe) e o compartilhamento de currículo já esperavam mas não existiam na tabela real.
