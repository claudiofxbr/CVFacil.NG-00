import { ResumeData } from "../types";
import { generateUUID } from "./resumeService";
import { getToken } from "../lib/apiClient";
import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js
// Usamos a versão do unpkg que é mais confiável para arquivos específicos de pacotes npm
// Adicionamos o protocolo https explicitamente para evitar problemas de carregamento
const PDFJS_VERSION = '5.5.207';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

/**
 * Importa um currículo a partir de um PDF.
 *
 * A validação/leitura inicial do PDF acontece no navegador (pdfjs-dist, não
 * depende de nenhuma chave de API), mas a extração de dados via IA é feita
 * no servidor (app/api/import-resume/route.ts) — a chave da API Gemini nunca
 * é exposta no bundle do navegador.
 */
export const importResumeFromPdf = async (
  file: File,
  userId: string,
  defaultAvatar: string
): Promise<ResumeData> => {
  // 1. Validar PDF antes de enviar (evita subir um arquivo obviamente inválido)
  try {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT_PDF")), 15000)
    );

    const pdf = await Promise.race([loadingTask.promise, timeoutPromise]) as any;
    console.log(`PDF validado: ${pdf.numPages} páginas encontradas.`);

    if (pdf.numPages === 0) {
      throw new Error("O arquivo PDF parece estar vazio.");
    }
  } catch (error: any) {
    console.error("Erro ao validar PDF com pdfjs-dist:", error);

    if (error.message === "TIMEOUT_PDF") {
      throw new Error("O motor de processamento de PDF demorou muito para responder. Tente um arquivo menor ou verifique sua conexão.");
    }

    if (error.message?.includes("worker") || error.message?.includes("fetch")) {
      throw new Error("Erro ao inicializar o motor de PDF. Por favor, verifique sua conexão ou tente novamente.");
    }

    throw new Error("O arquivo fornecido não é um PDF válido ou está corrompido.");
  }

  // 2. Enviar para a rota server-side que faz a extração via IA
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos

  let response: Response;
  try {
    response = await fetch('/api/import-resume', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${getToken()}` },
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('A importação está demorando muito (mais de 2 minutos). O serviço de IA pode estar sobrecarregado — tente novamente em alguns instantes.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || 'Erro ao importar currículo.');
  }

  const parsedData = json.resumeData;

  // 3. Completar os campos que só existem no contexto do cliente (id local,
  // usuário atual, template/tema padrão do novo currículo, avatar atual).
  const newResume: ResumeData = {
    id: generateUUID(),
    userId,
    templateId: 'original',
    themeMode: 'dark',
    lastUpdated: new Date().toISOString(),
    fullName: parsedData.fullName || "Novo Currículo",
    role: parsedData.role || "",
    email: parsedData.email || "",
    phone: parsedData.phone || "",
    linkedin: parsedData.linkedin || "",
    portfolio: parsedData.portfolio || "",
    summary: parsedData.summary || "",
    avatarUrl: defaultAvatar,
    experiences: parsedData.experiences || [],
    education: parsedData.education || [],
    skills: parsedData.skills || [],
    languages: parsedData.languages || [],
    hobbies: parsedData.hobbies || [],
    isPinned: false,
  };

  return newResume;
};
