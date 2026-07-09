# 🚀 Como Executar CVFacil.NG

## ⚙️ Pré-requisitos

Antes de começar, certifique-se de ter instalado:

### 1. **Node.js** (versão 20 ou superior)
```bash
# Verificar versão instalada
node --version
# Esperado: v20.x.x ou superior

# Baixar em: https://nodejs.org/
```

### 2. **npm** (geralmente vem com Node.js)
```bash
# Verificar versão instalada
npm --version
# Esperado: 10.x.x ou superior
```

### 3. **Git** (opcional, mas recomendado)
```bash
# Verificar versão instalada
git --version
```

---

## 📋 Passo 1: Preparar as Variáveis de Ambiente

### 1.1 Arquivo `.env.local` já existe?
```bash
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev
cat .env.local
```

### 1.2 Variáveis Necessárias (já configuradas)
```env
# ── Neon PostgreSQL ─────────────────────────────────────────
DATABASE_URL=postgresql://...  # Seu banco de dados Neon

# ── JWT Auth ────────────────────────────────────────────────
JWT_SECRET=seu_jwt_secret_muito_secreto_para_testes_desenvolvimento

# ── Gemini AI ───────────────────────────────────────────────
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSy...  # Seu token Gemini

# ── Stripe (Teste) ──────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# ── URL do App ──────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Migration Token ─────────────────────────────────────────
MIGRATION_TOKEN=dev-migration-token
```

✅ **Todas as variáveis já estão em `.env.local`!**

---

## 🔧 Passo 2: Instalar Dependências

```bash
# Navegar até a pasta do projeto
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev

# Instalar todas as dependências
npm install

# Esperado: saída final mostra "added X packages"
```

⏱️ **Tempo estimado: 2-5 minutos** (depende da velocidade da internet)

---

## 🗄️ Passo 3: Executar Migrations no Banco de Dados

### Opção A: Via Script (Recomendado) ⭐

**Terminal 1** - Iniciar o servidor de dev:
```bash
npm run dev
```

**Terminal 2** - Executar as migrations:
```bash
node scripts/run-migrations.js
```

**Esperado:**
```
🚀 Iniciando migrations do CVFacil.NG...

📡 Conectando ao servidor: http://localhost:3000/api/migrate
✅ Migrations executadas com sucesso!

📋 Migrations aplicadas:
   ✓ Adicionada coluna shared_token (UUID)
   ✓ Criado índice idx_shared_token
   ✓ Adicionada coluna language (VARCHAR)

🎉 Banco de dados atualizado!
```

### Opção B: Via cURL (Manual)

```bash
curl -X POST http://localhost:3000/api/migrate \
  -H "Authorization: Bearer dev-migration-token" \
  -H "Content-Type: application/json"
```

### Opção C: Via Interface Neon Web

1. Acesse https://console.neon.tech
2. Selecione seu banco de dados
3. Vá para "SQL Editor"
4. Execute os comandos SQL diretamente

---

## 🚀 Passo 4: Iniciar o Servidor de Desenvolvimento

```bash
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev

npm run dev
```

**Esperado:**
```
▲ Next.js 16.1.6 (Turbopack)
- Environments: .env.local

  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  ▐  ▌ Next.js 16.1.6                          ready
  ▐  ▌ - Local:        http://localhost:3000
  ▐  ▌ - Environments: .env.local
  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

  ✓ Ready in 2.5s
```

---

## 🌐 Passo 5: Acessar a Aplicação

### No Navegador:
1. Abra seu navegador (Chrome, Firefox, Safari, Edge)
2. Digite: `http://localhost:3000`
3. Você verá a tela de autenticação do CVFacil.NG

### URL Padrão:
```
http://localhost:3000
```

---

## 👤 Passo 6: Login/Registrar

### Opção 1: Registrar Nova Conta
1. Clique em "Registrar" ou "Sign Up"
2. Preencha com:
   - **Email**: teste@exemplo.com
   - **Senha**: SuaSenha123!
   - **Nome**: Seu Nome
3. Clique em "Registrar"

### Opção 2: Usar Credenciais de Teste
Se tiver dados de teste já salvos no banco:
- **Email**: claudio.xavier@gmail.com
- **Senha**: (conforme configurado)

---

## ✨ Passo 7: Explorar a Aplicação

### Dashboard (Home)
- Visualize currículos criados
- Estatísticas de uso
- Botões para criar novo currículo
- Importar PDF com IA

### Criar Novo Currículo
1. Clique em "Novo Currículo"
2. Escolha um template (16 opções, incluindo os 3 novos!)
3. Será redirecionado para o editor

### Editor de Currículo
- Preencha seus dados
- Use o botão "IA" para sugestões (Gemini)
- Veja preview em tempo real
- Exporte em PDF, Word ou HTML

### Funcionalidades Novas
- 🤖 **IA Suggestions**: Botão roxo/cyan no editor
- 🌍 **Idiomas**: Mude em Settings (en, es, fr)
- 📐 **Templates**: Minimalista, Acadêmico, Moderno

---

## 🛑 Parar o Servidor

Para parar a aplicação:
```bash
# No terminal onde está rodando o servidor
# Pressione: Ctrl + C

# Esperado: 
# ✓ Ready to exit
```

---

## 🔄 Reiniciar a Aplicação

Se precisar reiniciar:
```bash
# 1. Parar o servidor (Ctrl + C)

# 2. Iniciar novamente
npm run dev
```

---

## 📱 Acessar de Outro Computador (Mesma Rede)

Se quiser acessar de outro dispositivo na mesma rede:

1. Descubra seu IP local:
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

2. Acesse: `http://seu-ip-local:3000`

Exemplo: `http://192.168.1.100:3000`

---

## 🧪 Testar as Novas Features

### 1. Sugestões com Gemini
```
1. Criar um currículo
2. Ir para editor
3. Clicar no botão "IA" próximo ao campo "Resumo"
4. Aguardar 2-3 segundos
5. Ver 3 sugestões
6. Clicar em uma para aplicar
```

### 2. Múltiplos Idiomas
```
1. Clicar em "Settings" (engrenagem)
2. Procurar "Language" ou "Idioma"
3. Trocar para English, Español ou Français
4. UI inteira é traduzida
5. Volta a Settings para confirmar
```

### 3. Novos Templates
```
1. Clique em "Novo Currículo"
2. Scroll até o final da lista de templates
3. Veja: "Minimalista Pro", "Acadêmico Formal", "Moderno Dinâmico"
4. Selecione um
5. Veja o design ser renderizado
```

---

## ⚠️ Solução de Problemas

### ❌ Erro: "npm: command not found"
```bash
# Node.js não está instalado
# Baixar em: https://nodejs.org/
# Instalar e reiniciar o terminal
```

### ❌ Erro: "Database connection failed"
```bash
# 1. Verifique DATABASE_URL em .env.local
# 2. Confirme que o banco Neon está ativo
# 3. Teste a conexão no console do Neon
# 4. Se problema persistir, verifique firewall
```

### ❌ Erro: "Port 3000 already in use"
```bash
# Outra aplicação está usando a porta 3000
# Opção 1: Parar a outra aplicação
# Opção 2: Usar outra porta
npm run dev -- -p 3001
```

### ❌ Erro: "Cannot find module"
```bash
# Dependências não foram instaladas corretamente
npm install
# Se problema persistir:
rm -rf node_modules package-lock.json
npm install
```

### ❌ "Gemini API Key não funciona"
```bash
# 1. Verifique a chave em .env.local
# 2. Confirme que a chave é válida (em https://ai.google.dev)
# 3. Certifique-se de ter crédito/quota disponível
# 4. Reinicie o servidor
npm run dev
```

---

## 📊 Verificar Status

### Status do Servidor
```bash
# Se vir "Ready in X.Xs" - está funcionando ✅
# Se vê erros - verifique os logs acima
```

### Status do Banco
```bash
# Terminal adicional
curl http://localhost:3000/api/migrate -H "Authorization: Bearer dev-migration-token"

# Esperado: status "ok"
```

### Status da Build
```bash
npm run build

# Esperado: "✓ Compiled successfully"
```

---

## 🔐 Segurança (Desenvolvimento)

⚠️ **Importante para Produção:**

```env
# ❌ NÃO use em produção:
JWT_SECRET=dev-secret
MIGRATION_TOKEN=dev-migration-token

# ✅ Use em produção:
JWT_SECRET=<token-seguro-muito-longo>
MIGRATION_TOKEN=<token-aleatorio-forte>
```

---

## 📈 Estrutura de Pastas

```
cvfacil-ng-dev/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   └── share/[token]/      # Página pública
├── components/             # Componentes React
│   ├── templates/          # Templates de CV
│   ├── Dashboard.tsx       # Dashboard principal
│   └── ResumeEditor.tsx    # Editor de CV
├── lib/                    # Utilitários
│   ├── db.ts              # Conexão Neon
│   └── i18n.ts            # Traduções
├── services/              # Serviços
│   ├── resumeService.ts   # Lógica de CV
│   └── exportService.ts   # Export PDF/Word/HTML
├── .env.local             # Variáveis de ambiente
├── package.json           # Dependências
└── tsconfig.json          # Config TypeScript
```

---

## 📚 Documentação Adicional

- **[QUICK_START.md](./QUICK_START.md)** - Guia das novas features
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Detalhes técnicos
- **[SETUP_NEON_MIGRATIONS.md](./SETUP_NEON_MIGRATIONS.md)** - Migrations
- **[DEPLOY.md](./DEPLOY.md)** - Deploy em produção

---

## 🎯 Checklist de Execução

- [ ] Node.js 20+ instalado
- [ ] npm install executado
- [ ] .env.local configurado
- [ ] Migrations executadas
- [ ] npm run dev iniciado
- [ ] Navegador aberto em localhost:3000
- [ ] Conta criada/login realizado
- [ ] Dashboard carregado
- [ ] Novo currículo criado
- [ ] Features testadas (IA, idiomas, templates)

---

## ✅ Sucesso!

Se chegou até aqui, o CVFacil.NG está **rodando perfeitamente**! 🎉

**Próximas ações:**
1. Explorar a aplicação
2. Criar alguns currículos
3. Testar as novas features
4. Ler a documentação
5. Fazer modificações conforme necessário

---

**Desenvolvido com ❤️ por Claude Code**  
**Última atualização: 2026-05-05**
