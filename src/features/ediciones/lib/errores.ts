import { ApiError } from '@/shared/api/mutator';
import type { CampoBloqueado, ErrorRegla, Incumplimiento } from '../tipos';

const lista = (error: unknown, clave: string): unknown[] => {
  if (!(error instanceof ApiError)) return [];
  const valor = error.cuerpo?.[clave];
  return Array.isArray(valor) ? valor : [];
};

const texto = (v: unknown) => (typeof v === 'string' ? v : '');

/** Condiciones que impiden el cambio de estado (`EDICION_PRECONDICIONES_NO_CUMPLIDAS`, `EDICION_CATEGORIA_ABIERTA`). */
export function incumplimientosDe(error: unknown): Incumplimiento[] {
  return lista(error, 'incumplimientos').map((i) => {
    const o = (i ?? {}) as Record<string, unknown>;
    return { codigo: texto(o.codigo), mensaje: texto(o.mensaje), forzable: o.forzable === true };
  });
}

/** Invariantes de la modalidad que se rompen (`MODALIDAD_REGLAS_INVALIDAS`). */
export function erroresReglasDe(error: unknown): ErrorRegla[] {
  return lista(error, 'erroresReglas').map((i) => {
    const o = (i ?? {}) as Record<string, unknown>;
    return { codigo: texto(o.codigo), campo: texto(o.campo), mensaje: texto(o.mensaje) };
  });
}

/** Campos que el estado de la liga no deja cambiar (`EDICION_CAMPO_CONGELADO`, `MODALIDAD_BLOQUEADA`). */
export function camposBloqueadosDe(error: unknown): CampoBloqueado[] {
  return lista(error, 'camposBloqueados').map((i) => {
    const o = (i ?? {}) as Record<string, unknown>;
    return { campo: texto(o.campo), codigo: texto(o.codigo) };
  });
}

/** ¿Se puede saltar todo lo que falta? Solo si hay algo que forzar y nada es no forzable. */
export const sePuedeForzar = (incumplimientos: Incumplimiento[]): boolean =>
  incumplimientos.length > 0 && incumplimientos.every((i) => i.forzable);
