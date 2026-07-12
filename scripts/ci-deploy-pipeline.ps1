#requires -version 5.1
<#
    ci-deploy-pipeline.ps1
    ------------------------------------------------------------------------
    Pipeline de publicacao do CVFacil.NG: envia o repositorio local para o
    GitHub e, em seguida, implanta a imagem resultante na VPS Hostinger
    (Docker Swarm / EasyPanel) via SSH.

    Implementacao independente: as etapas sao definidas como uma lista de
    blocos executados em sequencia por um runner generico, em vez de
    funcoes fixas por fase — facilita adicionar/remover etapas depois.

    Exemplo:
        .\scripts\ci-deploy-pipeline.ps1 -Mensagem "fix: X" `
            -Servico "cvfacil_ng_cvfacil_ng" -RegistryUsuario claudiofxbr
#>

param(
    [string]$Mensagem,
    [switch]$SomenteGit,
    [switch]$SemVps,

    [string]$Repo        = "C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev",
    [string]$RepoGitHub  = "claudiofxbr/CVFacil.NG-00",
    [string]$Branch      = "main",
    [string]$Workflow    = "Build e publica imagem Docker do CVFacil.NG",
    [string]$Imagem      = "ghcr.io/claudiofxbr/cvfacil.ng:latest",

    [string]$VpsHost   = "69.62.87.38",
    [string]$VpsUser   = "root",
    [string]$VpsChave  = "$HOME\.ssh\cvfacil_deploy_key",
    [string]$Servico,

    [string]$RegistryUsuario,
    [string]$RegistryToken = $env:GHCR_TOKEN,

    [int]$TimeoutBuildMin   = 15,
    [int]$TimeoutServicoMin = 5
)

$estado = [ordered]@{ Commit = $null }
$resultados = New-Object System.Collections.Generic.List[object]

function Executar-Etapa {
    param([string]$Nome, [scriptblock]$Acao)

    Write-Host "`n>> $Nome" -ForegroundColor Cyan
    try {
        & $Acao
        $resultados.Add([pscustomobject]@{ Etapa = $Nome; Resultado = "OK" })
        Write-Host "   OK" -ForegroundColor Green
        return $true
    }
    catch {
        $resultados.Add([pscustomobject]@{ Etapa = $Nome; Resultado = "FALHOU: $($_.Exception.Message)" })
        Write-Host "   FALHOU: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Ssh-Vps {
    param([string]$Comando)
    $saida = & ssh -i $VpsChave -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new `
        "$VpsUser@$VpsHost" $Comando 2>&1
    if ($LASTEXITCODE -ne 0) { throw "comando remoto falhou: $Comando`n$($saida -join "`n")" }
    return ($saida -join "`n")
}

# ── Lista de etapas ──────────────────────────────────────────────────────────
$plano = @()

$plano += @{
    Nome = "Validar ferramentas e repositorio"
    Acao = {
        foreach ($t in @("git", "gh", "ssh")) {
            if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { throw "'$t' nao encontrado no PATH." }
        }
        if (-not (Test-Path (Join-Path $Repo ".git"))) { throw "'$Repo' nao tem pasta .git." }
        $origem = git -C $Repo remote get-url origin 2>$null
        if ($origem -notmatch [regex]::Escape($RepoGitHub)) {
            throw "origin de '$Repo' e '$origem', esperado '$RepoGitHub'."
        }
    }
}

if (-not $SomenteGit -and -not $SemVps) {
    # sem restrições adicionais aqui — ambas as fases seguem
}

$plano += @{
    Nome = "Publicar no GitHub (commit + push)"
    Acao = {
        $pendencias = git -C $Repo status --porcelain
        if ($pendencias) {
            if (-not $Mensagem) { throw "ha alteracoes pendentes e nenhum -Mensagem foi informado." }
            git -C $Repo add -A
            if ($LASTEXITCODE -ne 0) { throw "'git add' falhou." }
            git -C $Repo commit -m $Mensagem | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "'git commit' falhou." }
        }
        git -C $Repo push origin $Branch
        if ($LASTEXITCODE -ne 0) { throw "'git push' falhou." }
        $estado.Commit = (git -C $Repo rev-parse HEAD).Trim()
    }
}

if (-not $SomenteGit) {
    $plano += @{
        Nome = "Aguardar build/publicacao da imagem no GitHub Actions"
        Acao = {
            $prazo = (Get-Date).AddMinutes($TimeoutBuildMin)
            $execucaoId = $null
            while (-not $execucaoId -and (Get-Date) -lt $prazo) {
                $lista = gh run list --repo $RepoGitHub --workflow="$Workflow" --branch=$Branch --limit=15 --json databaseId,headSha 2>$null
                if ($lista) {
                    $match = ($lista | ConvertFrom-Json) | Where-Object { $_.headSha -eq $estado.Commit } | Select-Object -First 1
                    if ($match) { $execucaoId = $match.databaseId }
                }
                if (-not $execucaoId) { Start-Sleep -Seconds 6 }
            }
            if (-not $execucaoId) { throw "nenhuma execucao encontrada para o commit $($estado.Commit) em $TimeoutBuildMin min." }

            gh run watch $execucaoId --repo $RepoGitHub --exit-status
            if ($LASTEXITCODE -ne 0) { throw "workflow $execucaoId falhou (gh run view $execucaoId --repo $RepoGitHub --log-failed)." }
        }
    }
}

if (-not $SemVps) {
    $plano += @{
        Nome = "Localizar servico Docker Swarm na VPS"
        Acao = {
            if (-not (Test-Path $VpsChave)) { throw "chave SSH '$VpsChave' nao encontrada." }
            if (-not $Servico) {
                $achados = Ssh-Vps "docker service ls --filter name=cvfacil --format '{{.Name}}'"
                $candidatos = $achados -split "`n" | Where-Object { $_.Trim() -ne "" }
                if ($candidatos.Count -eq 0) { throw "nenhum servico 'cvfacil*' na VPS — crie o App no EasyPanel primeiro." }
                if ($candidatos.Count -gt 1) { throw "mais de um candidato: $($candidatos -join ', '). Use -Servico." }
                $script:Servico = $candidatos[0].Trim()
            }
        }
    }

    $plano += @{
        Nome = "Autenticar no GHCR e atualizar o servico"
        Acao = {
            if (-not $RegistryUsuario -or -not $RegistryToken) {
                throw "informe -RegistryUsuario e -RegistryToken (ou `$env:GHCR_TOKEN)."
            }
            Ssh-Vps "echo '$RegistryToken' | docker login ghcr.io -u $RegistryUsuario --password-stdin" | Out-Null
            Ssh-Vps "docker service update --with-registry-auth --force --image $Imagem $Servico" | Out-Null
        }
    }

    $plano += @{
        Nome = "Aguardar container ficar saudavel"
        Acao = {
            $prazo = (Get-Date).AddMinutes($TimeoutServicoMin)
            $ok = $false
            while (-not $ok -and (Get-Date) -lt $prazo) {
                $estadoServico = Ssh-Vps "docker service ps $Servico --filter 'desired-state=running' --format '{{.CurrentState}}'"
                if ($estadoServico -match "^Running") { $ok = $true; break }
                Start-Sleep -Seconds 5
            }
            if (-not $ok) { throw "container nao ficou 'Running' a tempo (docker service logs $Servico)." }
        }
    }
}

# ── Execução do plano ────────────────────────────────────────────────────────
Write-Host "CVFacil.NG — pipeline de publicacao (" -NoNewline
Write-Host "$($plano.Count) etapas" -NoNewline -ForegroundColor Yellow
Write-Host ")"

$sucesso = $true
foreach ($etapa in $plano) {
    if (-not (Executar-Etapa -Nome $etapa.Nome -Acao $etapa.Acao)) {
        $sucesso = $false
        break
    }
}

Write-Host "`n===== Resumo =====" -ForegroundColor DarkGray
$resultados | Format-Table -AutoSize | Out-String | Write-Host

if ($estado.Commit) { Write-Host "Commit: $($estado.Commit)" -ForegroundColor Gray }

if ($sucesso) {
    Write-Host "Pipeline concluido com sucesso." -ForegroundColor Green
    exit 0
}
else {
    Write-Host "Pipeline interrompido por falha (ver etapa acima)." -ForegroundColor Red
    exit 1
}
