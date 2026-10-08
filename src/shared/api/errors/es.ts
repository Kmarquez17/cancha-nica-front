import { ApiError } from '../mutator';

/** code del backend -> mensaje amable. `field` indica el campo del formulario (setError). */
export const mensajesEs: Record<string, { message: string; field?: string }> = {
  ROSTER_FULL: { message: 'La plantilla de este equipo ya está completa.' },
  PLAYER_ALREADY_ACTIVE: { message: 'Este jugador ya está activo en otro equipo de la edición.' },
  CLOCK_NOT_ELAPSED: {
    message: 'Todavía no ha transcurrido el tiempo necesario para esta acción.',
  },

  // Sesión y cuentas (Fase 1)
  INVALID_CREDENTIALS: { message: 'Correo o contraseña incorrectos.' },
  ACCOUNT_LOCKED: {
    message:
      'Demasiados intentos: tu cuenta está bloqueada unos minutos. Puedes restablecer tu contraseña para desbloquearla.',
  },
  IP_LOCKED: {
    message: 'Demasiados intentos desde tu red. Espera unos minutos e inténtalo de nuevo.',
  },
  TOO_MANY_REQUESTS: { message: 'Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.' },
  UNAUTHORIZED: { message: 'Tu sesión expiró. Inicia sesión de nuevo.' },
  ORG_BLOQUEADA: {
    message: 'La cuenta del cliente está bloqueada. Contacta al administrador de la app.',
  },
  TOKEN_INVALIDO_O_EXPIRADO: {
    message: 'Este enlace ya no es válido. Pide uno nuevo a quien te invitó.',
  },
  EMAIL_YA_REGISTRADO: { message: 'Ese correo ya tiene una cuenta.', field: 'email' },

  // Plataforma
  ORG_SLUG_DUPLICATED: {
    message: 'Ya existe un cliente con ese identificador (slug).',
    field: 'slug',
  },
  ORG_ESTADO_INVALIDO: { message: 'El cliente ya está en ese estado. Actualiza la lista.' },
  ORG_YA_TIENE_OWNER: { message: 'Este cliente ya tiene un dueño.' },

  // Transporte
  VALIDATION_ERROR: { message: 'Revisa los datos del formulario.' },
  PAYLOAD_TOO_LARGE: { message: 'Los datos enviados son demasiado grandes.' },
  UNSUPPORTED_MEDIA_TYPE: { message: 'El formato de los datos no es compatible.' },
};

/** Códigos cuyo `detail` del servidor explica el motivo y es seguro mostrarlo. */
const USA_DETALLE = new Set(['PASSWORD_DEBIL']);

export function mensajeGenerico(requestId?: string): string {
  return `Ocurrió un error inesperado.${requestId ? ` Código de soporte: ${requestId}.` : ''}`;
}

export function esKnownCode(code: string): boolean {
  return code in mensajesEs || USA_DETALLE.has(code);
}

/** Mensaje en español para un ApiError; code desconocido => genérico con requestId. */
export function mensajeDeError(error: ApiError): string {
  if (USA_DETALLE.has(error.code)) {
    return error.detail ?? 'La contraseña no es lo bastante segura.';
  }
  return mensajesEs[error.code]?.message ?? mensajeGenerico(error.requestId);
}

export function campoDeError(error: ApiError): string | undefined {
  return mensajesEs[error.code]?.field;
}
