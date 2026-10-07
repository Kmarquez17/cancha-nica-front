export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public title: string,
    public detail?: string,
    public requestId?: string,
    public errors?: FieldError[],
  ) {
    super(title);
    this.name = 'ApiError';
  }
}

/** Construye un ApiError desde un cuerpo application/problem+json (puro, testeable). */
export function problemToApiError(status: number, body: unknown): ApiError {
  const p = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  return new ApiError(
    typeof p.status === 'number' ? p.status : status,
    str(p.code) ?? 'UNKNOWN',
    str(p.title) ?? 'Error',
    str(p.detail),
    str(p.requestId),
    Array.isArray(p.errors) ? (p.errors as FieldError[]) : undefined,
  );
}

let refreshing: Promise<boolean> | null = null; // single-flight (R1)

// TODO(Fase 1): refresh real POST /api/auth/refresh + redirección al login del portal.
async function refreshSession(): Promise<boolean> {
  refreshing ??= Promise.resolve(false).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const doFetch = () => fetch(`/api${url}`, { ...init, credentials: 'include' });
  let res = await doFetch();
  if (res.status === 401 && !url.startsWith('/auth/') && (await refreshSession())) {
    res = await doFetch(); // reintento único
  }
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  const body = await res.json().catch(() => ({}));
  throw problemToApiError(res.status, body);
}
