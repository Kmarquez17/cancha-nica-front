import { ApiError } from './mutator';
import { rutaBloqueada, rutaLogin, type Portal } from './portales';

/** Mutaciones cuyo error se muestra en el propio formulario (no es una sesión caída). */
const MUTACIONES_PROPIAS = new Set([
  'plataformaLogin',
  'adminLogin',
  'aceptarInvitacion',
  'restablecerContrasena',
  'olvideContrasena',
  'logout',
  'refreshSession',
]);

export type AccionSesion =
  | { tipo: 'bloqueada'; portal: Portal; destino: string }
  | { tipo: 'login'; portal: Portal; destino: string };

/**
 * Decide qué hacer con un error de la API que afecta a la sesión (puro, testeable):
 * - `ORG_BLOQUEADA` → pantalla de cuenta bloqueada del portal. NO se refresca ni se borran cookies.
 * - `UNAUTHORIZED` (el refresh ya falló en el mutator) → login del portal.
 * Todo lo demás lo maneja quien llamó.
 */
export function accionParaError(
  error: unknown,
  opciones: { rutaActual: string; nombreMutacion?: string },
): AccionSesion | null {
  if (!(error instanceof ApiError) || !error.portal) return null;
  if (opciones.nombreMutacion && MUTACIONES_PROPIAS.has(opciones.nombreMutacion)) return null;

  if (error.code === 'ORG_BLOQUEADA') {
    const destino = rutaBloqueada(error.portal);
    return opciones.rutaActual.startsWith(destino)
      ? null
      : { tipo: 'bloqueada', portal: error.portal, destino };
  }
  if (error.code === 'UNAUTHORIZED') {
    const destino = rutaLogin(error.portal);
    return opciones.rutaActual.startsWith(destino)
      ? null
      : { tipo: 'login', portal: error.portal, destino };
  }
  return null;
}
