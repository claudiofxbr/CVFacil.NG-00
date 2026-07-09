/**
 * Estratégia de retry com exponential backoff
 * Implementa o padrão: wait = baseWait * (2 ^ retryCount) + jitter
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterPercent: number; // 0-100
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,      // 1 segundo
  maxDelayMs: 30000,      // 30 segundos
  backoffMultiplier: 2,
  jitterPercent: 10,      // ±10% jitter
};

export class RetryError extends Error {
  constructor(
    public readonly lastError: Error,
    public readonly retryCount: number,
    public readonly totalAttempts: number,
  ) {
    super(`Failed after ${totalAttempts} attempts: ${lastError.message}`);
    this.name = 'RetryError';
  }
}

/**
 * Calcula delay com exponential backoff + jitter
 */
export function calculateBackoffDelay(
  retryCount: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, retryCount);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Adiciona jitter para evitar thundering herd
  const jitterRange = cappedDelay * (config.jitterPercent / 100);
  const jitter = (Math.random() - 0.5) * 2 * jitterRange;

  return Math.max(0, Math.round(cappedDelay + jitter));
}

/**
 * Sleep assíncrono
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determina se um erro é retryable
 */
export function isRetryableError(error: any): boolean {
  // Erros retryable:
  // - 429: Too Many Requests
  // - 500, 502, 503, 504: Server errors
  // - Network errors
  // - Timeouts

  if (error.status === 429) return true;
  if (error.status >= 500 && error.status < 600) return true;

  // O SDK do GoogleGenAI normalmente não popula `error.status` — o código HTTP
  // e o status (ex: "UNAVAILABLE", "RESOURCE_EXHAUSTED") vêm dentro da própria
  // `error.message` (string JSON), então também checamos por lá.
  const message = error.message?.toLowerCase() || '';
  if (message.includes('timeout')) return true;
  if (message.includes('econnreset')) return true;
  if (message.includes('econnrefused')) return true;
  if (message.includes('enotfound')) return true;
  if (message.includes('socket hang up')) return true;
  if (message.includes('fetch failed')) return true;
  if (message.includes('unavailable')) return true;
  if (message.includes('overloaded')) return true;
  if (message.includes('high demand')) return true;
  if (message.includes('resource_exhausted')) return true;
  if (message.includes('"code":429') || message.includes('"code":503') || message.includes('"code":500')) return true;

  return false;
}

/**
 * Executa função com retry automático
 * @example
 * const result = await withRetry(
 *   () => gemini.generateContent(prompt),
 *   { maxRetries: 3 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<{ result: T; retryCount: number }> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let retryCount = 0;

  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    try {
      const result = await fn();

      if (retryCount > 0) {
        console.log(`✅ Succeeded after ${retryCount} retries on attempt ${attempt}`);
      }

      return { result, retryCount };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isRetryable = isRetryableError(error);

      console.error(
        `❌ Attempt ${attempt}/${finalConfig.maxRetries + 1} failed: ${lastError.message} (retryable: ${isRetryable})`,
      );

      // Se não é retryable ou foi a última tentativa, lança erro
      if (!isRetryable || attempt === finalConfig.maxRetries + 1) {
        throw new RetryError(lastError, retryCount, attempt);
      }

      // Calcula delay e aguarda
      retryCount++;
      const delay = calculateBackoffDelay(retryCount - 1, finalConfig);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // Nunca deve chegar aqui, mas para segurança:
  throw new RetryError(lastError || new Error('Unknown error'), retryCount, finalConfig.maxRetries + 1);
}

/**
 * Middleware para retry em requisições Fetch
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig?: Partial<RetryConfig>,
): Promise<Response> {
  const { result } = await withRetry(
    () => fetch(url, options),
    retryConfig,
  );
  return result;
}
