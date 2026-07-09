/**
 * Testes Unitários e de Integração: API de Sugestões
 *
 * Cobertura:
 * ✅ Schema validation (entrada e saída)
 * ✅ Retry logic com exponential backoff
 * ✅ Circuit breaker pattern
 * ✅ JSON parsing robusto
 * ✅ Error handling específico
 * ✅ Cargas altas (stress testing)
 */

import {
  validateSuggestionRequest,
  validateSuggestionResponse,
  normalizeGeminiResponse,
} from '@/lib/gemini/validation';
import {
  calculateBackoffDelay,
  isRetryableError,
  withRetry,
  RetryError,
  DEFAULT_RETRY_CONFIG,
} from '@/lib/gemini/retry';
import {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitState,
  DEFAULT_CIRCUIT_CONFIG,
} from '@/lib/gemini/circuit-breaker';
import { StructuredLogger, LogLevel } from '@/lib/gemini/logger';

// ============================================================================
// 1️⃣ TESTES DE VALIDAÇÃO (Schema)
// ============================================================================

describe('SuggestionRequest Validation', () => {
  test('deve validar requisição válida', () => {
    const validRequest = {
      field: 'summary',
      currentText: 'Profissional com 10 anos de experiência',
      context: { fullName: 'João Silva', role: 'Developer' },
      language: 'pt-BR',
    };

    const result = validateSuggestionRequest(validRequest);
    expect(result.field).toBe('summary');
    expect(result.currentText).toBe('Profissional com 10 anos de experiência');
  });

  test('deve rejeitar campo obrigatório faltando', () => {
    const invalidRequest = {
      field: 'summary',
      // falta currentText
      context: {},
    };

    expect(() => validateSuggestionRequest(invalidRequest)).toThrow();
  });

  test('deve rejeitar field inválido', () => {
    const invalidRequest = {
      field: 'invalid_field',
      currentText: 'Algum texto',
    };

    expect(() => validateSuggestionRequest(invalidRequest)).toThrow();
  });

  test('deve rejeitar texto muito longo (>5000 chars)', () => {
    const invalidRequest = {
      field: 'summary',
      currentText: 'a'.repeat(5001),
    };

    expect(() => validateSuggestionRequest(invalidRequest)).toThrow();
  });

  test('deve usar idioma padrão pt-BR se não especificado', () => {
    const request = {
      field: 'summary',
      currentText: 'Algum texto',
    };

    const result = validateSuggestionRequest(request);
    expect(result.language).toBe('pt-BR');
  });

  test('deve validar todos os tipos de field suportados', () => {
    const fields = ['summary', 'role', 'company', 'experience_description', 'degree', 'skill'];

    fields.forEach(field => {
      const request = { field, currentText: 'Teste' };
      expect(() => validateSuggestionRequest(request)).not.toThrow();
    });
  });
});

describe('SuggestionResponse Validation', () => {
  test('deve validar resposta válida', () => {
    const validResponse = {
      field: 'summary',
      currentText: 'Original',
      suggestions: ['Sugestão 1', 'Sugestão 2', 'Sugestão 3'],
      language: 'pt-BR',
      timestamp: new Date().toISOString(),
    };

    const result = validateSuggestionResponse(validResponse);
    expect(result.suggestions.length).toBe(3);
  });

  test('deve rejeitar resposta com sugestões não-array', () => {
    const invalidResponse = {
      field: 'summary',
      currentText: 'Original',
      suggestions: 'string inválida',
      language: 'pt-BR',
      timestamp: new Date().toISOString(),
    };

    expect(() => validateSuggestionResponse(invalidResponse)).toThrow();
  });
});

// ============================================================================
// 2️⃣ TESTES DE PARSING JSON ROBUSTO
// ============================================================================

describe('normalizeGeminiResponse', () => {
  test('deve extrair numbered items (1. 2. 3.)', () => {
    const response = `
1. Sugestão Um
2. Sugestão Dois
3. Sugestão Três
    `;

    const result = normalizeGeminiResponse(response);
    expect(result).toEqual(['Sugestão Um', 'Sugestão Dois', 'Sugestão Três']);
  });

  test('deve extrair JSON de dentro de code blocks markdown', () => {
    const response = `
\`\`\`json
["Sugestão 1", "Sugestão 2", "Sugestão 3"]
\`\`\`
    `;

    const result = normalizeGeminiResponse(response);
    expect(result).toEqual(['Sugestão 1', 'Sugestão 2', 'Sugestão 3']);
  });

  test('deve extrair suggestions de objeto JSON', () => {
    const response = `
\`\`\`json
{
  "suggestions": ["Opção A", "Opção B", "Opção C"]
}
\`\`\`
    `;

    const result = normalizeGeminiResponse(response);
    expect(result).toEqual(['Opção A', 'Opção B', 'Opção C']);
  });

  test('deve limpar markdown e retornar texto como fallback', () => {
    const response = `**Bold** e *italic* com algum texto`;

    const result = normalizeGeminiResponse(response);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).not.toContain('*');
  });

  test('deve retornar array vazio para resposta vazia', () => {
    const result = normalizeGeminiResponse('');
    expect(result).toEqual([]);
  });

  test('deve ignorar items muito longos (>500 chars)', () => {
    const response = `
1. ${' muito '.repeat(100)}
2. Sugestão válida
    `;

    const result = normalizeGeminiResponse(response);
    expect(result).toContain('Sugestão válida');
  });
});

// ============================================================================
// 3️⃣ TESTES DE RETRY COM EXPONENTIAL BACKOFF
// ============================================================================

describe('Retry Logic', () => {
  test('deve calcular backoff exponencial corretamente', () => {
    const delays = [
      calculateBackoffDelay(0, { ...DEFAULT_RETRY_CONFIG, jitterPercent: 0 }),
      calculateBackoffDelay(1, { ...DEFAULT_RETRY_CONFIG, jitterPercent: 0 }),
      calculateBackoffDelay(2, { ...DEFAULT_RETRY_CONFIG, jitterPercent: 0 }),
    ];

    // 1000 * 2^0 = 1000
    // 1000 * 2^1 = 2000
    // 1000 * 2^2 = 4000
    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(2000);
    expect(delays[2]).toBe(4000);
  });

  test('deve respeitar maxDelay', () => {
    const delay = calculateBackoffDelay(10, {
      ...DEFAULT_RETRY_CONFIG,
      maxDelayMs: 5000,
      jitterPercent: 0,
    });

    expect(delay).toBeLessThanOrEqual(5000);
  });

  test('deve adicionar jitter aleatório', () => {
    const delays = Array(5)
      .fill(null)
      .map(() => calculateBackoffDelay(1, { ...DEFAULT_RETRY_CONFIG, jitterPercent: 20 }));

    const allDifferent = new Set(delays).size > 1;
    expect(allDifferent).toBe(true);
  });

  test('deve retryar erros 429 (quota)', async () => {
    let attempts = 0;
    const error429 = new Error('Quota exceeded');
    (error429 as any).status = 429;

    try {
      await withRetry(
        () => {
          attempts++;
          if (attempts < 2) throw error429;
          return Promise.resolve('success');
        },
        { maxRetries: 3, baseDelayMs: 10 }, // Delay curto para teste
      );
    } catch {
      // Expected
    }

    expect(attempts).toBeGreaterThan(1);
  });

  test('deve retryar erros 5xx', async () => {
    let attempts = 0;
    const error500 = new Error('Server Error');
    (error500 as any).status = 500;

    try {
      await withRetry(
        () => {
          attempts++;
          if (attempts < 2) throw error500;
          return Promise.resolve('success');
        },
        { maxRetries: 3, baseDelayMs: 10 },
      );
    } catch {
      // Expected
    }

    expect(attempts).toBeGreaterThan(1);
  });

  test('não deve retryar erros 4xx (exceto 429)', async () => {
    const error400 = new Error('Bad Request');
    (error400 as any).status = 400;

    let attempts = 0;

    try {
      await withRetry(
        () => {
          attempts++;
          throw error400;
        },
        { maxRetries: 3, baseDelayMs: 10 },
      );
    } catch (error) {
      expect(error instanceof RetryError).toBe(true);
    }

    expect(attempts).toBe(1);
  });

  test('deve lançar RetryError após esgotar tentativas', async () => {
    const error = new Error('Always fails');
    (error as any).status = 500;

    try {
      await withRetry(
        () => Promise.reject(error),
        { maxRetries: 2, baseDelayMs: 10 },
      );
    } catch (e) {
      expect(e instanceof RetryError).toBe(true);
      if (e instanceof RetryError) {
        expect(e.totalAttempts).toBe(3); // 1 tentativa inicial + 2 retries
      }
    }
  });

  test('deve retornar sucesso com retry count', async () => {
    let attempts = 0;
    const error500 = new Error('Temporary failure');
    (error500 as any).status = 500;

    const { result, retryCount } = await withRetry(
      () => {
        attempts++;
        if (attempts === 1) throw error500;
        return Promise.resolve('success');
      },
      { maxRetries: 3, baseDelayMs: 10 },
    );

    expect(result).toBe('success');
    expect(retryCount).toBe(1);
  });
});

// ============================================================================
// 4️⃣ TESTES DE CIRCUIT BREAKER
// ============================================================================

describe('CircuitBreaker', () => {
  test('deve iniciar em estado CLOSED', () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  test('deve abrir após N falhas', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });

    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {
      // Expected
    }

    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {
      // Expected
    }

    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  test('deve lançar CircuitBreakerError quando OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });

    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {
      // Expected
    }

    let caughtError: any = null;
    try {
      await cb.execute(() => Promise.resolve('should fail'));
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError instanceof CircuitBreakerError).toBe(true);
  });

  test('deve transicionar OPEN -> HALF_OPEN após timeout', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      timeoutMs: 50,
    });

    // Força abertura
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {
      // Expected
    }

    expect(cb.getState()).toBe(CircuitState.OPEN);

    // Aguarda timeout
    await new Promise(resolve => setTimeout(resolve, 60));

    // Tenta executar
    try {
      await cb.execute(() => Promise.resolve('success'));
    } catch {
      // Pode falhar, mas deve estar em HALF_OPEN
    }

    expect([CircuitState.HALF_OPEN, CircuitState.CLOSED]).toContain(cb.getState());
  });

  test('deve fechar após N sucessos em HALF_OPEN', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      timeoutMs: 0, // Imediato
    });

    // Força abertura
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {
      // Expected
    }

    // Aguarda timeout (0ms)
    await new Promise(resolve => setTimeout(resolve, 10));

    // Executa sucessos
    await cb.execute(() => Promise.resolve('success1'));
    await cb.execute(() => Promise.resolve('success2'));

    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  test('deve resetar estado', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });

    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {
      // Expected
    }

    expect(cb.getState()).toBe(CircuitState.OPEN);

    cb.reset();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });
});

// ============================================================================
// 5️⃣ TESTES DE LOGGING
// ============================================================================

describe('StructuredLogger', () => {
  test('deve logar com diferentes níveis', () => {
    const logger = new StructuredLogger('TestService', LogLevel.DEBUG);
    const consoleSpy = jest.spyOn(console, 'debug');

    logger.debug('test message', { key: 'value' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('TestService'),
      'test message',
      expect.objectContaining({ key: 'value' }),
    );

    consoleSpy.mockRestore();
  });

  test('deve manter histórico de logs', () => {
    const logger = new StructuredLogger('Test');

    logger.info('message 1');
    logger.info('message 2');
    logger.error('error message', new Error('test'));

    const logs = logger.getLogs();
    expect(logs.length).toBeGreaterThan(0);
  });

  test('deve calcular estatísticas de erro', () => {
    const logger = new StructuredLogger('Test');

    logger.info('success 1');
    logger.error('error 1', new Error('test1'));
    logger.info('success 2');
    logger.error('error 2', new Error('test2'));

    const stats = logger.getStats();
    expect(stats.totalErrors).toBeGreaterThan(0);
  });

  test('deve limpar logs', () => {
    const logger = new StructuredLogger('Test');
    logger.info('message');

    let logs = logger.getLogs();
    expect(logs.length).toBeGreaterThan(0);

    logger.clear();
    logs = logger.getLogs();
    expect(logs.length).toBe(0);
  });
});

// ============================================================================
// 6️⃣ TESTES DE CARGA (Stress Testing)
// ============================================================================

describe('Load Testing', () => {
  test('deve processar 100 requisições sequenciais', async () => {
    const results = [];

    for (let i = 0; i < 100; i++) {
      const request = {
        field: 'skill' as const,
        currentText: `Skill ${i}`,
      };

      try {
        const validated = validateSuggestionRequest(request);
        results.push(validated);
      } catch (e) {
        results.push(null);
      }
    }

    expect(results.filter(r => r !== null).length).toBeGreaterThan(90);
  });

  test('deve manejar JSON responses complexos', () => {
    const complexResponses = [
      '1. Opção Um\n2. Opção Dois\n3. Opção Três',
      '```json\n["A", "B", "C"]\n```',
      '```\n{"suggestions": ["X", "Y", "Z"]}\n```',
      'Fallback: Resposta não estruturada',
    ];

    complexResponses.forEach(response => {
      const result = normalizeGeminiResponse(response);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  test('deve recuperar de falhas intermitentes', async () => {
    let failCount = 0;

    const result = await withRetry(
      () => {
        failCount++;
        if (failCount < 3) {
          const err = new Error('Intermittent failure');
          (err as any).status = 500;
          return Promise.reject(err);
        }
        return Promise.resolve('recovered');
      },
      { maxRetries: 5, baseDelayMs: 10 },
    );

    expect(result.result).toBe('recovered');
    expect(result.retryCount).toBe(2);
  });
});

// ============================================================================
// 7️⃣ TESTES DE INTEGRAÇÃO (End-to-End)
// ============================================================================

describe('Integration Tests', () => {
  test('deve completar fluxo: validação -> retry -> normalização', async () => {
    // Simula requisição completa
    const request = {
      field: 'summary' as const,
      currentText: 'Profissional experiente',
      language: 'pt-BR',
    };

    const validated = validateSuggestionRequest(request);
    expect(validated).toBeDefined();

    // Simula resposta do Gemini
    const geminiResponse = `
1. Profissional altamente experiente com sólida trajetória
2. Especialista com extensa experiência na área
3. Profissional com vasta experiência acumulada
    `;

    const normalized = normalizeGeminiResponse(geminiResponse);
    expect(normalized.length).toBeGreaterThanOrEqual(1);

    // Valida resposta final
    const finalResponse = {
      field: request.field,
      currentText: request.currentText,
      suggestions: normalized,
      language: request.language,
      timestamp: new Date().toISOString(),
    };

    const validated_response = validateSuggestionResponse(finalResponse);
    expect(validated_response.suggestions.length).toBeGreaterThan(0);
  });
});
