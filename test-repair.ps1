# ============================================================================
# CVFacil.NG - TEST REPAIR SCRIPT v1.0
# ============================================================================
# Script para verificar se reparo foi aplicado e iniciar servidor
# ============================================================================

# CONFIGURAR ENCODING UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host ""
Write-Host "======================================================================"
Write-Host ""
Write-Host "    CVFacil.NG TEST REPAIR - Validação de Arquivos"
Write-Host ""
Write-Host "======================================================================"
Write-Host ""

$filesRequired = @(
    @{ Path = "components\auth-guard.tsx"; Name = "AuthGuard Component" },
    @{ Path = "lib\auth-logger.ts"; Name = "AuthLogger Service" },
    @{ Path = "App.tsx"; Name = "App.tsx (with AuthGuard)" },
    @{ Path = "components\AuthProvider.tsx"; Name = "AuthProvider (with timeout)" },
    @{ Path = "app\api\monitoring\auth\route.ts"; Name = "Monitoring Endpoint" },
    @{ Path = "tests\auth\auth-validation.test.ts"; Name = "Auth Tests" },
    @{ Path = "DASHBOARD_SECURITY_REPAIR.md"; Name = "Documentation" }
)

$allPresent = $true

Write-Host "Verificando arquivos criados..." -ForegroundColor Cyan
Write-Host ""

foreach ($file in $filesRequired) {
    if (Test-Path $file.Path) {
        Write-Host "  [OK] $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "  [ERRO] $($file.Name) [AUSENTE]" -ForegroundColor Red
        $allPresent = $false
    }
}

Write-Host ""

if ($allPresent) {
    Write-Host "[OK] Todos os arquivos do reparo foram criados com sucesso!" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Alguns arquivos estao ausentes. Verifique o resultado anterior." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "======================================================================"
Write-Host ""

# Matar processos node antigos
Write-Host "Limpando processos antigos..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "[OK] Processos node encerrados" -ForegroundColor Green
Write-Host ""

# Iniciar servidor
Write-Host "======================================================================"
Write-Host ""
Write-Host "Iniciando servidor com reparo aplicado..." -ForegroundColor Cyan
Write-Host ""
Write-Host "INSTRUÇÕES DE TESTE:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abrir navegador em http://localhost:3000"
Write-Host "2. Se ver LOGIN (nao 404) = [OK] REPARO FUNCIONANDO"
Write-Host "3. Fazer login com: teste@example.com / 123456"
Write-Host "4. Verificar console (F12) por mensagens [AuthGuard], [AuthProvider]"
Write-Host "5. Recarregar página com token válido = deve manter session"
Write-Host ""
Write-Host "======================================================================"
Write-Host ""

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
npm run dev
