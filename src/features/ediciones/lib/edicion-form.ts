import { z } from 'zod';
import type { ActualizarEdicionDto, EdicionDto } from '@/shared/api/generated/models';
import { aFechaInput, aIso } from './fechas';
import { formAReglas, refinarReglas, reglasAForm, reglasObjeto } from './reglas';
import { dineroAForm, dineroObjeto, formADinero } from './sanciones';
import {
  MODALIDADES,
  type ParametrosEdicion,
  type ReglasFinancieras,
  type ReglasModalidad,
  type ReglasSanciones,
} from '../tipos';

// ---------- lectura de lo que el contrato deja como objeto libre ----------

export const reglasModalidadDe = (e: EdicionDto) => e.reglasModalidad as unknown as ReglasModalidad;
export const sancionesDe = (e: EdicionDto) => e.reglasSanciones as unknown as ReglasSanciones;
export const financierasDe = (e: EdicionDto) => e.reglasFinancieras as unknown as ReglasFinancieras;
export const parametrosDe = (e: EdicionDto): ParametrosEdicion => ({
  duracionTiempoRegular: e.duracionTiempoRegular,
  duracionTiempoEliminatoria: e.duracionTiempoEliminatoria,
  limiteFaltasAcumuladas: e.limiteFaltasAcumuladas,
  rosterMin: e.rosterMin,
  rosterMax: e.rosterMax,
});

// ---------- qué se puede editar: lo dice la API (`camposEditables`), no se duplica la regla ----------

/** Grupos de pantalla -> campos del PATCH que la API tiene que listar como editables. */
const GRUPOS = {
  nombre: ['nombre'],
  slug: ['slug'],
  categoria: ['categoriaId'],
  fechaInicio: ['fechaInicio'],
  fechaFin: ['fechaFinEstimada'],
  modalidad: ['modalidad'],
  reglas: ['reglasModalidad'],
  sanciones: ['reglasSanciones'],
  finanzas: ['reglasFinancieras'],
  costos: ['costoInscripcion', 'costoArbitraje'],
  edades: ['edadMinima', 'edadMaxima'],
  arranque: ['minEquiposArranque', 'maxEquiposPorJugador'],
  eliminatorias: ['clasificadosPlayoff', 'tercerPuesto'],
} as const;
export type GrupoEditable = keyof typeof GRUPOS;

export function puedeEditar(
  edicion: Pick<EdicionDto, 'camposEditables'>,
  grupo: GrupoEditable,
): boolean {
  return GRUPOS[grupo].every((campo) => edicion.camposEditables.includes(campo));
}

// ---------- formulario ----------

const fecha = z
  .string()
  .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Elige una fecha.');
const edad = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || (/^\d{1,2}$/.test(v) && Number(v) >= 5 && Number(v) <= 80),
    'Escribe una edad entre 5 y 80, o déjala vacía.',
  );
const entero = (min: number, max = 99) =>
  z
    .number({ error: 'Escribe un número.' })
    .int('Debe ser un número entero.')
    .min(min, `Mínimo ${min}.`)
    .max(max, `Máximo ${max}.`);

/** Datos de la liga + reglas de la modalidad + sanciones y dinero, todo plano para react-hook-form. */
export const ligaSchema = reglasObjeto
  .extend(dineroObjeto.shape)
  .extend({
    nombre: z
      .string()
      .trim()
      .min(3, 'Escribe el nombre (mínimo 3 letras).')
      .max(80, 'Máximo 80 caracteres.'),
    categoriaId: z.string().min(1, 'Elige una categoría.'),
    modalidad: z.enum(MODALIDADES),
    fechaInicio: fecha,
    fechaFinEstimada: fecha,
    slug: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v),
        'Solo minúsculas, números y guiones.',
      ),
    edadMinima: edad,
    edadMaxima: edad,
    minEquiposArranque: entero(2, 64),
    maxEquiposPorJugador: entero(1, 10),
    clasificadosPlayoff: z.enum(['', '4', '8', '16']),
    tercerPuesto: z.boolean(),
  })
  .superRefine((v, ctx) => {
    refinarReglas(v, ctx);
    const falla = (path: keyof LigaValues, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    if (v.fechaInicio && v.fechaFinEstimada && v.fechaFinEstimada < v.fechaInicio)
      falla('fechaFinEstimada', 'No puede ser anterior al inicio.');
    if (v.edadMinima && v.edadMaxima && Number(v.edadMinima) > Number(v.edadMaxima))
      falla('edadMinima', 'La edad mínima no puede ser mayor que la máxima.');
  });

export type LigaValues = z.infer<typeof ligaSchema>;

export function edicionAForm(e: EdicionDto): LigaValues {
  return {
    nombre: e.nombre,
    categoriaId: e.categoria.id,
    modalidad: e.modalidad,
    fechaInicio: aFechaInput(e.fechaInicio),
    fechaFinEstimada: aFechaInput(e.fechaFinEstimada),
    slug: e.slug,
    edadMinima: e.edadMinima?.toString() ?? '',
    edadMaxima: e.edadMaxima?.toString() ?? '',
    minEquiposArranque: e.minEquiposArranque,
    maxEquiposPorJugador: e.maxEquiposPorJugador,
    clasificadosPlayoff: (e.clasificadosPlayoff?.toString() ??
      '') as LigaValues['clasificadosPlayoff'],
    tercerPuesto: e.tercerPuesto,
    ...reglasAForm(reglasModalidadDe(e), parametrosDe(e)),
    ...dineroAForm(sancionesDe(e), financierasDe(e), e),
  };
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const aEdad = (t: string) => (t.trim() === '' ? null : Number(t));

/**
 * Solo viaja lo que cambió. El backend es «todo o nada»: si el PATCH toca un solo campo que el estado de la liga
 * bloquea, no aplica ninguno; por eso no se reenvían los campos que siguen igual aunque estén bloqueados.
 * Cambiar la modalidad recarga el preset en el servidor; lo que se envíe en la misma petición se respeta encima.
 */
export function cambiosDeEdicion(inicial: LigaValues, nuevo: LigaValues): ActualizarEdicionDto {
  const c: ActualizarEdicionDto = {};

  const nombre = nuevo.nombre.trim();
  if (nombre !== inicial.nombre.trim()) c.nombre = nombre;
  const slug = nuevo.slug.trim();
  if (slug && slug !== inicial.slug) c.slug = slug;
  if (nuevo.categoriaId !== inicial.categoriaId) c.categoriaId = nuevo.categoriaId;
  if (nuevo.fechaInicio !== inicial.fechaInicio) c.fechaInicio = aIso(nuevo.fechaInicio);
  if (nuevo.fechaFinEstimada !== inicial.fechaFinEstimada)
    c.fechaFinEstimada = aIso(nuevo.fechaFinEstimada);

  const modalidadCambia = nuevo.modalidad !== inicial.modalidad;
  if (modalidadCambia) c.modalidad = nuevo.modalidad;

  const ri = formAReglas(inicial);
  const rn = formAReglas(nuevo);
  if (modalidadCambia || !igual(ri.reglas, rn.reglas)) c.reglasModalidad = rn.reglas;
  for (const clave of Object.keys(rn.parametros) as (keyof ParametrosEdicion)[]) {
    if (modalidadCambia || ri.parametros[clave] !== rn.parametros[clave])
      Object.assign(c, { [clave]: rn.parametros[clave] });
  }

  const di = formADinero(inicial);
  const dn = formADinero(nuevo);
  if (!igual(di.sanciones, dn.sanciones)) c.reglasSanciones = dn.sanciones;
  if (!igual(di.finanzas, dn.finanzas)) c.reglasFinancieras = dn.finanzas;
  if (di.costos.costoInscripcion !== dn.costos.costoInscripcion)
    c.costoInscripcion = dn.costos.costoInscripcion;
  if (di.costos.costoArbitraje !== dn.costos.costoArbitraje)
    c.costoArbitraje = dn.costos.costoArbitraje;

  if (nuevo.edadMinima !== inicial.edadMinima) c.edadMinima = aEdad(nuevo.edadMinima);
  if (nuevo.edadMaxima !== inicial.edadMaxima) c.edadMaxima = aEdad(nuevo.edadMaxima);
  if (nuevo.minEquiposArranque !== inicial.minEquiposArranque)
    c.minEquiposArranque = nuevo.minEquiposArranque;
  if (nuevo.maxEquiposPorJugador !== inicial.maxEquiposPorJugador)
    c.maxEquiposPorJugador = nuevo.maxEquiposPorJugador;
  if (nuevo.clasificadosPlayoff !== inicial.clasificadosPlayoff)
    c.clasificadosPlayoff =
      nuevo.clasificadosPlayoff === '' ? null : (Number(nuevo.clasificadosPlayoff) as 4 | 8 | 16);
  if (nuevo.tercerPuesto !== inicial.tercerPuesto) c.tercerPuesto = nuevo.tercerPuesto;

  return c;
}
