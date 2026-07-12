# CVFacil.NG — build multi-stage para deploy via EasyPanel (Docker Swarm)
# Segue o padrão next output:'standalone' já configurado em next.config.mjs.

FROM node:20-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# node:20-slim não inclui OpenSSL — o engine do Prisma Client precisa dele em
# runtime (sem isso: "Prisma cannot find the required libssl system library").
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# node:20-slim ja inclui um usuario nao-root "node" (uid 1000) -- roda a
# aplicacao com ele em vez de root, para reduzir o dano em caso de RCE.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/prisma ./prisma

USER node

EXPOSE 3000
CMD ["node", "server.js"]
