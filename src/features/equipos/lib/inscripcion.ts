import { aE164 } from '@/shared/lib/telefono';
import type { ClubInscripcion, DelegadoDto, DelegadoInscripcion } from '../tipos';

/** Campos del club en el formulario de inscripción: uno que ya existe o uno nuevo. */
export type ClubCampos = { modo: 'existente' | 'nuevo'; id: string; nombre: string };
/** Campos del delegado: uno que ya existe o uno nuevo (nombre y teléfono). */
export type DelegadoCampos = {
  modo: 'existente' | 'nuevo';
  id: string;
  nombre: string;
  telefono: string;
};

export type ErroresClub = { id?: string; nombre?: string };
export type ErroresDelegado = { id?: string; nombre?: string; telefono?: string };

export const clubVacio = (hayClubes: boolean): ClubCampos => ({
  modo: hayClubes ? 'existente' : 'nuevo',
  id: '',
  nombre: '',
});

export const delegadoVacio = (hayDelegados: boolean): DelegadoCampos => ({
  modo: hayDelegados ? 'existente' : 'nuevo',
  id: '',
  nombre: '',
  telefono: '',
});

export function validarClub(c: ClubCampos): ErroresClub {
  if (c.modo === 'existente') return c.id ? {} : { id: 'Elige un club.' };
  return c.nombre.trim().length >= 2
    ? {}
    : { nombre: 'Escribe el nombre del club (mínimo 2 letras).' };
}

export function validarDelegado(d: DelegadoCampos): ErroresDelegado {
  if (d.modo === 'existente') return d.id ? {} : { id: 'Elige un delegado.' };
  const errores: ErroresDelegado = {};
  if (d.nombre.trim().length < 2)
    errores.nombre = 'Escribe el nombre del delegado (mínimo 2 letras).';
  if (aE164(d.telefono) === null)
    errores.telefono = 'Escribe el teléfono con código de país, por ejemplo +50588888888.';
  return errores;
}

export const hayErrores = (e: object) => Object.keys(e).length > 0;

export function aClubInscripcion(c: ClubCampos): ClubInscripcion {
  return c.modo === 'existente' ? { id: c.id } : { nombre: c.nombre.trim() };
}

export function aDelegadoInscripcion(d: DelegadoCampos): DelegadoInscripcion {
  return d.modo === 'existente'
    ? { id: d.id }
    : { nombre: d.nombre.trim(), telefono: aE164(d.telefono)! };
}

/**
 * ¿El delegado ya lleva un equipo de esta categoría? (Regla del plan: nunca dos en la misma.) `ignorarEquipoId`
 * deja fuera el equipo que se está reasignando.
 */
export function yaTieneCategoria(
  d: Pick<DelegadoDto, 'equipos'>,
  categoria: string,
  ignorarEquipoId?: string,
): boolean {
  return d.equipos.some((e) => e.categoria === categoria && e.id !== ignorarEquipoId);
}
