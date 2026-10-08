import { HttpResponse, type HttpResponseInit } from 'msw';
import { Problema, persistir as persistirFase2 } from './fase2/db';
import { persistir as persistirFase3 } from './fase3/db';

/** Respuesta problem+json, igual que la API real (con sus campos extra: `incumplimientos`, `erroresReglas`…). */
export function problema(e: Problema) {
  return HttpResponse.json(
    {
      status: e.status,
      code: e.code,
      title: e.title,
      ...e.extras,
      requestId: 'req_mock',
    },
    { status: e.status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

/**
 * Ejecuta la operación de la base simulada y traduce `Problema` a problem+json; cualquier otro error se relanza.
 * Tras cada operación correcta guarda el estado para que la demo sobreviva a una recarga.
 */
export function responder<T>(operacion: () => T, init?: HttpResponseInit) {
  try {
    const dato = operacion();
    persistirFase2();
    persistirFase3();
    return dato === undefined
      ? new HttpResponse(null, { status: 204 })
      : HttpResponse.json(dato, init);
  } catch (e) {
    if (e instanceof Problema) return problema(e);
    throw e;
  }
}

export const ruta = (p: string) => `/api${p}`;
export const cuerpo = async <T>(request: Request) => (await request.json().catch(() => ({}))) as T;
