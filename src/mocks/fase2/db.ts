/**
 * Base en memoria que simula la Fase 2 del backend (categorías, ligas/ediciones, mesas, login de mesa) mientras
 * no existe el contrato real. Reproduce las reglas de `FASE_02.md`: nombre de categoría único sin tildes ni
 * guiones, una sola liga abierta por categoría y modalidad, edición por estado, máximo 6 mesas, PIN de 6 dígitos
 * que se ve una sola vez. PROVISIONAL: se borra cuando llegue el snapshot real.
 */
import {
  camposEditables,
  normalizarNombre,
  presetDe,
  reglasFormSchema,
  reglasAForm,
  slugDeEdicion,
  transicionesDe,
} from '@/features/ediciones/lib/reglas';
import type {
  ActualizarEdicionBody,
  CambiarEstadoBody,
  CategoriaDto,
  CrearCategoriaBody,
  CrearEdicionBody,
  EdicionDto,
  EstadoEdicion,
  MesaConPinDto,
  MesaDto,
  MesaMeDto,
} from '@/features/ediciones/tipos';

export class Problema extends Error {
  constructor(
    public status: number,
    public code: string,
    public title: string,
    public errors?: string[],
  ) {
    super(title);
  }
}

const ABIERTAS: EstadoEdicion[] = ['EN_REGISTRO', 'EN_CURSO', 'EN_ELIMINATORIAS', 'PAUSADA'];
const DUENO = { id: 'u-dueno', nombre: 'Dueño de la liga' };
export const SLUG_CLIENTE = 'sopa';
export const NOMBRE_CLIENTE = 'Liga SOPA';
const MAX_MESAS = 6;

type Estado = {
  categorias: CategoriaDto[];
  ediciones: EdicionDto[];
  mesas: (MesaDto & { pin: string })[];
  sesionMesaId: string | null;
  seq: number;
};

const ahora = () => new Date().toISOString();

function sembrar(): Estado {
  const libre: CategoriaDto = {
    id: 'cat-1',
    nombre: 'Libre',
    edadMinima: null,
    edadMaxima: null,
    archivada: false,
    creadoPor: DUENO,
    creadaEn: ahora(),
  };
  const sub18: CategoriaDto = { ...libre, id: 'cat-2', nombre: 'Sub-18', edadMaxima: 17 };
  const sub15: CategoriaDto = {
    ...libre,
    id: 'cat-3',
    nombre: 'Sub-15',
    edadMaxima: 14,
    archivada: true,
  };
  const base = (m: 'FUTSAL' | 'FUTBOL_9' | 'FUTBOL_11') => {
    const { reglas, parametros } = presetDe(m);
    return { reglasModalidad: reglas, ...parametros };
  };
  const apertura: EdicionDto = {
    id: 'ed-1',
    nombre: 'Apertura 2026',
    slug: 'apertura-2026',
    modalidad: 'FUTSAL',
    categoria: { id: libre.id, nombre: libre.nombre },
    estado: 'EN_REGISTRO',
    estadoPrevioPausa: null,
    fechaInicio: '2026-11-01',
    fechaFinEstimada: '2027-02-28',
    edadMinima: null,
    edadMaxima: null,
    archivadaEn: null,
    creadoPor: DUENO,
    creadaEn: ahora(),
    ...base('FUTSAL'),
  };
  const clausura: EdicionDto = {
    ...apertura,
    id: 'ed-2',
    nombre: 'Clausura Sub-18',
    slug: 'clausura-sub-18',
    modalidad: 'FUTBOL_9',
    categoria: { id: sub18.id, nombre: sub18.nombre },
    estado: 'CONFIGURACION',
    fechaInicio: '2027-03-01',
    fechaFinEstimada: null,
    edadMaxima: 17,
    ...base('FUTBOL_9'),
  };
  const mesas: (MesaDto & { pin: string })[] = [
    {
      id: 'mesa-1',
      username: 'MESA1',
      nombreOperador: 'Carlos Pérez',
      activa: true,
      bloqueadaHasta: null,
      ediciones: [{ id: apertura.id, nombre: apertura.nombre }],
      creadoPor: DUENO,
      creadaEn: ahora(),
      pin: '123456',
    },
    {
      id: 'mesa-2',
      username: 'MESA2',
      nombreOperador: null,
      activa: true,
      bloqueadaHasta: new Date(Date.now() + 10 * 60_000).toISOString(),
      ediciones: [],
      creadoPor: DUENO,
      creadaEn: ahora(),
      pin: '654321',
    },
  ];
  return {
    categorias: [libre, sub18, sub15],
    ediciones: [apertura, clausura],
    mesas,
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
const sinPin = (m: MesaDto & { pin: string }): MesaDto => {
  const copia: Partial<typeof m> = clonar(m);
  delete copia.pin;
  return copia as MesaDto;
};

// ---------- categorías ----------

export function listarCategorias(archivadas = false) {
  return clonar(estado.categorias.filter((c) => archivadas || !c.archivada));
}

function validarRango(min?: number | null, max?: number | null) {
  if (min != null && max != null && min > max)
    throw new Problema(400, 'VALIDATION_ERROR', 'Rango de edad inválido', [
      'edadMinima no puede ser mayor que edadMaxima.',
    ]);
}

export function crearCategoria(b: CrearCategoriaBody) {
  const nombre = b.nombre.trim();
  if (!nombre) throw new Problema(400, 'VALIDATION_ERROR', 'Nombre obligatorio');
  validarRango(b.edadMinima, b.edadMaxima);
  const n = normalizarNombre(nombre);
  if (estado.categorias.some((c) => normalizarNombre(c.nombre) === n))
    throw new Problema(409, 'CATEGORIA_DUPLICADA', 'Categoría duplicada');
  const c: CategoriaDto = {
    id: id('cat'),
    nombre,
    edadMinima: b.edadMinima ?? null,
    edadMaxima: b.edadMaxima ?? null,
    archivada: false,
    creadoPor: DUENO,
    creadaEn: ahora(),
  };
  estado.categorias.push(c);
  return clonar(c);
}

export function actualizarCategoria(cid: string, b: Partial<CrearCategoriaBody>) {
  const c = buscarCategoria(cid);
  const nombre = (b.nombre ?? c.nombre).trim();
  const min = b.edadMinima === undefined ? c.edadMinima : b.edadMinima;
  const max = b.edadMaxima === undefined ? c.edadMaxima : b.edadMaxima;
  validarRango(min, max);
  const n = normalizarNombre(nombre);
  if (estado.categorias.some((o) => o.id !== cid && normalizarNombre(o.nombre) === n))
    throw new Problema(409, 'CATEGORIA_DUPLICADA', 'Categoría duplicada');
  Object.assign(c, { nombre, edadMinima: min, edadMaxima: max });
  return clonar(c);
}

export function archivarCategoria(cid: string, archivada: boolean) {
  const c = buscarCategoria(cid);
  c.archivada = archivada;
  return clonar(c);
}

function buscarCategoria(cid: string) {
  const c = estado.categorias.find((x) => x.id === cid);
  if (!c) throw new Problema(404, 'NOT_FOUND', 'Categoría no encontrada');
  return c;
}

// ---------- ediciones ----------

export function listarEdiciones(archivadas = false) {
  return clonar(estado.ediciones.filter((e) => archivadas || !e.archivadaEn));
}

export function obtenerEdicion(eid: string) {
  return clonar(buscarEdicion(eid));
}

function buscarEdicion(eid: string) {
  const e = estado.ediciones.find((x) => x.id === eid);
  if (!e) throw new Problema(404, 'NOT_FOUND', 'Liga no encontrada');
  return e;
}

function validarReglas(r: Parameters<typeof reglasAForm>[0], p: Parameters<typeof reglasAForm>[1]) {
  const res = reglasFormSchema.safeParse(reglasAForm(r, p));
  if (!res.success)
    throw new Problema(
      400,
      'MODALIDAD_REGLAS_INVALIDAS',
      'Reglas de modalidad inválidas',
      res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    );
}

function slugUnico(base: string, excepto?: string) {
  const b = base || 'liga';
  let slug = b;
  let n = 2;
  while (estado.ediciones.some((e) => e.slug === slug && e.id !== excepto)) slug = `${b}-${n++}`;
  return slug;
}

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

export function crearEdicion(b: CrearEdicionBody) {
  const cat = buscarCategoria(b.categoriaId);
  if (cat.archivada) throw new Problema(409, 'CATEGORIA_ARCHIVADA', 'Categoría archivada');
  if (!b.nombre.trim()) throw new Problema(400, 'VALIDATION_ERROR', 'Nombre obligatorio');
  const { reglasModalidad, ...resto } = b;
  const parametros = {
    duracionTiempoRegular: resto.duracionTiempoRegular,
    duracionTiempoEliminatoria: resto.duracionTiempoEliminatoria,
    limiteFaltasAcumuladas: resto.limiteFaltasAcumuladas,
    rosterMin: resto.rosterMin,
    rosterMax: resto.rosterMax,
  };
  validarReglas(reglasModalidad, parametros);
  const e: EdicionDto = {
    id: id('ed'),
    nombre: b.nombre.trim(),
    slug: slugUnico(slugDeEdicion(b.nombre)),
    modalidad: b.modalidad,
    categoria: { id: cat.id, nombre: cat.nombre },
    estado: 'CONFIGURACION',
    estadoPrevioPausa: null,
    fechaInicio: b.fechaInicio,
    fechaFinEstimada: b.fechaFinEstimada ?? null,
    edadMinima: b.edadMinima ?? cat.edadMinima,
    edadMaxima: b.edadMaxima ?? cat.edadMaxima,
    reglasModalidad,
    ...parametros,
    archivadaEn: null,
    creadoPor: DUENO,
    creadaEn: ahora(),
  };
  estado.ediciones.push(e);
  return clonar(e);
}

export function actualizarEdicion(eid: string, b: ActualizarEdicionBody) {
  const e = buscarEdicion(eid);
  if (e.estado === 'FINALIZADA') throw new Problema(409, 'EDICION_SOLO_LECTURA', 'Liga finalizada');
  const permitido = camposEditables(e.estado);
  const toca = {
    nombre: b.nombre !== undefined,
    slug: b.slug !== undefined,
    fechaInicio: b.fechaInicio !== undefined,
    fechaFinEstimada: b.fechaFinEstimada !== undefined,
    modalidad: b.modalidad !== undefined && b.modalidad !== e.modalidad,
    reglas:
      b.reglasModalidad !== undefined ||
      b.rosterMin !== undefined ||
      b.rosterMax !== undefined ||
      b.duracionTiempoRegular !== undefined ||
      b.duracionTiempoEliminatoria !== undefined ||
      b.limiteFaltasAcumuladas !== undefined,
  } as const;
  for (const [campo, quiere] of Object.entries(toca)) {
    if (quiere && !permitido.has(campo as never))
      throw new Problema(
        409,
        campo === 'modalidad' ? 'MODALIDAD_BLOQUEADA' : 'EDICION_SOLO_LECTURA',
        'Ese dato ya no se puede cambiar en este estado',
      );
  }
  const modalidad = b.modalidad ?? e.modalidad;
  if (modalidad !== e.modalidad && hayAbierta(e.categoria.id, modalidad, e.id))
    throw new Problema(409, 'EDICION_CATEGORIA_ABIERTA', 'Ya hay una liga abierta');
  const reglasModalidad = b.reglasModalidad ?? e.reglasModalidad;
  const parametros = {
    duracionTiempoRegular: b.duracionTiempoRegular ?? e.duracionTiempoRegular,
    duracionTiempoEliminatoria: b.duracionTiempoEliminatoria ?? e.duracionTiempoEliminatoria,
    limiteFaltasAcumuladas:
      b.limiteFaltasAcumuladas === undefined ? e.limiteFaltasAcumuladas : b.limiteFaltasAcumuladas,
    rosterMin: b.rosterMin ?? e.rosterMin,
    rosterMax: b.rosterMax ?? e.rosterMax,
  };
  if (toca.reglas || toca.modalidad) validarReglas(reglasModalidad, parametros);
  Object.assign(e, {
    nombre: b.nombre?.trim() || e.nombre,
    slug: b.slug ? slugUnico(b.slug, e.id) : e.slug,
    fechaInicio: b.fechaInicio ?? e.fechaInicio,
    fechaFinEstimada: b.fechaFinEstimada === undefined ? e.fechaFinEstimada : b.fechaFinEstimada,
    modalidad,
    reglasModalidad,
    ...parametros,
  });
  return clonar(e);
}

export function archivarEdicion(eid: string, archivar: boolean) {
  const e = buscarEdicion(eid);
  if (archivar && e.estado !== 'CONFIGURACION')
    throw new Problema(409, 'EDICION_SOLO_LECTURA', 'Solo se archiva una liga en configuración');
  e.archivadaEn = archivar ? ahora() : null;
  return clonar(e);
}

/** Incumplimientos que el panel muestra al querer arrancar (equipos y fixture llegan en fases 3 y 5). */
function incumplimientos(e: EdicionDto, a: EstadoEdicion): string[] {
  if (a !== 'EN_CURSO') return [];
  const faltas: string[] = [];
  if (hayAbierta(e.categoria.id, e.modalidad, e.id) && e.estado !== 'EN_REGISTRO')
    faltas.push('Ya hay otra liga abierta de la misma categoría y modalidad.');
  faltas.push('Faltan equipos confirmados (todavía no hay clubes ni equipos).');
  faltas.push('Falta generar el calendario.');
  if (!estado.mesas.some((m) => m.activa && m.ediciones.some((x) => x.id === e.id)))
    faltas.push('Falta al menos una mesa activa asignada a esta liga.');
  return faltas;
}

export function cambiarEstado(eid: string, b: CambiarEstadoBody, esDueno = true) {
  const e = buscarEdicion(eid);
  if (!transicionesDe(e.estado, e.estadoPrevioPausa).includes(b.a))
    throw new Problema(409, 'EDICION_TRANSICION_INVALIDA', 'Transición no permitida');
  if (b.a === 'FINALIZADA' && !b.confirmar)
    throw new Problema(400, 'CONFIRMACION_REQUERIDA', 'Confirma para finalizar');
  if (e.estado === 'CONFIGURACION' || b.a === 'EN_REGISTRO') {
    if (hayAbierta(e.categoria.id, e.modalidad, e.id))
      throw new Problema(409, 'EDICION_CATEGORIA_ABIERTA', 'Ya hay una liga abierta');
  }
  const faltan = incumplimientos(e, b.a);
  if (faltan.length > 0 && !(b.forzar && esDueno))
    throw new Problema(
      b.forzar ? 403 : 409,
      b.forzar ? 'FORBIDDEN' : 'EDICION_PRECONDICIONES',
      'La liga no cumple los requisitos para este cambio',
      faltan,
    );
  if (b.a === 'PAUSADA') e.estadoPrevioPausa = e.estado;
  else if (e.estado === 'PAUSADA') e.estadoPrevioPausa = null;
  e.estado = b.a;
  return clonar(e);
}

// ---------- mesas ----------

export function listarMesas() {
  return estado.mesas.map(sinPin);
}

function buscarMesa(mid: string) {
  const m = estado.mesas.find((x) => x.id === mid);
  if (!m) throw new Problema(404, 'NOT_FOUND', 'Mesa no encontrada');
  return m;
}

const nuevoPin = () => String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
const conPin = (m: MesaDto & { pin: string }): MesaConPinDto => ({
  ...sinPin(m),
  pin: m.pin,
  waMeUrl: null,
  loginUrl: `/mesa/${SLUG_CLIENTE}`,
});

export function crearMesa(b: { nombreOperador?: string | null }) {
  if (estado.mesas.length >= MAX_MESAS)
    throw new Problema(409, 'MESA_LIMIT_REACHED', 'Límite de mesas alcanzado');
  const usados = new Set(estado.mesas.map((m) => m.username));
  const username = Array.from({ length: MAX_MESAS }, (_, i) => `MESA${i + 1}`).find(
    (u) => !usados.has(u),
  )!;
  const m = {
    id: id('mesa'),
    username,
    nombreOperador: b.nombreOperador?.trim() || null,
    activa: true,
    bloqueadaHasta: null,
    ediciones: [],
    creadoPor: DUENO,
    creadaEn: ahora(),
    pin: nuevoPin(),
  };
  estado.mesas.push(m);
  return conPin(m);
}

export function actualizarMesa(
  mid: string,
  b: { nombreOperador?: string | null; activa?: boolean },
) {
  const m = buscarMesa(mid);
  if (b.nombreOperador !== undefined) m.nombreOperador = b.nombreOperador?.trim() || null;
  if (b.activa !== undefined) m.activa = b.activa;
  return sinPin(m);
}

export function asignarEdiciones(mid: string, ids: string[]) {
  const m = buscarMesa(mid);
  const eds = ids.map((i) => {
    const e = estado.ediciones.find((x) => x.id === i);
    if (!e) throw new Problema(404, 'NOT_FOUND', 'Liga no encontrada');
    return { id: e.id, nombre: e.nombre };
  });
  m.ediciones = eds;
  return sinPin(m);
}

export function resetearPin(mid: string) {
  const m = buscarMesa(mid);
  m.pin = nuevoPin();
  m.bloqueadaHasta = null;
  return conPin(m);
}

export function desbloquearMesa(mid: string) {
  const m = buscarMesa(mid);
  m.bloqueadaHasta = null;
  return sinPin(m);
}

// ---------- login de mesa ----------

export function loginMesa(orgSlug: string, username: string, pin: string) {
  // Misma respuesta si el cliente no existe, la mesa no existe, el PIN falla o la mesa está inactiva.
  const invalido = new Problema(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas');
  if (orgSlug !== SLUG_CLIENTE) throw invalido;
  const m = estado.mesas.find((x) => x.username === username.trim().toUpperCase());
  if (!m || !m.activa) throw invalido;
  if (m.bloqueadaHasta && new Date(m.bloqueadaHasta) > new Date())
    throw new Problema(429, 'MESA_BLOQUEADA', 'Mesa bloqueada');
  if (m.pin !== pin) throw invalido;
  estado.sesionMesaId = m.id;
}

export function cerrarSesionMesa() {
  estado.sesionMesaId = null;
}

export function mesaMe(): MesaMeDto {
  const m = estado.mesas.find((x) => x.id === estado.sesionMesaId);
  if (!m) throw new Problema(401, 'UNAUTHORIZED', 'Sin sesión');
  return {
    id: m.id,
    username: m.username,
    nombreOperador: m.nombreOperador,
    organizacion: { id: 'org-1', nombre: NOMBRE_CLIENTE, slug: SLUG_CLIENTE },
    ediciones: m.ediciones
      .map((a) => estado.ediciones.find((e) => e.id === a.id)!)
      .filter((e) => e && e.estado !== 'FINALIZADA')
      .map((e) => ({ id: e.id, nombre: e.nombre, slug: e.slug, estado: e.estado })),
  };
}
