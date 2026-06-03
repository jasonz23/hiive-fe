export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      message = Array.isArray(body.message) ? body.message.join(', ') : body.message ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** SWR fetcher. */
export function fetcher<T>(path: string): Promise<T> {
  return fetch(`${API_BASE}${path}`).then((r) => parse<T>(r));
}

export function apiGet<T>(path: string): Promise<T> {
  return fetcher<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((r) => parse<T>(r));
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((r) => parse<T>(r));
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return fetch(`${API_BASE}${path}`, { method: 'POST', body: form }).then((r) => parse<T>(r));
}
