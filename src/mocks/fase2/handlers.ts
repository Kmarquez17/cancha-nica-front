import { http, HttpResponse, type HttpResponseInit } from 'msw';
import type {
  ActualizarEdicionBody,
  CambiarEstadoBody,
  CrearCategoriaBody,
  CrearEdicionBody,
  MesaLoginBody,
} from '@/features/ediciones/tipos';
import * as db from './db';

/** Respuesta problem+json, igual que la API real. */
function problema(e: db.Problema) {
  return HttpResponse.json(
    {
      status: e.status,
      code: e.code,
      title: e.title,
      errors: e.errors,
      requestId: 'req_mock_fase2',
    },
    { status: e.status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

/** Ejecuta la operación de la base y traduce `Problema` a problem+json; cualquier otro error se relanza. */
function responder<T>(operacion: () => T, init?: HttpResponseInit) {
  try {
    const dato = operacion();
    db.persistir();
    return dato === undefined
      ? new HttpResponse(null, { status: 204 })
      : HttpResponse.json(dato, init);
  } catch (e) {
    if (e instanceof db.Problema) return problema(e);
    throw e;
  }
}

const ruta = (p: string) => `/api${p}`;
const archivadas = (request: Request) =>
  new URL(request.url).searchParams.get('archivadas') === 'true';
const cuerpo = async <T>(request: Request) => (await request.json().catch(() => ({}))) as T;

/** Endpoints simulados de la Fase 2. Todo lo demás (sesión, /admin/me, plataforma) pasa a la API real. */
export const handlersFase2 = [
  // ---- categorías
  http.get(ruta('/admin/categorias'), ({ request }) =>
    responder(() => db.listarCategorias(archivadas(request))),
  ),
  http.post(ruta('/admin/categorias'), async ({ request }) => {
    const b = await cuerpo<CrearCategoriaBody>(request);
    return responder(() => db.crearCategoria(b), { status: 201 });
  }),
  http.patch(ruta('/admin/categorias/:id'), async ({ request, params }) => {
    const b = await cuerpo<Partial<CrearCategoriaBody>>(request);
    return responder(() => db.actualizarCategoria(String(params.id), b));
  }),
  http.post(ruta('/admin/categorias/:id/archivar'), ({ params }) =>
    responder(() => db.archivarCategoria(String(params.id), true)),
  ),
  http.post(ruta('/admin/categorias/:id/restaurar'), ({ params }) =>
    responder(() => db.archivarCategoria(String(params.id), false)),
  ),

  // ---- ediciones (ligas)
  http.get(ruta('/admin/ediciones'), ({ request }) =>
    responder(() => db.listarEdiciones(archivadas(request))),
  ),
  http.post(ruta('/admin/ediciones'), async ({ request }) => {
    const b = await cuerpo<CrearEdicionBody>(request);
    return responder(() => db.crearEdicion(b), { status: 201 });
  }),
  http.get(ruta('/admin/ediciones/:id'), ({ params }) =>
    responder(() => db.obtenerEdicion(String(params.id))),
  ),
  http.patch(ruta('/admin/ediciones/:id'), async ({ request, params }) => {
    const b = await cuerpo<ActualizarEdicionBody>(request);
    return responder(() => db.actualizarEdicion(String(params.id), b));
  }),
  http.post(ruta('/admin/ediciones/:id/archivar'), ({ params }) =>
    responder(() => db.archivarEdicion(String(params.id), true)),
  ),
  http.post(ruta('/admin/ediciones/:id/restaurar'), ({ params }) =>
    responder(() => db.archivarEdicion(String(params.id), false)),
  ),
  http.post(ruta('/admin/ediciones/:id/estado'), async ({ request, params }) => {
    const b = await cuerpo<CambiarEstadoBody>(request);
    return responder(() => db.cambiarEstado(String(params.id), b));
  }),

  // ---- mesas
  http.get(ruta('/admin/mesas'), () => responder(() => db.listarMesas())),
  http.post(ruta('/admin/mesas'), async ({ request }) => {
    const b = await cuerpo<{ nombreOperador?: string | null }>(request);
    return responder(() => db.crearMesa(b), { status: 201 });
  }),
  http.patch(ruta('/admin/mesas/:id'), async ({ request, params }) => {
    const b = await cuerpo<{ nombreOperador?: string | null; activa?: boolean }>(request);
    return responder(() => db.actualizarMesa(String(params.id), b));
  }),
  http.put(ruta('/admin/mesas/:id/ediciones'), async ({ request, params }) => {
    const b = await cuerpo<{ edicionIds: string[] }>(request);
    return responder(() => db.asignarEdiciones(String(params.id), b.edicionIds ?? []));
  }),
  http.post(ruta('/admin/mesas/:id/pin/reset'), ({ params }) =>
    responder(() => db.resetearPin(String(params.id))),
  ),
  http.post(ruta('/admin/mesas/:id/desbloquear'), ({ params }) =>
    responder(() => db.desbloquearMesa(String(params.id))),
  ),

  // ---- login de mesa (por el slug del cliente)
  http.post(ruta('/auth/mesa/:orgSlug/login'), async ({ request, params }) => {
    const b = await cuerpo<MesaLoginBody>(request);
    return responder(() => {
      db.loginMesa(String(params.orgSlug), b.username ?? '', b.pin ?? '');
      return undefined;
    });
  }),
  http.post(ruta('/auth/mesa/logout'), () =>
    responder(() => {
      db.cerrarSesionMesa();
      return undefined;
    }),
  ),
  http.get(ruta('/mesa/me'), () => responder(() => db.mesaMe())),
];
