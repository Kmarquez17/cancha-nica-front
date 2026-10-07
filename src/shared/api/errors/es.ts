import { ApiError } from '../mutator';

/** code del backend -> mensaje amable. `field` indica el campo del formulario (setError). */
export const mensajesEs: Record<string, { message: string; field?: string }> = {
  ROSTER_FULL: { message: 'La plantilla de este equipo ya está completa.' },
  PLAYER_ALREADY_ACTIVE: { message: 'Este jugador ya está activo en otro equipo de la edición.' },
  INVALID_CREDENTIALS: { message: 'Correo o contraseña incorrectos.' },
  ACCOUNT_LOCKED: { message: 'Tu cuenta está bloqueada temporalmente. Inténtalo más tarde.' },
  IP_LOCKED: { message: 'Demasiados intentos desde tu red. Inténtalo más tarde.' },
  CLOCK_NOT_ELAPSED: {
    message: 'Todavía no ha transcurrido el tiempo necesario para esta acción.',
  },
};

export function mensajeGenerico(requestId?: string): string {
  return `Ocurrió un error inesperado.${requestId ? ` Código de soporte: ${requestId}.` : ''}`;
}

export function esKnownCode(code: string): boolean {
  return code in mensajesEs;
}

/** Mensaje en español para un ApiError; code desconocido => genérico con requestId. */
export function mensajeDeError(error: ApiError): string {
  return mensajesEs[error.code]?.message ?? mensajeGenerico(error.requestId);
}

export function campoDeError(error: ApiError): string | undefined {
  return mensajesEs[error.code]?.field;
}
