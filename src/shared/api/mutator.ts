import { portalDeRuta, type Portal } from './portales';

export class ApiError extends Error {
  /** Portal al que pertenecía la petición (lo fija apiFetch); sirve para decidir a dónde redirigir. */
  portal?: Portal;
  /**
   * Cuerpo completo del problem+json. Trae los campos extra del contrato (`incumplimientos`, `erroresReglas`,
   * `camposBloqueados`) que el resto del error no modela.
   */
  cuerpo?: Record<string, unknown>;

  constructor(
    public status: number,
    public code: string,
    public title: string,
    public detail?: string,
    public requestId?: string,
    public errors?: string[],
  ) {
    super(title);
    this.name = 'ApiError';
  }
}

/** Construye un ApiError desde un cuerpo application/problem+json (puro, testeable). */
export function problemToApiError(status: number, body: unknown): ApiError {
  const p = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const error = new ApiError(
    typeof p.status === 'number' ? p.status : status,
    str(p.code) ?? 'UNKNOWN',
    str(p.title) ?? 'Error',
    str(p.detail),
    str(p.requestId),
    Array.isArray(p.errors) ? p.errors.map(String) : undefined,
  );
  error.cuerpo = p;
  return error;
}

export type ResultadoRefresh = 'ok' | 'expirada' | 'bloqueada';

const refrescos = new Map<Portal, Promise<ResultadoRefresh>>(); // single-flight por portal (R1)

/**
 * Refresca la sesión de un portal. Una única petición en curso por portal: las demás esperan su
 * resultado. 204 = ok; 403 ORG_BLOQUEADA = cliente bloqueado (la sesión sigue viva, no se borra nada);
 * cualquier otra cosa = sesión expirada.
 */
export function refrescarSesion(portal: Portal): Promise<ResultadoRefresh> {
  let enCurso = refrescos.get(portal);
  if (!enCurso) {
    enCurso = fetch(`/api/auth/refresh?portal=${portal}`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res): Promise<ResultadoRefresh> => {
        if (res.status === 204) return 'ok';
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          if (problemToApiError(res.status, body).code === 'ORG_BLOQUEADA') return 'bloqueada';
        }
        return 'expirada';
      })
      .catch((): ResultadoRefresh => 'expirada')
      .finally(() => {
        refrescos.delete(portal);
      });
    refrescos.set(portal, enCurso);
  }
  return enCurso;
}

const ORG_BLOQUEADA_ERROR = () =>
  new ApiError(403, 'ORG_BLOQUEADA', 'Cliente bloqueado', 'El cliente está bloqueado.');

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const portal = portalDeRuta(url);
  const doFetch = () => fetch(`/api${url}`, { ...init, credentials: 'include' });
  let res = await doFetch();

  // 401 en una ruta de portal: un refresh y un único reintento. Los /auth/* no se refrescan.
  if (res.status === 401 && portal && !url.startsWith('/auth/')) {
    const resultado = await refrescarSesion(portal);
    if (resultado === 'ok') {
      res = await doFetch();
    } else if (resultado === 'bloqueada') {
      const error = ORG_BLOQUEADA_ERROR();
      error.portal = portal;
      throw error;
    }
  }

  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  const body = await res.json().catch(() => ({}));
  const error = problemToApiError(res.status, body);
  if (portal) error.portal = portal;
  throw error;
}
