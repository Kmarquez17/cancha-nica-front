import type { EdicionDto, EquipoDto } from '@/shared/api/generated/models';

/**
 * Qué botones ofrecer según el estado de la liga y el rol (`FRONT_FASE_03.md` §3). Solo habilita u oculta: la fuente
 * de verdad es el API, que responde `409` (`*_CERRADA`) o `403` si discrepa.
 */
type Liga = Pick<EdicionDto, 'estado' | 'archivadaEn'>;

const ABIERTAS = ['CONFIGURACION', 'EN_REGISTRO'];

export function puedeInscribir(liga: Liga, esDueno: boolean): boolean {
  if (liga.archivadaEn) return false;
  if (ABIERTAS.includes(liga.estado)) return true;
  return liga.estado === 'EN_CURSO' && esDueno;
}

/** Con la liga en marcha, inscribir es el «equipo tardío». */
export const esTardio = (liga: Liga) => liga.estado === 'EN_CURSO';

export function puedeRetirar(liga: Liga, equipo: Pick<EquipoDto, 'retirado'>, esDueno: boolean) {
  if (equipo.retirado || liga.archivadaEn) return false;
  if (ABIERTAS.includes(liga.estado)) return true;
  return (liga.estado === 'EN_CURSO' || liga.estado === 'PAUSADA') && esDueno;
}

export function puedeReincorporar(liga: Liga, equipo: Pick<EquipoDto, 'retirado'>) {
  return equipo.retirado && !liga.archivadaEn && ABIERTAS.includes(liga.estado);
}

/** Renombrar y reasignar: no en una liga finalizada ni archivada, ni sobre un equipo retirado. */
export function puedeEditar(liga: Liga, equipo: Pick<EquipoDto, 'retirado'>) {
  return !equipo.retirado && !liga.archivadaEn && liga.estado !== 'FINALIZADA';
}

/** Retirar con la liga ya en marcha es definitivo: no hay reincorporación. */
export const retiroDefinitivo = (liga: Liga) => !ABIERTAS.includes(liga.estado);
