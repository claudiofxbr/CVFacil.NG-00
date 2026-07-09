# 🪟 Windows - Solução Rápida (3 Opções)

## 🚨 Problema

```
.\start.ps1 : O termo '.\start.ps1' não é reconhecido...
```

---

## ✅ Opção 1: Usar Arquivo .BAT (MAIS FÁCIL - Recomendado!)

Sem necessidade de alterar PowerShell!

### Passo 1: Abrir `start.bat`

1. Navegue até: `C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev`
2. Procure pelo arquivo **`start.bat`**
3. **Clique 2x** para executar

### Pronto!

O script vai:
- ✅ Verificar Node.js + npm
- ✅ Limpar ambiente
- ✅ Instalar dependências
- ✅ Compilar projeto
- ✅ Iniciar servidor
- ✅ Abrir navegador automaticamente

**Nenhuma configuração necessária!** 🎉

---

## ✅ Opção 2: Usar Git Bash

Se tiver Git instalado:

### Passo 1: Abrir Git Bash

1. Clique direito na pasta `cvfacil-ng-dev`
2. Selecione **"Git Bash Here"**

### Passo 2: Executar

```bash
./start.sh
```

---

## ✅ Opção 3: Permitir PowerShell (Se quiser usar .ps1)

### Passo 1: Abrir PowerShell como Admin

1. Pressione `Win + X`
2. Clique em **"Windows PowerShell (Admin)"** ou **"Terminal (Admin)"**
3. Confirme com **"Sim"**

### Passo 2: Permitir Scripts

Cole isso na janela aberta:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

Pressione **Enter** (não pedirá confirmação por causa do `-Force`)

### Passo 3: Navegar e Executar

```powershell
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev
.\start.ps1
```

---

## 📊 Comparação das 3 Opções

| Opção | Método | Dificuldade | Tempo |
|-------|--------|-----------|-------|
| **1** | Clicar 2x em `start.bat` | ⭐ Muito Fácil | 1 clique |
| **2** | Git Bash + `./start.sh` | ⭐⭐ Fácil | 2 passos |
| **3** | PowerShell Policy | ⭐⭐⭐ Médio | 3 passos |

---

## 🎯 RECOMENDAÇÃO

**Use a Opção 1 (start.bat)** - É a mais simples!

### Passo Único:

1. Vá para: `C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev`
2. **Duplo-clique em `start.bat`**
3. Aguarde o navegador abrir

Pronto! Nenhuma outra configuração necessária.

---

## ✨ O que Ver Após Executar

### Janela 1: Configuração (start.bat)
```
====================================================
          CVfacil.NG STARTUP
       Inicializando aplicativo...
====================================================

[*] Verificando Node.js...
[OK] Node.js: v20.11.1
[OK] npm: 10.5.0
[OK] package.json encontrado

[*] Limpando ambiente...
[OK] Ambiente limpo

[*] Instalando dependencias...
[OK] Dependencias ok

[*] Compilando projeto...
[OK] Projeto compilado

[*] Iniciando servidor...
[*] Aguardando servidor (max 60 segundos)...
[OK] Servidor respondendo!

====================================================
       INICIALIZACAO COMPLETA!
====================================================

CVfacil.NG esta rodando!

URL:        http://localhost:3000
Node.js:    v20.11.1
npm:        10.5.0

[*] Abrindo navegador...
```

### Janela 2: Servidor (npm run dev)
```
  ▲ Next.js 16.1.6 (Turbopack)
  - Environments: .env.local

  ✓ Compiled successfully

  > Ready in 1.5s
```

### Navegador
```
Abre automaticamente em:
http://localhost:3000
```

---

## 🆘 Se Ainda Não Funcionar

### Problema: "Node.js não encontrado"

```powershell
# Verificar se Node.js está instalado
node -v

# Se não funcionar, instalar de:
# https://nodejs.org/ (v20+)
```

### Problema: "npm não encontrado"

```powershell
# Verificar npm
npm -v

# Se não funcionar, npm já vem com Node.js
# Reinstale Node.js de https://nodejs.org/
```

### Problema: "package.json não encontrado"

```powershell
# Verificar se está no diretório certo
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev
dir /s package.json
```

---

## 🔄 Para Parar o Servidor

1. **Localize a janela "CVfacil.NG Server"** (aberta automaticamente)
2. **Feche essa janela** (Alt+F4 ou X)
3. **Pronto!** Servidor parado

---

## 🧹 Para Limpar Tudo

Se quiser limpar caches/logs e recomeçar:

### Opção A: Automático (Recomendado)
```powershell
# Procure por cleanup.bat (se existir)
# Ou, via PowerShell:
.\cleanup.ps1
```

### Opção B: Manual
```powershell
# Remover diretórios
rmdir /s .next
rmdir /s dist
rmdir /s logs
rmdir /s build

# Limpar npm cache
npm cache clean --force
```

Depois execute `start.bat` novamente.

---

## 📋 Checklist Rápido

- [ ] Node.js instalado: `node -v` mostra v20+
- [ ] npm instalado: `npm -v` mostra v10+
- [ ] Arquivo `start.bat` existe no diretório
- [ ] Duplo-clique em `start.bat`
- [ ] Aguardar ~2-3 minutos
- [ ] Navegador abre em http://localhost:3000

---

## 🎉 Sucesso!

Se conseguiu ver a página do CVfacil.NG no navegador, tudo está funcionando!

Agora você pode:
- ✅ Fazer login/registro
- ✅ Criar currículo
- ✅ Testar features (IA, idiomas, templates)
- ✅ Exportar em PDF/DOCX

---

## 📞 Próximos Passos

1. **Primeira execução:** `start.bat` (completo)
2. **Próximas vezes:** `start.bat` (será mais rápido)
3. **Para parar:** Feche a janela "CVfacil.NG Server"
4. **Para limpar:** Execute `cleanup.ps1` ou remova as pastas manualmente

---

## ⚙️ Scripts Disponíveis

No diretório `cvfacil-ng-dev`, você tem:

| Arquivo | Função | Como Usar |
|---------|--------|-----------|
| **start.bat** | Iniciar (Windows) | Duplo-clique |
| start.ps1 | Iniciar (PowerShell) | `.\start.ps1` |
| cleanup.ps1 | Limpar ambiente | `.\cleanup.ps1` |
| start.sh | Iniciar (Linux/Mac) | `./start.sh` |
| cleanup.sh | Limpar (Linux/Mac) | `./cleanup.sh` |

---

**Desenvolvido com ❤️ por Claude Code**  
**Data: 2026-05-05**  
**Status: ✅ Pronto para Usar**
