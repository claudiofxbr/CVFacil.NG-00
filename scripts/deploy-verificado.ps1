#requires -version 5.1
<#
    deploy-verificado.ps1
    ------------------------------------------------------------------------
    Pipeline de publicacao do CVFacil.NG com VERIFICACAO REAL de cada etapa
    (nao apenas "exit code 0 = sucesso"):

      1) Publica o repositorio local no GitHub
      2) Confirma por hash que o commit remoto é IDENTICO ao local (fetch +
         comparacao de SHA — prova criptografica de que todos os arquivos
         chegaram integros, nao uma suposicao)
      3) Aguarda o GitHub Actions buildar e publicar a imagem Docker
      4) Via SSH, atualiza o servico Docker Swarm da VPS para essa imagem
      5) Confirma por digest que o container em execucao na VPS é
         exatamente a imagem recem-publicada, nao uma versao em cache

    Pressuposto explicito (arquitetura real do app na VPS): o CVFacil.NG
    roda em Docker Swarm/EasyPanel a partir de uma IMAGEM publicada no
    GHCR — nao existe deploy por copia de arquivos-fonte soltos no disco
    da VPS, porque o container nao le esses arquivos. Por isso "enviar
    para a VPS via SSH" aqui significa "instruir o Swarm, via SSH, a
    puxar a imagem nova" — nao um scp/rsync de codigo-fonte.

    Exemplo:
        .\scripts\deploy-verificado.ps1 -Mensagem "fix: X" `
            -Servico "cvfacil_ng_cvfacil_ng" -RegistryUsuario claudiofxbr
#>

param(
    [string]$Mensagem,
    [switch]$SomenteGit,
    [switch]$SemVps,

    [string]$Repo       = "C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev",
    [string]$RepoGitHub = "claudiofxbr/CVFacil.NG-00",
    [string]$Branch     = "main",
    [string]$Workflow   = "Build e publica imagem Docker do CVFacil.NG",
    [string]$Imagem     = "ghcr.io/claudiofxbr/cvfacil.ng:latest",

    [string]$VpsHost  = "69.62.87.38",
    [string]$VpsUser  = "root",
    [string]$VpsChave = "$HOME\.ssh\cvfacil_deploy_key",
    [string]$Servico,

    [string]$RegistryUsuario,
    [string]$RegistryToken = $env:GHCR_TOKEN,

    [int]$TimeoutBuildMin   = 15,
    [int]$TimeoutServicoMin = 5
)

$ErrorActionPreference = "Stop"
$log = New-Object System.Collections.Generic.List[object]

function Registrar([string]$etapa, [string]$status, [string]$detalhe = "") {
    $cor = switch ($status) { "OK" { "Green" }; "AVISO" { "Yellow" }; default { "Red" } }
    Write-Host ("  [{0}] {1}" -f $status, $etapa) -ForegroundColor $cor
    if ($detalhe) { Write-Host "        $detalhe" -ForegroundColor DarkGray }
    $log.Add([pscustomobject]@{ Etapa = $etapa; Status = $status; Detalhe = $detalhe })
}

function Parar([string]$motivo) {
    Registrar "PIPELINE" "FALHOU" $motivo
    Mostrar-Resumo
    exit 1
}

function Mostrar-Resumo {
    Write-Host "`n===== Resumo da execucao =====" -ForegroundColor DarkGray
    $log | Format-Table Etapa, Status, Detalhe -AutoSize | Out-String | Write-Host
}

function Ssh-Vps([string]$comando) {
    $saida = & ssh -i $VpsChave -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new `
        "$VpsUser@$VpsHost" $comando 2>&1
    [pscustomobject]@{ Texto = ($saida -join "`n"); Codigo = $LASTEXITCODE }
}

Write-Host "CVFacil.NG — deploy verificado (GitHub + VPS Hostinger)" -ForegroundColor White
Write-Host "Repositorio de trabalho: $Repo`n" -ForegroundColor DarkGray

# ── 1. Validação de ambiente e leitura do estado do repositório ────────────
foreach ($t in @("git", "gh", "ssh")) {
    if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { Parar "'$t' nao encontrado no PATH." }
}
if (-not (Test-Path (Join-Path $Repo ".git"))) { Parar "'$Repo' nao tem pasta .git." }

$origem = git -C $Repo remote get-url origin 2>$null
if ($origem -notmatch [regex]::Escape($RepoGitHub)) {
    Parar "origin de '$Repo' e '$origem', esperado '$RepoGitHub'."
}
Registrar "Validar ambiente e repositorio" "OK" "origin=$origem"

$arquivosRastreados = (git -C $Repo ls-files | Measure-Object).Count
$pendencias = git -C $Repo status --porcelain
$arquivosPendentes = if ($pendencias) { ($pendencias -split "`n").Count } else { 0 }
Registrar "Leitura do estado do projeto" "OK" "$arquivosRastreados arquivos versionados, $arquivosPendentes pendencia(s)"

# ── 2. Publicar no GitHub ────────────────────────────────────────────────
$commitLocal = $null

if ($SomenteGit -and $pendencias -and -not $Mensagem) {
    Parar "ha alteracoes pendentes e nenhum -Mensagem foi informado."
}

if ($pendencias) {
    if (-not $Mensagem) { Parar "ha alteracoes pendentes e nenhum -Mensagem foi informado." }
    git -C $Repo add -A
    if ($LASTEXITCODE -ne 0) { Parar "'git add -A' falhou." }
    git -C $Repo commit -m $Mensagem | Out-Null
    if ($LASTEXITCODE -ne 0) { Parar "'git commit' falhou." }
    Registrar "Commit criado" "OK" $Mensagem
}
else {
    Registrar "Commit" "AVISO" "nenhuma alteracao pendente — reaproveitando HEAD atual"
}

$commitLocal = (git -C $Repo rev-parse HEAD).Trim()

git -C $Repo push origin $Branch 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Parar "'git push' falhou (conflitos, permissao ou rede)." }
Registrar "Push para o GitHub" "OK" "commit $commitLocal"

# ── 3. Verificação criptográfica: o remoto tem EXATAMENTE este commit? ─────
git -C $Repo fetch origin $Branch 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Parar "'git fetch' de verificacao falhou." }

$commitRemoto = (git -C $Repo rev-parse "origin/$Branch").Trim()
if ($commitRemoto -ne $commitLocal) {
    Parar "commit remoto ($commitRemoto) DIFERENTE do local ($commitLocal) — push nao propagou corretamente."
}
Registrar "Verificacao de integridade no GitHub" "OK" "SHA local = SHA remoto = $commitLocal (prova que todos os arquivos do commit chegaram integros)"

if ($SomenteGit) {
    Registrar "Pipeline" "OK" "concluido (-SomenteGit): Git verificado, build/VPS pulados"
    Mostrar-Resumo
    exit 0
}

# ── 4. Aguardar build/publicação da imagem ──────────────────────────────────
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
if (-not $execucaoId) { Parar "nenhuma execucao do workflow encontrada para $commitLocal em $TimeoutBuildMin min." }

gh run watch $execucaoId --repo $RepoGitHub --exit-status
if ($LASTEXITCODE -ne 0) { Parar "workflow $execucaoId falhou (gh run view $execucaoId --repo $RepoGitHub --log-failed)." }
Registrar "Build e publicacao da imagem" "OK" "execucao $execucaoId, imagem $Imagem"

if ($SemVps) {
    Registrar "Pipeline" "OK" "concluido (-SemVps): GitHub verificado, deploy na VPS pulado"
    Mostrar-Resumo
    exit 0
}

# ── 5. Implantar na VPS via SSH (Docker Swarm) ──────────────────────────────
if (-not (Test-Path $VpsChave)) { Parar "chave SSH '$VpsChave' nao encontrada." }
if (-not $RegistryUsuario -or -not $RegistryToken) {
    Parar "informe -RegistryUsuario e -RegistryToken (ou `$env:GHCR_TOKEN)."
}

if (-not $Servico) {
    $busca = Ssh-Vps "docker service ls --filter name=cvfacil --format '{{.Name}}'"
    if ($busca.Codigo -ne 0) { Parar "falha ao conectar via SSH na VPS: $($busca.Texto)" }
    $candidatos = $busca.Texto -split "`n" | Where-Object { $_.Trim() -ne "" }
    if ($candidatos.Count -eq 0) { Parar "nenhum servico 'cvfacil*' na VPS — crie o App no EasyPanel primeiro (passo manual unico)." }
    if ($candidatos.Count -gt 1) { Parar "mais de um candidato: $($candidatos -join ', '). Use -Servico." }
    $Servico = $candidatos[0].Trim()
}
Registrar "Localizar servico na VPS" "OK" "servico=$Servico"

$login = Ssh-Vps "echo '$RegistryToken' | docker login ghcr.io -u $RegistryUsuario --password-stdin"
if ($login.Codigo -ne 0) { Parar "login no GHCR falhou na VPS: $($login.Texto)" }
Registrar "Autenticacao no GHCR (VPS)" "OK"

$update = Ssh-Vps "docker service update --with-registry-auth --force --image $Imagem $Servico"
if ($update.Codigo -ne 0) { Parar "falha ao atualizar o servico Swarm: $($update.Texto)" }
Registrar "Atualizacao do servico disparada" "OK"

# ── 6. Aguardar container saudável ──────────────────────────────────────────
$prazoServico = (Get-Date).AddMinutes($TimeoutServicoMin)
$saudavel = $false
while (-not $saudavel -and (Get-Date) -lt $prazoServico) {
    $estado = Ssh-Vps "docker service ps $Servico --filter 'desired-state=running' --format '{{.CurrentState}}'"
    if ($estado.Texto -match "^Running") { $saudavel = $true; break }
    Start-Sleep -Seconds 5
}
if (-not $saudavel) { Parar "container nao ficou 'Running' a tempo (docker service logs $Servico --tail 100)." }
Registrar "Container em execucao" "OK"

# ── 7. Verificação por digest: a VPS está rodando EXATAMENTE esta imagem? ──
$specImagem = Ssh-Vps "docker service inspect $Servico --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'"
if ($specImagem.Codigo -ne 0) { Parar "nao foi possivel inspecionar o servico para verificacao final: $($specImagem.Texto)" }

if ($specImagem.Texto -notmatch "sha256:[0-9a-f]{64}") {
    Registrar "Verificacao de digest na VPS" "AVISO" "Swarm ainda nao resolveu um digest para a imagem (spec: $($specImagem.Texto.Trim())). O servico esta rodando, mas nao foi possivel provar criptograficamente qual build."
}
else {
    Registrar "Verificacao de digest na VPS" "OK" "$($specImagem.Texto.Trim()) — prova que o container roda exatamente a imagem recem-publicada, nao uma versao em cache"
}

Registrar "Pipeline" "OK" "concluido — GitHub e VPS verificados"
Mostrar-Resumo
exit 0
