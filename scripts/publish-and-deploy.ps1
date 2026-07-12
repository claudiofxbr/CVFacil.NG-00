#requires -version 5.1
<#
    publish-and-deploy.ps1
    ------------------------------------------------------------------------
    Publica o repositorio local do CVFacil.NG no GitHub e, em seguida,
    implanta a imagem resultante na VPS Hostinger (Docker Swarm / EasyPanel)
    via SSH.

    Escrito especificamente para o diretorio de trabalho:
        C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev

    Uso basico:
        .\publish-and-deploy.ps1 -Message "fix: ajusta checkout" `
            -SwarmService "cvfacil_ng_cvfacil_ng" -RegistryUser claudiofxbr

    Uso sem novo commit (reimplanta a ultima imagem ja publicada):
        .\publish-and-deploy.ps1 -PularGit -SwarmService "..." -RegistryUser claudiofxbr
#>

param(
    [Parameter(HelpMessage = "Mensagem do commit. Obrigatoria se houver alteracoes pendentes.")]
    [string]$Message,

    [switch]$PularGit,
    [switch]$PularVps,

    [string]$RepoPath   = "C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev",
    [string]$RepoBranch = "main",
    [string]$RepoOrigemEsperada = "claudiofxbr/CVFacil.NG-00",

    [string]$NomeWorkflow = "Build e publica imagem Docker do CVFacil.NG",
    [string]$Imagem       = "ghcr.io/claudiofxbr/cvfacil.ng:latest",

    [string]$VpsIp     = "69.62.87.38",
    [string]$VpsUser   = "root",
    [string]$ChaveSsh  = "$HOME\.ssh\cvfacil_deploy_key",
    [string]$SwarmService,

    [string]$RegistryUser,
    [string]$RegistryToken = $env:GHCR_TOKEN,

    [int]$MinutosLimiteBuild = 15,
    [int]$MinutosLimiteServico = 5
)

# ────────────────────────────────────────────────────────────────────────
# Utilitarios de saida
# ────────────────────────────────────────────────────────────────────────
function Banner([string]$texto) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
    Write-Host " $texto" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
}
function Info([string]$texto)  { Write-Host "  > $texto" -ForegroundColor Gray }
function Sucesso([string]$texto) { Write-Host "  [OK] $texto" -ForegroundColor Green }
function Atencao([string]$texto) { Write-Host "  [ATENCAO] $texto" -ForegroundColor Yellow }

# Qualquer 'throw' abaixo é capturado no bloco try/catch no final do arquivo,
# que imprime o erro de forma legível e encerra com código de saída 1.

# ────────────────────────────────────────────────────────────────────────
# Etapa 1 — validar o diretório de trabalho
# ────────────────────────────────────────────────────────────────────────
function Validar-Repositorio {
    Banner "Etapa 1/4 — Validando o repositorio local"

    if (-not (Test-Path $RepoPath)) {
        throw "Diretorio '$RepoPath' nao existe nesta maquina."
    }
    if (-not (Test-Path (Join-Path $RepoPath ".git"))) {
        throw "'$RepoPath' nao tem uma pasta .git — nao e um repositorio Git."
    }

    $origem = git -C $RepoPath remote get-url origin 2>$null
    if (-not $origem -or $origem -notmatch [regex]::Escape($RepoOrigemEsperada)) {
        throw "O 'origin' de '$RepoPath' e '$origem', que nao corresponde a '$RepoOrigemEsperada'. Abortando por seguranca."
    }
    Info "Repositorio: $RepoPath"
    Info "Origin: $origem"

    $branchAtual = git -C $RepoPath rev-parse --abbrev-ref HEAD 2>$null
    if ($branchAtual -ne $RepoBranch) {
        Atencao "Branch atual e '$branchAtual', esperado '$RepoBranch'. Trocando..."
        git -C $RepoPath checkout $RepoBranch 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel trocar para a branch '$RepoBranch'." }
    }
    Sucesso "Repositorio validado na branch '$RepoBranch'"
}

# ────────────────────────────────────────────────────────────────────────
# Etapa 2 — publicar no GitHub
# ────────────────────────────────────────────────────────────────────────
function Publicar-NoGitHub {
    Banner "Etapa 2/4 — Publicando no GitHub"

    $alteracoes = git -C $RepoPath status --porcelain
    if ($alteracoes) {
        Info "Alteracoes detectadas:"
        $alteracoes -split "`n" | ForEach-Object { Info "  $_" }

        if (-not $Message) {
            throw "Ha alteracoes pendentes mas nenhum -Message foi informado. Passe -Message 'texto' ou faca o commit manualmente."
        }

        git -C $RepoPath add -A
        if ($LASTEXITCODE -ne 0) { throw "'git add -A' falhou." }

        git -C $RepoPath commit -m $Message
        if ($LASTEXITCODE -ne 0) { throw "'git commit' falhou." }
        Sucesso "Commit criado: $Message"
    }
    else {
        Info "Nenhuma alteracao pendente — reaproveitando o HEAD atual"
    }

    git -C $RepoPath push origin $RepoBranch
    if ($LASTEXITCODE -ne 0) { throw "'git push' falhou. Verifique conflitos, permissoes ou rede." }

    $script:CommitAtual = (git -C $RepoPath rev-parse HEAD).Trim()
    Sucesso "Push concluido. Commit: $script:CommitAtual"
}

# ────────────────────────────────────────────────────────────────────────
# Etapa 3 — esperar o build/publicação da imagem no GitHub Actions
# ────────────────────────────────────────────────────────────────────────
function Esperar-BuildDaImagem {
    Banner "Etapa 3/4 — Aguardando build da imagem Docker (GitHub Actions)"

    $limite = (Get-Date).AddMinutes($MinutosLimiteBuild)
    $execucaoId = $null

    while (-not $execucaoId -and (Get-Date) -lt $limite) {
        $lista = gh run list --repo $RepoOrigemEsperada --workflow="$NomeWorkflow" --branch=$RepoBranch --limit=15 --json databaseId,headSha 2>$null
        if ($lista) {
            $execucao = ($lista | ConvertFrom-Json) | Where-Object { $_.headSha -eq $script:CommitAtual } | Select-Object -First 1
            if ($execucao) { $execucaoId = $execucao.databaseId }
        }
        if (-not $execucaoId) {
            Info "Aguardando o GitHub registrar a execucao do workflow..."
            Start-Sleep -Seconds 6
        }
    }

    if (-not $execucaoId) {
        throw "Nenhuma execucao do workflow '$NomeWorkflow' foi encontrada para o commit $script:CommitAtual em $MinutosLimiteBuild minutos."
    }
    Info "Execucao localizada: $execucaoId — acompanhando..."

    $tempoRestante = [int](($limite - (Get-Date)).TotalSeconds)
    if ($tempoRestante -lt 30) { $tempoRestante = 30 }

    $processo = Start-Process -FilePath "gh" `
        -ArgumentList @("run", "watch", "$execucaoId", "--repo", $RepoOrigemEsperada, "--exit-status") `
        -NoNewWindow -PassThru -Wait

    if ($processo.ExitCode -ne 0) {
        throw "O workflow falhou (execucao $execucaoId). Veja: gh run view $execucaoId --repo $RepoOrigemEsperada --log-failed"
    }
    Sucesso "Imagem publicada com sucesso em $Imagem"
}

# ────────────────────────────────────────────────────────────────────────
# Etapa 4 — implantar na VPS via SSH
# ────────────────────────────────────────────────────────────────────────
function Executar-Ssh([string]$comandoRemoto) {
    $saida = & ssh -i $ChaveSsh -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new `
        "$VpsUser@$VpsIp" $comandoRemoto 2>&1
    [pscustomobject]@{ Texto = ($saida -join "`n"); Codigo = $LASTEXITCODE }
}

function Implantar-NaVps {
    Banner "Etapa 4/4 — Implantando na VPS Hostinger via SSH ($VpsIp)"

    if (-not (Test-Path $ChaveSsh)) {
        throw "Chave SSH nao encontrada em '$ChaveSsh'."
    }
    if (-not $RegistryUser -or -not $RegistryToken) {
        throw "Informe -RegistryUser e -RegistryToken (ou defina `$env:GHCR_TOKEN) — necessarios para autenticar o pull da imagem privada no GHCR."
    }

    $servico = $SwarmService
    if (-not $servico) {
        Info "Nome do servico nao informado — tentando localizar automaticamente..."
        $busca = Executar-Ssh "docker service ls --filter name=cvfacil --format '{{.Name}}'"
        if ($busca.Codigo -ne 0) { throw "Falha ao conectar via SSH na VPS: $($busca.Texto)" }

        $candidatos = $busca.Texto -split "`n" | Where-Object { $_.Trim() -ne "" }
        if ($candidatos.Count -eq 0) {
            throw "Nenhum servico Docker Swarm com 'cvfacil' no nome foi encontrado. O app 'cvfacil_ng' provavelmente ainda nao foi criado no EasyPanel (passo manual, feito uma vez na UI: criar o App apontando para $Imagem, com credencial de registry e dominio configurados)."
        }
        if ($candidatos.Count -gt 1) {
            throw "Mais de um servico candidato: $($candidatos -join ', '). Informe -SwarmService explicitamente."
        }
        $servico = $candidatos[0].Trim()
    }
    Info "Servico alvo: $servico"

    Info "Autenticando no GHCR na VPS..."
    $login = Executar-Ssh "echo '$RegistryToken' | docker login ghcr.io -u $RegistryUser --password-stdin"
    if ($login.Codigo -ne 0) { throw "Login no GHCR falhou na VPS: $($login.Texto)" }
    Sucesso "Login no GHCR realizado"

    Info "Forcando atualizacao do servico para a imagem nova..."
    $update = Executar-Ssh "docker service update --with-registry-auth --force --image $Imagem $servico"
    if ($update.Codigo -ne 0) { throw "Falha ao atualizar o servico Swarm: $($update.Texto)" }
    Sucesso "Atualizacao disparada"

    Info "Aguardando o novo container ficar saudavel (limite $MinutosLimiteServico min)..."
    $limite = (Get-Date).AddMinutes($MinutosLimiteServico)
    $saudavel = $false
    while (-not $saudavel -and (Get-Date) -lt $limite) {
        $status = Executar-Ssh "docker service ps $servico --filter 'desired-state=running' --format '{{.CurrentState}}' | Select-String -Pattern '^Running' -Quiet 2>/dev/null; docker service ps $servico --filter 'desired-state=running' --format '{{.CurrentState}}' | head -1"
        if ($status.Texto -match "^Running") { $saudavel = $true; break }
        Start-Sleep -Seconds 5
    }

    if (-not $saudavel) {
        throw "O container nao ficou 'Running' a tempo. Verifique manualmente: ssh $VpsUser@$VpsIp `"docker service logs $servico --tail 100`""
    }
    Sucesso "Novo container rodando na VPS"
}

# ────────────────────────────────────────────────────────────────────────
# Execução principal
# ────────────────────────────────────────────────────────────────────────
try {
    Banner "CVFacil.NG — Publicacao GitHub + Deploy VPS Hostinger"

    Validar-Repositorio

    if ($PularGit) {
        Atencao "Etapa de Git pulada (-PularGit). Usando HEAD atual."
        $script:CommitAtual = (git -C $RepoPath rev-parse HEAD).Trim()
        Info "Commit atual: $script:CommitAtual"
    }
    else {
        Publicar-NoGitHub
        Esperar-BuildDaImagem
    }

    if ($PularVps) {
        Atencao "Etapa de deploy na VPS pulada (-PularVps)."
    }
    else {
        Implantar-NaVps
    }

    Banner "Concluido com sucesso"
    Info "Commit publicado: $script:CommitAtual"
    Info "Imagem: $Imagem"
    if (-not $PularVps) { Info "VPS: $VpsIp — servico atualizado e saudavel" }
    exit 0
}
catch {
    Write-Host ""
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pipeline interrompido nesta etapa. Nenhum passo seguinte foi executado." -ForegroundColor Red
    exit 1
}
