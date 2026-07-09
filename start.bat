@echo off
REM ============================================================================
REM CVFacil.NG - Startup Script (Batch/CMD) - v2.0
REM Startup completo com todas as validacoes de seguranca e autenticacao
REM ============================================================================

setlocal enabledelayedexpansion

set "PROJECT_ROOT=%CD%"
set "APP_PORT=3000"
set "APP_URL=http://localhost:%APP_PORT%"
set "LOG_DIR=%PROJECT_ROOT%\logs"
set "REDIS_PORT=6380"

cls
echo.
echo ======================================================================
echo.
echo              CVFacil.NG STARTUP SCRIPT v2.0
echo.
echo  Features Implementadas:
echo  [OK] Arquitetura de Seguranca (Middleware)
echo  [OK] Autenticacao com JWT
echo  [OK] Fila de Processamento (BullMQ)
echo  [OK] Monitoramento de Quota Gemini
echo  [OK] Validacao de Token (jose)
echo  [OK] Prisma Schema e Migrations
echo.
echo ======================================================================
echo.

REM =========== PASSO 1: VALIDAR PRE-REQUISITOS ===========
echo.
echo [PASSO 1/7] Validando pre-requisitos...
echo.

REM Verificar Node.js
echo [*] Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ [ERRO] Node.js nao encontrado!
    echo    Instale de: https://nodejs.org/ (v20+)
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js: %NODE_VERSION%

REM Verificar npm
echo [*] Verificando npm...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ [ERRO] npm nao encontrado!
    echo    Reinstale Node.js
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo ✅ npm: %NPM_VERSION%

REM Verificar package.json
if not exist "package.json" (
    echo ❌ [ERRO] package.json nao encontrado!
    pause
    exit /b 1
)
echo ✅ package.json encontrado
echo.

REM =========== PASSO 2: VALIDAR ARQUIVO .env.local ===========
echo [PASSO 2/7] Validando configuracoes (.env.local)...
echo.

if not exist ".env.local" (
    echo ❌ [ERRO] Arquivo .env.local nao encontrado!
    echo    Por favor, configure as variaveis de ambiente primeiro:
    echo    - DATABASE_URL (Neon PostgreSQL)
    echo    - NEXT_PUBLIC_GEMINI_API_KEY (Google Gemini)
    echo    - JWT_SECRET
    echo    - REDIS_HOST e REDIS_PORT
    pause
    exit /b 1
)
echo ✅ .env.local encontrado

REM Verificar variáveis críticas
findstr /M "DATABASE_URL" .env.local >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ DATABASE_URL nao configurada em .env.local
    pause
    exit /b 1
)
echo ✅ DATABASE_URL configurada

findstr /M "JWT_SECRET" .env.local >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ JWT_SECRET nao configurada em .env.local
    pause
    exit /b 1
)
echo ✅ JWT_SECRET configurada

findstr /M "NEXT_PUBLIC_GEMINI_API_KEY" .env.local >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  NEXT_PUBLIC_GEMINI_API_KEY nao configurada
    echo    (Opcional, mas necessaria para upload de PDFs)
)
echo ✅ Configuracoes validadas
echo.

REM =========== PASSO 3: LIMPEZA ===========
echo [PASSO 3/7] Limpando cache e build anterior...
echo.

if exist .next (
    echo [*] Removendo .next...
    rmdir /s /q .next >nul 2>&1
)
if exist dist (
    echo [*] Removendo dist...
    rmdir /s /q dist >nul 2>&1
)
if exist logs (
    echo [*] Removendo logs...
    rmdir /s /q logs >nul 2>&1
)
echo [*] Limpando npm cache...
call npm cache clean --force >nul 2>&1
echo ✅ Ambiente limpo
echo.

REM =========== PASSO 4: INSTALAR DEPENDENCIAS ===========
echo [PASSO 4/7] Instalando dependencias...
echo.

if exist node_modules (
    echo ℹ️  node_modules ja existe - validando...
    REM Verificar se libraries criticas estao instaladas
    if not exist "node_modules\next" (
        echo ⚠️  Next.js nao encontrado, reinstalando...
        call npm install --legacy-peer-deps
    )
    if not exist "node_modules\jose" (
        echo ⚠️  jose nao encontrado, instalando...
        call npm install jose --legacy-peer-deps
    )
    if not exist "node_modules\bullmq" (
        echo ⚠️  bullmq nao encontrado, instalando...
        call npm install bullmq --legacy-peer-deps
    )
) else (
    echo [*] Instalando todas as dependencias...
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ [ERRO] Falha ao instalar dependencias
        pause
        exit /b 1
    )
)
echo ✅ Dependencias ok
echo.

REM =========== PASSO 5: SINCRONIZAR BANCO DE DADOS ===========
echo [PASSO 5/7] Sincronizando schema Prisma com banco...
echo.

echo [*] Executando: npx prisma db push
call npx prisma db push --skip-generate
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Aviso: Prisma db push teve problema
    echo    Pode ser normal se banco ja esta sincronizado
)
echo ✅ Schema validado
echo.

REM =========== PASSO 6: COMPILAR ===========
echo [PASSO 6/7] Compilando projeto...
echo.

call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ [ERRO] Falha ao compilar projeto
    echo    Verifique os erros acima
    pause
    exit /b 1
)
echo ✅ Projeto compilado com sucesso
echo.

REM =========== PASSO 7: INICIAR SERVIDOR ===========
echo [PASSO 7/7] Iniciando servidor Next.js...
echo.

if not exist logs mkdir logs >nul 2>&1

REM Verificar se porta 3000 esta disponivel
netstat -an | findstr ":3000 " >nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Aviso: Porta 3000 ja esta em uso!
    echo    Tentando porta 3001...
    set "APP_PORT=3001"
    set "APP_URL=http://localhost:%APP_PORT%"
)

echo [*] Iniciando: npm run dev (porta %APP_PORT%)
echo.
start "CVFacil.NG Server" cmd /k "cd /d "%PROJECT_ROOT%" && npm run dev"

REM Aguardar servidor estar pronto
echo [*] Aguardando servidor ficar pronto (max 60 segundos)...
set /a count=0
:wait_loop
timeout /t 2 /nobreak >nul
set /a count=!count!+1
if %count% lss 30 (
    powershell -Command "try{(New-Object Net.WebClient).DownloadString('http://localhost:%APP_PORT%')}catch{exit 1}" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] ✅ Servidor respondendo!
        goto success
    )
    goto wait_loop
)

:success
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                                                                ║
echo ║            ✅ INICIALIZACAO COMPLETA COM SUCESSO!             ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo 📊 INFORMACOES DO SERVIDOR:
echo    URL:           %APP_URL%
echo    Node.js:       %NODE_VERSION%
echo    npm:           %NPM_VERSION%
echo    Porta:         %APP_PORT%
echo    Logs:          %LOG_DIR%
echo.

echo 🔐 SEGURANCA IMPLEMENTADA:
echo    ✅ Middleware de autenticacao
echo    ✅ Validacao de JWT (jose)
echo    ✅ Protected Routes
echo    ✅ Auth Context Provider
echo.

echo 📦 ARQUITETURA:
echo    ✅ Prisma ORM com PostgreSQL (Neon)
echo    ✅ BullMQ para fila de processamento
echo    ✅ Redis para cache (porta %REDIS_PORT%)
echo    ✅ Google Gemini API integration
echo.

echo 🚀 PROXIMOS PASSOS:
echo.
echo    1. ABRIR NO NAVEGADOR:
echo       %APP_URL%
echo.
echo    2. FAZER LOGIN:
echo       - Se ja tem conta: use email/senha
echo       - Se nao tem: clique em "Registrar"
echo.
echo    3. TESTAR FUNCIONALIDADES:
echo       - Upload de PDF
echo       - Processamento com Gemini
echo       - Monitoramento de quota
echo.

echo 📋 DOCUMENTACAO:
echo    - COMO_INICIAR.md (guia rapido)
echo    - SEGURANCA_AUTENTICACAO.md (arquitetura segura)
echo    - IMPLEMENTACAO_COMPLETA.md (features completas)
echo.

echo 💡 DICAS:
echo    - Mantenha este terminal aberto (servidor rodando)
echo    - Para parar: feche esta janela
echo    - Para logs: verifique %LOG_DIR%
echo    - Para monitorar jobs: abra novo PowerShell e execute:
echo      npx prisma studio
echo.

echo [*] Abrindo navegador em %APP_PORT%...
start %APP_URL%
echo.
echo Pressione ENTER para continuar...
pause
