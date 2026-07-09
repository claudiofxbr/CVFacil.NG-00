# ⚠️ Erro: Quota Gemini API Excedida

## O que Aconteceu?

Você atingiu o **limite gratuito** da API Gemini para importação de PDFs. A API Gemini tem limites:

```
LIMITE GRATUITO:
├─ 15 requisições por minuto
├─ Quota de tokens diários limitada
└─ Reset a cada 24 horas
```

---

## 🚀 SOLUÇÃO RÁPIDA (Recomendado)

### Opção 1: Adicionar Plano Pago (2 minutos)

1. **Acesse:** https://console.cloud.google.com/
2. **Clique em:** "Billing" (lado esquerdo)
3. **Clique em:** "Create Billing Account"
4. **Adicione cartão de crédito**
5. **Pronto!** Seu limite aumenta para:
   - ✅ 10.000 requisições por dia
   - ✅ 1.000.000 tokens por dia
   - ✅ Custo: ~$0.005-0.05 por requisição

---

### Opção 2: Esperar 24 Horas (Gratuito)

O limite se reseta diariamente. Você pode:
- Tentar importar outro PDF amanhã
- Usar um novo projeto Google Cloud (temporário)

---

### Opção 3: Criar Novo Projeto Google Cloud (Temporário)

Se quiser testar agora:

1. Acesse: https://console.cloud.google.com/
2. Clique na "seta" perto do nome do projeto (topo)
3. Clique em "New Project"
4. Crie um novo projeto
5. Abra a **nova chave API** (NOVO_GEMINI_API_KEY)
6. Atualize `.env.local`:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=NOVO_GEMINI_API_KEY
   ```
7. Reinicie: `.\start.ps1`

Isso vai gerar uma nova quota para você testar!

---

## 💳 COMO ADICIONAR CARTÃO (Passo a Passo)

1. **Abra:** https://console.cloud.google.com/
2. **Menu superior → Billing**
3. **Se não tem Billing Account:**
   - Clique: "Create Billing Account"
   - Escolha: "Individual"
   - Preencha dados do cartão
4. **Se já tem Billing Account:**
   - Clique: "Manage Billing Accounts"
   - Clique na sua conta
   - "Payment Methods"
   - Adicione seu cartão

---

## 📊 Após Adicionar Cartão

Seu limite muda de:

| Métrica | Gratuito | Com Cartão |
|---------|----------|-----------|
| Requisições/dia | ~0 (excedido) | 10,000 |
| Tokens/dia | ~0 (excedido) | 1,000,000 |
| Custo | $0 | ~$0.005-0.05/req |

**Estimativa de custo:**
- 100 importações de PDF = ~$0.50
- 1.000 importações = ~$5.00

---

## ✅ Verificar se Funcionou

Depois de adicionar cartão:

1. Aguarde **5 minutos** (propagação do sistema)
2. Reinicie o aplicativo: `.\start.ps1`
3. Tente importar um PDF novamente
4. ✅ Deve funcionar!

---

## 🔄 Temporário: Desabilitar Importação de PDF

Se não quiser adicionar cartão agora, você pode desabilitar a importação:

**No navegador:**
1. Acesse http://localhost:3000
2. Vá para "Dashboard"
3. Tente importar PDF
4. Se aparecer erro → clique em "Criar Manualmente"

---

## 📞 Precisa de Ajuda?

- **Google Cloud Console:** https://console.cloud.google.com/
- **Gemini API Pricing:** https://ai.google.dev/pricing
- **Gemini API Docs:** https://ai.google.dev/gemini-api/docs

---

## 🎯 Recomendação Final

**Para usar CVFacil.NG em produção:**
- ✅ Adicione um cartão de crédito
- ✅ Custa muito pouco (~$0-10/mês dependendo do uso)
- ✅ Terá acesso completo às features

**Para testar/desenvolvimento:**
- ✅ Use novo projeto a cada 24 horas
- ✅ Ou crie novo projeto quando quota acabar

---

**Versão:** 1.0
**Data:** Maio 2026
