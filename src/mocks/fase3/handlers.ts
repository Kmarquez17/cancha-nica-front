import { http } from 'msw';
import type {
  ActualizarDelegadoDto,
  CambiarPinDto,
  EstadoEquipo,
  InscribirEquipoDto,
  LoginDelegadoDto,
  ReasignarDelegadoDto,
  RenombrarEquipoDto,
  RetirarEquipoDto,
} from '@/shared/api/generated/models';
import { cuerpo, responder, ruta } from '../respuestas';
import * as db from './db';

const param = (request: Request, nombre: string) => new URL(request.url).searchParams.get(nombre);

/**
 * Endpoints simulados de la Fase 3, con las rutas del contrato (`docs/contrato/FRONT_FASE_03.md`). Los 22
 * `operationId` nuevos; el cambio de estado con `excluirEquipos` lo resuelve el handler de la Fase 2.
 */
export const handlersFase3 = [
  // ---- clubes
  http.get(ruta('/admin/clubes'), ({ request }) =>
    responder(() =>
      db.listarClubes(param(request, 'q') ?? undefined, param(request, 'archivados') === 'true'),
    ),
  ),
  http.post(ruta('/admin/clubes/:id/archivar'), ({ params }) =>
    responder(() => db.archivarClub(String(params.id), true)),
  ),
  http.post(ruta('/admin/clubes/:id/restaurar'), ({ params }) =>
    responder(() => db.archivarClub(String(params.id), false)),
  ),

  // ---- delegados
  http.get(ruta('/admin/delegados'), () => responder(() => db.listarDelegados())),
  http.patch(ruta('/admin/delegados/:id'), async ({ request, params }) => {
    const b = await cuerpo<ActualizarDelegadoDto>(request);
    return responder(() => db.actualizarDelegado(String(params.id), b));
  }),
  http.post(ruta('/admin/delegados/:id/pin/reset'), ({ params }) =>
    responder(() => db.resetearPinDelegado(String(params.id))),
  ),
  http.post(ruta('/admin/delegados/:id/desbloquear'), ({ params }) =>
    responder(() => db.desbloquearDelegado(String(params.id))),
  ),
  http.post(ruta('/admin/delegados/:id/activar'), ({ params }) =>
    responder(() => db.activarDelegado(String(params.id), true)),
  ),
  http.post(ruta('/admin/delegados/:id/desactivar'), ({ params }) =>
    responder(() => db.activarDelegado(String(params.id), false)),
  ),

  // ---- equipos de la liga
  http.get(ruta('/admin/ediciones/:edicionId/equipos'), ({ request, params }) =>
    responder(() =>
      db.listarEquipos(
        String(params.edicionId),
        (param(request, 'estado') as EstadoEquipo | null) ?? undefined,
      ),
    ),
  ),
  http.post(ruta('/admin/ediciones/:edicionId/equipos'), async ({ request, params }) => {
    const b = await cuerpo<InscribirEquipoDto>(request);
    return responder(() => db.inscribirEquipo(String(params.edicionId), b), { status: 201 });
  }),
  http.get(ruta('/admin/ediciones/:edicionId/equipos/:equipoId'), ({ params }) =>
    responder(() => db.obtenerEquipo(String(params.edicionId), String(params.equipoId))),
  ),
  http.patch(ruta('/admin/ediciones/:edicionId/equipos/:equipoId'), async ({ request, params }) => {
    const b = await cuerpo<RenombrarEquipoDto>(request);
    return responder(() =>
      db.renombrarEquipo(String(params.edicionId), String(params.equipoId), b.nombre),
    );
  }),
  http.patch(
    ruta('/admin/ediciones/:edicionId/equipos/:equipoId/delegado'),
    async ({ request, params }) => {
      const b = await cuerpo<ReasignarDelegadoDto>(request);
      return responder(() =>
        db.reasignarDelegado(String(params.edicionId), String(params.equipoId), b),
      );
    },
  ),
  http.post(
    ruta('/admin/ediciones/:edicionId/equipos/:equipoId/retirar'),
    async ({ request, params }) => {
      const b = await cuerpo<RetirarEquipoDto>(request);
      return responder(() =>
        db.retirarEquipo(String(params.edicionId), String(params.equipoId), b.motivo),
      );
    },
  ),
  http.post(ruta('/admin/ediciones/:edicionId/equipos/:equipoId/reincorporar'), ({ params }) =>
    responder(() => db.reincorporarEquipo(String(params.edicionId), String(params.equipoId))),
  ),

  // ---- lectura de plataforma (solo GET)
  http.get(ruta('/plataforma/organizaciones/:id/delegados'), () =>
    responder(() => db.delegadosDeOrganizacion()),
  ),
  http.get(ruta('/plataforma/organizaciones/:id/equipos'), () =>
    responder(() => db.equiposDeOrganizacion()),
  ),

  // ---- sesión y portal del delegado
  http.post(ruta('/auth/delegado/:orgSlug/login'), async ({ request, params }) => {
    const b = await cuerpo<LoginDelegadoDto>(request);
    return responder(() => db.loginDelegado(String(params.orgSlug), b.telefono ?? '', b.pin ?? ''));
  }),
  http.post(ruta('/auth/logout'), ({ request }) => {
    // Solo el cierre del portal del delegado; el resto sigue su camino (mesa en fase2, API falsa).
    if (param(request, 'portal') !== 'delegado') return undefined;
    return responder(() => {
      db.cerrarSesionDelegado();
      return undefined;
    });
  }),
  http.get(ruta('/delegado/me'), () => responder(() => db.delegadoMe())),
  http.get(ruta('/delegado/ediciones/:edicionId'), ({ params }) =>
    responder(() => db.delegadoEdicion(String(params.edicionId))),
  ),
  http.post(ruta('/delegado/pin'), async ({ request }) => {
    const b = await cuerpo<CambiarPinDto>(request);
    return responder(() => {
      db.cambiarPin(b);
      return undefined;
    });
  }),
];
