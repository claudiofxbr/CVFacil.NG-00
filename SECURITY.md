# Segurança — CVFacil.NG

Registro vivo de achados de auditoria, correções aplicadas e pendências. Atualizado conforme o trabalho avança — não é um documento estático de arquitetura (para isso, ver `SEGURANCA_AUTENTICACAO.md`, mas atenção: aquele arquivo já estava desatualizado antes desta sessão, e agora está ainda mais — a sessão vive num cookie `httpOnly`, não mais em `localStorage`).

## Corrigido

| Item | Data | O que foi feito | Evidência |
|---|---|---|---|
| SSH root com senha | 2026-07-12 | `PermitRootLogin prohibit-password` + `PasswordAuthentication no` no `sshd_config` da VPS de produção | Testado: nova conexão por chave funciona; tentativa por senha rejeitada (`Permission denied (publickey)`) |
| Portas do Docker Swarm expostas (2377, 7946) | 2026-07-12 | Bloqueadas via `ufw deny` | Testado: portas inacessíveis de fora; cluster Swarm continua saudável (`docker node ls` → Ready/Leader) |
| Ausência de headers de segurança HTTP (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) | 2026-07-12 | Adicionados via `headers()` em `next.config.mjs` | Testado com build de produção real: headers presentes, zero violações de CSP no navegador, login funcionando |
| JWT armazenado em `localStorage`, sem `httpOnly` | 2026-07-12 | Migrado para cookie `httpOnly` + `SameSite=Strict`, setado pelo servidor (`login`/`register`), limpo por nova rota `/api/auth/logout`. `localStorage`/`document.cookie` removidos de todos os pontos do cliente. | Testado: `Set-Cookie` com `HttpOnly` confirmado via `curl -i`; resposta JSON não contém mais `token`; sessão sobrevive a refresh; logout limpa a sessão no servidor |
| Dependências vulneráveis sem monitoramento (Dependabot desabilitado) | 2026-07-12 | `gh api -X PUT .../vulnerability-alerts` + `.../automated-security-fixes` | Confirmado via `204 No Content`; alertas reais já visíveis em `gh api .../dependabot/alerts` |
| 4 vulnerabilidades *high* em dependências (Next.js middleware bypass, nodemailer SSRF, ws DoS, protobufjs DoS) | 2026-07-12 | `nodemailer` removido (dependência direta, confirmadamente código morto — nunca referenciado). Next.js atualizado de 16.2.5 (vulnerável) para 16.2.10 (corrigido), o que também atualizou `ws`/`protobufjs` transitivos. | `npm audit`: 8 vulnerabilidades (4 high) → 2 (0 high, só moderate). Build de produção + login/registro/sessão testados após a atualização |
| Sem branch protection em `main` no GitHub | 2026-07-12 | Protecão leve: bloqueia force-push e deleção da branch. **Não** exige PR/review — o fluxo atual é sempre push direto, e exigir review travaria isso por completo (GitHub não permite autoaprovar a própria PR) | Confirmado via `gh api .../branches/main/protection`: `allow_force_pushes: false`, `allow_deletions: false` |
| Container roda como root | 2026-07-12 | `USER node` no Dockerfile (imagem `node:20-slim` já inclui esse usuário, uid 1000), com `COPY --chown=node:node` nos arquivos copiados | Testado com build real: `docker exec ... id` confirma `uid=1000(node)`; registro/login/sessão funcionando normalmente como não-root (inclui o engine binário do Prisma, que precisa de permissão de execução) |
| `/api/crash-report` público sem rate limit | 2026-07-12 | Rate limit por IP (30 requisições / 10 min, mesmo padrão de `lib/rateLimit.ts` já usado em login/register) | Testado com Redis real: 30 requisições seguidas → `200`, próximas 5 → `429`, exatamente no limite configurado |
| `ADMIN_SEED_EMAIL` permanente em produção | 2026-07-12 | Confirmado no banco que a conta admin de bootstrap já existe e está ativa; variável removida do ambiente local e do ambiente da VPS | **Também revelou** que o container em produção estava rodando uma imagem Docker **desatualizada** (recriado sem `docker pull` antes numa correção anterior) — todas as correções de segurança das rodadas anteriores desta sessão só entraram em vigor de fato agora, ao puxar a imagem mais recente do GHCR e recriar o container |
| Porta 3000 (painel EasyPanel) exposta publicamente | 2026-07-12 | **Causa raiz do incidente anterior identificada**: a regra de firewall anterior mirava no endereço interno errado do serviço, por isso nunca interceptava o tráfego de fato (e o efeito colateral observado antes não se repetiu ao corrigir o alvo). Corrigido usando o endereço de destino real, confirmado por inspeção direta de contadores de tráfego. `cvfacil-ng` usa um endereço de container diferente, não é afetado pela regra. | Bloqueio automatizado (script + serviço systemd, sobrevive a reboot). Acesso ao painel agora só via túnel SSH — detalhes de acesso documentados fora deste repositório público. Testado: bloqueio estável em múltiplas rodadas, `cvfacil-ng` nunca afetado |

## Pendente

| Item | Severidade | Por que ainda não foi corrigido | Notas para retomar |
|---|---|---|---|
| 2 vulnerabilidades *moderate* residuais (PostCSS XSS via `</style>` não escapado) | Baixa (aceito) | `npm audit fix --force` propõe **rebaixar o Next.js para a versão 9** para corrigir — inaceitável, quebraria o app inteiro. Risco residual aceito conscientemente. | Reavaliar quando o Next.js atualizar sua dependência de PostCSS internamente |
| Deploy atual sem TLS (HTTP puro, porta 3002) | Alta | Não iniciado | Depende de decisão sobre proxy reverso (Caddy/nginx). **Bloqueia também** o flag `Secure` do cookie de sessão (`COOKIE_SECURE=false` até isso ser resolvido — ver `.env.example`) |
| Sem backup automatizado do Neon (script encontrado no repo é de outro projeto/MySQL) | Alta | Não iniciado | Confirmar janela de PITR no console Neon primeiro |

## Histórico de auditorias

- 2026-07-12 — Auditoria completa do ecossistema (app, Neon, GitHub, VPS), nível geral avaliado como **moderado**.
