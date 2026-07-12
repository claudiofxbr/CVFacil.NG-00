export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  // Sessao vai via cookie httpOnly (enviado automaticamente pelo navegador
  // em requisicoes same-origin) -- nao ha mais token acessivel via JS para
  // montar um header Authorization.
  const res = await fetch(path, { ...init, headers, credentials: 'same-origin' });
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
  const res = await fetch(path, { credentials: 'same-origin' });
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
