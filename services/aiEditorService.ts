import { api } from "../lib/apiClient";

/**
 * Serviço para assistência de IA dentro do editor de currículos.
 *
 * A chamada à API Gemini acontece no servidor (app/api/ai-editor/route.ts) —
 * a chave de API nunca é exposta no bundle do navegador.
 */
export const improveTextWithAI = async (text: string, context: string): Promise<string> => {
  if (!text || text.trim().length < 10) {
    throw new Error("O texto é muito curto para ser melhorado.");
  }

  const { improvedText } = await api.post('/api/ai-editor', { action: 'improve-text', text, context });
  if (!improvedText) {
    throw new Error("A IA não conseguiu processar o texto.");
  }
  return improvedText;
};

/**
 * Sugere habilidades baseadas na experiência
 */
export const suggestSkillsWithAI = async (experiences: any[]): Promise<string[]> => {
  if (!experiences || experiences.length === 0) {
    throw new Error("Adicione algumas experiências para receber sugestões de habilidades.");
  }

  const { skills } = await api.post('/api/ai-editor', { action: 'suggest-skills', experiences });
  return skills || [];
};
