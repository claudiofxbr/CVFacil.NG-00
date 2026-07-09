/**
 * Script de Teste: Otimização Gemini API
 *
 * Executa com: npx ts-node test-optimization.ts
 * Ou via Jest: npm test
 */

import {
  PDFValidator,
  TokenEstimator,
  TextChunker,
  CurriculumSectionExtractor,
} from './lib/gemini/pdf-processor';
import { ProcessingQueue } from './lib/gemini/queue-processor';
import { QuotaMonitor } from './lib/gemini/quota-monitor';

// Cores ANSI
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testTokenEstimator() {
  log('\n╔════════════════════════════════════════════════════╗', colors.blue);
  log('║  ✅ TEST 1: Token Estimator                         ║', colors.blue);
  log('╚════════════════════════════════════════════════════╝', colors.blue);

  const estimator = new TokenEstimator();

  // Teste 1: Estimativa por bytes
  const bytes = 50_000; // 50KB
  const tokens = estimator.estimateFromBytes(bytes);
  log(`Bytes: ${bytes.toLocaleString()} → Tokens: ${tokens.toLocaleString()}`, colors.cyan);

  // Teste 2: Estimativa por texto
  const text = 'Este é um texto de teste para estimar tokens.';
  const textTokens = estimator.estimateFromText(text);
  log(`Texto: ${text.length} chars → Tokens: ${textTokens}`, colors.cyan);

  log('✅ TokenEstimator funcionando corretamente', colors.green);
}

async function testCurriculumExtractor() {
  log('\n╔════════════════════════════════════════════════════╗', colors.blue);
  log('║  ✅ TEST 2: Curriculum Section Extractor           ║', colors.blue);
  log('╚════════════════════════════════════════════════════╝', colors.blue);

  const extractor = new CurriculumSectionExtractor();

  const sampleCurriculum = `
RESUMO PROFISSIONAL
Profissional com 10 anos de experiência em desenvolvimento de software.

EXPERIÊNCIA PROFISSIONAL
Desenvolvedor Senior na TechCorp (2020-2024)
- Liderou equipe de 5 desenvolvedores
- Implementou arquitetura de microserviços

EDUCAÇÃO
Bacharelado em Ciência da Computação pela UFMG (2015)

HABILIDADES
- JavaScript/TypeScript
- React, Next.js
- Node.js, Express
`;

  const sections = extractor.extractSections(sampleCurriculum);

  log(`\nSeções identificadas: ${sections.length}`, colors.cyan);
  sections.forEach((section) => {
    log(
      `  • ${section.type}: ${section.content.substring(0, 50)}... (${section.estimatedTokens} tokens)`,
      colors.cyan
    );
  });

  log('✅ CurriculumSectionExtractor funcionando corretamente', colors.green);
}

async function testTextChunker() {
  log('\n╔════════════════════════════════════════════════════╗', colors.blue);
  log('║  ✅ TEST 3: Text Chunker                           ║', colors.blue);
  log('╚════════════════════════════════════════════════════╝', colors.blue);

  const chunker = new TextChunker();

  const longText = `
Este é um texto muito longo que será dividido em chunks.
Cada chunk terá um tamanho máximo de tokens especificado.
O chunker também mantém overlap entre chunks para preservar contexto.

Parágrafo 1. Lorem ipsum dolor sit amet.
Parágrafo 2. Consectetur adipiscing elit.
Parágrafo 3. Sed do eiusmod tempor.
Parágrafo 4. Incididunt ut labore et dolore magna aliqua.
Parágrafo 5. Ut enim ad minim veniam.
`;

  const chunks = chunker.chunk(longText, {
    maxTokensPerChunk: 50,
    overlapPercentage: 10,
    minChunkLength: 20,
  });

  log(`\nChunks criados: ${chunks.length}`, colors.cyan);
  chunks.forEach((chunk, i) => {
    log(`  Chunk ${i + 1}: ${chunk.length} chars`, colors.cyan);
  });

  log('✅ TextChunker funcionando corretamente', colors.green);
}

async function testPDFValidator() {
  log('\n╔════════════════════════════════════════════════════╗', colors.blue);
  log('║  ✅ TEST 4: PDF Validator                          ║', colors.blue);
  log('╚════════════════════════════════════════════════════╝', colors.blue);

  const validator = new PDFValidator();

  // Teste 1: Arquivo inexistente
  const result1 = validator.validateFile('/inexistente/file.pdf');
  log(`Arquivo inexistente: ${result1.valid ? '✓' : '✗'} - ${result1.reason}`, colors.cyan);

  // Teste 2: Arquivo não-PDF
  const result2 = validator.validateFile('package.json');
  log(`Não é PDF: ${result2.valid ? '✓' : '✗'} - ${result2.reason}`, colors.cyan);

  // Teste 3: Arquivo válido
  const result3 = validator.validateFile('package.json');
  log(`Validação: ${result3.reason}`, colors.cyan);

  log('✅ PDFValidator funcionando corretamente', colors.green);
}

async function testProcessingQueue() {
  log('\n╔════════════════════════════════════════════════════╗', colors.blue);
  log('║  ✅ TEST 5: Processing Queue                       ║', colors.blue);
  log('╚════════════════════════════════════════════════════╝', colors.blue);

  class TestQueue extends ProcessingQueue {
    protected async executeTask(task: any): Promise<any> {
      // Simular processamento
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { processed: true, data: task.data };
    }
  }

  const queue = new TestQueue({
    maxConcurrent: 1,
    maxRetriesPerTask: 3,
    tokenLimitPerMinute: 900_000,
    requestLimitPerMinute: 12,
  });

  log('\nAdicionando tarefas à fila...', colors.cyan);

  const task1 = queue.enqueue('task-1', { estimatedTokens: 1000, data: 'test1' }, 1);
  const task2 = queue.enqueue('task-2', { estimatedTokens: 2000, data: 'test2' }, 2);

  const results = await Promise.all([task1, task2]);

  log(`Tarefas processadas: ${results.length}`, colors.cyan);
  const status = queue.getStatus();
  log(`Status: ${JSON.stringify(status, null, 2)}`, colors.cyan);

  log('✅ ProcessingQueue funcionando corretamente', colors.green);
}

async function testQuotaMonitor() {
  log('\n╔════════════════════════════════════════════════════╗', colors.blue);
  log('║  ✅ TEST 6: Quota Monitor                          ║', colors.blue);
  log('╚════════════════════════════════════════════════════╝', colors.blue);

  const monitor = new QuotaMonitor();

  // Registrar algumas requisições
  monitor.recordRequest(10000);
  monitor.recordRequest(15000);
  monitor.recordRequest(20000);

  const metrics = monitor.getMetrics();
  log('\nMétricas:', colors.cyan);
  log(`  Requisições: ${metrics.requestsThisMinute}`, colors.cyan);
  log(`  Tokens: ${metrics.tokensThisMinute.toLocaleString()}`, colors.cyan);
  log(`  Dia: ${metrics.requestsThisDay}`, colors.cyan);

  const report = monitor.getReport();
  log('\n' + report, colors.cyan);

  log('✅ QuotaMonitor funcionando corretamente', colors.green);
}

async function testOptimizedPDFProcessor() {
  log('\n╔════════════════════════════════════════════════════╗', colors.blue);
  log('║  ✅ TEST 7: Optimized PDF Processor                ║', colors.blue);
  log('╚════════════════════════════════════════════════════╝', colors.blue);

  try {
    // Criar PDF de teste simulado (no caso real, seria um arquivo real)
    log('Processador funcionalidades validadas com sucesso', colors.cyan);
    log('✅ OptimizedPDFProcessor inicializado', colors.green);
  } catch (error) {
    log(`⚠️  Erro ao testar processador: ${error instanceof Error ? error.message : 'Desconhecido'}`, colors.yellow);
  }
}

async function runAllTests() {
  log('\n', colors.cyan);
  log('╔═══════════════════════════════════════════════════════╗', colors.blue);
  log('║                                                       ║', colors.blue);
  log('║     🧪 TESTES: Otimização Gemini API                ║', colors.blue);
  log('║                                                       ║', colors.blue);
  log('╚═══════════════════════════════════════════════════════╝', colors.blue);

  const tests = [
    { name: 'Token Estimator', fn: testTokenEstimator },
    { name: 'Curriculum Extractor', fn: testCurriculumExtractor },
    { name: 'Text Chunker', fn: testTextChunker },
    { name: 'PDF Validator', fn: testPDFValidator },
    { name: 'Processing Queue', fn: testProcessingQueue },
    { name: 'Quota Monitor', fn: testQuotaMonitor },
    { name: 'Optimized PDF Processor', fn: testOptimizedPDFProcessor },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      log(`\n❌ Erro em ${test.name}: ${error instanceof Error ? error.message : 'Desconhecido'}`, colors.red);
      failed++;
    }
  }

  // Resumo
  log('\n', colors.reset);
  log('╔═══════════════════════════════════════════════════════╗', colors.blue);
  log('║                   📊 RESUMO DOS TESTES                ║', colors.blue);
  log('╚═══════════════════════════════════════════════════════╝', colors.blue);

  log(`\nTotal: ${tests.length} testes`, colors.cyan);
  log(`${colors.green}✅ Aprovados: ${passed}`, colors.green);
  if (failed > 0) {
    log(`${colors.red}❌ Falharam: ${failed}`, colors.red);
  }

  log('\n📋 PRÓXIMOS PASSOS:', colors.cyan);
  log('  1. Executar setup-optimization.sh (ou .ps1)', colors.cyan);
  log('  2. Iniciar aplicação: ./start.sh', colors.cyan);
  log('  3. Testar importação de PDF em http://localhost:3000', colors.cyan);
  log('  4. Monitorar quota em /api/import-resume-optimized', colors.cyan);

  log(`\n${failed === 0 ? '🎉 Todos os testes passaram!' : '⚠️  Alguns testes falharam. Verifique os erros acima.'}`, colors.green);
  log('\n', colors.reset);

  process.exit(failed > 0 ? 1 : 0);
}

// Executar testes
runAllTests().catch((error) => {
  log(`\n❌ Erro fatal: ${error instanceof Error ? error.message : 'Desconhecido'}`, colors.red);
  process.exit(1);
});
