# 🪟 Configuração no Windows - CVfacil.NG

## ❌ Problema: "O termo '.\start.ps1' não é reconhecido"

Este erro ocorre porque o PowerShell tem restrições de segurança. Aqui está como resolver:

---

## ✅ Solução Rápida (3 passos)

### Passo 1: Abrir PowerShell como Administrador

1. Pressione `Win + X`
2. Clique em **"Terminal do Windows (Admin)"** ou **"Windows PowerShell (Admin)"**
3. Se pedir confirmação, clique **"Sim"**

### Passo 2: Permitir Execução de Scripts

Na janela do PowerShell aberta como Admin, execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

**O que isso faz:**
- `Set-ExecutionPolicy` = Define política de execução
- `RemoteSigned` = Permite scripts locais + scripts assinados remotos
- `CurrentUser` = Apenas para usuário atual (não global)
- `Force` = Não pede confirmação

**Resultado esperado:**
```
ExecutionPolicy
---------
RemoteSigned
```

### Passo 3: Navegar e Executar o Script

```powershell
# 1. Navegar para o diretório do projeto
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev

# 2. Confirmar que está no diretório correto
ls *.ps1  # Deve listar start.ps1 e cleanup.ps1

# 3. Executar o script
.\start.ps1
```

---

## 🔍 Solução Detalhada (se passo rápido não funcionar)

### Opção A: Verificar Execution Policy Atual

```powershell
# Ver política atual
Get-ExecutionPolicy

# Resultado pode ser:
# - Restricted (bloqueado - precisa mudar)
# - AllSigned (assinados)
# - RemoteSigned (OK)
# - Unrestricted (permite tudo)
```

### Opção B: Mudar Policy Manualmente

**Abra PowerShell como Admin e execute:**

```powershell
# Para usuário atual
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Ou para toda máquina (não recomendado)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
```

**Confirme digitando `S` e pressione Enter**

### Opção C: Método Alternativo (sem mudar policy)

Se não quiser mudar a policy, execute assim:

```powershell
# Navegar para o diretório
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev

# Executar bypassing a policy
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

---

## 🎯 Verificação Passo-a-Passo

### 1. Verificar PowerShell Versão

```powershell
$PSVersionTable.PSVersion

# Resultado esperado: 5.x ou 7.x
```

### 2. Verificar Diretório Correto

```powershell
# Ver diretório atual
pwd

# Resultado esperado:
# Path
# ----
# C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev

# Se não estiver aqui, navegar:
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev
```

### 3. Verificar se Script Existe

```powershell
# Listar arquivos .ps1
Get-ChildItem *.ps1

# Resultado esperado:
#     Directory: C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev
#
# Mode                 LastWriteTime         Length Name
# ----                 -------------         ------ ----
# -a---          05/05/2026 09:37           6579   start.ps1
# -a---          05/05/2026 09:37           2294   cleanup.ps1
```

### 4. Verificar Execution Policy

```powershell
Get-ExecutionPolicy -List

# Resultado esperado:
#         Scope ExecutionPolicy
#         ----- ---------------
#  MachinePolicy       Undefined
#     UserPolicy       Undefined
#        Process       Undefined
#    CurrentUser  RemoteSigned
#   LocalMachine  Undefined
```

### 5. Executar Script

```powershell
# Simplesmente execute
.\start.ps1

# Ou com parâmetros
.\start.ps1 -SkipClean -NoBrowser
```

---

## 🛠️ Troubleshooting Avançado

### Erro: "não foi possível carregar o arquivo... porque a execução de scripts está desabilitada"

**Solução:**
```powershell
# Verificar se LocalMachine também está bloqueado
Get-ExecutionPolicy -Scope LocalMachine

# Se for Restricted, mudar:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
```

### Erro: "acesso negado" ou "permissão"

**Solução:**
1. Abrir PowerShell como Admin (não como usuário normal)
2. Confirmar com `S` quando pedir confirmação

### Erro: "arquivo script não encontrado"

**Solução:**
```powershell
# Verificar caminho correto
cd "C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev"

# Confirmar arquivos existem
ls -Name *.ps1

# Se não encontrar, o caminho está errado
```

---

## 📋 Checklist de Configuração

- [ ] PowerShell aberto **como Admin**
- [ ] Execution Policy alterado para `RemoteSigned`
- [ ] Estar no diretório correto: `C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev`
- [ ] Arquivos existem: `ls *.ps1`
- [ ] Executar: `.\start.ps1`

---

## 🎯 Resumo Rápido

```powershell
# 1. Abrir PowerShell como Admin (Win + X)

# 2. Permitir execução
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# 3. Navegar para projeto
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev

# 4. Executar
.\start.ps1
```

**Pronto! Script deve inicializar agora.**

---

## ⚙️ Alternativas se PowerShell não Funcionar

### Opção 1: Usar Git Bash (recomendado)

```bash
# Git Bash já suporta bash scripts
./start.sh
```

**Download:** https://git-scm.com/download/win

### Opção 2: Usar WSL (Windows Subsystem for Linux)

```bash
# No terminal WSL
./start.sh
```

**Setup:** https://docs.microsoft.com/pt-br/windows/wsl/install

### Opção 3: Usar Prompt de Comando (CMD)

```cmd
# Executar Node commands diretamente
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev
npm install --legacy-peer-deps
npm run build
npm run dev
```

---

## 🔐 Segurança da Execution Policy

**RemoteSigned significa:**
- ✅ Permite executar scripts locais (criados no seu PC)
- ✅ Requer assinatura para scripts baixados da internet
- ✅ Nível recomendado de segurança

**Não use Unrestricted** (permite tudo sem assinatura)

---

## 📞 Suporte Rápido

Se ainda tiver problemas:

1. **Verifique a policy:**
   ```powershell
   Get-ExecutionPolicy
   ```

2. **Verifique o diretório:**
   ```powershell
   pwd
   ```

3. **Verifique o arquivo:**
   ```powershell
   Test-Path .\start.ps1
   ```

4. **Tente o modo bypass:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start.ps1
   ```

---

## ✅ Confirmação de Sucesso

Após executar `.\start.ps1`, você deve ver:

```
╔════════════════════════════════════════════════╗
║           CVfacil.NG STARTUP                   ║
║     Inicializando com verificações...         ║
╚════════════════════════════════════════════════╝

ℹ️  INFO: package.json encontrado
✅ SUCCESS: Node.js: v20.x.x
✅ SUCCESS: npm: 10.x.x
...
✅ SUCCESS: Servidor iniciado (PID: 12345)
✅ SUCCESS: Navegador aberto
```

Se ver isso, **está funcionando!** 🎉

---

**Desenvolvido por Claude Code**  
**Data: 2026-05-05**
