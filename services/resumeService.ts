import { ResumeData, TemplateOption } from '../types';

// Placeholder para currículos sem foto (avatarUrl vazio/nulo).
// Evita <img src=""> (recarrega a própria página e gera erro no React/Next em dev).
export const DEFAULT_AVATAR_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23cbd5e1'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%2394a3b8'/%3E%3Cellipse cx='50' cy='88' rx='30' ry='24' fill='%2394a3b8'/%3E%3C/svg%3E";

// Função auxiliar para gerar IDs únicos de forma segura (funciona em HTTP e HTTPS)
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
        return crypto.randomUUID();
    } catch (e) {
        // Fallback silencioso
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Utilitário de Compressão de Imagem Centralizado
// Evita o erro de QuotaExceededError do localStorage reduzindo o tamanho da imagem
export const compressImage = (file: File, maxWidth: number = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scaleSize = maxWidth / img.width;
          
          // Se a imagem for menor que o limite, usa o tamanho original
          if (scaleSize >= 1) {
             canvas.width = img.width;
             canvas.height = img.height;
          } else {
             canvas.width = maxWidth;
             canvas.height = img.height * scaleSize;
          }

          const ctx = canvas.getContext('2d');
          if (!ctx) {
             reject("Contexto do canvas não encontrado");
             return;
          }
          
          // Preencher fundo com branco para evitar fundo preto em PNGs transparentes
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Converte para JPEG com 70% de qualidade para otimizar armazenamento
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
};

export const templates: TemplateOption[] = [
  // ── Layouts clássicos (variações de cor) ───────────────────────────────────
  { id: 'original', name: 'Original Forest', color: '#d97706', description: 'Estilo padrão com tons terrosos.' },
  { id: 'blue', name: 'Corporate Blue', color: '#2563eb', description: 'Profissional e confiável.' },
  { id: 'red', name: 'Bold Red', color: '#dc2626', description: 'Para quem quer destaque imediato.' },
  { id: 'green', name: 'Eco Green', color: '#059669', description: 'Fresco e equilibrado.' },
  { id: 'purple', name: 'Royal Purple', color: '#7c3aed', description: 'Elegante e criativo.' },
  { id: 'black', name: 'Mono Black', color: '#171717', description: 'Alto contraste e seriedade.' },
  { id: 'magenta', name: 'Vivid Magenta', color: '#db2777', description: 'Moderno e artístico.' },
  { id: 'violet', name: 'Deep Violet', color: '#5b21b6', description: 'Sofisticado e misterioso.' },
  { id: 'gray', name: 'Minimal Gray', color: '#57534e', description: 'Limpo e minimalista.' },
  { id: 'lilac', name: 'Soft Lilac', color: '#c084fc', description: 'Suave e moderno.' },
  // ── Novos layouts estruturais ──────────────────────────────────────────────
  { id: 'tech', name: 'Tech Dark Pro', color: '#10b981', description: 'Grid moderno estilo tech/startup.' },
  { id: 'timeline', name: 'Clean Timeline', color: '#f59e0b', description: 'Timeline com foco em experiência.' },
  { id: 'creative', name: 'Creative Split', color: '#8b5cf6', description: 'Layout assimétrico e criativo.' },
  // ── Novos templates estruturais ────────────────────────────────────────────
  { id: 'minimal', name: 'Minimalista Pro', color: '#64748b', description: 'Extremamente limpo e elegante com espaçamento generoso.' },
  { id: 'academic', name: 'Acadêmico Formal', color: '#0f172a', description: 'Formal e tradicional, ideal para pesquisadores e acadêmicos.' },
  { id: 'modern', name: 'Moderno Dinâmico', color: '#ec4899', description: 'Contemporâneo e vibrante com acentos gradientes.' },
  // ── Novos templates com foto (fiéis a referências visuais) ─────────────────
  { id: 'corporate-blue', name: 'Corporate Analyst', color: '#1c4e82', description: 'Executivo, com destaque gráfico financeiro.' },
  { id: 'legal-black', name: 'Legal Noir', color: '#111111', description: 'Elegante e sóbrio, ideal para área jurídica.' },
  { id: 'engineer-navy', name: 'Engineer Navy', color: '#1e3a5f', description: 'Técnico e estruturado, com sidebar de contato.' },
  { id: 'grunge-gray', name: 'Editorial Grunge', color: '#3f3f3f', description: 'Tipografia forte para perfis criativos.' },
  { id: 'fashion-red', name: 'Fashion Bold', color: '#ff3131', description: 'Impacto visual para moda e design.' },
];

export const initialResumeData: ResumeData = {
  id: 'default-init',
  userId: 'default-user',
  templateId: 'original',
  themeMode: 'dark', // Padrão Escuro
  lastUpdated: new Date().toISOString(),
  isPinned: false,
  fullName: "MARIA FERNANDES",
  role: "Senior UX/UI Designer & Product Strategist",
  email: "maria.fernandes@email.com",
  phone: "+55 11 98765-4321",
  linkedin: "linkedin/mariafernandes",
  portfolio: "portfolio.com",
  summary: "Designer UX/UI com mais de 8 anos de experiência na criação de interfaces intuitivas e centradas no usuário para aplicações web e mobile. Apaixonada por resolver problemas complexos através do design, com forte habilidade em pesquisa, prototipagem e colaboração com equipes de desenvolvimento.",
  avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBKfd51M6l8RpIQ_jTNw4Id5iOQ4vFkIleM5-ZmYk_pFKjgVZIpKcrSmIL95hwsOwAuCYNwSakYFmOtdUm4J2ikNQCW2kPSOg31LbvXUjn3Oqk-y19GujNITmAgNo0MfuoU0Jtk0KX7g9VR02z_5_M1bQ7M77DwZJsqG6DdHggZuJvcIkoJEuCaKL-ucHhT38o-byQPcrC81timsrnGB1WEK1wJe-HdoJusyqVPpS8k8k9XlzwyX3I_epHxVqT7BSAOZuK-ghfPgsO2",
  experiences: [
    {
      id: "1",
      role: "UX/UI Designer Sênior",
      company: "Tech Solutions Inc.",
      period: "2020 - PRESENTE",
      description: "Liderou o redesign completo da plataforma SaaS, aumentando retenção em 20%. Conduziu pesquisas com usuários e testes de usabilidade para informar decisões."
    },
    {
      id: "2",
      role: "Designer de Produto",
      company: "Creative Agency",
      period: "2018 - 2020",
      description: "Criou design systems escaláveis para múltiplos clientes de e-commerce. Desenvolveu interfaces mobile focadas em conversão fluida para iOS e Android."
    }
  ],
  education: [
    {
      id: "1",
      degree: "Design Gráfico",
      institution: "Univ. Federal de Design",
      year: "2014 - 2018",
      type: "Bacharelado"
    },
    {
      id: "2",
      degree: "User Experience",
      institution: "UX Academy Online",
      year: "2019",
      type: "Certificação"
    }
  ],
  skills: [
    { id: "1", name: "UI/UX Design", level: 95 },
    { id: "2", name: "Figma & Adobe XD", level: 100 },
    { id: "3", name: "Prototipagem", level: 90 },
    { id: "4", name: "JavaScript / React", level: 75 }
  ],
  languages: [
    { id: "1", name: "Português", level: "Nativo" },
    { id: "2", name: "Inglês", level: "C2" },
    { id: "3", name: "Espanhol", level: "B1" }
  ],
  hobbies: [
    "Fotografia",
    "Viagens",
    "Leitura Técnica",
    "Ciclismo"
  ]
};