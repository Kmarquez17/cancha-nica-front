import type { EstadoEdicion, Modalidad } from '../tipos';

export const MODALIDAD_TEXTO: Record<Modalidad, string> = {
  FUTSAL: 'Fútbol sala',
  FUTBOL_9: 'Fútbol 9',
  FUTBOL_11: 'Fútbol 11',
};

export const ESTADO_TEXTO: Record<EstadoEdicion, string> = {
  CONFIGURACION: 'En configuración',
  EN_REGISTRO: 'Inscripciones abiertas',
  EN_CURSO: 'En juego',
  EN_ELIMINATORIAS: 'Eliminatorias',
  PAUSADA: 'Pausada',
  FINALIZADA: 'Finalizada',
};

/** Texto del botón que lleva al estado `a` desde el actual. */
export function accionDeEstado(a: EstadoEdicion, desde: EstadoEdicion): string {
  if (desde === 'PAUSADA') return 'Reanudar liga';
  switch (a) {
    case 'EN_REGISTRO':
      return 'Abrir inscripciones';
    case 'EN_CURSO':
      return 'Empezar la liga';
    case 'EN_ELIMINATORIAS':
      return 'Pasar a eliminatorias';
    case 'PAUSADA':
      return 'Pausar liga';
    case 'FINALIZADA':
      return 'Finalizar liga';
    default:
      return ESTADO_TEXTO[a];
  }
}
