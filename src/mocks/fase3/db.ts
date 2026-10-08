/**
 * Base en memoria que simula la Fase 3 (clubes, delegados, inscripción de equipos, login de delegado) mientras el
 * backend no publica el contrato. Se apoya en la de la Fase 2 para las ligas. Reglas tomadas de `PLAN_BACKEND.md`:
 * alta del equipo en un solo formulario que crea club y delegado si son nuevos (R12), PIN de 6 dígitos que se ve
 * una sola vez (R13), teléfono único por cliente, un delegado nunca tiene dos equipos de la misma categoría.
 * PROVISIONAL: se borra cuando llegue el snapshot real.
 */
import { normalizarNombre } from '@/features/ediciones/lib/reglas';
import type {
  CambiarPinBody,
  ClubDto,
  DelegadoConPinDto,
  DelegadoDto,
  DelegadoEquipoRef,
  DelegadoInscripcion,
  DelegadoMeDto,
  EquipoDto,
  EquipoInscritoDto,
  InscribirEquipoBody,
} from '@/features/equipos/tipos';
import { aE164 } from '@/shared/lib/telefono';
import {
  DUENO,
  NOMBRE_CLIENTE,
  Problema,
  SLUG_CLIENTE,
  nuevoPin,
  obtenerEdicion,
} from '../fase2/db';

type DelegadoInterno = Omit<DelegadoDto, 'equipos' | 'pinCambiado'> & {
  pin: string;
  pinCambiadoEn: string | null;
};
type EquipoInterno = EquipoDto;
type ClubInterno = Omit<ClubDto, 'equipos'>;

type Estado = {
  clubes: ClubInterno[];
  delegados: DelegadoInterno[];
  equipos: EquipoInterno[];
  sesionDelegadoId: string | null;
  seq: number;
};

const ahora = () => new Date().toISOString();

function sembrar(): Estado {
  const club = (id: string, nombre: string): ClubInterno => ({
    id,
    nombre,
    activo: true,
    creadoPor: DUENO,
    creadaEn: ahora(),
  });
  const deleg = (
    id: string,
    nombre: string,
    telefono: string,
    pin: string,
    usado: boolean,
  ): DelegadoInterno => ({
    id,
    nombre,
    telefono,
    pin,
    activo: true,
    pinCambiadoEn: null,
    ultimoAccesoEn: usado ? ahora() : null,
    bloqueadoHasta: null,
    creadoPor: DUENO,
    creadaEn: ahora(),
  });
  const equipo = (id: string, clubId: string, delegadoId: string): EquipoInterno => ({
    id,
    edicionId: 'ed-1',
    club: { id: clubId, nombre: '' },
    delegado: { id: delegadoId, nombre: '', telefono: '', pinSinUsar: false },
    estado: 'CONFIRMADO',
    habilitado: true,
    creadoPor: DUENO,
    creadaEn: ahora(),
  });
  return {
    clubes: [
      club('club-1', 'Los Tigres'),
      club('club-2', 'Deportivo Norte'),
      club('club-3', 'Atlético Sur'),
    ],
    delegados: [
      deleg('del-1', 'Pedro Gómez', '+50588880001', '111111', false),
      deleg('del-2', 'Ana Ruiz', '+50588880002', '222222', true),
      deleg('del-3', 'Marta Díaz', '+50588880009', '333333', true),
    ],
    equipos: [equipo('eq-1', 'club-1', 'del-1'), equipo('eq-2', 'club-2', 'del-2')],
    sesionDelegadoId: null,
    seq: 10,
  };
}

const CLAVE = 'cancha-nica:mock-fase3';

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
export function reiniciarDb3() {
  estado = sembrar();
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(CLAVE);
  } catch {
    // nada que limpiar
  }
}

const id = (p: string) => `${p}-${++estado.seq}`;
const clonar = <T>(v: T): T => structuredClone(v);

// ---------- armado de respuestas ----------

const nombreClub = (cid: string) => estado.clubes.find((c) => c.id === cid)?.nombre ?? '';

function equipoDto(e: EquipoInterno): EquipoDto {
  const d = estado.delegados.find((x) => x.id === e.delegado.id)!;
  return clonar({
    ...e,
    club: { id: e.club.id, nombre: nombreClub(e.club.id) },
    delegado: {
      id: d.id,
      nombre: d.nombre,
      telefono: d.telefono,
      pinSinUsar: d.ultimoAccesoEn === null,
    },
  });
}

function refEquipo(e: EquipoInterno): DelegadoEquipoRef {
  const liga = obtenerEdicion(e.edicionId);
  return {
    id: e.id,
    club: nombreClub(e.club.id),
    edicion: { id: liga.id, nombre: liga.nombre },
    categoria: liga.categoria.nombre,
  };
}

function delegadoDto(d: DelegadoInterno): DelegadoDto {
  const { pin: _pin, pinCambiadoEn, ...resto } = d;
  void _pin;
  return clonar({
    ...resto,
    pinCambiado: pinCambiadoEn !== null,
    equipos: estado.equipos.filter((e) => e.delegado.id === d.id).map(refEquipo),
  });
}

const loginUrl = `/delegado/${SLUG_CLIENTE}`;
const conPin = (d: DelegadoInterno): DelegadoConPinDto => ({
  delegado: { id: d.id, nombre: d.nombre, telefono: d.telefono },
  pin: d.pin,
  waMeUrl: `https://wa.me/${d.telefono.replace(/\D/g, '')}`,
  loginUrl,
});

// ---------- clubes ----------

export function listarClubes(): ClubDto[] {
  return clonar(
    estado.clubes.map((c) => ({
      ...c,
      equipos: estado.equipos.filter((e) => e.club.id === c.id).length,
    })),
  );
}

function validarNombreClub(nombre: string, excepto?: string) {
  const limpio = nombre.trim();
  if (limpio.length < 2) throw new Problema(400, 'VALIDATION_ERROR', 'Nombre del club obligatorio');
  const n = normalizarNombre(limpio);
  if (estado.clubes.some((c) => c.id !== excepto && normalizarNombre(c.nombre) === n))
    throw new Problema(409, 'CLUB_DUPLICADO', 'Club duplicado');
  return limpio;
}

export function crearClub(nombre: string) {
  const c: ClubInterno = {
    id: id('club'),
    nombre: validarNombreClub(nombre),
    activo: true,
    creadoPor: DUENO,
    creadaEn: ahora(),
  };
  estado.clubes.push(c);
  return clonar({ ...c, equipos: 0 });
}

export function actualizarClub(cid: string, b: { nombre?: string; activo?: boolean }) {
  const c = estado.clubes.find((x) => x.id === cid);
  if (!c) throw new Problema(404, 'NOT_FOUND', 'Club no encontrado');
  if (b.nombre !== undefined) c.nombre = validarNombreClub(b.nombre, cid);
  if (b.activo !== undefined) c.activo = b.activo;
  return clonar({ ...c, equipos: estado.equipos.filter((e) => e.club.id === c.id).length });
}

// ---------- delegados ----------

export function listarDelegados(): DelegadoDto[] {
  return estado.delegados.map(delegadoDto);
}

function categoriaDeEquipo(e: EquipoInterno) {
  return obtenerEdicion(e.edicionId).categoria.id;
}

function buscarDelegado(did: string) {
  const d = estado.delegados.find((x) => x.id === did);
  if (!d) throw new Problema(404, 'NOT_FOUND', 'Delegado no encontrado');
  return d;
}

/** Devuelve el delegado (existente o creado ahora) y si es nuevo. Valida teléfono único por cliente. */
function resolverDelegado(d: DelegadoInscripcion): { delegado: DelegadoInterno; nuevo: boolean } {
  if ('id' in d) return { delegado: buscarDelegado(d.id), nuevo: false };
  const nombre = d.nombre.trim();
  if (nombre.length < 2)
    throw new Problema(400, 'VALIDATION_ERROR', 'Nombre del delegado obligatorio');
  const telefono = aE164(d.telefono);
  if (!telefono) throw new Problema(400, 'VALIDATION_ERROR', 'Teléfono inválido');
  if (estado.delegados.some((x) => x.telefono === telefono))
    throw new Problema(409, 'TELEFONO_DUPLICADO', 'Teléfono duplicado');
  const nuevoDel: DelegadoInterno = {
    id: id('del'),
    nombre,
    telefono,
    pin: nuevoPin(),
    activo: true,
    pinCambiadoEn: null,
    ultimoAccesoEn: null,
    bloqueadoHasta: null,
    creadoPor: DUENO,
    creadaEn: ahora(),
  };
  return { delegado: nuevoDel, nuevo: true };
}

function chocaCategoria(delegadoId: string, edicionId: string, excepto?: string) {
  const cat = obtenerEdicion(edicionId).categoria.id;
  return estado.equipos.some(
    (e) => e.delegado.id === delegadoId && e.id !== excepto && categoriaDeEquipo(e) === cat,
  );
}

// ---------- equipos ----------

export function listarEquipos(edicionId: string): EquipoDto[] {
  obtenerEdicion(edicionId);
  return estado.equipos.filter((e) => e.edicionId === edicionId).map(equipoDto);
}

export function inscribirEquipo(edicionId: string, b: InscribirEquipoBody): EquipoInscritoDto {
  const liga = obtenerEdicion(edicionId);
  if (liga.estado !== 'EN_REGISTRO')
    throw new Problema(
      409,
      'EDICION_NO_ACEPTA_INSCRIPCIONES',
      'La liga no tiene inscripciones abiertas',
    );

  // Se valida todo antes de crear nada: si algo falla, no queda un club ni un delegado a medias.
  const clubExistente =
    'id' in b.club ? estado.clubes.find((c) => c.id === (b.club as { id: string }).id) : undefined;
  if ('id' in b.club && !clubExistente) throw new Problema(404, 'NOT_FOUND', 'Club no encontrado');
  if (clubExistente && !clubExistente.activo)
    throw new Problema(409, 'CLUB_INACTIVO', 'Club inactivo');
  const nombreNuevo = 'nombre' in b.club ? validarNombreClub(b.club.nombre) : null;
  if (
    clubExistente &&
    estado.equipos.some((e) => e.edicionId === edicionId && e.club.id === clubExistente.id)
  )
    throw new Problema(409, 'EQUIPO_DUPLICADO', 'El club ya está inscrito en esta liga');

  const { delegado, nuevo } = resolverDelegado(b.delegado);
  if (!nuevo && chocaCategoria(delegado.id, edicionId))
    throw new Problema(
      409,
      'DELEGADO_MISMA_CATEGORIA',
      'El delegado ya tiene un equipo en esta categoría',
    );

  const club = clubExistente ?? crearClub(nombreNuevo!);
  if (nuevo) estado.delegados.push(delegado);
  const e: EquipoInterno = {
    id: id('eq'),
    edicionId,
    club: { id: club.id, nombre: '' },
    delegado: { id: delegado.id, nombre: '', telefono: '', pinSinUsar: false },
    estado: 'CONFIRMADO',
    habilitado: true,
    creadoPor: DUENO,
    creadaEn: ahora(),
  };
  estado.equipos.push(e);
  return { ...equipoDto(e), pinEntregado: nuevo ? conPin(delegado) : null };
}

export function reasignarDelegado(equipoId: string, d: DelegadoInscripcion): EquipoInscritoDto {
  const e = estado.equipos.find((x) => x.id === equipoId);
  if (!e) throw new Problema(404, 'NOT_FOUND', 'Equipo no encontrado');
  const { delegado, nuevo } = resolverDelegado(d);
  if (!nuevo && chocaCategoria(delegado.id, e.edicionId, e.id))
    throw new Problema(
      409,
      'DELEGADO_MISMA_CATEGORIA',
      'El delegado ya tiene un equipo en esta categoría',
    );
  if (nuevo) estado.delegados.push(delegado);
  e.delegado = { id: delegado.id, nombre: '', telefono: '', pinSinUsar: false };
  // La sesión del delegado anterior sobre este equipo se invalida (simulado: se cierra su sesión).
  estado.sesionDelegadoId = null;
  return { ...equipoDto(e), pinEntregado: nuevo ? conPin(delegado) : null };
}

export function resetearPinDelegado(did: string): DelegadoConPinDto {
  const d = buscarDelegado(did);
  d.pin = nuevoPin();
  d.pinCambiadoEn = null;
  d.ultimoAccesoEn = null;
  d.bloqueadoHasta = null;
  return conPin(d);
}

// ---------- portal del delegado ----------

export function loginDelegado(orgSlug: string, telefono: string, pin: string) {
  // Misma respuesta si el cliente no existe, el teléfono no existe, el PIN falla o el delegado está inactivo.
  const invalido = new Problema(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas');
  if (orgSlug !== SLUG_CLIENTE) throw invalido;
  const tel = aE164(telefono);
  const d = tel ? estado.delegados.find((x) => x.telefono === tel) : undefined;
  if (!d || !d.activo) throw invalido;
  if (d.bloqueadoHasta && new Date(d.bloqueadoHasta) > new Date())
    throw new Problema(429, 'ACCOUNT_LOCKED', 'Delegado bloqueado');
  if (d.pin !== pin) throw invalido;
  d.ultimoAccesoEn = ahora();
  estado.sesionDelegadoId = d.id;
}

export function cerrarSesionDelegado() {
  estado.sesionDelegadoId = null;
}

export function delegadoMe(): DelegadoMeDto {
  const d = estado.delegados.find((x) => x.id === estado.sesionDelegadoId);
  if (!d) throw new Problema(401, 'UNAUTHORIZED', 'Sin sesión');
  return {
    id: d.id,
    nombre: d.nombre,
    telefono: d.telefono,
    pinTemporal: d.pinCambiadoEn === null,
    organizacion: { id: 'org-1', nombre: NOMBRE_CLIENTE, slug: SLUG_CLIENTE },
    equipos: estado.equipos
      .filter((e) => e.delegado.id === d.id)
      .map((e) => {
        const liga = obtenerEdicion(e.edicionId);
        return {
          id: e.id,
          club: { id: e.club.id, nombre: nombreClub(e.club.id) },
          categoria: liga.categoria.nombre,
          edicion: { id: liga.id, nombre: liga.nombre, slug: liga.slug, estado: liga.estado },
        };
      }),
  };
}

export function cambiarPin(b: CambiarPinBody) {
  const d = estado.delegados.find((x) => x.id === estado.sesionDelegadoId);
  if (!d) throw new Problema(401, 'UNAUTHORIZED', 'Sin sesión');
  if (d.pin !== b.pinActual)
    throw new Problema(401, 'INVALID_CREDENTIALS', 'PIN actual incorrecto');
  if (!/^\d{6}$/.test(b.pinNuevo))
    throw new Problema(400, 'VALIDATION_ERROR', 'El PIN tiene 6 números');
  if (b.pinNuevo === b.pinActual)
    throw new Problema(400, 'VALIDATION_ERROR', 'El PIN nuevo debe ser distinto');
  d.pin = b.pinNuevo;
  d.pinCambiadoEn = ahora();
}
