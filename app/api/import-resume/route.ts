import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { isGeminiQuotaError, GEMINI_QUOTA_MESSAGE, isGeminiOverloadedError, GEMINI_OVERLOADED_MESSAGE } from '@/lib/geminiQuotaError';
import { generateUUID } from '@/services/resumeService';
import { withRetry } from '@/lib/gemini/retry';

export async function POST(req: Request) {
  try {
    // 1. Autenticar
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    // 2. Obter arquivo do formulário
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido.' }, { status: 400 });
    }

    // 3. Converter para Base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // 4. Chamar Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave de API não configurada.' },
        { status: 500 }
      );
    }

    const client = new GoogleGenAI({ apiKey });

    // Schema para resposta estruturada
    const resumeSchema = {
      type: Type.OBJECT,
      properties: {
        fullName: { type: Type.STRING },
        role: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        linkedin: { type: Type.STRING },
        portfolio: { type: Type.STRING },
        summary: { type: Type.STRING },
        experiences: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              role: { type: Type.STRING },
              company: { type: Type.STRING },
              period: { type: Type.STRING },
              description: { type: Type.STRING },
            },
          },
        },
        education: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              degree: { type: Type.STRING },
              institution: { type: Type.STRING },
              year: { type: Type.STRING },
              type: { type: Type.STRING },
            },
          },
        },
        skills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              level: { type: Type.NUMBER },
            },
          },
        },
        languages: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              level: { type: Type.STRING },
            },
          },
        },
        hobbies: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['fullName', 'role', 'summary'],
    };

    console.log('[import-resume] Iniciando análise do PDF com Gemini...');

    // Retry curto para erros transitórios (ex: 503 "modelo sobrecarregado").
    // maxRetries baixo de propósito: cada chamada ao Gemini já pode demorar
    // vários minutos sozinha em picos de demanda — múltiplos retries podem
    // multiplicar a espera do usuário em vez de ajudar.
    const { result: response } = await withRetry(
      () => client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            },
            {
              text: 'Você é um especialista em recrutamento. Analise este currículo em PDF e extraia todas as informações em JSON estruturado. Se algo não estiver presente, use valores vazios.',
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: resumeSchema,
          // Se o navegador desistir (timeout/fechar aba), interrompe a espera
          // aqui no servidor. Não cancela a chamada nem a cobrança no lado da
          // Google (é uma operação "client-only" segundo o próprio SDK) — só
          // evita que este processo continue preso depois que ninguém mais
          // vai usar o resultado.
          abortSignal: req.signal,
        },
      }),
      { maxRetries: 1, baseDelayMs: 1500, maxDelayMs: 3000 },
    );

    const responseText = response.text;
    console.log('[import-resume] Resposta da IA recebida');

    if (!responseText) {
      return NextResponse.json(
        { error: 'A IA não retornou dados.' },
        { status: 500 }
      );
    }

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error('[import-resume] Erro ao parsear JSON:', responseText);
      return NextResponse.json(
        { error: 'Erro ao processar resposta da IA.' },
        { status: 500 }
      );
    }

    // Estruturar resposta para o cliente
    const resumeData = {
      fullName: parsedData.fullName || 'Novo Currículo',
      role: parsedData.role || '',
      email: parsedData.email || '',
      phone: parsedData.phone || '',
      linkedin: parsedData.linkedin || '',
      portfolio: parsedData.portfolio || '',
      summary: parsedData.summary || '',
      experiences: (parsedData.experiences || []).map((exp: any) => ({
        id: generateUUID(),
        role: exp.role || '',
        company: exp.company || '',
        period: exp.period || '',
        description: exp.description || '',
      })),
      education: (parsedData.education || []).map((edu: any) => ({
        id: generateUUID(),
        degree: edu.degree || '',
        institution: edu.institution || '',
        year: edu.year || '',
        type: edu.type || 'Bacharelado',
      })),
      skills: (parsedData.skills || []).map((skill: any) => ({
        id: generateUUID(),
        name: skill.name || '',
        level: typeof skill.level === 'number' ? skill.level : 70,
      })),
      languages: (parsedData.languages || []).map((lang: any) => ({
        id: generateUUID(),
        name: lang.name || '',
        level: lang.level || 'Básico',
      })),
      hobbies: parsedData.hobbies || [],
    };

    console.log('[import-resume] Sucesso na importação');
    return NextResponse.json({ resumeData }, { status: 200 });
  } catch (err: any) {
    console.error('[import-resume] Erro:', err.message);

    // Erro de quota da API Gemini (429 - RESOURCE_EXHAUSTED): nunca repassar o
    // JSON cru do Google para o usuário — retornar uma mensagem clara e acionável.
    if (isGeminiQuotaError(err)) {
      return NextResponse.json({ error: GEMINI_QUOTA_MESSAGE }, { status: 429 });
    }

    // Modelo temporariamente sobrecarregado (503 - UNAVAILABLE), mesmo após retry.
    if (isGeminiOverloadedError(err)) {
      return NextResponse.json({ error: GEMINI_OVERLOADED_MESSAGE }, { status: 503 });
    }

    return NextResponse.json(
      { error: err.message || 'Erro ao importar currículo.' },
      { status: 500 }
    );
  }
}
