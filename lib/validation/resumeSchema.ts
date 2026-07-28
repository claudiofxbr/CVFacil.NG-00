import { z } from 'zod';

// Limites conservadores: o objetivo não é restringir o uso legítimo (o maior
// currículo real observado fica bem abaixo disso), e sim rejeitar payloads
// desproporcionais antes de gravar como JSON no banco (achado M9 da auditoria
// de 22/07 — as rotas de currículo não validavam nada além do que o
// TypeScript já ignora em runtime).
const MAX_ITEMS = 50;
const MAX_TEXT = 5000;
const MAX_SHORT = 300;
// avatarUrl é uma data URL (imagem já comprimida no cliente para ~400px de
// largura, JPEG qualidade 0.7 — ver services/resumeService.ts:compressImage).
// O teto aqui é só uma rede de segurança contra alguém chamando a API
// diretamente com uma imagem não comprimida, não o tamanho esperado normal.
const MAX_AVATAR = 1_000_000;

const experienceSchema = z.object({
  id: z.string().max(100),
  role: z.string().max(MAX_SHORT),
  company: z.string().max(MAX_SHORT),
  period: z.string().max(100),
  description: z.string().max(MAX_TEXT),
});

const educationSchema = z.object({
  id: z.string().max(100),
  degree: z.string().max(MAX_SHORT),
  institution: z.string().max(MAX_SHORT),
  year: z.string().max(50),
  type: z.string().max(50),
});

const skillSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(MAX_SHORT),
  level: z.number().min(0).max(100),
});

const languageSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(MAX_SHORT),
  level: z.string().max(50),
});

const baseFields = {
  templateId: z.string().max(100).optional(),
  themeMode: z.string().max(20).optional(),
  fullName: z.string().max(MAX_SHORT).optional(),
  role: z.string().max(MAX_SHORT).optional(),
  email: z.string().max(MAX_SHORT).optional(),
  phone: z.string().max(MAX_SHORT).optional(),
  linkedin: z.string().max(MAX_SHORT).optional(),
  portfolio: z.string().max(MAX_SHORT).optional(),
  summary: z.string().max(MAX_TEXT).optional(),
  experiences: z.array(experienceSchema).max(MAX_ITEMS).optional(),
  education: z.array(educationSchema).max(MAX_ITEMS).optional(),
  skills: z.array(skillSchema).max(MAX_ITEMS).optional(),
  languages: z.array(languageSchema).max(MAX_ITEMS).optional(),
  hobbies: z.array(z.string().max(MAX_SHORT)).max(MAX_ITEMS).optional(),
  avatarUrl: z.string().max(MAX_AVATAR).nullable().optional(),
  isPinned: z.boolean().optional(),
};

export const resumeCreateSchema = z.object({
  ...baseFields,
  isImported: z.boolean().optional(),
});

export const resumeUpdateSchema = z.object({
  ...baseFields,
  isAutoSave: z.boolean().optional(),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
}
