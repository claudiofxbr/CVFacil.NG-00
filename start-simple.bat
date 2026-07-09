@echo off
REM ============================================================================
REM CVFacil.NG - Startup Script (Batch/CMD) - v2.0
REM ============================================================================

setlocal enabledelayedexpansion

set "PROJECT_ROOT=%CD%"
set "APP_PORT=3000"
set "APP_URL=http://localhost:%APP_PORT%"

cls
echo.
echo ======================================================================
echo.
echo           CVFacil.NG STARTUP SCRIPT v2.0
echo.
echo  [OK] Arquitetura de Seguranca (Middleware)
echo  [OK] Autenticacao com JWT
echo  [OK] Fila de Processamento (BullMQ)
echo  [OK] Monitoramento de Quota Gemini
echo.
echo ======================================================================
echo.

REM PASSO 1: Validar Node.js
echo [1/6] Validando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js nao encontrado!
    echo        Instale de: https://nodejs.org/ (v20+)
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js: %NODE_VERSION%
echo.

REM PASSO 2: Validar npm
echo [2/6] Validando npm...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] npm nao encontrado!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm: %NPM_VERSION%
echo.

REM PASSO 3: Validar .env.local
echo [3/6] Validando .env.local...
if not exist ".env.local" (
    echo [ERRO] .env.local nao encontrado!
    echo        Configure as variaveis de ambiente
    pause
    exit /b 1
)
echo [OK] .env.local encontrado
echo.

REM PASSO 4: Instalar dependencias
echo [4/6] Instalando/validando dependencias...
if exist node_modules (
    echo [INFO] node_modules ja existe
) else (
    echo [INFO] Instalando dependencias...
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo [ERRO] Falha ao instalar dependencias
        pause
        exit /b 1
    )
)
echo [OK] Dependencias ok
echo.

REM PASSO 5: Sincronizar Prisma
echo [5/6] Sincronizando Prisma Schema...
call npx prisma db push --skip-generate >nul 2>&1
echo [OK] Schema sincronizado
echo.

REM PASSO 6: Iniciar servidor
echo [6/6] Iniciando servidor...
echo [INFO] Iniciando: npm run dev
echo [INFO] URL: %APP_URL%
echo.
echo Aguarde o servidor iniciar...
echo.

start "CVFacil.NG Server" cmd /k "cd /d "%PROJECT_ROOT%" && npm run dev"

timeout /t 3 /nobreak >nul

REM Aguardar servidor responder
set /a count=0
:wait_loop
timeout /t 2 /nobreak >nul
set /a count=!count!+1
if %count% lss 30 (
    powershell -Command "try{(New-Object Net.WebClient).DownloadString('http://localhost:%APP_PORT%')}catch{exit 1}" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Servidor respondendo!
        goto success
    )
    goto wait_loop
)

:success
echo.
echo ======================================================================
echo.
echo            INICIALIZACAO COMPLETA COM SUCESSO!
echo.
echo  Servidor:  %APP_URL%
echo  Node.js:   %NODE_VERSION%
echo  npm:       %NPM_VERSION%
echo.
echo ======================================================================
echo.
echo [INFO] Abrindo navegador...
start %APP_URL%
echo.
echo ======================================================================
echo.
echo PROXIMOS PASSOS:
echo.
echo  1. Navegador abriu automaticamente em %APP_URL%
echo  2. Registre uma nova conta ou faca login
echo  3. O servidor esta rodando neste terminal
echo  4. Para parar: feche esta janela
echo.
echo ======================================================================
echo.
pause
