# 🚀 Scripts de Inicialização Atualizados - CVFacil.NG v2.0

## 📋 Resumo

Os scripts de inicialização foram **completamente atualizados** para refletir todas as implementações recentes:

- ✅ Arquitetura de Segurança (Middleware + Auth Context)
- ✅ Autenticação com JWT
- ✅ Fila de Processamento (BullMQ)
- ✅ Validação de Token (jose)
- ✅ Prisma Schema e Sincronização
- ✅ Verificações de Configuração

---

## 📁 Scripts Disponíveis

### 1. **start.bat** (Batch - Recomendado para Windows)

**Localização**: `./start.bat`

**O que faz**:
```
[1/7] Valida pré-requisitos (Node.js, npm, .env.local)
[2/7] Valida arquivo .env.local e variáveis críticas
[3/7] Limpa cache (.next, dist, node_modules)
[4/7] Instala/valida dependências
[5/7] Sincroniza schema Prisma com banco
[6/7] Compila o projeto (npm run build)
[7/7] Inicia servidor na porta 3000
```

**Como usar**:
```powershell
# No PowerShell ou CMD
.\start.bat
```

**Saída esperada**:
```
╔════════════════════════════════════════════════════════════════╗
║        ✅ INICIALIZACAO COMPLETA COM SUCESSO!                 ║
╚════════════════════════════════════════════════════════════════╝

URL:           http://localhost:3000
Node.js:       v20.x.x
npm:           10.x.x
```

---

### 2. **start.ps1** (PowerShell - Alternativa moderna)

**Localização**: `./start.ps1`

**O que faz**: Mesmo que start.bat, mas com:
- Melhor output formatado com cores
- Validações mais robustas
- Melhor tratamento de erros
- Funções PowerShell reutilizáveis

**Como usar**:
```powershell
# Permitir execução de scripts (primeira vez)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Executar script
.\start.ps1
```

---

### 3. **setup-optimization.bat** (Setup Completo)

**Localização**: `./setup-optimization.bat`

**O que faz**:
```
[1/6] Valida pré-requisitos
[2/6] Instala TODAS as dependências
[3/6] Valida todos os arquivos críticos
[4/6] Sincroniza Prisma Schema
[5/6] Compila TypeScript
[6/6] Mostra resumo completo
```

**Quando usar**:
- Na primeira inicialização
- Após fazer git clone
- Após grandes atualizações

**Como usar**:
```powershell
.\setup-optimization.bat
```

---

## ✅ Checklist de Validações

### Pré-requisitos
- ✅ Node.js v20+
- ✅ npm v10+
- ✅ Arquivo `.env.local` existe
- ✅ Variáveis obrigatórias configuradas:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `NEXT_PUBLIC_GEMINI_API_KEY` (opcional)

### Ambiente
- ✅ Arquivos `.next`, `dist`, `logs` limpos
- ✅ npm cache limpeza
- ✅ node_modules validado

### Dependências (19 pacotes)
- ✅ next - Framework Next.js
- ✅ jose - JWT validation
- ✅ bcryptjs - Password hashing
- ✅ bullmq - Job queue
- ✅ redis - Cache backend
- ✅ pdfjs-dist - PDF extraction
- ✅ @google/genai - Gemini API
- ✅ prisma - ORM
- ✅ E mais 11 dependências críticas

### Arquivos de Implementação
- ✅ middleware.ts - Route protection
- ✅ lib/auth-context.tsx - Auth state
- ✅ components/protected-route.tsx - Protected wrapper
- ✅ app/api/auth/* - Auth endpoints (login, register, me)
- ✅ app/api/import-resume-v2/* - PDF processing
- ✅ app/api/quota-status/* - Quota monitoring
- ✅ lib/gemini/* - Gemini handlers
- ✅ prisma/schema.prisma - Database schema

### Banco de Dados
- ✅ Prisma schema sincronizado
- ✅ Tabelas criadas:
  - users
  - import_jobs
  - resumes
  - api_quota_logs
  - quota_state
  - job_retry_history
  - worker_health

---

## 🚀 Fluxo de Inicialização Completo

```
Executar start.bat / start.ps1
        ↓
[1] Validar Node.js + npm + .env.local
        ↓
[2] Validar variáveis de ambiente
        ↓
[3] Limpar cache anterior
        ↓
[4] Instalar/validar dependências (npm install)
        ↓
[5] Sincronizar Prisma Schema (npx prisma db push)
        ↓
[6] Compilar TypeScript (npm run build)
        ↓
[7] Iniciar servidor (npm run dev)
        ↓
[8] Aguardar porta 3000 responder
        ↓
[9] Abrir navegador em http://localhost:3000
        ↓
✅ CVFacil.NG pronto para uso
```

---

## 🔧 Requisitos do Sistema

### Mínimo
- Windows 7+ ou PowerShell Core
- Node.js 20.0.0+
- npm 10.0.0+
- 4GB RAM
- 2GB espaço em disco

### Recomendado
- Windows 10/11
- Node.js 20.10.0+
- npm 10.5.0+
- 8GB RAM
- 5GB espaço em disco

---

## 🆘 Troubleshooting

### Problema: "Node.js não encontrado"
**Solução**:
```bash
# Instale Node.js
# https://nodejs.org/ (v20+)

# Ou com Chocolatey
choco install nodejs -y
```

### Problema: "npm install falha"
**Solução**:
```powershell
npm cache clean --force
Remove-Item node_modules -Recurse -Force
npm install --legacy-peer-deps
```

### Problema: "Porta 3000 já em uso"
**Solução**:
```powershell
# Encontrar processo usando porta
netstat -ano | findstr :3000

# Matar processo
taskkill /PID <PID> /F

# Ou usar porta diferente
npm run dev -- -p 3001
```

### Problema: "Prisma db push falha"
**Solução**:
```powershell
# Limpar cache Prisma
rm -r node_modules/.prisma

# Reinstalar
npm install prisma --save-dev

# Tentar novamente
npx prisma db push --skip-generate
```

### Problema: ".env.local não encontrado"
**Solução**:
Crie arquivo `.env.local` com:
```
DATABASE_URL=postgresql://...
JWT_SECRET=seu_segredo_aqui
NEXT_PUBLIC_GEMINI_API_KEY=sua_chave_aqui
REDIS_HOST=localhost
REDIS_PORT=6380
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📊 Informações do Script

| Arquivo | Tipo | Tamanho | Versão | Status |
|---------|------|---------|--------|--------|
| start.bat | Batch | ~6KB | 2.0 | ✅ Atualizado |
| setup-optimization.bat | Batch | ~8KB | 2.0 | ✅ Atualizado |
| start.ps1 | PowerShell | ~7KB | 2.0 | ✅ Novo |

---

## 🎯 Após Executar os Scripts

### 1️⃣ Abrir Navegador
```
http://localhost:3000
```

### 2️⃣ Fazer Login
- **Nova conta**: Clique em "Registrar"
- **Conta existente**: Use email/senha

### 3️⃣ Testar Funcionalidades
- Upload de PDF para processar
- Acompanhamento de status via dashboard
- Monitoramento de quota Gemini

### 4️⃣ Monitorar em Tempo Real (Opcional)
```powershell
npx prisma studio
```

Abre interface web mostrando:
- Jobs em processamento
- Quota utilizada
- Erros e logs
- Status do worker

---

## 🔐 Segurança Implementada

Os scripts agora validam:

✅ **Autenticação**:
- JWT tokens (jose library)
- Password hashing (bcryptjs)
- Session validation

✅ **Rota Protection**:
- Middleware em `middleware.ts`
- Validação de token antes de rendering
- Redirecionamento automático para login

✅ **Dados**:
- Prisma ORM para queries seguras
- Schema validation com Zod
- Prepared statements (via Prisma)

✅ **Configuração**:
- Validação de `.env.local`
- Verificação de variáveis obrigatórias
- Port conflict detection

---

## 📝 Logs e Debugging

### Acessar Logs
```powershell
# Logs do servidor
Get-Content logs/server.log -Tail 50

# Logs do Prisma
Set-Env DEBUG=prisma:*
```

### Modo Debug
```powershell
# Variáveis de ambiente
$env:DEBUG = "cvfacil:*"
$env:NODE_ENV = "development"

# Executar com debug
npm run dev
```

### Monitoramento de Jobs
```powershell
# Abrir Prisma Studio
npx prisma studio

# Via API
curl http://localhost:3000/api/quota-status
```

---

## 🎓 Documentação Relacionada

Leia para entender completamente:

1. **COMECE_AQUI.txt** - Quick start (3 minutos)
2. **COMO_INICIAR.md** - Guia detalhado
3. **SEGURANCA_AUTENTICACAO.md** - Arquitetura de segurança
4. **IMPLEMENTACAO_COMPLETA.md** - Features completas
5. **CONCLUSAO_IMPLEMENTACAO.md** - Resumo final

---

## ✅ Checklist Final

- [ ] Executou `./start.bat` ou `./start.ps1`
- [ ] Servidor respondendo em `http://localhost:3000`
- [ ] Conseguiu fazer login/registrar
- [ ] `.env.local` configurado corretamente
- [ ] Nenhum erro no console do navegador
- [ ] Nenhum erro no terminal do servidor
- [ ] Prisma Studio acessível (`npx prisma studio`)

Se todos os checkboxes estão ✅, você está pronto para:
- ✅ Produção
- ✅ Desenvolvimento
- ✅ Testes

---

**Data de Atualização**: 07/05/2026  
**Versão**: 2.0  
**Status**: ✅ Pronto para Produção  
**Mantido por**: CVFacil.NG Development Team
