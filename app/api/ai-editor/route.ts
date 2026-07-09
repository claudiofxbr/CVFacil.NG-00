import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { isGeminiQuotaError, GEMINI_QUOTA_MESSAGE, isGeminiOverloadedError, GEMINI_OVERLOADED_MESSAGE } from '@/lib/geminiQuotaError';
import { withRetry } from '@/lib/gemini/retry';

function auth(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

function friendlyError(err: any): { message: string; status: number } {
  if (isGeminiQuotaError(err)) return { message: GEMINI_QUOTA_MESSAGE, status: 429 };
  if (isGeminiOverloadedError(err)) return { message: GEMINI_OVERLOADED_MESSAGE, status: 503 };
  return { message: err?.message || 'Erro ao processar solicitação de IA.', status: 500 };
}

export async function POST(req: Request) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Chave de API não configurada no servidor.' }, { status: 500 });
  }
  const ai = new GoogleGenAI({ apiKey });

  const body = await req.json();
  const { action } = body;

  try {
    if (action === 'improve-text') {
      const { text, context } = body;
      if (!text || String(text).trim().length < 10) {
        return NextResponse.json({ error: 'O texto é muito curto para ser melhorado.' }, { status: 400 });
      }

      const { result } = await withRetry(
        () => ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { text: `Você é um especialista em escrita de currículos e tech recruiter.
              Sua tarefa é melhorar o seguinte texto para torná-lo mais profissional, impactante e focado em resultados.

              Contexto: ${context}
              Texto original: "${text}"

              Instruções:
              1. Mantenha a verdade dos fatos.
              2. Use verbos de ação fortes.
              3. Destaque conquistas e métricas se possível.
              4. O tom deve ser profissional e confiante.
              5. Retorne APENAS o texto melhorado, sem explicações ou aspas.` }
            ]
          },
          config: { abortSignal: req.signal },
        }),
        { maxRetries: 1, baseDelayMs: 1000, maxDelayMs: 3000 },
      );

      const improvedText = result.text;
      if (!improvedText) {
        return NextResponse.json({ error: 'A IA não conseguiu processar o texto.' }, { status: 500 });
      }
      return NextResponse.json({ improvedText: improvedText.trim() });
    }

    if (action === 'suggest-skills') {
      const { experiences } = body;
      if (!Array.isArray(experiences) || experiences.length === 0) {
        return NextResponse.json({ error: 'Adicione algumas experiências para receber sugestões de habilidades.' }, { status: 400 });
      }

      const expContext = experiences.map((e: any) => `${e.role} na ${e.company}: ${e.description}`).join('\n');

      const { result } = await withRetry(
        () => ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { text: `Com base nas seguintes experiências profissionais, sugira uma lista de até 10 habilidades técnicas (hard skills) e comportamentais (soft skills) relevantes.

              Experiências:
              ${expContext}

              Retorne APENAS uma lista de strings separadas por vírgula.` }
            ]
          },
          config: { abortSignal: req.signal },
        }),
        { maxRetries: 1, baseDelayMs: 1000, maxDelayMs: 3000 },
      );

      const text = result.text;
      const skills = text ? text.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [];
      return NextResponse.json({ skills });
    }

    if (action === 'test-connection') {
      const { result } = await withRetry(
        () => ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: 'Olá, IA! Confirme que sua integração com o CVFacil.NG está funcionando.',
          config: { abortSignal: req.signal },
        }),
        { maxRetries: 1, baseDelayMs: 1000, maxDelayMs: 3000 },
      );
      return NextResponse.json({ text: result.text || 'Sem resposta de texto.' });
    }

    return NextResponse.json({ error: `Ação não suportada: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[ai-editor] Erro:', err.message);
    const { message, status } = friendlyError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
