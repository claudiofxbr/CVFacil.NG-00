import { GoogleGenAI } from '@google/genai';
import { geminiLogger } from './logger';

interface GeminiResponse {
  suggestions: string[];
  tokensUsed: number;
  retryAfter?: number;
}

/**
 * Erro customizado para API Gemini
 */
export class GeminiAPIError extends Error {
  constructor(
    message: string,
    public code: string | number,
    public details?: any,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

export class GeminiAPIHandler {
  private genAI: GoogleGenAI;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000; // 1 segundo

  constructor() {
    this.genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
    });
  }

  /**
   * Analisar currículo com Gemini com tratamento de 429
   */
  async analyzeResume(
    resumeText: string,
    estimatedTokens: number
  ): Promise<GeminiResponse> {
    return this.retryWithExponentialBackoff(
      () => this.makeGeminiRequest(resumeText, estimatedTokens),
      0
    );
  }

  /**
   * Fazer requisição ao Gemini com error handling específico
   */
  private async makeGeminiRequest(
    resumeText: string,
    estimatedTokens: number
  ): Promise<GeminiResponse> {
    try {
      geminiLogger.debug(`🔄 Chamando Gemini API...`, {
        tokens: estimatedTokens,
      });

      const model = this.genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Analise este currículo e forneça 3 sugestões de melhoria breves:

${resumeText}

Retorne APENAS as 3 sugestões numeradas, sem explicações extras.`,
              },
            ],
          },
        ],
      });

      const response = await model;
      const text = response.text || '';
      const suggestions = this.parseSuggestions(text);

      return {
        suggestions,
        tokensUsed: estimatedTokens, // Estimativa
      };
    } catch (error: any) {
      // Extrair código de erro
      const errorCode =
        error?.error?.code ||
        error?.status ||
        error?.response?.status ||
        'UNKNOWN';
      const errorMessage =
        error?.message ||
        error?.error?.message ||
        error?.response?.data?.error?.message ||
        'Erro desconhecido';

      // Determinar se é retryable
      const isRetryable =
        errorCode === 429 ||
        errorCode === '429' ||
        errorMessage?.includes('429') ||
        errorMessage?.includes('Resource Exhausted') ||
        errorCode === 500 ||
        errorCode === '500' ||
        errorCode === 503 ||
        errorCode === '503';

      geminiLogger.error(
        `❌ Erro Gemini: ${errorMessage} (Code: ${errorCode}, Retryable: ${isRetryable})`
      );

      // Criar erro estruturado
      const apiError = new GeminiAPIError(
        errorMessage,
        errorCode,
        error?.error?.details || error?.response?.data,
        isRetryable
      );

      throw apiError;
    }
  }

  /**
   * Retry com exponential backoff e jitter
   */
  private async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    attempt: number
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const is429 =
        error?.code === 429 ||
        error?.code === '429' ||
        error?.message?.includes('429') ||
        error?.message?.includes('Resource Exhausted') ||
        error?.isRetryable;

      if (is429 && attempt < this.MAX_RETRIES) {
        // Calcular delay com exponential backoff + jitter
        const exponentialDelay = this.BASE_DELAY * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        const delayMs = exponentialDelay + jitter;

        geminiLogger.warn(
          `⏳ Erro retryable recebido, retry ${attempt + 1}/${this.MAX_RETRIES} em ${delayMs.toFixed(0)}ms`,
          {
            code: error?.code,
            message: error?.message,
          }
        );

        // Aguardar
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        // Tentar novamente
        return this.retryWithExponentialBackoff(fn, attempt + 1);
      }

      // Se não é 429 ou excedeu tentativas, re-throw
      throw error;
    }
  }

  /**
   * Parse resposta do Gemini
   */
  private parseSuggestions(text: string): string[] {
    const lines = text.split('\n');
    const suggestions: string[] = [];

    for (const line of lines) {
      const cleaned = line.replace(/^[\d+.)\s-]+/, '').trim();
      if (cleaned.length > 10) {
        suggestions.push(cleaned);
      }
    }

    return suggestions.slice(0, 3);
  }
}

export default GeminiAPIHandler;
