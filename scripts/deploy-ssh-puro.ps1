#requires -version 5.1
<#
    deploy-ssh-puro.ps1
    ------------------------------------------------------------------------
    Deploy do CVFacil.NG via SSH puro — SEM EasyPanel. Publica GitHub,
    aguarda o build da imagem, e roda um container Docker "cru" na VPS
    Hostinger (docker run direto, sem Swarm/EasyPanel gerenciando nada).

    Pressuposto explicito: sem EasyPanel/Traefik, nao ha HTTPS automatico.
    O app fica acessivel em http://<VpsHost>:<Porta> (e http://cvfacil.ng:<Porta>
    depois que o DNS apontar para a VPS). TLS ficaria por conta de um passo
    futuro separado (ex.: Caddy/nginx+certbot) — fora do escopo pedido aqui.

    Exemplo:
        .\scripts\deploy-ssh-puro.ps1 -Mensagem "fix: X" -RegistryUsuario claudiofxbr
#>

param(
    [string]$Mensagem,
    [switch]$SomenteGit,
    [switch]$SemDeploy,

    [string]$Repo       = "C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev",
    [string]$RepoGitHub = "claudiofxbr/CVFacil.NG-00",
    [string]$Branch     = "main",
    [string]$Workflow   = "Build e publica imagem Docker do CVFacil.NG",
    [string]$Imagem     = "ghcr.io/claudiofxbr/cvfacil.ng:latest",

    [string]$VpsHost   = "69.62.87.38",
    [string]$VpsUser   = "root",
    [string]$VpsChave  = "$HOME\.ssh\cvfacil_deploy_key",
    [string]$DiretorioRemoto = "/opt/cvfacil-ng",
    [string]$NomeContainer   = "cvfacil-ng",
    # 3000 e usado pelo proprio painel do EasyPanel nesta VPS (confirmado via
    # "ss -tlnp") -- nao usar. 3002 esta livre e e o padrao aqui.
    [int]$Porta = 3002,

    [string]$RegistryUsuario,
    [string]$RegistryToken = $env:GHCR_TOKEN,
    [string]$EnvLocal = "$PSScriptRoot\..\.env.local",

    [int]$TimeoutBuildMin = 15
)

if (Test-Path variable:PSNativeCommandUseErrorActionPreference) { $PSNativeCommandUseErrorActionPreference = $false }
$log = New-Object System.Collections.Generic.List[object]

function Registrar([string]$etapa, [string]$status, [string]$detalhe = "") {
    $cor = switch ($status) { "OK" { "Green" }; "AVISO" { "Yellow" }; default { "Red" } }
    Write-Host ("  [{0}] {1}" -f $status, $etapa) -ForegroundColor $cor
    if ($detalhe) { Write-Host "        $detalhe" -ForegroundColor DarkGray }
    $log.Add([pscustomobject]@{ Etapa = $etapa; Status = $status; Detalhe = $detalhe })
}
function Parar([string]$motivo) {
    Registrar "PIPELINE" "FALHOU" $motivo
    Write-Host "`n===== Resumo =====" -ForegroundColor DarkGray
    $log | Format-Table Etapa, Status, Detalhe -AutoSize | Out-String | Write-Host
    exit 1
}
function Ssh-Vps([string]$comando) {
    $saida = & ssh -i $VpsChave -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new `
        "$VpsUser@$VpsHost" $comando 2>&1
    [pscustomobject]@{ Texto = ($saida -join "`n"); Codigo = $LASTEXITCODE }
}
function Ssh-Vps-Stdin([string]$conteudo, [string]$comando) {
    $conteudo | & ssh -i $VpsChave -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new `
        "$VpsUser@$VpsHost" $comando 2>&1 | Out-Null
    return $LASTEXITCODE
}

Write-Host "CVFacil.NG — deploy via SSH puro (sem EasyPanel)" -ForegroundColor White
Write-Host "Container: $NomeContainer  |  Porta: $Porta  |  VPS: $VpsHost`n" -ForegroundColor DarkGray

# ── 1. Validar ambiente e repositorio ────────────────────────────────────────
foreach ($t in @("git", "gh", "ssh")) {
    if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { Parar "'$t' nao encontrado no PATH." }
}
if (-not (Test-Path (Join-Path $Repo ".git"))) { Parar "'$Repo' nao tem pasta .git." }
$origem = git -C $Repo remote get-url origin 2>$null
if ($origem -notmatch [regex]::Escape($RepoGitHub)) { Parar "origin '$origem' nao corresponde a '$RepoGitHub'." }
Registrar "Validar ambiente e repositorio" "OK" "origin=$origem"

# ── 2. Publicar no GitHub + verificar integridade ───────────────────────────
$pendencias = git -C $Repo status --porcelain
if ($pendencias) {
    if (-not $Mensagem) { Parar "ha alteracoes pendentes e nenhum -Mensagem foi informado." }
    git -C $Repo add -A
    git -C $Repo commit -m $Mensagem | Out-Null
    if ($LASTEXITCODE -ne 0) { Parar "'git commit' falhou." }
    Registrar "Commit criado" "OK" $Mensagem
}
else {
    Registrar "Commit" "AVISO" "nenhuma alteracao pendente"
}
$commitLocal = (git -C $Repo rev-parse HEAD).Trim()
git -C $Repo push origin $Branch | Out-Null
if ($LASTEXITCODE -ne 0) { Parar "'git push' falhou." }

git -C $Repo fetch origin $Branch | Out-Null
$commitRemoto = (git -C $Repo rev-parse "origin/$Branch").Trim()
if ($commitRemoto -ne $commitLocal) { Parar "commit remoto ($commitRemoto) difere do local ($commitLocal)." }
Registrar "Push + verificacao de integridade" "OK" "SHA=$commitLocal"

if ($SomenteGit) {
    Registrar "Pipeline" "OK" "concluido (-SomenteGit)"
    Write-Host "`n===== Resumo =====" -ForegroundColor DarkGray
    $log | Format-Table Etapa, Status, Detalhe -AutoSize | Out-String | Write-Host
    exit 0
}

# ── 3. Aguardar build/publicacao da imagem ──────────────────────────────────
$prazo = (Get-Date).AddMinutes($TimeoutBuildMin)
$execucaoId = $null
while (-not $execucaoId -and (Get-Date) -lt $prazo) {
    $lista = gh run list --repo $RepoGitHub --workflow="$Workflow" --branch=$Branch --limit=15 --json databaseId,headSha 2>$null
    if ($lista) {
        $match = ($lista | ConvertFrom-Json) | Where-Object { $_.headSha -eq $commitLocal } | Select-Object -First 1
        if ($match) { $execucaoId = $match.databaseId }
    }
    if (-not $execucaoId) { Start-Sleep -Seconds 6 }
}
if (-not $execucaoId) { Parar "nenhuma execucao encontrada para $commitLocal em $TimeoutBuildMin min." }
gh run watch $execucaoId --repo $RepoGitHub --exit-status
if ($LASTEXITCODE -ne 0) { Parar "workflow $execucaoId falhou." }
Registrar "Build e publicacao da imagem" "OK" "execucao $execucaoId"

if ($SemDeploy) {
    Registrar "Pipeline" "OK" "concluido (-SemDeploy)"
    Write-Host "`n===== Resumo =====" -ForegroundColor DarkGray
    $log | Format-Table Etapa, Status, Detalhe -AutoSize | Out-String | Write-Host
    exit 0
}

# ── 4. Preparar variaveis de ambiente e enviar para a VPS (via SSH, sem tocar disco local) ─
if (-not (Test-Path $EnvLocal)) { Parar "'$EnvLocal' nao encontrado — necessario como origem das variaveis de ambiente." }
if (-not (Test-Path $VpsChave)) { Parar "chave SSH '$VpsChave' nao encontrada." }

$linhasEnv = Get-Content $EnvLocal | Where-Object {
    $_ -notmatch '^\s*#' -and $_ -match '=' -and $_ -notmatch '^NEXT_PUBLIC_APP_URL='
}
$envFinal = @($linhasEnv)
$envFinal += "NEXT_PUBLIC_APP_URL=http://$VpsHost`:$Porta"
$envFinal += "NODE_ENV=production"
$envFinal += "PORT=3000"
$envFinal += "HOSTNAME=0.0.0.0"
$conteudoEnv = ($envFinal -join "`n")

if (0 -ne (Ssh-Vps-Stdin "" "mkdir -p $DiretorioRemoto")) { Parar "nao foi possivel criar '$DiretorioRemoto' na VPS." }
if (0 -ne (Ssh-Vps-Stdin $conteudoEnv "cat > $DiretorioRemoto/.env")) { Parar "falha ao enviar o arquivo de ambiente para a VPS." }
Ssh-Vps "chmod 600 $DiretorioRemoto/.env" | Out-Null
Registrar "Variaveis de ambiente enviadas (via SSH)" "OK" "$($envFinal.Count) variaveis em $DiretorioRemoto/.env"

# ── 5. Autenticar no GHCR (so se um token foi informado) e puxar a imagem ───
# Login e opcional: se o pacote no GHCR for publico, "docker pull" funciona
# sem autenticacao nenhuma. So tentamos logar se -RegistryToken foi passado.
if ($RegistryUsuario -and $RegistryToken) {
    $login = Ssh-Vps "echo '$RegistryToken' | docker login ghcr.io -u $RegistryUsuario --password-stdin"
    if ($login.Codigo -ne 0) { Parar "login no GHCR falhou: $($login.Texto)" }
    Registrar "Login no GHCR (VPS)" "OK"
}
else {
    # Limpa qualquer credencial em cache de tentativas anteriores: se um login
    # antigo (ex.: com token invalido) ficou salvo em ~/.docker/config.json na
    # VPS, o Docker usa essa credencial automaticamente em vez de tentar pull
    # anonimo — mesmo que o pacote seja publico, resultando em "denied".
    Ssh-Vps "docker logout ghcr.io" | Out-Null
    Registrar "Login no GHCR (VPS)" "AVISO" "pulado (sem token) — credenciais antigas limpas, assume que o pacote e publico"
}

$pull = Ssh-Vps "docker pull $Imagem"
if ($pull.Codigo -ne 0) {
    Parar "docker pull falhou: $($pull.Texto) — se o pacote ainda estiver privado, informe -RegistryUsuario e -RegistryToken."
}
Registrar "Imagem baixada na VPS" "OK" "$Imagem"

# ── 6. Rodar migrations (Prisma) contra o Neon, a partir da propria imagem ──
# Retry com backoff: bancos serverless (Neon) podem estar suspensos e levar
# alguns segundos para "acordar" na primeira conexao, causando um P1001
# transitorio que desaparece na tentativa seguinte.
$migrar = $null
$tentativasMigracao = 3
for ($i = 1; $i -le $tentativasMigracao; $i++) {
    $migrar = Ssh-Vps "docker run --rm --env-file $DiretorioRemoto/.env $Imagem npx prisma@5.21.0 migrate deploy"
    if ($migrar.Codigo -eq 0) { break }
    if ($i -lt $tentativasMigracao) {
        Registrar "Migrations (tentativa $i/$tentativasMigracao)" "AVISO" "falhou, tentando de novo em 10s (possivel cold-start do banco)"
        Start-Sleep -Seconds 10
    }
}
if ($migrar.Codigo -ne 0) { Parar "migrations falharam apos $tentativasMigracao tentativas: $($migrar.Texto)" }
Registrar "Migrations aplicadas no Neon" "OK"

# ── 7. Substituir o container (parar/remover o antigo, subir o novo) ───────
# Confere se a porta ja esta em uso por outra coisa (ex.: o proprio EasyPanel
# ocupa a 3000 nesta VPS) ANTES de tentar subir, e falha com mensagem clara
# em vez do erro generico do Docker ("port is already allocated").
$portaEmUso = Ssh-Vps "ss -tln | grep -q ':$Porta ' && echo OCUPADA || echo LIVRE"
if ($portaEmUso.Texto.Trim() -eq "OCUPADA") {
    $ocupante = Ssh-Vps "docker ps --format '{{.Names}}: {{.Ports}}' | grep ':$Porta->' "
    Parar "porta $Porta ja esta em uso na VPS por outro processo/container ($($ocupante.Texto.Trim())). Use -Porta para escolher outra."
}

Ssh-Vps "docker rm -f $NomeContainer" | Out-Null   # ignora erro se nao existir ainda
$run = Ssh-Vps "docker run -d --name $NomeContainer --restart unless-stopped -p ${Porta}:3000 --env-file $DiretorioRemoto/.env $Imagem"
if ($run.Codigo -ne 0) { Parar "falha ao iniciar o container: $($run.Texto)" }
Registrar "Container iniciado" "OK" "porta $Porta -> 3000"

# ── 8. Verificar saude (dentro da VPS e externamente) ───────────────────────
Start-Sleep -Seconds 5
$statusContainer = Ssh-Vps "docker inspect -f '{{.State.Status}}' $NomeContainer"
if ($statusContainer.Texto.Trim() -ne "running") {
    Parar "container nao ficou 'running' (status: $($statusContainer.Texto.Trim())). Logs: docker logs $NomeContainer --tail 100"
}
$httpInterno = Ssh-Vps "curl -s -o /dev/null -w '%{http_code}' http://localhost:$Porta/"
Registrar "Health check interno (dentro da VPS)" "OK" "HTTP $($httpInterno.Texto.Trim())"

try {
    $externo = Invoke-WebRequest -Uri "http://${VpsHost}:${Porta}/" -Method Head -TimeoutSec 10 -ErrorAction Stop
    Registrar "Health check externo (deste computador)" "OK" "HTTP $($externo.StatusCode)"
}
catch {
    Registrar "Health check externo (deste computador)" "AVISO" "nao respondeu de fora — verifique firewall/porta $Porta liberada na VPS"
}

Write-Host "`n===== Resumo =====" -ForegroundColor DarkGray
$log | Format-Table Etapa, Status, Detalhe -AutoSize | Out-String | Write-Host
Write-Host "App disponivel em: http://${VpsHost}:${Porta}" -ForegroundColor Green
exit 0
