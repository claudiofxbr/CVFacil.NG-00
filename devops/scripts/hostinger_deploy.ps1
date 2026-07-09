# =================================================================
# SCRIPT DE GERENCIAMENTO DE DEPLOY - PortalCursos.NG (CORRIGIDO)
# =================================================================

$VpsIp = Read-Host "Digite o IP da sua VPS Hostinger"
$VpsUser = "root"

Write-Host "Iniciando processo de deploy remoto..." -ForegroundColor Cyan

# 1. Enviar o script Linux para a VPS usando SCP
Write-Host "Enviando script de automacao para o servidor..." -ForegroundColor Yellow
# Usando aspas simples para evitar problemas de parsing no Windows
scp "devops/scripts/hostinger_deploy.sh" "${VpsUser}@${VpsIp}:/tmp/hostinger_deploy.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao enviar o arquivo. Verifique o IP e seu acesso SSH." -ForegroundColor Red
    exit
}

# 2. Executar o script remotamente via SSH (Sintaxe compativel com PS 5.1)
Write-Host "Executando configuracao no servidor Linux..." -ForegroundColor Yellow
$remoteCmd = "chmod +x /tmp/hostinger_deploy.sh; /tmp/hostinger_deploy.sh"
ssh "${VpsUser}@${VpsIp}" $remoteCmd

Write-Host "Processo concluido! Verifique as mensagens acima." -ForegroundColor Green
