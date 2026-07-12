# Segurança — CVFacil.NG

Registro vivo de achados de auditoria, correções aplicadas e pendências. Atualizado conforme o trabalho avança — não é um documento estático de arquitetura (para isso, ver `SEGURANCA_AUTENTICACAO.md`, mas atenção: aquele arquivo descreve um desenho de autenticação baseado em cookies que **não corresponde ao código atual**, que usa `localStorage` — ver pendência abaixo).

## Corrigido

| Item | Data | O que foi feito | Evidência |
|---|---|---|---|
| SSH root com senha | 2026-07-12 | `PermitRootLogin prohibit-password` + `PasswordAuthentication no` no `sshd_config` da VPS (69.62.87.38) | Testado: nova conexão por chave funciona; tentativa por senha rejeitada (`Permission denied (publickey)`) |
| Portas do Docker Swarm expostas (2377, 7946) | 2026-07-12 | Bloqueadas via `ufw deny` | Testado: portas inacessíveis de fora; cluster Swarm continua saudável (`docker node ls` → Ready/Leader) |

## Pendente

| Item | Severidade | Por que ainda não foi corrigido | Notas para retomar |
|---|---|---|---|
| Porta 3000 (painel EasyPanel) exposta publicamente | Crítica | Tentativa via `iptables -I DOCKER-USER --dport 3000 -j DROP` causou queda real do CVFacil.NG (porta 3002) por um mecanismo não totalmente entendido — revertido. EasyPanel roda como **serviço Docker Swarm** (`PublishMode: host`), e a API de serviços Swarm **não suporta** bind em IP específico (ex.: `127.0.0.1`) — só containers avulsos (`docker run`) suportam isso. | Opções para uma próxima tentativa, com mais tempo/cautela: (a) investigar a fundo por que a regra `DOCKER-USER` afetou uma porta não relacionada antes de tentar de novo; (b) reconfigurar EasyPanel como container avulso (arriscado — pode quebrar autogerenciamento); (c) IP allow-list em vez de bloqueio total. |
| Ausência de headers de segurança HTTP (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) | Alta | Em andamento | — |
| JWT armazenado em `localStorage`, sem revogação, TTL de 30 dias | Alta | Em andamento | Migrar para cookie `httpOnly` + `Secure` + `SameSite=Strict` |
| Dependências vulneráveis sem monitoramento (Dependabot desabilitado) | Alta | Não iniciado | `gh api repos/claudiofxbr/CVFacil.NG-00` confirma alerts desabilitados |
| Container roda como root (sem `USER` no Dockerfile) | Alta | Não iniciado | — |
| Deploy atual sem TLS (HTTP puro, porta 3002) | Alta | Não iniciado | Depende de decisão sobre proxy reverso (Caddy/nginx) |
| `ADMIN_SEED_EMAIL` permanente em produção | Média | Não iniciado | Remover do ambiente após confirmar admin já criado |
| `/api/crash-report` público sem rate limit | Média | Não iniciado | — |
| Sem branch protection em `main` no GitHub | Média | Não iniciado | — |
| Sem backup automatizado do Neon (script encontrado no repo é de outro projeto/MySQL) | Alta | Não iniciado | Confirmar janela de PITR no console Neon primeiro |

## Histórico de auditorias

- 2026-07-12 — Auditoria completa do ecossistema (app, Neon, GitHub, VPS), nível geral avaliado como **moderado**.
