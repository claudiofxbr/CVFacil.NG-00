# 🚀 Guia de Inicialização: CVfacil.NG

## 📋 Índice

1. [Início Rápido](#início-rápido)
2. [Requisitos](#requisitos)
3. [Scripts Disponíveis](#scripts-disponíveis)
4. [Solução de Problemas](#solução-de-problemas)
5. [Estrutura dos Scripts](#estrutura-dos-scripts)

---

## ⚡ Início Rápido

### Linux / macOS

```bash
# Fazer o script executável
chmod +x start.sh

# Executar
./start.sh
```

### Windows (PowerShell)

```powershell
# Permitir execução de scripts (primeira vez)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Executar
.\start.ps1
```

---

## ✅ Requisitos

| Requisito | Versão Mínima | Status |
|-----------|---------------|--------|
| Node.js | 20.0.0 | ✅ Obrigatório |
| npm | 10.0.0 | ✅ Obrigatório |
| Git | Qualquer | ⚠️ Recomendado |
| Navegador | Moderno | ⚠️ Para UI |

### Verificar Requisitos

```bash
# Verificar Node.js
node --version    # v20.x.x

# Verificar npm
npm --version     # v10.x.x

# Verificar Git (opcional)
git --version
```

---

## 📁 Scripts Disponíveis

### 1️⃣ `start.sh` / `start.ps1` - Inicializar Aplicação

**Descrição:** Script principal que automatiza toda a inicialização

**Uso:**

```bash
# Bash
./start.sh [opções]

# PowerShell
.\start.ps1 [-Opções]
```

**Opções Disponíveis:**

| Opção | Descrição |
|-------|-----------|
| `--skip-clean` | Pula limpeza de ambiente |
| `--skip-install` | Pula instalação de dependências |
| `--no-browser` | Não abre navegador automaticamente |
| `--dry-run` | Simula execução (bash only) |
| `-h`, `--help` | Mostra menu de ajuda |

**Exemplos:**

```bash
# Inicialização completa
./start.sh

# Pular limpeza
./start.sh --skip-clean

# Sem instalar dependências
./start.sh --skip-install

# Sem abrir navegador
./start.sh --no-browser

# Combinação
./start.sh --skip-clean --skip-install --no-browser
```

**O que o script faz:**

1. ✅ Verifica pré-requisitos (Node.js, npm)
2. ✅ Limpa ambiente (remove .next, dist, logs, caches)
3. ✅ Instala dependências (npm install)
4. ✅ Compila projeto (npm run build)
5. ✅ Inicia servidor de desenvolvimento (npm run dev)
6. ✅ Aguarda servidor estar pronto (health checks)
7. ✅ Abre navegador automaticamente
8. ✅ Exibe resumo de status

---

### 2️⃣ `cleanup.sh` / `cleanup.ps1` - Limpeza de Ambiente

**Descrição:** Remove todos os arquivos temporários e parar o servidor

**Uso:**

```bash
# Bash
./cleanup.sh

# PowerShell
.\cleanup.ps1
```

**O que remove:**

- Diretórios: `.next`, `.turbo`, `dist`, `build`, `coverage`, `logs`
- Arquivos: `*.log`, `.server.pid`, `.env.local.bak`
- Cache: npm cache, yarn cache
- Processos: Para o servidor se estiver rodando

**Quando usar:**

- Antes de fazer deploy
- Quando tem problemas de build
- Para liberar espaço em disco
- Para reconstruir projeto do zero

---

## 📊 Fluxo de Execução

```
┌─────────────────────────────────────────┐
│      START.SH / START.PS1               │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  CHECK PREREQUISITES                    │
│  • Node.js v20+                         │
│  • npm v10+                             │
│  • package.json existe                  │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  CLEANUP ENVIRONMENT (--skip-clean)     │
│  • Remove .next, dist, logs             │
│  • npm cache clean                      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  INSTALL DEPENDENCIES (--skip-install)  │
│  • npm install --legacy-peer-deps       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  BUILD PROJECT                          │
│  • npm run build                        │
│  • TypeScript compilation               │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  START SERVER                           │
│  • npm run dev (background)             │
│  • Salva PID em .server.pid             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  WAIT FOR SERVER                        │
│  • Health checks (curl http://...)      │
│  • Aguarda até 30 tentativas            │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  OPEN BROWSER (--no-browser)            │
│  • Abre http://localhost:3000           │
│  • Plataforma específico (open, xdg)    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  SHOW SUMMARY                           │
│  • URL, PID, logs                       │
│  • Próximos passos                      │
└─────────────────────────────────────────┘
```

---

## 🔍 Estrutura dos Scripts

### Componentes Principais

```bash
├── start.sh / start.ps1         ← Script principal
│   ├── check_prerequisites()    ← Validações
│   ├── cleanup_environment()    ← Limpeza
│   ├── install_dependencies()   ← npm install
│   ├── build_project()          ← npm run build
│   ├── start_server()           ← npm run dev
│   ├── wait_for_server()        ← Health checks
│   ├── open_browser()           ← Abre navegador
│   └── show_summary()           ← Resumo final
│
├── cleanup.sh / cleanup.ps1     ← Limpeza isolada
│   ├── Parar servidor
│   ├── Remover diretórios
│   ├── Limpar cache
│   └── Resumo
```

### Funções Modulares

Cada função pode ser reutilizada independentemente:

```bash
# Importar e usar funções individuais
source start.sh

# Usar apenas uma função
check_prerequisites
install_dependencies
build_project
```

---

## 📍 Caminhos e Portas

| Item | Valor | Descrição |
|------|-------|-----------|
| **URL da App** | `http://localhost:3000` | Acesso via navegador |
| **Port** | `3000` | Porta padrão do Next.js |
| **Project Root** | `$(pwd)` | Raiz do projeto |
| **Logs** | `./logs/` | Diretório de logs |
| **PID File** | `./.server.pid` | Arquivo com PID do servidor |
| **Build Dir** | `./.next/` | Output do build Next.js |

---

## 🚨 Solução de Problemas

### ❌ "Node.js não está instalado"

```bash
# Solução:
# 1. Baixar de https://nodejs.org/ (v20+)
# 2. Ou usar gerenciador de pacotes:

# macOS
brew install node

# Ubuntu/Debian
sudo apt-get install nodejs npm

# Windows
# Usar https://nodejs.org/ ou chocolatey:
choco install nodejs
```

### ❌ "Porta 3000 já está em uso"

```bash
# Encontrar processo usando a porta:
# Bash/macOS
lsof -i :3000

# Windows PowerShell
Get-NetTCPConnection -LocalPort 3000

# Parar processo
kill -9 <PID>  # Bash
Stop-Process -Id <PID> -Force  # PowerShell
```

### ❌ "Falha ao instalar dependências"

```bash
# Solução 1: Limpar cache
npm cache clean --force

# Solução 2: Remover node_modules
rm -rf node_modules  # Bash
rmdir /s node_modules  # Windows cmd

# Solução 3: Usar legacy peer deps
npm install --legacy-peer-deps

# Solução 4: Usar npm nova versão
npm install -g npm@latest
```

### ❌ "Build failed - TypeScript errors"

```bash
# Verificar erros detalhados
npm run build

# Tentar reparo
npm install
npm run build -- --verbose
```

### ❌ "Servidor não responde"

```bash
# Verificar logs
tail -f logs/server.log  # Bash
Get-Content logs\server.log -Tail 50 -Wait  # PowerShell

# Verificar se porta está aberta
curl http://localhost:3000  # Bash
Invoke-WebRequest http://localhost:3000  # PowerShell

# Aguardar mais tempo ou abrir manualmente
# Editar start.sh e aumentar max_attempts
```

### ❌ "Erro de permissão ao executar script"

```bash
# Bash - fazer executável
chmod +x start.sh cleanup.sh

# PowerShell - permitir execução
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📊 Comandos Disponíveis

### Desenvolvimento

```bash
npm run dev          # Iniciar servidor (dev mode)
npm run build        # Compilar projeto
npm run start        # Iniciar servidor (prod mode)
npm run lint         # Verificar código
npm test             # Executar testes
npm test:coverage    # Testes com cobertura
```

### Limpeza

```bash
./cleanup.sh         # Limpar tudo (Bash)
.\cleanup.ps1        # Limpar tudo (PowerShell)
npm cache clean      # Limpar cache npm
rm -rf node_modules  # Remover dependências
```

### Monitoramento

```bash
# Ver logs em tempo real
tail -f logs/server.log  # Bash
Get-Content logs\server.log -Tail 50 -Wait  # PowerShell

# Verificar processo
ps aux | grep "npm"  # Bash
Get-Process | Where-Object {$_.ProcessName -like "*node*"}  # PowerShell

# Ver porta 3000
lsof -i :3000  # Bash
Get-NetTCPConnection -LocalPort 3000  # PowerShell
```

---

## 📝 Arquivos de Configuração

### `.server.pid`

Arquivo gerado automaticamente contendo o PID (Process ID) do servidor:

```bash
# Ler PID
cat .server.pid

# Usar para parar servidor
kill $(cat .server.pid)
```

### `logs/server.log`

Log completo de execução do servidor:

```bash
# Ver últimas 50 linhas
tail -50 logs/server.log

# Ver em tempo real
tail -f logs/server.log

# Buscar erro
grep -i error logs/server.log
```

---

## 🔧 Customizações

### Modificar Porta

Editar `start.sh` ou `start.ps1`:

```bash
# Bash
readonly APP_PORT=3000  # Mudar para 3001, 8000, etc.

# PowerShell
$appPort = 3000  # Mudar para porta desejada
```

Depois executar:

```bash
npm run dev -- -p 3001  # Usar porta 3001
```

### Modificar Timeout

Editar `start.sh`:

```bash
readonly max_attempts=30  # Aumentar para 60, 90, etc.
local wait_time=2          # Tempo entre tentativas
```

### Adicionar Variáveis de Ambiente

Criar `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

---

## ✨ Features dos Scripts

### ✅ Modularidade

Cada função é independente e pode ser reutilizada:

```bash
source start.sh
check_prerequisites  # Só verifica
install_dependencies # Só instala
```

### ✅ Logging Estruturado

Cores e ícones para fácil leitura:

```
✅ SUCCESS - operação bem-sucedida
❌ ERROR - erro crítico
⚠️  WARNING - aviso importante
ℹ️  INFO - informação
```

### ✅ Tratamento de Erros

- Validação de pré-requisitos
- Verificação de diretórios
- Health checks do servidor
- Captura de erros com mensagens claras

### ✅ Cross-Platform

- Bash para Linux/macOS
- PowerShell para Windows
- Detecção automática de SO para abrir navegador

---

## 🎯 Checklist de Inicialização

- [ ] Node.js v20+ instalado
- [ ] npm v10+ instalado
- [ ] `.env.local` configurado
- [ ] Porta 3000 disponível
- [ ] Executar `./start.sh` ou `.\start.ps1`
- [ ] Verificar se navegador abre
- [ ] Login/registro na app
- [ ] Verificar logs se houver erro

---

## 🤝 Suporte

Para mais informações:

- **Documentação**: Leia `IMPLEMENTACAO_ROBUSTA.md`, `SOLUCAO_COMPLETA.md`
- **Logs**: Verifique `logs/server.log`
- **Status**: Acesse `http://localhost:3000/api/suggestions` (health check)

---

**Desenvolvido com ❤️ por Claude Code**  
**Data: 2026-05-05**
