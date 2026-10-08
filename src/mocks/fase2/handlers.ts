import { http, passthrough } from 'msw';
import type {
  ActualizarCategoriaDto,
  ActualizarEdicionDto,
  ActualizarMesaDto,
  CambiarEstadoDto,
  CrearCategoriaDto,
  CrearEdicionDto,
  CrearMesaDto,
  DefinirAlcanceMesaDto,
  LoginMesaDto,
} from '@/shared/api/generated/models';
import { cuerpo, responder, ruta } from '../respuestas';
import * as db from './db';

const archivadas = (request: Request) =>
  new URL(request.url).searchParams.get('archivadas') === 'true';

/**
 * Endpoints simulados de la Fase 2, con las rutas del contrato (`docs/contrato/FRONT_FASE_02.md`). Todo lo demás
 * (sesión, `/admin/me`, plataforma) pasa a la API real o a la falsa del E2E.
 */
export const handlersFase2 = [
  // ---- categorías
  http.get(ruta('/admin/categorias'), ({ request }) =>
    responder(() => db.listarCategorias(archivadas(request))),
  ),
  http.post(ruta('/admin/categorias'), async ({ request }) => {
    const b = await cuerpo<CrearCategoriaDto>(request);
    return responder(() => db.crearCategoria(b), { status: 201 });
  }),
  http.patch(ruta('/admin/categorias/:id'), async ({ request, params }) => {
    const b = await cuerpo<ActualizarCategoriaDto>(request);
    return responder(() => db.actualizarCategoria(String(params.id), b));
  }),
  http.post(ruta('/admin/categorias/:id/archivar'), ({ params }) =>
    responder(() => db.archivarCategoria(String(params.id), true)),
  ),
  http.post(ruta('/admin/categorias/:id/restaurar'), ({ params }) =>
    responder(() => db.archivarCategoria(String(params.id), false)),
  ),

  // ---- ligas (ediciones)
  http.get(ruta('/admin/ediciones'), ({ request }) =>
    responder(() => db.listarEdiciones(archivadas(request))),
  ),
  http.post(ruta('/admin/ediciones'), async ({ request }) => {
    const b = await cuerpo<CrearEdicionDto>(request);
    return responder(() => db.crearEdicion(b), { status: 201 });
  }),
  http.get(ruta('/admin/ediciones/:id'), ({ params }) =>
    responder(() => db.obtenerEdicion(String(params.id))),
  ),
  http.patch(ruta('/admin/ediciones/:id'), async ({ request, params }) => {
    const b = await cuerpo<ActualizarEdicionDto>(request);
    return responder(() => db.actualizarEdicion(String(params.id), b));
  }),
  http.post(ruta('/admin/ediciones/:id/archivar'), ({ params }) =>
    responder(() => db.archivarEdicion(String(params.id), true)),
  ),
  http.post(ruta('/admin/ediciones/:id/restaurar'), ({ params }) =>
    responder(() => db.archivarEdicion(String(params.id), false)),
  ),
  http.post(ruta('/admin/ediciones/:id/estado'), async ({ request, params }) => {
    const b = await cuerpo<CambiarEstadoDto>(request);
    return responder(() => db.cambiarEstado(String(params.id), b));
  }),

  // ---- mesas
  http.get(ruta('/admin/mesas'), () => responder(() => db.listarMesas())),
  http.post(ruta('/admin/mesas'), async ({ request }) => {
    const b = await cuerpo<CrearMesaDto>(request);
    return responder(() => db.crearMesa(b), { status: 201 });
  }),
  http.patch(ruta('/admin/mesas/:id'), async ({ request, params }) => {
    const b = await cuerpo<ActualizarMesaDto>(request);
    return responder(() => db.actualizarMesa(String(params.id), b));
  }),
  http.put(ruta('/admin/mesas/:id/ediciones'), async ({ request, params }) => {
    const b = await cuerpo<DefinirAlcanceMesaDto>(request);
    return responder(() => db.definirAlcance(String(params.id), b.edicionIds ?? []));
  }),
  http.post(ruta('/admin/mesas/:id/pin/reset'), ({ params }) =>
    responder(() => db.resetearPin(String(params.id))),
  ),
  http.post(ruta('/admin/mesas/:id/desbloquear'), ({ params }) =>
    responder(() => db.desbloquearMesa(String(params.id))),
  ),
  http.post(ruta('/admin/mesas/:id/activar'), ({ params }) =>
    responder(() => db.activarMesa(String(params.id), true)),
  ),
  http.post(ruta('/admin/mesas/:id/desactivar'), ({ params }) =>
    responder(() => db.activarMesa(String(params.id), false)),
  ),

  // ---- sesión de la mesa
  http.post(ruta('/auth/mesa/:orgSlug/login'), async ({ request, params }) => {
    const b = await cuerpo<LoginMesaDto>(request);
    return responder(() => db.loginMesa(String(params.orgSlug), b.username ?? '', b.pin ?? ''));
  }),
  http.post(ruta('/auth/logout'), ({ request }) => {
    // El cierre de sesión es de todos los portales: solo se simula el de la mesa.
    if (new URL(request.url).searchParams.get('portal') !== 'mesa') return passthrough();
    return responder(() => {
      db.cerrarSesionMesa();
      return undefined;
    });
  }),
  http.get(ruta('/mesa/me'), () => responder(() => db.mesaMe())),
];
