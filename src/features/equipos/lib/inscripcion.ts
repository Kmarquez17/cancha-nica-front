import type { InscribirEquipoDto } from '@/shared/api/generated/models';
import { normalizarTelefono } from '@/shared/lib/telefono';

/** Campos del delegado en el formulario: uno que ya existe o uno nuevo. */
export type CamposDelegado = {
  delegadoModo: 'existente' | 'nuevo';
  delegadoId: string;
  delegadoNombre: string;
  delegadoTelefono: string;
};

/** Campos del formulario único de alta de equipo (R12). */
export type CamposEquipo = CamposDelegado & {
  /** Nombre del equipo en esta liga. */
  nombre: string;
  /** Lo escrito en el autocompletar del club. */
  clubTexto: string;
  /** Club elegido de la lista; `''` si solo se escribió un nombre (el API lo busca o lo crea en silencio). */
  clubId: string;
};

export type ErroresDelegado = {
  delegadoId?: string;
  delegadoNombre?: string;
  delegadoTelefono?: string;
};

export type ErroresEquipo = ErroresDelegado & { nombre?: string; clubNombre?: string };

export const delegadoVacio = (hayDelegados: boolean): CamposDelegado => ({
  delegadoModo: hayDelegados ? 'existente' : 'nuevo',
  delegadoId: '',
  delegadoNombre: '',
  delegadoTelefono: '',
});

export const camposVacios = (hayDelegados: boolean): CamposEquipo => ({
  nombre: '',
  clubTexto: '',
  clubId: '',
  ...delegadoVacio(hayDelegados),
});

export const hayErrores = (e: object) => Object.keys(e).length > 0;

export function validarDelegado(c: CamposDelegado): ErroresDelegado {
  if (c.delegadoModo === 'existente')
    return c.delegadoId ? {} : { delegadoId: 'Elige un delegado.' };
  const errores: ErroresDelegado = {};
  if (c.delegadoNombre.trim().length < 2)
    errores.delegadoNombre = 'Escribe el nombre del delegado (mínimo 2 letras).';
  if (c.delegadoTelefono.trim() === '')
    errores.delegadoTelefono = 'Escribe el teléfono del delegado.';
  return errores;
}

/**
 * Validación mínima antes de enviar. El teléfono solo se exige no vacío: si el formato no cuadra, el API responde
 * `TELEFONO_INVALIDO` y manda; para dar una pista en vivo se usa `vistaPreviaTelefono`.
 */
export function validarEquipo(c: CamposEquipo): ErroresEquipo {
  const errores: ErroresEquipo = validarDelegado(c);
  if (c.nombre.trim().length < 2)
    errores.nombre = 'Escribe el nombre del equipo (mínimo 2 letras).';
  return errores;
}

export function aDelegadoEntrada(c: CamposDelegado): InscribirEquipoDto['delegado'] {
  return c.delegadoModo === 'existente'
    ? { id: c.delegadoId }
    : { nombre: c.delegadoNombre.trim(), telefono: c.delegadoTelefono.trim() };
}

/**
 * Cuerpo del alta. `club` solo va si se eligió uno de la lista (`clubId`; al escribir encima se limpia). Si solo se
 * escribió un nombre no se envía `club` y el API reutiliza o crea el club en silencio.
 */
export function aInscripcion(c: CamposEquipo): InscribirEquipoDto {
  return {
    nombre: c.nombre.trim(),
    ...(c.clubId ? { club: { id: c.clubId } } : {}),
    delegado: aDelegadoEntrada(c),
  };
}

/**
 * Vista previa tolerante del teléfono: el E.164 si la tabla local lo reconoce, o `null`. Nunca bloquea el envío
 * (el API puede ampliar la tabla de países sin avisar).
 */
export const vistaPreviaTelefono = (valor: string, pais?: string | null) =>
  valor.trim() === '' ? null : normalizarTelefono(valor, pais);
