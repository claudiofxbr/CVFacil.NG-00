# 🔧 Redis Setup para CVFacil.NG

## Opção 1: Windows Subsystem for Linux (WSL) - Recomendado

```bash
# No PowerShell como administrador:
wsl --install Ubuntu

# No terminal WSL Ubuntu:
sudo apt update && sudo apt install redis-server -y
sudo service redis-server start
redis-cli ping  # Deve retornar "PONG"
```

## Opção 2: Usando Windows Package Manager (Chocolatey)

```powershell
# Como administrador:
choco install redis-64 -y
redis-server  # Inicia o servidor
```

## Opção 3: Docker Desktop

```bash
docker run -d -p 6379:6379 redis:alpine
```

## Opção 4: Redis Cloud (Online) - Sem Instalação

1. Acesse https://redis.com/cloud
2. Crie uma conta gratuita
3. Crie um banco de dados
4. Copie a connection string e adicione em `.env.local`:

```
REDIS_HOST=seu-host.cloud.redislabs.com
REDIS_PORT=seu-port
REDIS_PASSWORD=sua-senha
```

---

## Verificar Conexão

```bash
redis-cli -h localhost -p 6379
> ping
PONG
```

## Próximos Passos

1. ✅ Redis ativo
2. Iniciar worker: `npm run worker`
3. Iniciar app: `npm run dev`
4. Teste em http://localhost:3000/api/quota-status
