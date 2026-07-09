# ⚠️ Solução: Quota Gemini API Excedida

## 🔴 O Problema

```
Error 429: RESOURCE_EXHAUSTED
"You exceeded your current quota, please check your plan and billing details"
```

A **quota gratuita do Gemini** foi atingida. O free tier tem limites:
- ❌ **15 requisições/minuto** (já atingidas)
- ❌ **1M tokens/dia** (já atingidos)
- ❌ **50 requisições/dia** (já atingidas)

---

## ✅ Solução 1: Esperar (Rápido)

Se acabou de exceder, espere **30-60 segundos** e tente novamente.

A quota se reseta a cada minuto/hora/dia dependendo do limite.

---

## ✅ Solução 2: Usar Plano Pago (Recomendado) ⭐

### Passo 1: Acessar Google Cloud Console
1. Acesse: https://console.cloud.google.com
2. Faça login com sua conta Google

### Passo 2: Habilitar Billing
1. Vá para **Billing** (no menu lateral)
2. Clique em **Link a billing account** ou **Create billing account**
3. Adicione método de pagamento (cartão de crédito)

### Passo 3: Configurar Quota Paga
1. Vá para **APIs & Services** → **Quotas**
2. Procure por **generativelanguage.googleapis.com**
3. Atualize os limites para valores maiores

### Resultado:
- ✅ Quota aumentada para **1500 requisições/minuto**
- ✅ Custo: ~$0.075 por 1M tokens (muito barato)
- ✅ Limite diário: Praticamente ilimitado

---

## ✅ Solução 3: Usar Modelo Alternativo

Se quiser evitar custo, troque para um modelo menos exigente:

### Modificar `app/api/suggestions/route.ts`

Trocar:
```typescript
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
```

Por:
```typescript
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
```

Ou use modelo ainda mais leve:
```typescript
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
```

---

## ✅ Solução 4: Desabilitar Feature Temporariamente

Se quer usar a app sem a feature de IA por enquanto:

### Modificar `components/Dashboard.tsx`

Comentar a linha de import:
```typescript
// import { importResumeFromPdf } from '../services/aiImportService';
```

E comentar o botão no JSX:
```typescript
{/* 
  <button onClick={handleImportClick} className="...">
    Importar PDF
  </button>
*/}
```

---

## 📊 Comparação de Opções

| Opção | Custo | Limite | Tempo |
|-------|-------|--------|-------|
| **Free (reset)** | R$0 | 15 req/min | ⏳ 30-60s |
| **Pago (Google)** | ~R$0.30/dia | 1500 req/min | ✅ Imediato |
| **Modelo alternativo** | R$0 | Variável | ✅ Imediato |
| **Desabilitar** | R$0 | N/A | ✅ Imediato |

---

## 🎯 Recomendação

### Se vai usar muito (Desenvolvimento/Testes):
→ **Solução 2: Ativar Plano Pago** (Mais barato que café ☕)

### Se é teste rápido:
→ **Solução 1: Esperar 30 segundos** (Gratuito)

### Se quer preservar quota:
→ **Solução 4: Desabilitar feature** (Temporariamente)

---

## 🔧 Implementação Rápida: Solução 3 (Trocar Modelo)

Editar arquivo: `app/api/suggestions/route.ts`

Encontrar essa linha:
```typescript
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
```

Trocar para:
```typescript
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
```

Salvar e recarregar a página.

**Benefício:** Continua funcionando, consome menos quota

---

## 📞 Teste de Conexão

Para verificar se sua chave funciona:

```bash
curl -X GET \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

---

## 🆘 Próximas Ações

1. **Imediato**: Espere 30-60 segundos, tente novamente
2. **Melhor**: Ative plano pago no Google Cloud (super barato)
3. **Alternativa**: Troque modelo para `gemini-2.0-flash`

---

## 📚 Links Úteis

- **Google Cloud Console**: https://console.cloud.google.com
- **Gemini API Quotas**: https://ai.google.dev/gemini-api/docs/rate-limits
- **Preços Gemini**: https://ai.google.dev/pricing

---

**Desenvolvido por Claude Code**  
**Data: 2026-05-05**
