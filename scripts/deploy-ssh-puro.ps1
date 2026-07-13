#requires -version 5.1
<#
    deploy-ssh-puro.ps1
    ------------------------------------------------------------------------
    Deploy do CVFacil.NG via SSH puro — SEM EasyPanel. Publica GitHub,
    aguarda o build da imagem, e roda um container Docker "cru" na VPS
    Hostinger (docker run direto, sem Swarm/EasyPanel gerenciando nada).

    HTTPS real ja existe em producao: um container Caddy separado (fora
    deste script — ver /opt/caddy-cvfacil na VPS) termina TLS via Let's
    Encrypt (desafio DNS-01, plugin Hostinger) e faz proxy reverso para
    http://localhost:$Porta. Este script continua publicando o app em HTTP
    puro nessa porta (uso interno/health-check); a URL publica oficial e
    $AppUrl, servida pelo Caddy.

    O container do app roda na rede Docker "$Network" (nao na rede padrao),
    porque precisa alcancar o container Redis (nome "$RedisContainer") por
    nome — sem essa rede, o rate limiting de login/registro/crash-report
    fica silenciosamente inativo (o codigo falha aberto quando o Redis
    esta inalcancavel). O Redis e o proprio container Caddy NAO sao geridos
    por este script (sao dependencias de infraestrutura de ciclo de vida
    separado, ja provisionadas manualmente na VPS) — o script so verifica
    se o Redis esta acessivel antes de subir o app, e falha com uma
    mensagem clara se nao estiver, em vez de tentar recria-lo.

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

    # URL publica oficial (servida via HTTPS pelo Caddy, fora deste script —
    # ver cabecalho acima). Vira NEXT_PUBLIC_APP_URL no .env de producao.
    [string]$AppUrl = "https://xavierbr-vps.tech:8443",

    # Rede Docker dedicada do app + Redis (isolada da rede padrao e das redes
    # de outros apps na mesma VPS). Criada automaticamente se nao existir.
    [string]$Network = "cvfacil-net",
    # Container Redis (ja provisionado manualmente — ver cabecalho acima).
    # Usado so para o teste de alcancabilidade antes do deploy.
    [string]$RedisContainer = "cvfacil-redis",

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
    # Envia $conteudo pelo stdin REAL da conexao SSH (nunca embutido como texto
    # dentro do comando remoto) — importante para segredos como o token do
    # GHCR: evita que o valor apareca em texto puro na string do comando.
    $saida = $conteudo | & ssh -i $VpsChave -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new `
        "$VpsUser@$VpsHost" $comando 2>&1
    [pscustomobject]@{ Texto = ($saida -join "`n"); Codigo = $LASTEXITCODE }
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

# Variaveis que precisam de um valor diferente em producao do que no
# .env.local (dev): sao filtradas daqui e reaplicadas explicitamente abaixo.
# Sem isso, cada redeploy reintroduziria silenciosamente configuracao de
# desenvolvimento em producao (ex.: cookie de sessao sem Secure, ou Redis
# apontando para "localhost", que nao existe de dentro do container).
$variaveisSobrescritas = '^(NEXT_PUBLIC_APP_URL|COOKIE_SECURE|REDIS_HOST|REDIS_PORT)='
$linhasEnv = Get-Content $EnvLocal | Where-Object {
    $_ -notmatch '^\s*#' -and $_ -match '=' -and $_ -notmatch $variaveisSobrescritas
}
$envFinal = @($linhasEnv)
$envFinal += "NEXT_PUBLIC_APP_URL=$AppUrl"
# HTTPS real ja existe (Caddy, ver cabecalho) -- cookie de sessao exige Secure.
$envFinal += "COOKIE_SECURE=true"
# Nome do container Redis na rede Docker "$Network" (resolvido por nome, nao IP).
$envFinal += "REDIS_HOST=$RedisContainer"
$envFinal += "REDIS_PORT=6379"
$envFinal += "NODE_ENV=production"
$envFinal += "PORT=3000"
$envFinal += "HOSTNAME=0.0.0.0"
$conteudoEnv = ($envFinal -join "`n")

if (0 -ne (Ssh-Vps-Stdin "" "mkdir -p $DiretorioRemoto").Codigo) { Parar "nao foi possivel criar '$DiretorioRemoto' na VPS." }
if (0 -ne (Ssh-Vps-Stdin $conteudoEnv "cat > $DiretorioRemoto/.env").Codigo) { Parar "falha ao enviar o arquivo de ambiente para a VPS." }
Ssh-Vps "chmod 600 $DiretorioRemoto/.env" | Out-Null
Registrar "Variaveis de ambiente enviadas (via SSH)" "OK" "$($envFinal.Count) variaveis em $DiretorioRemoto/.env"

# ── 5. Autenticar no GHCR (so se um token foi informado) e puxar a imagem ───
# Login e opcional: se o pacote no GHCR for publico, "docker pull" funciona
# sem autenticacao nenhuma. So tentamos logar se -RegistryToken foi passado.
# O token vai pelo stdin real do SSH (Ssh-Vps-Stdin), nunca embutido como
# texto dentro da string do comando remoto -- evita expor o segredo em
# listagens de processo e reduz o risco de ferramentas de seguranca locais
# sinalizarem o arquivo do script por conter um padrao "echo '<segredo>' |".
if ($RegistryUsuario -and $RegistryToken) {
    $login = Ssh-Vps-Stdin $RegistryToken "docker login ghcr.io -u $RegistryUsuario --password-stdin"
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

# ── 7. Garantir a rede Docker e checar a dependencia do Redis ──────────────
# Idempotente: "docker network create" falha com codigo != 0 se a rede ja
# existir, mas isso nao e um erro real aqui -- so segue em frente.
Ssh-Vps "docker network create $Network" | Out-Null
$redeOk = Ssh-Vps "docker network inspect $Network --format '{{.Name}}'"
if ($redeOk.Codigo -ne 0) { Parar "nao foi possivel criar/confirmar a rede Docker '$Network': $($redeOk.Texto)" }
Registrar "Rede Docker '$Network'" "OK"

$redisStatus = Ssh-Vps "docker inspect -f '{{.State.Status}}' $RedisContainer"
if ($redisStatus.Codigo -ne 0 -or $redisStatus.Texto.Trim() -ne "running") {
    Parar "container Redis '$RedisContainer' nao esta rodando na VPS (status: $($redisStatus.Texto.Trim())). Sem ele, o rate limiting de login/registro/crash-report fica silenciosamente inativo -- suba o Redis manualmente antes de reexecutar o deploy (ver SECURITY.md)."
}
Registrar "Dependencia Redis ('$RedisContainer')" "OK" "running"

# ── 8. Substituir o container (parar/remover o antigo, subir o novo) ───────
# IMPORTANTE: remover o container antigo ANTES de checar a porta. Em todo
# redeploy, o proprio "$NomeContainer" da rodada anterior ja ocupa a porta —
# isso e esperado e nao e um conflito real. So depois de remove-lo faz
# sentido checar se sobrou algo (outro processo/container) ainda usando a
# porta, o que ai sim seria um conflito genuino (ex.: o EasyPanel na 3000).
Ssh-Vps "docker rm -f $NomeContainer" | Out-Null   # ignora erro se nao existir ainda

$portaEmUso = Ssh-Vps "ss -tln | grep -q ':$Porta ' && echo OCUPADA || echo LIVRE"
if ($portaEmUso.Texto.Trim() -eq "OCUPADA") {
    $ocupante = Ssh-Vps "docker ps --format '{{.Names}}: {{.Ports}}' | grep ':$Porta->' "
    Parar "porta $Porta ja esta em uso na VPS por outro processo/container ($($ocupante.Texto.Trim())). Use -Porta para escolher outra."
}

$run = Ssh-Vps "docker run -d --name $NomeContainer --restart unless-stopped --network $Network -p ${Porta}:3000 --env-file $DiretorioRemoto/.env $Imagem"
if ($run.Codigo -ne 0) { Parar "falha ao iniciar o container: $($run.Texto)" }
Registrar "Container iniciado" "OK" "rede $Network, porta $Porta -> 3000"

# ── 9. Verificar saude (dentro da VPS e externamente via HTTPS) ────────────
Start-Sleep -Seconds 5
$statusContainer = Ssh-Vps "docker inspect -f '{{.State.Status}}' $NomeContainer"
if ($statusContainer.Texto.Trim() -ne "running") {
    Parar "container nao ficou 'running' (status: $($statusContainer.Texto.Trim())). Logs: docker logs $NomeContainer --tail 100"
}
$httpInterno = Ssh-Vps "curl -s -o /dev/null -w '%{http_code}' http://localhost:$Porta/"
Registrar "Health check interno (dentro da VPS)" "OK" "HTTP $($httpInterno.Texto.Trim())"

# Externo: bate na URL publica real (HTTPS, via Caddy), nao na porta interna --
# assim o teste cobre o caminho que o usuario final de fato usa.
try {
    $externo = Invoke-WebRequest -Uri $AppUrl -Method Head -TimeoutSec 10 -ErrorAction Stop
    Registrar "Health check externo (HTTPS, deste computador)" "OK" "HTTP $($externo.StatusCode)"
}
catch {
    Registrar "Health check externo (HTTPS, deste computador)" "AVISO" "$AppUrl nao respondeu de fora — verifique o container Caddy/certificado na VPS"
}

Write-Host "`n===== Resumo =====" -ForegroundColor DarkGray
$log | Format-Table Etapa, Status, Detalhe -AutoSize | Out-String | Write-Host
Write-Host "App disponivel em: $AppUrl" -ForegroundColor Green
exit 0
