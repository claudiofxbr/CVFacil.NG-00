const TOKEN_KEY = 'auth-token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

export const setToken = (token: string) => {
  if (typeof window === 'undefined') return;

  // Salvar em localStorage
  localStorage.setItem(TOKEN_KEY, token);

  // Salvar em cookie (para middleware acessar server-side)
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=604800; SameSite=Strict`;
};

export const removeToken = () => {
  if (typeof window === 'undefined') return;

  // Remover de localStorage
  localStorage.removeItem(TOKEN_KEY);

  // Remover cookie
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Strict`;
};

async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { ...init, headers });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error ?? `Erro ${res.status}`, res.status);
  return data;
}

export const api = {
  get:    (path: string)                    => apiFetch(path),
  post:   (path: string, body: unknown)     => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path: string, body: unknown)     => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path: string, body?: unknown)    => apiFetch(path, { method: 'PATCH',  body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: (path: string)                    => apiFetch(path, { method: 'DELETE' }),
};

// Baixa um arquivo de uma rota autenticada (ex.: exportação CSV) como download
// do navegador. Diferente de `api.*`, não faz parse de JSON na resposta.
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error ?? `Erro ${res.status}`, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
