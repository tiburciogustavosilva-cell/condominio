/** Cliente da API do backend (Express + Prisma). Token JWT vai como Bearer em toda chamada. */
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api';
const CHAVE_TOKEN = 'token';

export const tokenStore = {
  get: () => localStorage.getItem(CHAVE_TOKEN),
  set: (t: string) => localStorage.setItem(CHAVE_TOKEN, t),
  limpar: () => localStorage.removeItem(CHAVE_TOKEN)
};

/** Disparado quando a API responde 401 com token — o useAuth desloga. */
export const EVENTO_SESSAO_EXPIRADA = 'sessao-expirada';

async function req<T>(method: string, rota: string, body?: unknown): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(BASE + rota, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (res.status === 401 && token) {
    tokenStore.limpar();
    window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
  }
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.erro ?? `Erro ${res.status}`);
  return json as T;
}

/** Arquivo binário autenticado (ex.: foto da encomenda) → URL local pra usar em <img>. Revogue com URL.revokeObjectURL. */
export async function baixarComoUrl(rota: string): Promise<string> {
  const token = tokenStore.get();
  const res = await fetch(BASE + rota, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('Não foi possível carregar o arquivo');
  return URL.createObjectURL(await res.blob());
}

export const api = {
  get: <T = any>(rota: string) => req<T>('GET', rota),
  post: <T = any>(rota: string, body?: unknown) => req<T>('POST', rota, body ?? {}),
  put: <T = any>(rota: string, body: unknown) => req<T>('PUT', rota, body),
  patch: <T = any>(rota: string, body?: unknown) => req<T>('PATCH', rota, body ?? {}),
  delete: <T = any>(rota: string) => req<T>('DELETE', rota)
};
