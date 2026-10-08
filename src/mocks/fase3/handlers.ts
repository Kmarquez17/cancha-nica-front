import { http } from 'msw';
import type {
  CambiarPinBody,
  DelegadoInscripcion,
  DelegadoLoginBody,
  InscribirEquipoBody,
} from '@/features/equipos/tipos';
import { cuerpo, responder, ruta } from '../respuestas';
import * as db from './db';

/** Endpoints simulados de la Fase 3 (nombres provisionales, a confirmar con el contrato). */
export const handlersFase3 = [
  // ---- clubes
  http.get(ruta('/admin/clubes'), () => responder(() => db.listarClubes())),
  http.post(ruta('/admin/clubes'), async ({ request }) => {
    const b = await cuerpo<{ nombre: string }>(request);
    return responder(() => db.crearClub(b.nombre ?? ''), { status: 201 });
  }),
  http.patch(ruta('/admin/clubes/:id'), async ({ request, params }) => {
    const b = await cuerpo<{ nombre?: string; activo?: boolean }>(request);
    return responder(() => db.actualizarClub(String(params.id), b));
  }),

  // ---- delegados
  http.get(ruta('/admin/delegados'), () => responder(() => db.listarDelegados())),
  http.post(ruta('/admin/delegados/:id/pin/reset'), ({ params }) =>
    responder(() => db.resetearPinDelegado(String(params.id))),
  ),

  // ---- equipos de una liga
  http.get(ruta('/admin/ediciones/:id/equipos'), ({ params }) =>
    responder(() => db.listarEquipos(String(params.id))),
  ),
  http.post(ruta('/admin/ediciones/:id/equipos'), async ({ request, params }) => {
    const b = await cuerpo<InscribirEquipoBody>(request);
    return responder(() => db.inscribirEquipo(String(params.id), b), { status: 201 });
  }),
  http.patch(
    ruta('/admin/ediciones/:id/equipos/:equipoId/delegado'),
    async ({ request, params }) => {
      const b = await cuerpo<{ delegado: DelegadoInscripcion }>(request);
      return responder(() => db.reasignarDelegado(String(params.equipoId), b.delegado));
    },
  ),

  // ---- portal del delegado
  http.post(ruta('/auth/delegado/:orgSlug/login'), async ({ request, params }) => {
    const b = await cuerpo<DelegadoLoginBody>(request);
    return responder(() => {
      db.loginDelegado(String(params.orgSlug), b.telefono ?? '', b.pin ?? '');
      return undefined;
    });
  }),
  http.post(ruta('/auth/delegado/logout'), () =>
    responder(() => {
      db.cerrarSesionDelegado();
      return undefined;
    }),
  ),
  http.get(ruta('/delegado/me'), () => responder(() => db.delegadoMe())),
  http.post(ruta('/delegado/pin'), async ({ request }) => {
    const b = await cuerpo<CambiarPinBody>(request);
    return responder(() => {
      db.cambiarPin(b);
      return undefined;
    });
  }),
];
