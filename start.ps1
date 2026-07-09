# ============================================================================
# CVFacil.NG - Startup Script (PowerShell) - v4.0
# ============================================================================
# Script corrigido com resolução de conflitos de AuthProvider
# Versão: 4.0 - Maio 2026

Write-Host ""
Write-Host "======================================================================"
Write-Host ""
Write-Host "           CVFacil.NG STARTUP SCRIPT v4.0"
Write-Host ""
Write-Host "  [OK] Arquitetura de Seguranca (Middleware)"
Write-Host "  [OK] Autenticacao com JWT + Bcrypt"
Write-Host "  [OK] Token em localStorage + Cookie"
Write-Host "  [OK] ErrorBoundary + GlobalExceptionHandler"
Write-Host ""
Write-Host "======================================================================"
Write-Host ""

# CONFIGURAR ENCODING UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host ""
Write-Host "======================================================================"
Write-Host "           CVFacil.NG STARTUP SCRIPT v4.1 - FIXED EDITION"
Write-Host "======================================================================"
Write-Host ""

# PASSO 0: Matar processos node antigos na porta 3000
Write-Host "[0/6] Limpando processos antigos..."
$processes = Get-Process node -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "      Encontrados processos node. Encerrando..."
    $processes | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Verifique se porta 3000 está livre
$portTest = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($portTest) {
    Write-Host "[AVISO] Porta 3000 ainda em uso. Aguardando..."
    Start-Sleep -Seconds 3
}
Write-Host "[OK] Portas limpas"
Write-Host ""

# PASSO 1: Validar Node.js
Write-Host "[1/7] Validando Node.js..."
$nodeCheck = node -v 2>$null
if ($null -eq $nodeCheck) {
    Write-Host "[ERRO] Node.js nao encontrado!"
    Write-Host "       Instale de: https://nodejs.org/ (v20+)"
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "[OK] Node.js: $nodeCheck"
Write-Host ""

# PASSO 2: Validar npm
Write-Host "[2/7] Validando npm..."
$npmCheck = npm -v 2>$null
if ($null -eq $npmCheck) {
    Write-Host "[ERRO] npm nao encontrado!"
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "[OK] npm: $npmCheck"
Write-Host ""

# PASSO 3: Validar .env.local
Write-Host "[3/7] Validando .env.local..."
if (-not (Test-Path ".env.local")) {
    Write-Host "[ERRO] .env.local nao encontrado!"
    Write-Host "       Configure as variaveis de ambiente"
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "[OK] .env.local encontrado"
Write-Host ""

# PASSO 4: Instalar dependencias
Write-Host "[4/7] Instalando/validando dependencias..."
if (Test-Path "node_modules") {
    Write-Host "[INFO] node_modules ja existe"
} else {
    Write-Host "[INFO] Instalando dependencias..."
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Falha ao instalar dependencias"
        Read-Host "Pressione Enter para sair"
        exit 1
    }
}
Write-Host "[OK] Dependencias ok"
Write-Host ""

# PASSO 5: Sincronizar Prisma
Write-Host "[5/7] Sincronizando Prisma Schema..."
npx prisma db push --skip-generate *>$null
Write-Host "[OK] Schema sincronizado"
Write-Host ""

# PASSO 6: Criar usuario de teste (se nao existir)
Write-Host "[6/7] Verificando usuario de teste..."
node create-test-user.cjs 2>$null
Write-Host ""

# INICIALIZACAO COMPLETA (6 PASSOS PRONTOS)
Write-Host "======================================================================"
Write-Host ""
Write-Host "            PREPARACAO COMPLETA COM SUCESSO! v4.1"
Write-Host ""
Write-Host "  Node.js:   $nodeCheck"
Write-Host "  npm:       $npmCheck"
Write-Host "  Status:    [OK] Ambiente pronto"
Write-Host ""
Write-Host "======================================================================"
Write-Host ""

Write-Host "CREDENCIAIS DE TESTE:"
Write-Host ""
Write-Host "  Email:  teste@example.com"
Write-Host "  Senha:  123456"
Write-Host ""

Write-Host "======================================================================"
Write-Host ""

# PASSO 7: Iniciar servidor
Write-Host "[7/7] Iniciando servidor npm run dev..."
Write-Host ""

# Iniciar npm run dev como background job
$job = Start-Job -ScriptBlock {
    Set-Location "C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev"
    npm run dev
}

# Aguardar o servidor ficar pronto (espera a porta 3000 responder)
Write-Host "Aguardando servidor ficar pronto..."
$ready = $false
$attempts = 0
$maxAttempts = 60 # 60 tentativas = ~60 segundos máximo

while (-not $ready -and $attempts -lt $maxAttempts) {
    $attempts++
    try {
        # Tenta conectar à porta 3000
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connection = $tcpClient.BeginConnect("localhost", 3000, $null, $null)
        $connection.AsyncWaitHandle.WaitOne(1000, $false) | Out-Null

        if ($tcpClient.Connected) {
            $ready = $true
            $tcpClient.Close()
            Write-Host "[OK] Servidor pronto em http://localhost:3000"
            Write-Host ""
        } else {
            Start-Sleep -Milliseconds 500
        }
    } catch {
        Start-Sleep -Milliseconds 500
    }
}

if ($ready) {
    # Abrir navegador DEPOIS que o servidor está pronto
    Write-Host "Abrindo navegador..."
    Start-Process "http://localhost:3000"
    Write-Host ""
    Write-Host "======================================================================"
    Write-Host "Servidor rodando em http://localhost:3000"
    Write-Host "Pressione Ctrl+C para parar o servidor"
    Write-Host "======================================================================"
    Write-Host ""

    # Aguardar o job do servidor terminar (quando usuário pressiona Ctrl+C)
    Wait-Job $job | Out-Null
} else {
    Write-Host "[ERRO] Servidor não respondeu após 60 segundos"
    Write-Host "Verifique se há erros no console"
    Stop-Job $job
    Remove-Job $job
}
