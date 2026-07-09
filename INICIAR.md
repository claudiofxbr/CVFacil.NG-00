# 🚀 CVFacil.NG - Guia de Inicialização

## ⚡ Inicio Rápido (Recomendado)

### Abra PowerShell como Administrador e execute:

```powershell
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev
.\start.ps1
```

**Pronto!** O script fará tudo automaticamente:
- ✅ Validar Node.js e npm
- ✅ Instalar dependências
- ✅ Sincronizar banco de dados
- ✅ Criar usuário de teste
- ✅ Abrir navegador em http://localhost:3000
- ✅ Iniciar o servidor

---

## 🔐 Credenciais de Teste

Após executar o script, faça login com:

```
📧 Email:  teste@example.com
🔑 Senha:  123456
```

---

## 📋 Fluxo Esperado

```
1. PowerShell executa: .\start.ps1
   ↓
2. Script valida tudo automaticamente
   ↓
3. Script inicia o servidor npm run dev em background
   ↓
4. Script aguarda servidor ficar pronto (~5-10 segundos)
   ↓
5. Navegador abre automaticamente em http://localhost:3000
   ↓
6. Você vê a tela de LOGIN
   ↓
7. Digite email e senha de teste
   ↓
8. Clique em "Entrar"
   ↓
9. ✅ Redirecionado para o DASHBOARD
```

---

## ❌ Se Tiver Problemas

### Erro: "Node.js não encontrado"
- Instale de: https://nodejs.org/ (versão 20+)

### Erro: ".env.local não encontrado"
- Verifique se o arquivo `.env.local` existe no diretório
- Ele deve ter as variáveis de ambiente configuradas

### Erro: "Credenciais inválidas"
- Copie exatamente: `teste@example.com`
- Copie exatamente: `123456`
- Sem espaços extras!

### Erro 404 "This page could not be found"
- Aguarde 10-15 segundos antes de atualizar o navegador
- O servidor npm run dev leva um pouco para inicializar
- Se persistir, pressione `Ctrl+C` para parar e execute novamente
- Verifique se a porta 3000 não está em uso: `netstat -ano | findstr :3000`

### Servidor travado ou não inicia
- Pressione `Ctrl+C` para parar
- Aguarde 2 segundos
- Execute `.\start.ps1` novamente

---

## 🛑 Para Parar o Servidor

Pressione `Ctrl+C` no PowerShell onde o servidor está rodando.

---

## 📝 Alternativa: Comandos Manuais

Se preferir não usar o script:

```powershell
# 1. Navegar para o diretório
cd C:\Users\VeKTI-01\Downloads\cvfacil-ng-dev

# 2. Instalar dependências (apenas na primeira vez)
npm install --legacy-peer-deps

# 3. Sincronizar banco de dados
npx prisma db push --skip-generate

# 4. Criar usuário de teste
node create-test-user.cjs

# 5. Iniciar servidor
npm run dev
```

Depois abra http://localhost:3000 no navegador.

---

## ✅ Checklist de Funcionamento

- [ ] Servidor iniciou sem erros
- [ ] Navegador abriu em http://localhost:3000
- [ ] Tela de LOGIN apareceu
- [ ] Conseguiu fazer login com teste@example.com / 123456
- [ ] Foi redirecionado para o DASHBOARD
- [ ] Dashboard carregou corretamente

Se todos estes pontos estão ✅, a aplicação está funcionando perfeitamente!

---

## 🎯 Próximos Passos

1. **Criar sua conta:** Registre-se com seu próprio email
2. **Usar o dashboard:** Comece a criar currículos
3. **Explorar features:** Teste todos os recursos disponíveis

---

**Versão:** 4.0 (Maio 2026)
**Status:** ✅ Testado e funcionando
