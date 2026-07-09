# ⚡ COMO EXECUTAR CVFacil.NG - Resumo Rápido

## 🎯 3 Formas de Iniciar

### **Forma 1: Script Automático (Mais Fácil)** ⭐

#### 🪟 Windows
```bash
# Double-click ou abra o terminal na pasta e execute:
start.bat
```

#### 🐧 Linux/Mac
```bash
# Dar permissão de execução
chmod +x start.sh

# Executar
./start.sh
```

---

### **Forma 2: Comando Manual (Recomendado)**

```bash
# 1. Abrir terminal/PowerShell na pasta do projeto
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev

# 2. Instalar dependências (primeira vez)
npm install

# 3. Iniciar servidor
npm run dev
```

**Esperado:**
```
▲ Next.js 16.1.6
  ✓ Ready in 2.5s
  - Local: http://localhost:3000
```

---

### **Forma 3: IDE/Editor (VS Code)**

1. **Abrir pasta** em VS Code
2. **Terminal integrado**: `Ctrl + '` (acento grave)
3. **Executar**:
   ```bash
   npm install  # primeira vez
   npm run dev
   ```
4. **Abrir navegador**: `Ctrl + Click` no link ou `http://localhost:3000`

---

## 🌐 Acessar Aplicação

| Método | URL |
|--------|-----|
| **Local (seu PC)** | http://localhost:3000 |
| **Outra máquina na rede** | http://seu-ip:3000 |
| **Descobrir IP local** | `ipconfig` (Windows) ou `ifconfig` (Linux) |

---

## 📋 Pré-requisitos (Verificar)

```bash
# Verificar Node.js (deve ser v20+)
node --version

# Verificar npm (deve ser v10+)
npm --version

# Verificar arquivo .env.local
ls .env.local  # Linux/Mac
dir .env.local # Windows
```

---

## ⚠️ Se der Erro

### "npm: command not found"
→ Instalar Node.js em https://nodejs.org/

### "Port 3000 already in use"
→ Usar outra porta: `npm run dev -- -p 3001`

### "Database connection failed"
→ Verificar `DATABASE_URL` em `.env.local`

### "Cannot find module"
→ Executar `npm install` novamente

---

## 🧪 Testar Aplicação

1. ✅ Abrir http://localhost:3000
2. ✅ Registrar conta ou fazer login
3. ✅ Ver Dashboard
4. ✅ Criar novo currículo
5. ✅ Testar: Sugestões IA, Idiomas, Templates

---

## 🛑 Parar Aplicação

```bash
# No terminal onde está rodando
Ctrl + C

# Esperado:
# Gracefully shutting down...
# ✓ Ready to exit
```

---

## 📚 Documentação Completa

Para detalhes, ver:
- **[RUN_APP.md](./RUN_APP.md)** - Guia completo
- **[QUICK_START.md](./QUICK_START.md)** - Novas features
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Detalhes técnicos

---

## ✅ Checklist Rápido

- [ ] Node.js v20+ instalado
- [ ] npm install executado
- [ ] .env.local existe
- [ ] npm run dev iniciado
- [ ] Navegador aberto em localhost:3000
- [ ] Aplicação carregando ✨

---

**Desenvolvido com ❤️ por Claude Code**
