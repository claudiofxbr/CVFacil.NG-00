#requires -version 5.1
<#
    verify-deploy.ps1
    ------------------------------------------------------------------------
    Auditoria de saude do pipeline CVFacil.NG (GitHub + imagem + VPS), a
    qualquer momento -- independente de ter acabado de rodar um deploy.
    Nao publica nada nem altera estado: e so leitura/diagnostico.

    Diferenca em relacao ao health-check embutido no fim de
    deploy-ssh-puro.ps1: aquele so prova que O DEPLOY QUE ACABOU DE RODAR
    ficou de pe. Este aqui responde "o pipeline inteiro esta saudavel AGORA",
    incluindo deriva silenciosa entre deploys (ex.: alguem trocou algo na
    VPS na mao, ou o container caiu e o restart policy o trouxe de volta
    numa versao antiga em cache local).

    Codigo de saida: 0 = tudo OK. 1 = pelo menos uma checagem falhou.

    Exemplo:
        .\scripts\verify-deploy.ps1
        .\scripts\verify-deploy.ps1 -Detalhado
#>

param(
    [string]$Repo       = "C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev",
    [string]$RepoGitHub = "claudiofxbr/CVFacil.NG-00",
    [string]$Branch     = "main",
    [string]$Workflow   = "Build e publica imagem Docker do CVFacil.NG",
    [string]$Imagem     = "ghcr.io/claudiofxbr/cvfacil.ng:latest",

    [string]$VpsHost  = "69.62.87.38",
    [string]$VpsUser  = "root",
    [string]$VpsChave = "$HOME\.ssh\cvfacil_deploy_key",

    [string]$NomeContainer  = "cvfacil-ng",
    [int]$Porta              = 3002,
    [string]$Network         = "cvfacil-net",
    [string]$RedisContainer  = "cvfacil-redis",

    [string]$AppUrl = "https://xavierbr-vps.tech:8443",

    [switch]$Detalhado
)

if (Test-Path variable:PSNativeCommandUseErrorActionPreference) { $PSNativeCommandUseErrorActionPreference = $false }

$resultados = New-Object System.Collections.Generic.List[object]
$falhas = 0

function Checar([string]$nome, [scriptblock]$bloco) {
    try {
        $r = & $bloco
        if ($r -is [hashtable]) {
            $ok = [bool]$r.Ok
            $detalhe = [string]$r.Detalhe
        } else {
            $ok = [bool]$r
            $detalhe = ""
        }
    } catch {
        $ok = $false
        $detalhe = "excecao: $($_.Exception.Message)"
    }
    $status = if ($ok) { "OK" } else { "FALHOU"; $script:falhas++ }
    $cor = if ($ok) { "Green" } else { "Red" }
    Write-Host ("  [{0}] {1}" -f $status, $nome) -ForegroundColor $cor
    if ($detalhe -and ($Detalhado -or -not $ok)) { Write-Host "        $detalhe" -ForegroundColor DarkGray }
    $resultados.Add([pscustomobject]@{ Checagem = $nome; Status = $status; Detalhe = $detalhe })
}

function Ssh-Vps([string]$comando) {
    $saida = & ssh -i $VpsChave -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new `
        "$VpsUser@$VpsHost" $comando 2>&1
    [pscustomobject]@{ Texto = ($saida -join "`n"); Codigo = $LASTEXITCODE }
}

Write-Host "CVFacil.NG — verificacao de saude do pipeline`n" -ForegroundColor White

# ── 1. GitHub: ultima execucao do workflow para o branch ───────────────────
Checar "GitHub Actions: ultima execucao concluida com sucesso" {
    $lista = gh run list --repo $RepoGitHub --workflow="$Workflow" --branch=$Branch --limit=1 `
        --json databaseId,status,conclusion,headSha 2>$null
    if (-not $lista) { return @{ Ok = $false; Detalhe = "nao foi possivel consultar 'gh run list'" } }
    $ultima = ($lista | ConvertFrom-Json)[0]
    $ok = ($ultima.status -eq "completed" -and $ultima.conclusion -eq "success")
    @{ Ok = $ok; Detalhe = "status=$($ultima.status) conclusion=$($ultima.conclusion) sha=$($ultima.headSha)" }
}

# ── 2. Repositorio local em sincronia com o remoto ──────────────────────────
Checar "Repositorio local sincronizado com origin/$Branch" {
    git -C $Repo fetch origin $Branch 2>&1 | Out-Null
    $local  = (git -C $Repo rev-parse HEAD 2>$null).Trim()
    $remoto = (git -C $Repo rev-parse "origin/$Branch" 2>$null).Trim()
    @{ Ok = ($local -eq $remoto -and $local); Detalhe = "local=$local remoto=$remoto" }
}

# ── 3. VPS acessivel via SSH ─────────────────────────────────────────────────
$vpsOk = $false
Checar "VPS acessivel via SSH" {
    $r = Ssh-Vps "echo ping"
    # $script: -- scriptblocks executam em escopo filho; sem o prefixo, a
    # atribuicao criaria uma copia local que desaparece ao sair do bloco,
    # deixando o $vpsOk externo sempre em $false (bug ja visto e corrigido
    # aqui: as checagens 4-7, dependentes da VPS, ficavam puladas em
    # silencio, sem nem aparecer como FALHOU).
    $script:vpsOk = ($r.Codigo -eq 0 -and $r.Texto.Trim() -eq "ping")
    @{ Ok = $script:vpsOk; Detalhe = $r.Texto }
}

if ($vpsOk) {
    # ── 4. Container em execucao, sem crash-loop ────────────────────────────
    Checar "Container '$NomeContainer' em execucao (sem crash-loop)" {
        $status = Ssh-Vps "docker inspect -f '{{.State.Status}}|{{.RestartCount}}|{{.State.StartedAt}}' $NomeContainer"
        if ($status.Codigo -ne 0) { return @{ Ok = $false; Detalhe = "container nao encontrado: $($status.Texto)" } }
        $partes = $status.Texto.Trim() -split '\|'
        $rodando = $partes[0] -eq "running"
        $restarts = 0; [int]::TryParse($partes[1], [ref]$restarts) | Out-Null
        $ok = $rodando -and $restarts -lt 5
        @{ Ok = $ok; Detalhe = "status=$($partes[0]) restartCount=$restarts iniciado=$($partes[2])" }
    }

    # ── 5. Imagem em execucao == imagem mais recente publicada ──────────────
    Checar "Container roda a imagem mais recente publicada (sem deriva)" {
        Ssh-Vps "docker pull $Imagem" | Out-Null
        $digestRemoto = Ssh-Vps "docker inspect --format '{{index .RepoDigests 0}}' $Imagem"
        $imagemContainer = Ssh-Vps "docker inspect --format '{{.Image}}' $NomeContainer"
        $idImagemAtual = Ssh-Vps "docker inspect --format '{{.Id}}' $Imagem"
        $ok = ($imagemContainer.Codigo -eq 0 -and $idImagemAtual.Codigo -eq 0 -and
               $imagemContainer.Texto.Trim() -eq $idImagemAtual.Texto.Trim())
        @{ Ok = $ok; Detalhe = "imagem:latest=$($digestRemoto.Texto.Trim()) container.Image=$($imagemContainer.Texto.Trim().Substring(0,[Math]::Min(19,$imagemContainer.Texto.Trim().Length)))..." }
    }

    # ── 6. Dependencias: rede Docker + Redis ────────────────────────────────
    Checar "Rede Docker '$Network' existe" {
        $r = Ssh-Vps "docker network inspect $Network --format '{{.Name}}'"
        @{ Ok = ($r.Codigo -eq 0); Detalhe = $r.Texto }
    }
    Checar "Redis ('$RedisContainer') em execucao" {
        $r = Ssh-Vps "docker inspect -f '{{.State.Status}}' $RedisContainer"
        @{ Ok = ($r.Codigo -eq 0 -and $r.Texto.Trim() -eq "running"); Detalhe = $r.Texto.Trim() }
    }

    # ── 7. Health check interno (dentro da VPS, bypassa Caddy/DNS/TLS) ──────
    Checar "Health check interno (http://localhost:$Porta)" {
        $r = Ssh-Vps "curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:$Porta/"
        @{ Ok = ($r.Texto.Trim() -eq "200"); Detalhe = "HTTP $($r.Texto.Trim())" }
    }
}

# ── 8. Health check externo + headers de seguranca (caminho real do usuario) ─
Checar "Health check externo ($AppUrl)" {
    try {
        $resp = Invoke-WebRequest -Uri $AppUrl -Method Get -TimeoutSec 15 -ErrorAction Stop
        $csp = $resp.Headers['Content-Security-Policy']
        $hsts = $resp.Headers['Strict-Transport-Security']
        $ok = ($resp.StatusCode -eq 200 -and $csp -and $hsts)
        @{ Ok = $ok; Detalhe = "HTTP $($resp.StatusCode); CSP=$([bool]$csp); HSTS=$([bool]$hsts)" }
    } catch {
        @{ Ok = $false; Detalhe = $_.Exception.Message }
    }
}

# ── 9. Sanidade da API de auth (sem cookie -> deve barrar, nao vazar) ───────
Checar "API /api/auth/me nega acesso sem sessao (401)" {
    try {
        Invoke-WebRequest -Uri "$AppUrl/api/auth/me" -Method Get -TimeoutSec 10 -ErrorAction Stop | Out-Null
        @{ Ok = $false; Detalhe = "respondeu 200 sem cookie de sessao -- deveria ser 401" }
    } catch {
        $codigo = $_.Exception.Response.StatusCode.value__
        @{ Ok = ($codigo -eq 401); Detalhe = "HTTP $codigo" }
    }
}

# ── 10. Assets estaticos do build carregam (build nao esta corrompido) ──────
Checar "Assets estaticos (_next/static) respondem" {
    try {
        $html = (Invoke-WebRequest -Uri $AppUrl -Method Get -TimeoutSec 15 -ErrorAction Stop).Content
        $match = [regex]::Match($html, '/_next/static/[^"''<>\s]+\.(?:css|js)')
        if (-not $match.Success) { return @{ Ok = $false; Detalhe = "nenhuma referencia a /_next/static encontrada no HTML" } }
        $assetUrl = "$AppUrl$($match.Value)"
        $r = Invoke-WebRequest -Uri $assetUrl -Method Get -TimeoutSec 15 -ErrorAction Stop
        @{ Ok = ($r.StatusCode -eq 200); Detalhe = "$($match.Value) -> HTTP $($r.StatusCode)" }
    } catch {
        @{ Ok = $false; Detalhe = $_.Exception.Message }
    }
}

Write-Host "`n===== Resumo =====" -ForegroundColor DarkGray
$resultados | Format-Table Checagem, Status, Detalhe -AutoSize | Out-String | Write-Host

if ($falhas -gt 0) {
    Write-Host "$falhas checagem(ns) falharam." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Pipeline saudavel: todas as checagens passaram." -ForegroundColor Green
    exit 0
}
