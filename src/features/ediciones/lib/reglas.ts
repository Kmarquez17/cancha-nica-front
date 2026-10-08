import { z } from 'zod';
import type { EstadoEdicion, Modalidad, ParametrosEdicion, ReglasModalidad } from '../tipos';

/** Presets de modalidad (espejo de `reglas-modalidad.ts` del backend, PLAN 4.14). FUTBOL_9 y FUTBOL_11 son provisionales. */
export const PRESETS: Record<
  Modalidad,
  { reglas: ReglasModalidad; parametros: ParametrosEdicion }
> = {
  FUTSAL: {
    reglas: {
      jugadoresEnCancha: 5,
      minJugadoresPartido: 4,
      maxConvocados: 12,
      relojModo: 'REGRESIVO',
      registraFaltas: true,
      faltasPersonalesParaAmarilla: 3,
      roja: { inferioridadMs: 120_000, cancelaPorGolRival: true },
    },
    parametros: {
      duracionTiempoRegular: 20,
      duracionTiempoEliminatoria: 25,
      limiteFaltasAcumuladas: 6,
      rosterMin: 6,
      rosterMax: 18,
    },
  },
  FUTBOL_9: {
    reglas: {
      jugadoresEnCancha: 9,
      minJugadoresPartido: 6,
      maxConvocados: 14,
      relojModo: 'PROGRESIVO',
      registraFaltas: false,
      faltasPersonalesParaAmarilla: null,
      roja: { inferioridadMs: null, cancelaPorGolRival: false },
    },
    parametros: {
      duracionTiempoRegular: 30,
      duracionTiempoEliminatoria: 35,
      limiteFaltasAcumuladas: null,
      rosterMin: 10,
      rosterMax: 22,
    },
  },
  FUTBOL_11: {
    reglas: {
      jugadoresEnCancha: 11,
      minJugadoresPartido: 7,
      maxConvocados: 18,
      relojModo: 'PROGRESIVO',
      registraFaltas: false,
      faltasPersonalesParaAmarilla: null,
      roja: { inferioridadMs: null, cancelaPorGolRival: false },
    },
    parametros: {
      duracionTiempoRegular: 45,
      duracionTiempoEliminatoria: 45,
      limiteFaltasAcumuladas: null,
      rosterMin: 14,
      rosterMax: 30,
    },
  },
};

export const presetDe = (m: Modalidad) => structuredClone(PRESETS[m]);

/** Valores del formulario: planos, con la inferioridad de la roja en minutos (el API usa milisegundos). */
export type ReglasForm = {
  jugadoresEnCancha: 5 | 9 | 11;
  minJugadoresPartido: number;
  maxConvocados: number;
  relojModo: 'REGRESIVO' | 'PROGRESIVO';
  registraFaltas: boolean;
  faltasPersonalesParaAmarilla: number | null;
  inferioridadMin: number | null;
  cancelaPorGolRival: boolean;
  duracionTiempoRegular: number;
  duracionTiempoEliminatoria: number;
  limiteFaltasAcumuladas: number | null;
  rosterMin: number;
  rosterMax: number;
};

export function reglasAForm(r: ReglasModalidad, p: ParametrosEdicion): ReglasForm {
  return {
    jugadoresEnCancha: r.jugadoresEnCancha,
    minJugadoresPartido: r.minJugadoresPartido,
    maxConvocados: r.maxConvocados,
    relojModo: r.relojModo,
    registraFaltas: r.registraFaltas,
    faltasPersonalesParaAmarilla: r.faltasPersonalesParaAmarilla,
    inferioridadMin: r.roja.inferioridadMs === null ? null : r.roja.inferioridadMs / 60_000,
    cancelaPorGolRival: r.roja.cancelaPorGolRival,
    ...p,
  };
}

export function presetAForm(m: Modalidad): ReglasForm {
  const { reglas, parametros } = PRESETS[m];
  return reglasAForm(reglas, parametros);
}

export function formAReglas(f: ReglasForm): {
  reglas: ReglasModalidad;
  parametros: ParametrosEdicion;
} {
  return {
    reglas: {
      jugadoresEnCancha: f.jugadoresEnCancha,
      minJugadoresPartido: f.minJugadoresPartido,
      maxConvocados: f.maxConvocados,
      relojModo: f.relojModo,
      registraFaltas: f.registraFaltas,
      faltasPersonalesParaAmarilla: f.registraFaltas ? f.faltasPersonalesParaAmarilla : null,
      roja: {
        inferioridadMs: f.inferioridadMin === null ? null : Math.round(f.inferioridadMin * 60_000),
        cancelaPorGolRival: f.cancelaPorGolRival,
      },
    },
    parametros: {
      duracionTiempoRegular: f.duracionTiempoRegular,
      duracionTiempoEliminatoria: f.duracionTiempoEliminatoria,
      limiteFaltasAcumuladas: f.registraFaltas ? f.limiteFaltasAcumuladas : null,
      rosterMin: f.rosterMin,
      rosterMax: f.rosterMax,
    },
  };
}

const entero = (min: number) =>
  z
    .number({ error: 'Escribe un número.' })
    .int('Debe ser un número entero.')
    .min(min, `Mínimo ${min}.`);

/**
 * Forma e invariantes del plan (4.14), validadas en el cliente para avisar en el campo correcto.
 * El servidor manda: ante `MODALIDAD_REGLAS_INVALIDAS` se muestra su detalle.
 */
export const reglasObjeto = z.object({
  jugadoresEnCancha: z.union([z.literal(5), z.literal(9), z.literal(11)]),
  minJugadoresPartido: entero(1),
  maxConvocados: entero(1),
  relojModo: z.enum(['REGRESIVO', 'PROGRESIVO']),
  registraFaltas: z.boolean(),
  faltasPersonalesParaAmarilla: entero(1).nullable(),
  inferioridadMin: z
    .number({ error: 'Escribe un número.' })
    .positive('Debe ser mayor que 0.')
    .nullable(),
  cancelaPorGolRival: z.boolean(),
  duracionTiempoRegular: entero(1),
  duracionTiempoEliminatoria: entero(1),
  limiteFaltasAcumuladas: entero(1).nullable(),
  rosterMin: entero(1),
  rosterMax: entero(1),
});

export const refinarReglas = (v: ReglasForm, ctx: z.RefinementCtx) => {
  const falla = (path: keyof ReglasForm, message: string) =>
    ctx.addIssue({ code: 'custom', path: [path], message });
  if (v.minJugadoresPartido >= v.jugadoresEnCancha)
    falla(
      'minJugadoresPartido',
      `Debe ser menor que los jugadores en cancha (${v.jugadoresEnCancha}).`,
    );
  if (v.maxConvocados < v.jugadoresEnCancha)
    falla(
      'maxConvocados',
      `No puede ser menor que los jugadores en cancha (${v.jugadoresEnCancha}).`,
    );
  if (v.rosterMin < v.minJugadoresPartido)
    falla('rosterMin', `No puede ser menor que el mínimo para jugar (${v.minJugadoresPartido}).`);
  if (v.rosterMax < v.maxConvocados)
    falla('rosterMax', `No puede ser menor que los convocados por partido (${v.maxConvocados}).`);
  if (v.rosterMin > v.rosterMax)
    falla('rosterMin', `No puede ser mayor que el máximo del plantel (${v.rosterMax}).`);
  if (v.registraFaltas && v.limiteFaltasAcumuladas === null)
    falla('limiteFaltasAcumuladas', 'Indica el límite de faltas acumuladas.');
  if (v.cancelaPorGolRival && v.inferioridadMin === null)
    falla(
      'cancelaPorGolRival',
      'Solo aplica si la roja deja al equipo con uno menos por un tiempo.',
    );
};

export const reglasFormSchema = reglasObjeto.superRefine(refinarReglas);

/** Transiciones que el panel ofrece (el servidor valida y puede rechazar). `PAUSADA` vuelve al estado previo. */
export function transicionesDe(
  estado: EstadoEdicion,
  estadoPrevioPausa: EstadoEdicion | null,
): EstadoEdicion[] {
  switch (estado) {
    case 'CONFIGURACION':
      return ['EN_REGISTRO'];
    case 'EN_REGISTRO':
      return ['EN_CURSO', 'PAUSADA'];
    case 'EN_CURSO':
      return ['EN_ELIMINATORIAS', 'PAUSADA'];
    case 'EN_ELIMINATORIAS':
      return ['FINALIZADA'];
    case 'PAUSADA':
      return estadoPrevioPausa ? [estadoPrevioPausa] : [];
    default:
      return [];
  }
}

export type CampoEditable =
  'nombre' | 'slug' | 'fechaInicio' | 'fechaFinEstimada' | 'modalidad' | 'reglas';

/** Qué campos admite cada estado (FASE_02, tarea 2.5). */
export function camposEditables(estado: EstadoEdicion): ReadonlySet<CampoEditable> {
  switch (estado) {
    case 'CONFIGURACION':
      return new Set(['nombre', 'slug', 'fechaInicio', 'fechaFinEstimada', 'modalidad', 'reglas']);
    case 'EN_REGISTRO':
      return new Set(['nombre', 'fechaFinEstimada', 'modalidad', 'reglas']);
    case 'FINALIZADA':
      return new Set();
    default:
      return new Set(['nombre', 'fechaFinEstimada']);
  }
}

const SIN_TILDES = /[̀-ͯ]/g;

/** «Sub 18» y «Sub-18» son la misma categoría (sin mayúsculas, tildes, espacios ni guiones). */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(SIN_TILDES, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** "Apertura 2026" -> "apertura-2026". */
export function slugDeEdicion(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(SIN_TILDES, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
}
