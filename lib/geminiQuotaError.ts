// Utilitário compartilhado (client + server) para detectar erros de quota
// excedida da API Gemini (429 - RESOURCE_EXHAUSTED) e traduzi-los para uma
// mensagem clara em vez de repassar o JSON cru da Google ao usuário final.

// Concatena as fontes de texto disponíveis no erro (mensagem própria, erro
// original encapsulado por retry, e JSON.stringify como último recurso).
// Importante: `Error.prototype.message` não é enumerável, então
// `JSON.stringify(error)` sozinho não captura o texto de um Error real (nem
// de um erro embrulhado, ex. pela função `withRetry`) — por isso `.message`
// é sempre a fonte primária aqui.
function errorText(error: any): string {
  const parts: string[] = [];
  if (typeof error?.message === 'string') parts.push(error.message);
  if (typeof error?.lastError?.message === 'string') parts.push(error.lastError.message);
  try { parts.push(JSON.stringify(error)); } catch { /* ignore */ }
  return parts.join(' ').toLowerCase();
}

export const GEMINI_QUOTA_MESSAGE =
  'Limite gratuito da IA (Gemini) foi atingido no momento. Tente novamente mais tarde ou peça ao administrador para configurar um plano pago.';

export function isGeminiQuotaError(error: any): boolean {
  if (error?.status === 429) return true;
  const text = errorText(error);
  return (
    text.includes('resource_exhausted') ||
    text.includes('quota exceeded') ||
    text.includes('"code":429')
  );
}

// Erro distinto de quota: o modelo está temporariamente sobrecarregado (503 -
// UNAVAILABLE). É transitório — diferente do limite de cota, que só se resolve
// esperando o reset ou trocando de plano.
export const GEMINI_OVERLOADED_MESSAGE =
  'O serviço de IA (Gemini) está temporariamente sobrecarregado. Tente novamente em alguns instantes.';

export function isGeminiOverloadedError(error: any): boolean {
  if (error?.status === 503) return true;
  const text = errorText(error);
  return (
    text.includes('unavailable') ||
    text.includes('"code":503') ||
    text.includes('overloaded') ||
    text.includes('high demand')
  );
}
