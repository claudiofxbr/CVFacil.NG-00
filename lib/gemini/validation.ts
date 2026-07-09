import { z } from 'zod';

// Schema de entrada para sugestões
export const SuggestionRequestSchema = z.object({
  field: z.enum(['summary', 'role', 'company', 'experience_description', 'degree', 'skill']),
  currentText: z.string().min(1).max(5000),
  context: z.object({
    fullName: z.string().optional(),
    role: z.string().optional(),
    targetRole: z.string().optional(),
    industry: z.string().optional(),
  }).optional(),
  language: z.enum(['pt-BR', 'en', 'es', 'fr']).default('pt-BR'),
});

// Schema de resposta do Gemini (pode vir em vários formatos)
export const GeminiResponseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({
        text: z.string(),
      })),
    }),
  })),
});

// Schema para sugestões processadas
export const SuggestionResponseSchema = z.object({
  field: z.string(),
  currentText: z.string(),
  suggestions: z.array(z.string()),
  language: z.string(),
  timestamp: z.string(),
  retryCount: z.number().optional(),
  processingTime: z.number().optional(),
});

export type SuggestionRequest = z.infer<typeof SuggestionRequestSchema>;
export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;
export type SuggestionResponse = z.infer<typeof SuggestionResponseSchema>;

/**
 * Valida e normaliza resposta do Gemini
 * Trata múltiplos formatos possíveis: JSON válido, markdown, texto puro
 */
export function normalizeGeminiResponse(text: string): string[] {
  if (!text) return [];

  // Tenta extrair JSON se estiver encapsulado em markdown
  const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) return parsed.suggestions;
    } catch (e) {
      // Não era JSON válido, continua
    }
  }

  // Tenta extrair items numerados (1. ... 2. ... 3. ...)
  const numbered = text.match(/\d+\.\s*(.+?)(?=\n\d+\.|$)/gs);
  if (numbered && numbered.length >= 2) {
    return numbered
      .map(item => item.replace(/^\d+\.\s*/, '').trim())
      .filter(s => s.length > 0 && s.length < 500);
  }

  // Fallback: retorna o texto completo como uma sugestão
  const cleaned = text
    .replace(/^#+\s*/gm, '')
    .replace(/[*_`]/g, '')
    .trim();

  if (cleaned.length > 0 && cleaned.length < 1000) {
    return [cleaned];
  }

  return [];
}

/**
 * Valida input do usuário
 */
export function validateSuggestionRequest(data: unknown) {
  try {
    return SuggestionRequestSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`Validation failed: ${messages}`);
    }
    throw error;
  }
}

/**
 * Valida resposta antes de retornar ao cliente
 */
export function validateSuggestionResponse(data: unknown) {
  try {
    return SuggestionResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Response validation failed:', error.issues);
      // Em produção, isso seria um erro crítico
      throw new Error('Invalid response format from suggestions API');
    }
    throw error;
  }
}
