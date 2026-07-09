# 🚀 GUIA DE INICIALIZAÇÃO DO CVFACIL.NG

## ⚡ Inicio Rápido (5 minutos)

### Você vai precisar de **3 Terminais** abertos simultaneamente:

---

## 📋 PRÉ-REQUISITOS

✅ Verifique se tem tudo:

```bash
node --version      # Deve ser v20+
npm --version       # Deve ser v10+
```

---

## 🎯 TERMINAL 1: Redis (Escolha UMA opção)

### Opção A: WSL (Windows Subsystem for Linux) - RECOMENDADO

**1. Abra PowerShell como ADMINISTRADOR**

**2. Digite:**
```powershell
wsl
```

**3. Uma nova janela vai abrir. Digite:**
```bash
sudo service redis-server start
```

**4. Verifique se está funcionando:**
```bash
redis-cli ping
```

✅ **Esperado:** resposta `PONG`

---

### Opção B: Docker (Se tem Docker instalado)

```bash
docker run -d -p 6379:6379 redis:alpine
```

✅ **Esperado:** ID do container impresso

---

### Opção C: Chocolatey (Se tem Chocolatey)

```powershell
choco install redis-64 -y
redis-server
```

✅ **Esperado:** mensagens de inicialização do Redis

---

## 💻 TERMINAL 2: Servidor Next.js

```bash
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev
npm run dev
```

✅ **Esperado (após 5-10 segundos):**
```
▲ Next.js 16.1.6 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.3.12:3000

✓ Ready in 2.1s
```

**Acesse:** http://localhost:3000 no seu navegador

---

## 🔧 TERMINAL 3: Worker de Processamento

**Em uma TERCEIRA janela**, digite:

```bash
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev
npm run worker
```

✅ **Esperado (após 2-3 segundos):**
```
🚀 Iniciando PDF Processing Worker...
✅ Worker pronto para processar jobs
```

---

## ✅ VERIFICAR SE ESTÁ TUDO FUNCIONANDO

### Test 1: Verificar Servidor
```bash
curl http://localhost:3000
```
✅ Deve retornar HTML da aplicação

### Test 2: Verificar Status de Quota
```bash
curl http://localhost:3000/api/quota-status | jq
```

✅ Deve retornar JSON com status "ok"

Exemplo:
```json
{
  "status": "ok",
  "quota": {
    "thisMinute": {
      "requests": "0/12",
      "tokens": "0/1,000,000",
      "status": "OK"
    }
  },
  "queue": {
    "stats": {
      "pending": 0,
      "processing": 0,
      "success": 0,
      "failed": 0
    }
  }
}
```

---

## 🧪 TESTE PRÁTICO (OPCIONAL)

### Fazer Upload de um PDF

**Crie um arquivo de teste ou use um PDF real:**

```bash
curl -X POST http://localhost:3000/api/import-resume-v2 \
  -F "file=@seu_curriculo.pdf" \
  -F "userId=test_user_123" | jq
```

✅ Esperado:
```json
{
  "success": true,
  "message": "Currículo enfileirado para processamento",
  "data": {
    "jobId": "clx1a2b3c4d5e6f7g8h9i0j",
    "fileName": "seu_curriculo.pdf",
    "estimatedTokens": 625,
    "statusUrl": "/api/import-resume-v2/status?jobId=clx1a2b3c4d5e6f7g8h9i0j"
  }
}
```

### Verificar Status do Job

```bash
# Usar o jobId da resposta anterior
curl "http://localhost:3000/api/import-resume-v2/status?jobId=clx1a2b3c4d5e6f7g8h9i0j" | jq
```

✅ Esperado (enquanto processando):
```json
{
  "success": true,
  "data": {
    "jobId": "clx1a2b3c4d5e6f7g8h9i0j",
    "status": "pending",
    "retryCount": 0,
    "pollInterval": 2000
  }
}
```

---

## 📊 DASHBOARD EM TEMPO REAL (OPCIONAL)

Ver todos os jobs e quota em tempo real:

```bash
npx prisma studio
```

Isso vai abrir uma interface gráfica mostrando:
- ✅ Todos os PDFs importados
- ✅ Status de cada um (PENDING, PROCESSING, SUCCESS, FAILED)
- ✅ Uso de quota
- ✅ Histórico de retries
- ✅ Logs de erro

---

## 🛑 PARAR TUDO

**Para encerrar (em cada terminal, pressione `Ctrl+C`):**

Terminal 1 (Redis):
```
Ctrl+C
```

Terminal 2 (Servidor):
```
Ctrl+C
```

Terminal 3 (Worker):
```
Ctrl+C
```

---

## 🆘 PROBLEMAS COMUNS

### ❌ Erro: "Port 3000 in use"
```
Solução: Feche o que está usando porta 3000 ou use:
npm run dev -- -p 3001
```

### ❌ Erro: "Could not connect to Redis"
```
Solução: 
1. Verificar se Redis está rodando
2. redis-cli ping (deve retornar PONG)
3. Conferir REDIS_HOST e REDIS_PORT em .env
```

### ❌ Worker mostra erros de conexão Neon
```
Solução:
1. Verificar DATABASE_URL em .env.local
2. Testar conexão:
   psql "postgresql://..."
3. Verificar se Neon está acessível
```

### ❌ PDF upload falha
```
Solução:
1. Verificar se Redis está rodando
2. Verificar se Worker está ativo
3. Ver logs do Worker para detalhes
```

---

## 🎯 RESUMO VISUAL

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  TERMINAL 1         TERMINAL 2        TERMINAL 3│
│  ───────────        ───────────       ──────────│
│  $ redis-cli        $ npm run dev     $ npm run │
│                                         worker  │
│  [✓] Redis          [✓] Next.js       [✓] Worker│
│      Rodando            em 3000           pronto │
│                                                 │
│  ↓         ↓                ↓                   │
│  └─────────┴────────────────┴──────────────────┘
│                        ↓
│            http://localhost:3000
│              CVFacil.NG Ready! 🚀
│
```

---

## 📱 ACESSAR A APLICAÇÃO

Abra seu navegador e vá para:

**http://localhost:3000**

Você vai ver a aplicação CVFacil.NG com:
- ✅ Dashboard de gerenciamento
- ✅ Upload de PDFs
- ✅ Status em tempo real
- ✅ Sugestões do Gemini AI

---

## 📞 PRÓXIMOS PASSOS

Depois que tiver tudo rodando:

1. **Ver guia de uso completo:**
   ```
   cat IMPLEMENTACAO_COMPLETA.md
   ```

2. **Monitorar em tempo real:**
   ```
   npx prisma studio
   ```

3. **Ver documentação:**
   - REDIS_SETUP.md
   - CONCLUSAO_IMPLEMENTACAO.md
   - Comentários no código

---

## ✅ CHECKLIST DE SUCESSO

```
[ ] Redis rodando (Terminal 1)
[ ] Servidor em http://localhost:3000 (Terminal 2)
[ ] Worker pronto (Terminal 3)
[ ] curl /api/quota-status funciona
[ ] Browser abre aplicação
[ ] Pode fazer upload de PDF
[ ] Status do job retorna jobId válido
[ ] Worker processa PDF nos logs
```

Se todos os checkboxes estão marcados: **SUCESSO!** 🎉

---

**Tempo total:** ~5 minutos  
**Terminais necessários:** 3  
**Dependências:** Redis, Node.js 20+, npm 10+

Boa sorte! 🚀
