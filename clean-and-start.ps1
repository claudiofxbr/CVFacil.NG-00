# ============================================================================
# CVFacil.NG - Clean & Start Script (PowerShell) - v1.0
# ============================================================================
# Script para limpar processos presos e iniciar o servidor
# Execute como Admin
# ============================================================================

# CONFIGURAR ENCODING UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host ""
Write-Host "======================================================================"
Write-Host ""
Write-Host "           CVFacil.NG CLEAN & START SCRIPT v1.0"
Write-Host ""
Write-Host "  [1] Matar processos node antigos"
Write-Host "  [2] Limpar cache Next.js"
Write-Host "  [3] Sincronizar banco de dados"
Write-Host "  [4] Iniciar servidor"
Write-Host ""
Write-Host "======================================================================"
Write-Host ""

# ETAPA 1: Matar processos node
Write-Host "[1/4] Matando processos node antigos..."
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "      Encontrados $($nodeProcesses.Count) processo(s) node"
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "      Processos encerrados"
    Start-Sleep -Seconds 2
} else {
    Write-Host "      Nenhum processo node encontrado"
}
Write-Host "[OK] Limpeza de processos concluída"
Write-Host ""

# ETAPA 2: Limpar cache
Write-Host "[2/4] Limpando cache Next.js..."
$cacheDir = ".\.next"
if (Test-Path $cacheDir) {
    Remove-Item -Recurse -Force $cacheDir -ErrorAction SilentlyContinue
    Write-Host "      Pasta .next removida"
} else {
    Write-Host "      Pasta .next não encontrada"
}
Write-Host "[OK] Cache limpo"
Write-Host ""

# ETAPA 3: Sincronizar Prisma
Write-Host "[3/4] Sincronizando banco de dados com Prisma..."
npx prisma db push --skip-generate --accept-data-loss *>$null
Write-Host "[OK] Banco de dados sincronizado"
Write-Host ""

# ETAPA 4: Iniciar servidor
Write-Host "[4/4] Iniciando servidor..."
Write-Host ""
Write-Host "======================================================================"
Write-Host "Servidor iniciando em http://localhost:3000"
Write-Host "Pressione Ctrl+C para parar"
Write-Host "======================================================================"
Write-Host ""

Start-Sleep -Seconds 1
npm run dev
