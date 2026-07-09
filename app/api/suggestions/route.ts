import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import {
  validateSuggestionRequest,
  validateSuggestionResponse,
  normalizeGeminiResponse,
} from '@/lib/gemini/validation';
import { withRetry, isRetryableError } from '@/lib/gemini/retry';
import { geminiCircuitBreaker, CircuitBreakerError } from '@/lib/gemini/circuit-breaker';
import { geminiLogger } from '@/lib/gemini/logger';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

function auth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

const prompts = {
  summary: (text: string, ctx: any, lang: string) => {
    const langText = lang === 'pt-BR' ? 'em português' : 'em inglês';
    return `Você é um especialista em currículos. Melhore este resumo profissional ${langText}, mantendo a essência mas tornando-o mais impactante e atrativo para recrutadores. O currículo é de: ${ctx.fullName || 'profissional'} trabalhando como ${ctx.role || 'profissional'}.

Resumo atual: "${text}"

Forneça 3 versões melhoradas (numeradas):
1. [Versão mais concisa]
2. [Versão mais descritiva]
3. [Versão focada em resultados]

Responda APENAS com as 3 versões, sem explicações adicionais.`;
  },

  role: (_text: string, _ctx: any, lang: string) => {
    const langText = lang === 'pt-BR' ? 'em português' : 'em inglês';
    return `Você é um especialista em títulos de cargo em currículos. Melhore este título ${langText}, tornando-o mais profissional e atrativo:

Título atual: "${_text}"

Forneça 3 variações de títulos melhores (numeradas):
1. [Versão tradicional/conservadora]
2. [Versão moderna/criativa]
3. [Versão genérica/broader appeal]

Responda APENAS com as 3 opções, sem explicações.`;
  },

  experience_description: (text: string, ctx: any, lang: string) => {
    const langText = lang === 'pt-BR' ? 'em português' : 'em inglês';
    return `Você é um especialista em descrever experiências profissionais para currículos. Melhore esta descrição de experiência ${langText}, focando em resultados e impacto:

Descrição atual: "${text}"
Empresa: ${ctx.company || 'não especificada'}

Forneça 3 versões melhoradas (numeradas):
1. [Versão focada em ações]
2. [Versão focada em resultados (com métricas)]
3. [Versão técnica/detalhada]

Responda APENAS com as 3 versões, sem explicações.`;
  },

  degree: (_text: string, _ctx: any, lang: string) => {
    const langText = lang === 'pt-BR' ? 'em português' : 'em inglês';
    return `Você é um especialista em educação para currículos. Melhore este título de grau/certificação ${langText}, tornando-o mais claro e profissional:

Grau atual: "${_text}"

Forneça 3 variações (numeradas):
1. [Versão formal/acadêmica]
2. [Versão prática/funcional]
3. [Versão com especialização]

Responda APENAS com as 3 opções, sem explicações.`;
  },

  skill: (_text: string, _ctx: any, lang: string) => {
    const langText = lang === 'pt-BR' ? 'em português' : 'em inglês';
    return `Você é um especialista em habilidades para currículos. Sugira versões melhoradas desta habilidade ${langText}:

Habilidade atual: "${_text}"

Forneça 3 variações (numeradas):
1. [Versão específica/técnica]
2. [Versão genérica/broad]
3. [Versão com contexto]

Responda APENAS com as 3 opções, sem explicações.`;
  },
};

/**
 * Gera sugestões via Gemini com retry, validação e circuit breaker
 */
async function generateSuggestions(
  field: string,
  prompt: string,
  language: string,
): Promise<{ suggestions: string[]; retryCount: number; duration: number }> {
  const startTime = Date.now();

  try {
    geminiLogger.logGeminiRequest(field, prompt, language);

    const { result, retryCount } = await withRetry(
      async () => {
        // Aplica circuit breaker
        return await geminiCircuitBreaker.execute(async () => {
          return await genAI.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
          });
        });
      },
      { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 },
    );

    const responseText = result.text || '';
    const suggestions = normalizeGeminiResponse(responseText);

    // Fallback: se não conseguiu parsing, retorna resposta crua como sugestão
    const finalSuggestions = suggestions.length >= 1 ? suggestions : [responseText.slice(0, 500)];

    const duration = Date.now() - startTime;
    geminiLogger.logGeminiResponse(field, finalSuggestions, duration, retryCount);

    return { suggestions: finalSuggestions, retryCount, duration };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof CircuitBreakerError) {
      geminiLogger.error('Circuit breaker aberto', error as Error, {
        field,
        duration,
        circuitState: geminiCircuitBreaker.getStatus().state,
      });
      throw error;
    }

    if (error instanceof Error) {
      const status = (error as any).status || 500;
      geminiLogger.logGeminiError(field, error, status, 0, geminiCircuitBreaker.getStatus().state);
    }

    throw error;
  }
}

export async function POST(req: Request) {
  const payload = auth(req);
  if (!payload) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    // Parse e validação de entrada (Schema Validation)
    const body = await req.json();
    const validatedInput = validateSuggestionRequest(body);
    const { field, currentText, context = {}, language = 'pt-BR' } = validatedInput;

    // Obtém prompt template
    const promptFn = prompts[field as keyof typeof prompts];
    if (!promptFn) {
      return NextResponse.json({ error: `Campo não suportado: ${field}` }, { status: 400 });
    }

    const prompt = promptFn(currentText, context, language);

    // Gera sugestões com retry, validação e circuit breaker
    const { suggestions, retryCount, duration } = await generateSuggestions(
      field,
      prompt,
      language,
    );

    // Validação de saída (Schema Validation)
    const response = {
      field,
      currentText,
      suggestions,
      language,
      timestamp: new Date().toISOString(),
      retryCount,
      processingTime: duration,
    };

    validateSuggestionResponse(response);

    return NextResponse.json(response);
  } catch (error: any) {
    // Trata erros específicos
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validação falhou', details: error.message },
        { status: 400 },
      );
    }

    if (error.message?.includes('Circuit breaker')) {
      return NextResponse.json(
        {
          error: 'Serviço de IA temporariamente indisponível',
          retryAfter: 30,
        },
        { status: 503 },
      );
    }

    if (error.status === 429 || error.message?.includes('quota')) {
      geminiLogger.warn('Quota Gemini excedida', { error: error.message });
      return NextResponse.json(
        {
          error: 'Quota de IA excedida. Aguarde alguns minutos ou atualize para plano pago.',
          details: 'https://ai.google.dev/gemini-api/docs/rate-limits',
          retryAfter: 60,
        },
        { status: 429 },
      );
    }

    if (isRetryableError(error)) {
      return NextResponse.json(
        {
          error: 'Erro temporário ao gerar sugestões. Tentando novamente...',
          retryAfter: 5,
        },
        { status: 503 },
      );
    }

    // Erro genérico
    geminiLogger.error('Erro ao gerar sugestões', error);
    return NextResponse.json(
      {
        error: 'Erro ao gerar sugestões com Gemini',
        message: error.message || 'Tente novamente em alguns minutos',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/suggestions/health - Health check
 */
export async function GET() {
  const stats = geminiLogger.getStats();
  const circuitStatus = geminiCircuitBreaker.getStatus();

  return NextResponse.json({
    status: 'ok',
    service: 'suggestions-api',
    timestamp: new Date().toISOString(),
    stats,
    circuit: circuitStatus,
  });
}
