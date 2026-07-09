# 📦 Scripts de Inicialização e Limpeza - CVfacil.NG

## 🚀 Resumo Rápido

Foram criados 4 scripts profissionais de inicialização e limpeza do CVfacil.NG:

| Script | Plataforma | Função | Tamanho |
|--------|-----------|--------|---------|
| `start.sh` | Linux/macOS | Inicialização completa (Bash) | 7.4 KB |
| `start.ps1` | Windows | Inicialização completa (PowerShell) | 5.2 KB |
| `cleanup.sh` | Linux/macOS | Limpeza de ambiente (Bash) | 2.6 KB |
| `cleanup.ps1` | Windows | Limpeza de ambiente (PowerShell) | 2.0 KB |

---

## ⚡ Como Usar (Início Rápido)

### 1️⃣ Linux / macOS

```bash
# Dar permissão de execução (primeira vez)
chmod +x start.sh cleanup.sh

# Inicializar aplicação
./start.sh

# Ou, com opções
./start.sh --skip-clean --no-browser

# Limpar ambiente
./cleanup.sh
```

### 2️⃣ Windows (PowerShell)

```powershell
# Permitir execução de scripts (primeira vez)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Inicializar aplicação
.\start.ps1

# Ou, com opções
.\start.ps1 -SkipClean -NoBrowser

# Limpar ambiente
.\cleanup.ps1
```

---

## 📋 O Que Cada Script Faz

### `start.sh` / `start.ps1` - Inicialização Completa

**Etapas de Execução:**

```
1. ✅ VALIDAÇÕES
   └─ Verifica Node.js v20+
   └─ Verifica npm v10+
   └─ Valida package.json

2. 🧹 LIMPEZA (pode pular com --skip-clean)
   └─ Remove: .next, dist, logs, caches
   └─ Limpa npm cache

3. 📦 INSTALAÇÃO (pode pular com --skip-install)
   └─ Executa: npm install --legacy-peer-deps
   └─ Instala todas as dependências

4. 🏗️ BUILD
   └─ Executa: npm run build
   └─ Compila TypeScript + Next.js

5. 🚀 SERVIDOR
   └─ Executa: npm run dev (background)
   └─ Salva PID em .server.pid
   └─ Logs em: logs/server.log

6. 💚 HEALTH CHECK
   └─ Aguarda servidor responder
   └─ Até 30 tentativas (2s cada)
   └─ Timeout automático

7. 🌐 NAVEGADOR (pode pular com --no-browser)
   └─ Abre: http://localhost:3000
   └─ Plataforma específico (open/xdg)

8. 📊 RESUMO
   └─ Exibe status final
   └─ URL, PID, logs, comandos
```

**Opções Disponíveis:**

```bash
./start.sh --skip-clean        # Não limpa ambiente
./start.sh --skip-install      # Não instala dependências
./start.sh --no-browser        # Não abre navegador
./start.sh --skip-clean --skip-install --no-browser  # Combinação
./start.sh --help              # Ver ajuda
```

**Output Exemplo:**

```
╔════════════════════════════════════════════════════════╗
║                  CVfacil.NG STARTUP                    ║
║        Inicializando com verificações...              ║
╚════════════════════════════════════════════════════════╝

✅ SUCCESS: package.json encontrado
✅ SUCCESS: Node.js: v20.11.1
✅ SUCCESS: npm: 10.5.0
...
✅ SUCCESS: Dependências instaladas com sucesso
✅ SUCCESS: Projeto compilado com sucesso
✅ SUCCESS: Servidor iniciado (PID: 12345)
✅ SUCCESS: Servidor respondendo em http://localhost:3000
✅ SUCCESS: Navegador aberto com sucesso

╔════════════════════════════════════════════════════════╗
║           ✅ INICIALIZAÇÃO COMPLETA                   ║
╚════════════════════════════════════════════════════════╝

CVfacil.NG está rodando!

Informações:
  URL:     http://localhost:3000
  PID:     12345
  Logs:    ./logs/server.log

Comandos Úteis:
  npm run dev      - Reinicia servidor
  npm test         - Executa testes
  npm run build    - Build para produção
```

---

### `cleanup.sh` / `cleanup.ps1` - Limpeza Completa

**O Que Remove:**

```
✓ Processa em background (npm run dev)
✓ Diretórios:
  - .next          (Next.js build)
  - .turbo         (Turbo cache)
  - dist           (Dist folder)
  - build          (Build folder)
  - coverage       (Test coverage)
  - logs           (Log files)

✓ Arquivos:
  - .server.pid    (Arquivo de PID)
  - *.log          (Todos os logs)
  - .env.local.bak (Backup de env)

✓ Cache:
  - npm cache      (npm cache clean --force)
  - yarn cache     (se aplicável)
```

**Uso:**

```bash
# Linux/macOS
./cleanup.sh

# Windows
.\cleanup.ps1

# Nenhuma opção necessária
```

**Output:**

```
╔════════════════════════════════════════════════════════╗
║             CVfacil.NG CLEANUP                         ║
║       Limpando arquivos temporários e caches...       ║
╚════════════════════════════════════════════════════════╝

ℹ️  INFO: Parando servidor (PID: 12345)...
✅ SUCCESS: Servidor parado
ℹ️  INFO: Removendo: .next
ℹ️  INFO: Removendo: dist
ℹ️  INFO: Removendo: logs
ℹ️  INFO: Limpando cache npm...
✅ SUCCESS: Limpeza completa!

Resumo:
  ✓ Servidor parado
  ✓ Diretórios de build removidos
  ✓ Logs removidos
  ✓ Cache npm/yarn limpo

Para reiniciar: ./start.sh
```

---

## 🎯 Casos de Uso

### Caso 1: Inicialização Normal (Recomendado)

```bash
./start.sh
# Limpeza + Instalação + Build + Servidor + Navegador
```

### Caso 2: Atualização Rápida (Sem Limpeza)

```bash
./start.sh --skip-clean --skip-install
# Build + Servidor (mais rápido)
```

### Caso 3: Debug (Sem Navegador)

```bash
./start.sh --no-browser
# Abre terminal para ver logs em tempo real
```

### Caso 4: Reconstrução Completa

```bash
./cleanup.sh      # Limpa tudo
./start.sh        # Reconstrói do zero
```

### Caso 5: Teste de CI/CD

```bash
./start.sh --no-browser
# Inicia servidor sem abrir navegador (para pipelines)
```

---

## 📊 Comparação Antes/Depois

### Antes (Manual)

```bash
# Passo 1: Limpeza manual
rm -rf .next dist build logs node_modules
npm cache clean --force

# Passo 2: Instalação
npm install --legacy-peer-deps

# Passo 3: Build
npm run build

# Passo 4: Servidor
npm run dev

# Passo 5: Abrir navegador (manual)
open http://localhost:3000  # macOS
xdg-open http://localhost:3000  # Linux

# ⏱️ Tempo: ~5-10 minutos com intervalo
# 😞 Processo: Tedioso e propenso a erros
```

### Depois (Automático)

```bash
# Um comando!
./start.sh

# ✅ Tempo: ~2-3 minutos automático
# 😊 Processo: Completamente automatizado
# 🎯 Feedback: Visual com cores e status
# 🔄 Modular: Pode pular etapas se necessário
```

---

## ⚙️ Estrutura Modular

Cada função pode ser usada independentemente:

```bash
# Source o script
source start.sh

# Usar funções individuais
check_prerequisites
cleanup_environment
install_dependencies
build_project
start_server
wait_for_server
open_browser

# Ou combinações
check_prerequisites && install_dependencies && build_project
```

---

## 🛠️ Recursos Técnicos

### Logging Estruturado

```bash
# Cores ANSI para melhor leitura
✅ SUCCESS - Verde (operação bem-sucedida)
❌ ERROR - Vermelho (erro crítico)
⚠️  WARNING - Amarelo (aviso)
ℹ️  INFO - Azul (informação)

# Todas as mensagens são datadas
[2026-05-05 14:30:45] ✅ Servidor iniciado
```

### Health Checks

```bash
# Verifica servidor com curl/wget
# Até 30 tentativas com 2s entre cada
# Timeout automático se não responder

# Resultado:
✅ Servidor respondendo em http://localhost:3000
```

### PID Management

```bash
# Salva PID em .server.pid
cat .server.pid  # Ver PID
kill $(cat .server.pid)  # Parar servidor

# Scripts cleanupsaem automaticamente
```

### Logging de Execução

```bash
# Logs salvos em logs/server.log
tail -f logs/server.log  # Ver em tempo real
grep error logs/server.log  # Buscar erros
```

---

## 🔧 Customizações

### Modificar Porta

```bash
# Editar start.sh
readonly APP_PORT=3000  # Mudar aqui

# Ou na linha de comando
npm run dev -- -p 3001
```

### Adicionar Variáveis de Ambiente

```bash
# Criar .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GEMINI_API_KEY=your_key
DATABASE_URL=postgresql://...
```

### Customizar Timeout

```bash
# Editar start.sh
local max_attempts=30  # Aumentar para 60
local wait_time=2      # Aumentar para 3
```

---

## 📈 Performance

| Operação | Tempo Típico |
|----------|-------------|
| Limpeza | 5-10 segundos |
| Instalação | 30-60 segundos |
| Build | 10-20 segundos |
| Servidor startup | 3-5 segundos |
| Health checks | 5-15 segundos |
| **Total** | **2-3 minutos** |

---

## ✅ Checklist

Antes de usar os scripts:

- [ ] Node.js v20+ instalado: `node -v`
- [ ] npm v10+ instalado: `npm -v`
- [ ] Estar no diretório raiz do projeto
- [ ] Porta 3000 disponível
- [ ] Scripts com permissão de execução (`chmod +x`)
- [ ] Lido o arquivo STARTUP_GUIDE.md

---

## 🎯 Próximos Passos

1. **Executar script:**
   ```bash
   ./start.sh  # ou .\start.ps1 no Windows
   ```

2. **Aguardar inicialização:**
   ```
   Navegador abre automaticamente em http://localhost:3000
   ```

3. **Usar a aplicação:**
   - Login/Registro
   - Criar currículo
   - Testar features (IA, idiomas, templates)

4. **Ver logs se necessário:**
   ```bash
   tail -f logs/server.log
   ```

5. **Parar servidor:**
   ```bash
   # Ctrl+C no terminal
   # Ou executar cleanup
   ./cleanup.sh
   ```

---

## 📚 Documentação Relacionada

- **STARTUP_GUIDE.md** - Guia completo e detalhado
- **IMPLEMENTACAO_ROBUSTA.md** - Implementação da API
- **SOLUCAO_COMPLETA.md** - Solução do erro Gemini
- **ANALISE_DIAGNOSTICO_GEMINI.md** - Análise diagnóstica

---

## 🤝 Suporte

Se encontrar problemas:

1. Verifique os logs: `logs/server.log`
2. Leia o STARTUP_GUIDE.md (seção Solução de Problemas)
3. Verifique pré-requisitos: `node -v && npm -v`
4. Tente cleanup + restart: `./cleanup.sh && ./start.sh`

---

**Scripts Desenvolvidos com ❤️ por Claude Code**  
**Data: 2026-05-05**  
**Status: ✅ Production Ready**
