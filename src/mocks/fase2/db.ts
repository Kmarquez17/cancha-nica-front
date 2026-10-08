/**
 * Base en memoria que simula los endpoints de la Fase 2 (categorías, ligas, mesas y login de mesa) para el E2E sin
 * backend y para explorar la interfaz sin servidor. Está tipada con los DTO generados del snapshot y sigue
 * `docs/contrato/FRONT_FASE_02.md`: mismos nombres de campo, `camposEditables` y `transicionesPosibles`, errores con
 * `incumplimientos`, `erroresReglas` y `camposBloqueados`, PIN de 6 dígitos que solo viaja en el alta y el reseteo.
 * Con el backend real y MSW apagado no se usa.
 */
import {
  normalizarNombre,
  presetDe,
  reglasAForm,
  reglasFormSchema,
} from '@/features/ediciones/lib/reglas';
import {
  COSTOS_POR_DEFECTO,
  FINANZAS_POR_DEFECTO,
  SANCIONES_POR_DEFECTO,
} from '@/features/ediciones/lib/sanciones';
import type {
  ActualizarCategoriaDto,
  ActualizarEdicionDto,
  CambiarEstadoDto,
  CategoriaDto,
  CrearCategoriaDto,
  CrearEdicionDto,
  EdicionDto,
  EstadoEdicion,
  MesaConPinDto,
  MesaDto,
  MesaPrincipalDto,
  UsuarioResumenDto,
} from '@/shared/api/generated/models';

export class Problema extends Error {
  constructor(
    public status: number,
    public code: string,
    public title: string,
    /** Campos extra del problem+json (`incumplimientos`, `erroresReglas`, `camposBloqueados`, `errors`). */
    public extras?: Record<string, unknown>,
  ) {
    super(title);
  }
}

export const DUENO: UsuarioResumenDto = { id: 'u-dueno', nombre: 'Dueño de la liga' };
export const SLUG_CLIENTE = 'sopa';
export const NOMBRE_CLIENTE = 'Liga SOPA';
const MAX_MESAS = 6;
const ABIERTAS: EstadoEdicion[] = ['EN_REGISTRO', 'EN_CURSO', 'EN_ELIMINATORIAS', 'PAUSADA'];

/** Campos que acepta el PATCH de una liga (FRONT_FASE_02.md §3.3). */
const TODOS_LOS_CAMPOS = [
  'nombre',
  'slug',
  'categoriaId',
  'modalidad',
  'reglasModalidad',
  'duracionTiempoRegular',
  'duracionTiempoEliminatoria',
  'limiteFaltasAcumuladas',
  'rosterMin',
  'rosterMax',
  'maxEquiposPorJugador',
  'minEquiposArranque',
  'edadMinima',
  'edadMaxima',
  'fechaInicio',
  'fechaFinEstimada',
  'clasificadosPlayoff',
  'tercerPuesto',
  'reglasSanciones',
  'reglasFinancieras',
  'costoInscripcion',
  'costoArbitraje',
];

export function camposEditablesDe(estado: EstadoEdicion, archivada: boolean): string[] {
  if (archivada || estado === 'FINALIZADA') return [];
  if (estado === 'CONFIGURACION') return TODOS_LOS_CAMPOS;
  if (estado === 'EN_REGISTRO')
    return TODOS_LOS_CAMPOS.filter((c) => !['slug', 'fechaInicio', 'categoriaId'].includes(c));
  return ['nombre', 'fechaFinEstimada', 'costoInscripcion', 'costoArbitraje'];
}

export function transicionesDe(
  estado: EstadoEdicion,
  previo: EstadoEdicion | null,
  archivada: boolean,
): EstadoEdicion[] {
  if (archivada) return [];
  switch (estado) {
    case 'CONFIGURACION':
      return ['EN_REGISTRO'];
    case 'EN_REGISTRO':
      return ['EN_CURSO', 'PAUSADA'];
    case 'EN_CURSO':
      return ['EN_ELIMINATORIAS', 'FINALIZADA', 'PAUSADA'];
    case 'EN_ELIMINATORIAS':
      return ['FINALIZADA'];
    case 'PAUSADA':
      return previo ? [previo] : [];
    default:
      return [];
  }
}

type EdicionInterna = Omit<EdicionDto, 'camposEditables' | 'transicionesPosibles'>;
type MesaInterna = Omit<MesaDto, 'acceso'> & { pin: string; bloqueadaHasta: string | null };
type CategoriaInterna = Omit<CategoriaDto, 'ediciones'>;

type Estado = {
  categorias: CategoriaInterna[];
  ediciones: EdicionInterna[];
  mesas: MesaInterna[];
  sesionMesaId: string | null;
  seq: number;
};

const ahora = () => new Date().toISOString();
const dia = (d: string) => `${d}T00:00:00.000Z`;

function sembrar(): Estado {
  const cat = (
    id: string,
    nombre: string,
    extra: Partial<CategoriaInterna> = {},
  ): CategoriaInterna => ({
    id,
    nombre,
    edadMinima: null,
    edadMaxima: null,
    activa: true,
    creadoPor: DUENO,
    creadoEn: ahora(),
    ...extra,
  });
  const liga = (
    id: string,
    nombre: string,
    slug: string,
    modalidad: EdicionDto['modalidad'],
    categoria: { id: string; nombre: string },
    estado: EstadoEdicion,
    extra: Partial<EdicionInterna> = {},
  ): EdicionInterna => {
    const { reglas, parametros } = presetDe(modalidad);
    return {
      id,
      nombre,
      slug,
      modalidad,
      categoria,
      estado,
      estadoPrevioPausa: null,
      fechaInicio: dia('2026-11-01'),
      fechaFinEstimada: null,
      edadMinima: null,
      edadMaxima: null,
      clasificadosPlayoff: null,
      tercerPuesto: false,
      minEquiposArranque: 4,
      maxEquiposPorJugador: 3,
      reglasModalidad: reglas,
      reglasSanciones: structuredClone(SANCIONES_POR_DEFECTO),
      reglasFinancieras: { ...FINANZAS_POR_DEFECTO },
      ...COSTOS_POR_DEFECTO,
      ...parametros,
      archivadaEn: null,
      creadoPor: DUENO,
      creadoEn: ahora(),
      ...extra,
    };
  };
  const mesa = (id: string, username: string, extra: Partial<MesaInterna>): MesaInterna => ({
    id,
    username,
    nombreOperador: null,
    activo: true,
    ediciones: [],
    creadoPor: DUENO,
    creadoEn: ahora(),
    pin: '000000',
    bloqueadaHasta: null,
    ...extra,
  });
  return {
    categorias: [
      cat('cat-1', 'Libre'),
      cat('cat-2', 'Sub-18', { edadMaxima: 17 }),
      cat('cat-3', 'Sub-15', { edadMaxima: 14, activa: false }),
    ],
    ediciones: [
      liga(
        'ed-1',
        'Apertura 2026',
        'apertura-2026',
        'FUTSAL',
        { id: 'cat-1', nombre: 'Libre' },
        'EN_REGISTRO',
        { fechaFinEstimada: dia('2027-02-28') },
      ),
      liga(
        'ed-2',
        'Clausura Sub-18',
        'clausura-sub-18',
        'FUTBOL_9',
        { id: 'cat-2', nombre: 'Sub-18' },
        'CONFIGURACION',
        { fechaInicio: dia('2027-03-01'), edadMaxima: 17 },
      ),
    ],
    mesas: [
      mesa('mesa-1', 'MESA1', {
        nombreOperador: 'Carlos Pérez',
        pin: '123456',
        ediciones: [{ id: 'ed-1', nombre: 'Apertura 2026', estado: 'EN_REGISTRO' }],
      }),
      mesa('mesa-2', 'MESA2', {
        pin: '654321',
        bloqueadaHasta: new Date(Date.now() + 10 * 60_000).toISOString(),
      }),
    ],
    sesionMesaId: null,
    seq: 10,
  };
}

const CLAVE = 'cancha-nica:mock-fase2';

/** La demo sobrevive a una recarga de la página (solo existe con MSW; PINs de mentira). */
function cargar(): Estado | null {
  try {
    const crudo = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Estado) : null;
  } catch {
    return null;
  }
}

export function persistir() {
  try {
    if (typeof sessionStorage !== 'undefined')
      sessionStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // sin almacenamiento: la demo sigue en memoria
  }
}

let estado = cargar() ?? sembrar();

/** Solo para pruebas y para reiniciar la demo. */
export function reiniciarDb() {
  estado = sembrar();
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(CLAVE);
  } catch {
    // nada que limpiar
  }
}

const id = (p: string) => `${p}-${++estado.seq}`;
const clonar = <T>(v: T): T => structuredClone(v);
export const nuevoPin = () => String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
const importe = (v: string) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : v);

// ---------- armado de respuestas ----------

function categoriaDto(c: CategoriaInterna): CategoriaDto {
  return clonar({
    ...c,
    ediciones: estado.ediciones.filter((e) => e.categoria.id === c.id).length,
  });
}

function edicionDto(e: EdicionInterna): EdicionDto {
  return clonar({
    ...e,
    camposEditables: camposEditablesDe(e.estado, e.archivadaEn !== null),
    transicionesPosibles: transicionesDe(e.estado, e.estadoPrevioPausa, e.archivadaEn !== null),
  });
}

function mesaDto(m: MesaInterna): MesaDto {
  const { pin: _pin, bloqueadaHasta, ...resto } = m;
  void _pin;
  const bloqueada = bloqueadaHasta !== null && new Date(bloqueadaHasta) > new Date();
  return clonar({
    ...resto,
    acceso: {
      estado: !m.activo ? 'DESACTIVADA' : bloqueada ? 'BLOQUEADA' : 'ACTIVA',
      bloqueadaHasta: bloqueada ? bloqueadaHasta : null,
    },
  });
}

function mesaConPin(m: MesaInterna): MesaConPinDto {
  const origen = typeof location === 'undefined' ? 'http://localhost:3001' : location.origin;
  const loginUrl = `${origen}/mesa/${SLUG_CLIENTE}`;
  const texto = `Tu acceso a la mesa de Cancha Nica:\nEnlace: ${loginUrl}\nUsuario: ${m.username}\nPIN: ${m.pin}`;
  return {
    mesa: mesaDto(m),
    pin: m.pin,
    loginUrl,
    waMeUrl: `https://wa.me/?text=${encodeURIComponent(texto)}`,
  };
}

// ---------- categorías ----------

export function listarCategorias(archivadas = false) {
  return estado.categorias.filter((c) => archivadas || c.activa).map(categoriaDto);
}

function buscarCategoria(cid: string) {
  const c = estado.categorias.find((x) => x.id === cid);
  if (!c) throw new Problema(404, 'NOT_FOUND', 'Categoría no encontrada');
  return c;
}

const errorValidacion = (...mensajes: string[]) =>
  new Problema(400, 'VALIDATION_ERROR', 'Datos inválidos', { errors: mensajes });

function validarCategoria(
  nombre: string,
  min: number | null,
  max: number | null,
  excepto?: string,
) {
  const limpio = nombre.trim();
  if (!normalizarNombre(limpio)) throw errorValidacion('El nombre debe tener letras o números.');
  if (limpio.length > 60) throw errorValidacion('El nombre admite hasta 60 caracteres.');
  for (const e of [min, max])
    if (e !== null && (e < 5 || e > 80)) throw errorValidacion('Las edades van de 5 a 80.');
  if (min !== null && max !== null && min > max)
    throw errorValidacion('La edad mínima no puede ser mayor que la máxima.');
  const n = normalizarNombre(limpio);
  if (estado.categorias.some((c) => c.id !== excepto && normalizarNombre(c.nombre) === n))
    throw new Problema(409, 'CATEGORIA_DUPLICADA', 'Categoría duplicada', {
      detail: `Ya existe una categoría equivalente a «${limpio}».`,
    });
  return limpio;
}

export function crearCategoria(b: CrearCategoriaDto) {
  const nombre = validarCategoria(b.nombre ?? '', b.edadMinima ?? null, b.edadMaxima ?? null);
  const c: CategoriaInterna = {
    id: id('cat'),
    nombre,
    edadMinima: b.edadMinima ?? null,
    edadMaxima: b.edadMaxima ?? null,
    activa: true,
    creadoPor: DUENO,
    creadoEn: ahora(),
  };
  estado.categorias.push(c);
  return categoriaDto(c);
}

export function actualizarCategoria(cid: string, b: ActualizarCategoriaDto) {
  const c = buscarCategoria(cid);
  // Omitir un campo = no cambiarlo; `null` = borrar el límite de edad.
  const min = b.edadMinima === undefined ? c.edadMinima : b.edadMinima;
  const max = b.edadMaxima === undefined ? c.edadMaxima : b.edadMaxima;
  const nombre = validarCategoria(b.nombre ?? c.nombre, min, max, cid);
  Object.assign(c, { nombre, edadMinima: min, edadMaxima: max });
  return categoriaDto(c);
}

/** Archivar y restaurar son idempotentes. */
export function archivarCategoria(cid: string, archivar: boolean) {
  const c = buscarCategoria(cid);
  c.activa = !archivar;
  return categoriaDto(c);
}

// ---------- ligas ----------

export function listarEdiciones(archivadas = false) {
  return estado.ediciones.filter((e) => archivadas || !e.archivadaEn).map(edicionDto);
}

function buscarEdicion(eid: string) {
  const e = estado.ediciones.find((x) => x.id === eid);
  if (!e) throw new Problema(404, 'NOT_FOUND', 'Liga no encontrada');
  return e;
}

export const obtenerEdicion = (eid: string) => edicionDto(buscarEdicion(eid));

function slugUnico(base: string, excepto?: string) {
  const b = base || 'liga';
  let slug = b;
  let n = 2;
  while (estado.ediciones.some((e) => e.slug === slug && e.id !== excepto)) slug = `${b}-${n++}`;
  return slug;
}

const slugDe = (nombre: string) =>
  nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

function hayAbierta(categoriaId: string, modalidad: string, excepto?: string) {
  return estado.ediciones.some(
    (e) =>
      e.id !== excepto &&
      e.categoria.id === categoriaId &&
      e.modalidad === modalidad &&
      ABIERTAS.includes(e.estado) &&
      !e.archivadaEn,
  );
}

const CAMPO_DE_FORMULARIO: Record<string, string> = {
  inferioridadMin: 'roja.inferioridadMs',
  cancelaPorGolRival: 'roja.cancelaPorGolRival',
};

/** Invariantes de la modalidad (`MODALIDAD_REGLAS_INVALIDAS` con `erroresReglas`). */
function validarReglas(e: EdicionInterna) {
  const r = reglasFormSchema.safeParse(
    reglasAForm(e.reglasModalidad as unknown as Parameters<typeof reglasAForm>[0], {
      duracionTiempoRegular: e.duracionTiempoRegular,
      duracionTiempoEliminatoria: e.duracionTiempoEliminatoria,
      limiteFaltasAcumuladas: e.limiteFaltasAcumuladas,
      rosterMin: e.rosterMin,
      rosterMax: e.rosterMax,
    }),
  );
  if (r.success) return;
  throw new Problema(400, 'MODALIDAD_REGLAS_INVALIDAS', 'Reglas de modalidad inválidas', {
    erroresReglas: r.error.issues.map((i) => {
      const campo = String(i.path[0]);
      return {
        codigo: 'REGLA_INVALIDA',
        campo: CAMPO_DE_FORMULARIO[campo] ?? campo,
        mensaje: i.message,
      };
    }),
  });
}

export function crearEdicion(b: CrearEdicionDto) {
  const cat = buscarCategoria(b.categoriaId);
  if (!cat.activa) throw new Problema(409, 'CATEGORIA_ARCHIVADA', 'Categoría archivada');
  const nombre = (b.nombre ?? '').trim();
  if (!nombre) throw errorValidacion('El nombre es obligatorio.');
  if (nombre.length > 80) throw errorValidacion('El nombre admite hasta 80 caracteres.');
  const { reglas, parametros } = presetDe(b.modalidad);
  const e: EdicionInterna = {
    id: id('ed'),
    nombre,
    slug: slugUnico(slugDe(nombre)),
    modalidad: b.modalidad,
    categoria: { id: cat.id, nombre: cat.nombre },
    estado: 'CONFIGURACION',
    estadoPrevioPausa: null,
    fechaInicio: b.fechaInicio ?? null,
    fechaFinEstimada: b.fechaFinEstimada ?? null,
    edadMinima: cat.edadMinima,
    edadMaxima: cat.edadMaxima,
    clasificadosPlayoff: null,
    tercerPuesto: false,
    minEquiposArranque: 4,
    maxEquiposPorJugador: 3,
    reglasModalidad: reglas,
    reglasSanciones: structuredClone(SANCIONES_POR_DEFECTO),
    reglasFinancieras: { ...FINANZAS_POR_DEFECTO },
    ...COSTOS_POR_DEFECTO,
    ...parametros,
    archivadaEn: null,
    creadoPor: DUENO,
    creadoEn: ahora(),
  };
  estado.ediciones.push(e);
  return edicionDto(e);
}

export function actualizarEdicion(eid: string, b: ActualizarEdicionDto) {
  const e = buscarEdicion(eid);
  if (e.archivadaEn) throw new Problema(409, 'EDICION_ARCHIVADA', 'Liga archivada');
  const permitidos = camposEditablesDe(e.estado, false);
  const pedidos = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  const desconocidos = pedidos.filter((k) => !TODOS_LOS_CAMPOS.includes(k));
  if (desconocidos.length)
    throw errorValidacion(`Campos no permitidos: ${desconocidos.join(', ')}.`);
  const bloqueados = pedidos.filter((k) => !permitidos.includes(k));
  // Todo o nada: si toca un solo campo bloqueado no se aplica ninguno.
  if (bloqueados.length) {
    const reglas = bloqueados.some((c) => c === 'modalidad' || c === 'reglasModalidad');
    throw new Problema(
      409,
      e.estado === 'FINALIZADA'
        ? 'EDICION_SOLO_LECTURA'
        : reglas
          ? 'MODALIDAD_BLOQUEADA'
          : 'EDICION_CAMPO_CONGELADO',
      'Hay datos que ya no se pueden cambiar',
      {
        camposBloqueados: bloqueados.map((campo) => ({
          campo,
          codigo: 'EDICION_CAMPO_CONGELADO',
        })),
      },
    );
  }

  const copia: EdicionInterna = clonar(e);
  if (b.categoriaId !== undefined) {
    const cat = buscarCategoria(b.categoriaId);
    if (!cat.activa) throw new Problema(409, 'CATEGORIA_ARCHIVADA', 'Categoría archivada');
    copia.categoria = { id: cat.id, nombre: cat.nombre };
  }
  if (b.modalidad !== undefined && b.modalidad !== copia.modalidad) {
    // Cambiar la modalidad recarga su preset (reglas y duraciones); lo que venga en la petición se respeta encima.
    const { reglas, parametros } = presetDe(b.modalidad);
    copia.modalidad = b.modalidad;
    copia.reglasModalidad = reglas;
    Object.assign(copia, parametros);
  }
  const resto: Record<string, unknown> = { ...b };
  delete resto.categoriaId;
  delete resto.modalidad;
  Object.assign(
    copia,
    Object.fromEntries(Object.entries(resto).filter(([, v]) => v !== undefined)),
  );
  if (b.nombre !== undefined) copia.nombre = b.nombre.trim();
  if (b.slug !== undefined) copia.slug = slugUnico(b.slug, e.id);
  if (b.costoInscripcion !== undefined) copia.costoInscripcion = importe(b.costoInscripcion);
  if (b.costoArbitraje !== undefined) copia.costoArbitraje = importe(b.costoArbitraje);

  const reglasToc =
    b.modalidad !== undefined ||
    b.reglasModalidad !== undefined ||
    [
      'duracionTiempoRegular',
      'duracionTiempoEliminatoria',
      'limiteFaltasAcumuladas',
      'rosterMin',
      'rosterMax',
    ].some((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (reglasToc) validarReglas(copia);
  if (copia.categoria.id !== e.categoria.id || copia.modalidad !== e.modalidad) {
    if (ABIERTAS.includes(copia.estado) && hayAbierta(copia.categoria.id, copia.modalidad, e.id))
      throw new Problema(409, 'EDICION_CATEGORIA_ABIERTA', 'Ya hay una liga abierta');
  }
  Object.assign(e, copia);
  return edicionDto(e);
}

/** Archivar solo en CONFIGURACION; restaurar siempre; ambos idempotentes. */
export function archivarEdicion(eid: string, archivar: boolean) {
  const e = buscarEdicion(eid);
  if (archivar && e.estado !== 'CONFIGURACION')
    throw new Problema(409, 'EDICION_ESTADO_INVALIDO', 'Solo se archiva una liga en configuración');
  if (archivar && !e.archivadaEn) e.archivadaEn = ahora();
  if (!archivar) e.archivadaEn = null;
  return edicionDto(e);
}

type Incumplimiento = { codigo: string; mensaje: string; forzable: boolean };

/** Condiciones de cada cambio de estado (FRONT_FASE_02.md §3.5). Equipos y calendario llegan en fases futuras. */
function incumplimientosPara(e: EdicionInterna, a: EstadoEdicion): Incumplimiento[] {
  const lista: Incumplimiento[] = [];
  if (a === 'EN_CURSO') {
    lista.push(
      {
        codigo: 'EQUIPOS_INSUFICIENTES',
        mensaje: `Faltan equipos confirmados (mínimo ${e.minEquiposArranque}).`,
        forzable: true,
      },
      { codigo: 'FIXTURE_NO_GENERADO', mensaje: 'Falta generar el calendario.', forzable: true },
    );
    if (!estado.mesas.some((m) => m.activo && m.ediciones.some((x) => x.id === e.id)))
      lista.push({
        codigo: 'SIN_MESA_ACTIVA',
        mensaje: 'Falta al menos una mesa activa asignada a esta liga.',
        forzable: true,
      });
  }
  if (a === 'EN_ELIMINATORIAS') {
    if (e.clasificadosPlayoff === null)
      lista.push({
        codigo: 'CLASIFICADOS_NO_DEFINIDOS',
        mensaje: 'Define cuántos equipos clasifican a eliminatorias.',
        forzable: false,
      });
    lista.push({
      codigo: 'FASE_REGULAR_INCOMPLETA',
      mensaje: 'La fase regular todavía no termina.',
      forzable: true,
    });
  }
  if (a === 'FINALIZADA' && e.estado === 'EN_CURSO' && e.clasificadosPlayoff !== null)
    lista.push({
      codigo: 'EDICION_CON_PLAYOFFS',
      mensaje: 'La liga tiene eliminatorias: pasa primero por esa fase.',
      forzable: false,
    });
  return lista;
}

export function cambiarEstado(eid: string, b: CambiarEstadoDto, esDueno = true) {
  const e = buscarEdicion(eid);
  if (e.archivadaEn) throw new Problema(409, 'EDICION_ARCHIVADA', 'Liga archivada');
  if (e.estado === 'FINALIZADA') throw new Problema(409, 'EDICION_SOLO_LECTURA', 'Liga finalizada');
  if (b.forzar && !esDueno) throw new Problema(403, 'FORBIDDEN', 'Solo el dueño puede forzar');
  if (!transicionesDe(e.estado, e.estadoPrevioPausa, false).includes(b.a))
    throw new Problema(409, 'EDICION_ESTADO_INVALIDO', 'Transición no permitida');
  if (b.a === 'FINALIZADA' && !b.confirmar)
    throw new Problema(400, 'CONFIRMACION_REQUERIDA', 'Confirma para finalizar');

  if (
    (b.a === 'EN_REGISTRO' || b.a === 'EN_CURSO') &&
    hayAbierta(e.categoria.id, e.modalidad, e.id)
  )
    throw new Problema(409, 'EDICION_CATEGORIA_ABIERTA', 'Ya hay una liga abierta', {
      incumplimientos: [
        {
          codigo: 'EDICION_CATEGORIA_ABIERTA',
          mensaje: 'Ya hay otra liga abierta de la misma categoría y modalidad.',
          forzable: false,
        },
      ],
    });

  const faltan = incumplimientosPara(e, b.a);
  if (faltan.length > 0) {
    const forzables = faltan.every((i) => i.forzable);
    if (!(b.forzar && forzables))
      throw new Problema(
        409,
        'EDICION_PRECONDICIONES_NO_CUMPLIDAS',
        'No se cumplen las condiciones',
        { incumplimientos: faltan },
      );
  }
  if (b.a === 'PAUSADA') e.estadoPrevioPausa = e.estado;
  else if (e.estado === 'PAUSADA') e.estadoPrevioPausa = null;
  e.estado = b.a;
  // Las mesas muestran el estado actual de cada liga.
  for (const m of estado.mesas) for (const x of m.ediciones) if (x.id === e.id) x.estado = e.estado;
  return edicionDto(e);
}

// ---------- mesas ----------

export function listarMesas() {
  return estado.mesas.map(mesaDto);
}

function buscarMesa(mid: string) {
  const m = estado.mesas.find((x) => x.id === mid);
  if (!m) throw new Problema(404, 'NOT_FOUND', 'Mesa no encontrada');
  return m;
}

export function crearMesa(b: { nombreOperador?: string | null }) {
  if (estado.mesas.length >= MAX_MESAS)
    throw new Problema(409, 'MESA_LIMIT_REACHED', 'Límite de mesas alcanzado');
  const usados = new Set(estado.mesas.map((m) => m.username));
  const username = Array.from({ length: MAX_MESAS }, (_, i) => `MESA${i + 1}`).find(
    (u) => !usados.has(u),
  )!;
  const m: MesaInterna = {
    id: id('mesa'),
    username,
    nombreOperador: b.nombreOperador?.trim() || null,
    activo: true,
    ediciones: [],
    creadoPor: DUENO,
    creadoEn: ahora(),
    pin: nuevoPin(),
    bloqueadaHasta: null,
  };
  estado.mesas.push(m);
  return mesaConPin(m);
}

export function actualizarMesa(mid: string, b: { nombreOperador?: string | null }) {
  const m = buscarMesa(mid);
  if (b.nombreOperador !== undefined) m.nombreOperador = b.nombreOperador?.trim() || null;
  return mesaDto(m);
}

export function activarMesa(mid: string, activar: boolean) {
  const m = buscarMesa(mid);
  m.activo = activar;
  if (!activar && estado.sesionMesaId === m.id) estado.sesionMesaId = null;
  return mesaDto(m);
}

/** Reemplaza el alcance. Las ligas nuevas no pueden estar archivadas ni finalizadas; las que ya tenía se conservan. */
export function definirAlcance(mid: string, ids: string[]) {
  const m = buscarMesa(mid);
  const nuevas = ids.map((i) => {
    const e = estado.ediciones.find((x) => x.id === i);
    if (!e) throw new Problema(404, 'NOT_FOUND', 'Liga no encontrada');
    const yaLaTenia = m.ediciones.some((x) => x.id === i);
    if (!yaLaTenia && e.archivadaEn) throw new Problema(409, 'EDICION_ARCHIVADA', 'Liga archivada');
    if (!yaLaTenia && e.estado === 'FINALIZADA')
      throw new Problema(409, 'EDICION_SOLO_LECTURA', 'Liga finalizada');
    return { id: e.id, nombre: e.nombre, estado: e.estado };
  });
  m.ediciones = nuevas;
  return mesaDto(m);
}

export function resetearPin(mid: string) {
  const m = buscarMesa(mid);
  m.pin = nuevoPin();
  m.bloqueadaHasta = null;
  if (estado.sesionMesaId === m.id) estado.sesionMesaId = null;
  return mesaConPin(m);
}

export function desbloquearMesa(mid: string) {
  const m = buscarMesa(mid);
  m.bloqueadaHasta = null;
  return mesaDto(m);
}

// ---------- login de mesa ----------

function principalDeMesa(m: MesaInterna): MesaPrincipalDto {
  return {
    id: m.id,
    username: m.username,
    nombreOperador: m.nombreOperador,
    organizacion: { id: 'org-1', nombre: NOMBRE_CLIENTE, slug: SLUG_CLIENTE },
    ediciones: m.ediciones
      .map((a) => estado.ediciones.find((e) => e.id === a.id)!)
      .filter((e) => e && e.estado !== 'FINALIZADA')
      .map((e) => ({
        id: e.id,
        nombre: e.nombre,
        slug: e.slug,
        estado: e.estado,
        modalidad: e.modalidad,
        categoria: e.categoria,
      })),
  };
}

export function loginMesa(orgSlug: string, username: string, pin: string) {
  // Un solo mensaje: cuenta inexistente, PIN errada, cliente inexistente y mesa desactivada son lo mismo.
  const invalido = new Problema(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas');
  if (orgSlug !== SLUG_CLIENTE) throw invalido;
  const m = estado.mesas.find((x) => x.username === username.trim().toUpperCase());
  if (!m || !m.activo) throw invalido;
  if (m.bloqueadaHasta && new Date(m.bloqueadaHasta) > new Date())
    throw new Problema(429, 'MESA_BLOQUEADA', 'Mesa bloqueada');
  if (m.pin !== pin) throw invalido;
  estado.sesionMesaId = m.id;
  return principalDeMesa(m);
}

export function cerrarSesionMesa() {
  estado.sesionMesaId = null;
}

export function mesaMe(): MesaPrincipalDto {
  const m = estado.mesas.find((x) => x.id === estado.sesionMesaId);
  if (!m || !m.activo) throw new Problema(401, 'UNAUTHORIZED', 'Sin sesión');
  return principalDeMesa(m);
}
