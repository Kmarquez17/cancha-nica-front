import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';

/** Mensaje de un error de equipos: `403` sin código de negocio = acción solo del dueño (`FRONT_FASE_03.md` §8). */
export function textoError(err: unknown): string {
  if (!(err instanceof ApiError)) return mensajeGenerico();
  if (err.status === 403 && err.code === 'FORBIDDEN') return 'Solo el dueño puede hacerlo.';
  return mensajeDeError(err);
}

/** Errores de estado de la liga: no son de un campo; hay que refrescar la liga y avisar en general. */
export const esErrorDeEstado = (err: unknown) =>
  err instanceof ApiError &&
  [
    'INSCRIPCION_CERRADA',
    'RETIRO_CERRADO',
    'REINCORPORACION_CERRADA',
    'EDICION_SOLO_LECTURA',
    'EDICION_ARCHIVADA',
  ].includes(err.code);
