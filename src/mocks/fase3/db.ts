/**
 * Base en memoria que simula la Fase 3 (clubes, delegados, equipos de la liga y portal del delegado) para el E2E
 * sin backend y para explorar la interfaz sin servidor. Está tipada con los DTO generados del snapshot y sigue
 * `docs/contrato/FRONT_FASE_03.md`: el nombre del equipo vive en cada liga, el club se reutiliza en silencio, el
 * delegado se identifica por teléfono (único por cliente) y lleva un equipo por liga, el PIN solo viaja en el alta
 * con delegado nuevo, la reasignación a un delegado nuevo y el reseteo, y los errores llevan los `code` del API.
 * Con el backend real y MSW apagado no se usa.
 */
import { normalizarNombre } from '@/features/ediciones/lib/reglas';
import type {
  ActualizarDelegadoDto,
  CambiarPinDto,
  ClubDto,
  DelegadoConPinDto,
  DelegadoDto,
  DelegadoPlataformaDto,
  DelegadoPrincipalDto,
  EdicionDto,
  EquipoConAccesoDto,
  EquipoDto,
  EquipoPlataformaDto,
  EstadoEquipo,
  InscribirEquipoDto,
  LigaDelegadoDetalleDto,
  ReasignarDelegadoDto,
  UsuarioResumenDto,
} from '@/shared/api/generated/models';
import {
  DUENO,
  NOMBRE_CLIENTE,
  Problema,
  SLUG_CLIENTE,
  nuevoPin,
  obtenerEdicion,
  puenteEquipos,
} from '../fase2/db';

type ClubInterno = Omit<ClubDto, 'equipos' | 'ligas'>;
type DelegadoInterno = {
  id: string;
  nombre: string;
  telefono: string;
  pin: string;
  activo: boolean;
  pinCambiadoEn: string | null;
  ultimoAccesoEn: string | null;
  fallos: number;
  bloqueadoHasta: string | null;
  creadoPor: UsuarioResumenDto;
  creadoEn: string;
};
type EquipoInterno = {
  id: string;
  edicionId: string;
  clubId: string;
  delegadoId: string;
  nombre: string;
  estado: EstadoEquipo;
  habilitado: boolean;
  inscritoTardio: boolean;
  retiradoEn: string | null;
  motivoRetiro: string | null;
  retiradoPor: UsuarioResumenDto | null;
  creadoPor: UsuarioResumenDto;
  creadoEn: string;
};

type Estado = {
  clubes: ClubInterno[];
  delegados: DelegadoInterno[];
  equipos: EquipoInterno[];
  sesionDelegadoId: string | null;
  seq: number;
};

/** País del cliente de la demo (`Organizacion.pais`). */
const PAIS = 'NI';
/** Fallos seguidos que bloquean el acceso del delegado; el bloqueo dura `MIN_BLOQUEO` minutos. */
const MAX_FALLOS = 5;
const MIN_BLOQUEO = 10;
const ligaId = (n: number) => `ed-${n}`;

const ahora = () => new Date().toISOString();

function sembrar(): Estado {
  const club = (id: string, nombre: string): ClubInterno => ({
    id,
    nombre,
    escudoUrl: null,
    activo: true,
    creadoPor: DUENO,
    creadoEn: ahora(),
  });
  const deleg = (
    id: string,
    nombre: string,
    telefono: string,
    pin: string,
    usado: boolean,
    cambiado = false,
  ): DelegadoInterno => ({
    id,
    nombre,
    telefono,
    pin,
    activo: true,
    pinCambiadoEn: cambiado ? ahora() : null,
    ultimoAccesoEn: usado ? ahora() : null,
    fallos: 0,
    bloqueadoHasta: null,
    creadoPor: DUENO,
    creadoEn: ahora(),
  });
  const equipo = (
    id: string,
    edicionId: string,
    nombre: string,
    clubId: string,
    delegadoId: string,
  ): EquipoInterno => ({
    id,
    edicionId,
    clubId,
    delegadoId,
    nombre,
    estado: 'CONFIRMADO',
    habilitado: true,
    inscritoTardio: false,
    retiradoEn: null,
    motivoRetiro: null,
    retiradoPor: null,
    creadoPor: DUENO,
    creadoEn: ahora(),
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
      deleg('del-3', 'Marta Díaz', '+50588880009', '333333', true, true),
    ],
    equipos: [
      equipo('eq-1', ligaId(1), 'Los Tigres', 'club-1', 'del-1'),
      equipo('eq-2', ligaId(1), 'Deportivo Norte', 'club-2', 'del-2'),
      // Pedro lleva otro equipo del mismo club en la otra liga, con otro nombre (el nombre es por liga).
      equipo('eq-3', ligaId(2), 'Tigres Sub-18', 'club-1', 'del-1'),
    ],
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

// ---------- rol de quien pide ----------

/**
 * ¿Quien pide es el dueño? En el E2E el rol viaja en el valor de la cookie `at_admin` (`…-admin` = ADMIN); fuera
 * del navegador (pruebas unitarias) se pasa explícito. Con una cookie httpOnly real no se podría leer: solo
 * existe con MSW.
 */
export function esDuenoActual(): boolean {
  if (typeof document === 'undefined') return true;
  return !/(?:^|;\s*)at_admin=[^;]*admin/.test(document.cookie);
}

const soloDueno = (dueno: boolean) => {
  if (!dueno) throw new Problema(403, 'FORBIDDEN', 'Solo el dueño puede hacerlo');
};

// ---------- errores ----------

const errorValidacion = (...mensajes: string[]) =>
  new Problema(400, 'VALIDATION_ERROR', 'Datos inválidos', { errors: mensajes });
const noEncontrado = (que: string) => new Problema(404, 'NOT_FOUND', `${que} no encontrado`);

// ---------- teléfono y PIN (mismas reglas que el API, FRONT_FASE_03.md §9) ----------

const PAISES: Record<string, { codigo: string; largos: number[]; troncal?: string }> = {
  NI: { codigo: '505', largos: [8] },
  CR: { codigo: '506', largos: [8] },
  PA: { codigo: '507', largos: [7, 8] },
  HN: { codigo: '504', largos: [8] },
  GT: { codigo: '502', largos: [8] },
  SV: { codigo: '503', largos: [8] },
  EC: { codigo: '593', largos: [8, 9], troncal: '0' },
  CO: { codigo: '57', largos: [10] },
  MX: { codigo: '52', largos: [10] },
  US: { codigo: '1', largos: [10], troncal: '1' },
};

const telefonoInvalido = (detalle: string) =>
  new Problema(400, 'TELEFONO_INVALIDO', 'Teléfono inválido', { detail: detalle });

/** Normaliza a E.164 con el país del cliente; lanza `TELEFONO_INVALIDO`. */
export function normalizarTelefono(valor: string, pais = PAIS): string {
  const limpio = valor.replace(/[\s\-.()]/g, '');
  if (!/^\+?\d+$/.test(limpio)) throw telefonoInvalido('El teléfono solo admite números.');
  const nacionalValido = (p: (typeof PAISES)[string], n: string) => {
    const sinTroncal = p.troncal && n.startsWith(p.troncal) ? n.slice(p.troncal.length) : n;
    const candidatos = n === sinTroncal ? [n] : [sinTroncal, n];
    const ok = candidatos.find((c) => !c.startsWith('0') && p.largos.includes(c.length));
    return ok ?? null;
  };

  const internacional = limpio.startsWith('+') || limpio.startsWith('00');
  if (internacional) {
    const digitos = limpio.startsWith('+') ? limpio.slice(1) : limpio.slice(2);
    const p = Object.values(PAISES).find((x) => digitos.startsWith(x.codigo));
    if (p) {
      const nacional = nacionalValido(p, digitos.slice(p.codigo.length));
      if (nacional) return `+${p.codigo}${nacional}`;
      throw telefonoInvalido('El número no tiene un largo válido para ese país.');
    }
    if (/^[1-9]\d{7,14}$/.test(digitos)) return `+${digitos}`;
    throw telefonoInvalido('El número internacional no es válido.');
  }

  const p = PAISES[pais];
  if (!p) throw telefonoInvalido('Escribe el número en formato internacional (+código de país).');
  // También se acepta el código de país escrito sin «+».
  if (limpio.startsWith(p.codigo)) {
    const nacional = nacionalValido(p, limpio.slice(p.codigo.length));
    if (nacional) return `+${p.codigo}${nacional}`;
  }
  const nacional = nacionalValido(p, limpio);
  if (!nacional) throw telefonoInvalido('El número no tiene un largo válido para el país.');
  return `+${p.codigo}${nacional}`;
}

/** PIN obvio: dígitos iguales, escalera completa o bloque que se repite (§9.2). */
export function pinEsDebil(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const d = [...pin].map(Number);
  const paso = (k: number) => d.every((x, i) => i === 0 || x - d[i - 1] === k);
  if (paso(1) || paso(-1)) return true;
  return [1, 2, 3].some(
    (n) => pin.length % n === 0 && pin === pin.slice(0, n).repeat(pin.length / n),
  );
}

// ---------- armado de respuestas ----------

const club = (cid: string) => estado.clubes.find((c) => c.id === cid)!;
const delegadoDe = (did: string) => estado.delegados.find((d) => d.id === did)!;
const vivo = (e: EquipoInterno) => e.estado !== 'RETIRADO';
const bloqueado = (d: DelegadoInterno) =>
  d.bloqueadoHasta !== null && new Date(d.bloqueadoHasta) > new Date();

function equipoDto(e: EquipoInterno): EquipoDto {
  const d = delegadoDe(e.delegadoId);
  return clonar({
    id: e.id,
    edicionId: e.edicionId,
    nombre: e.nombre,
    estado: e.estado,
    habilitado: e.habilitado,
    inscritoTardio: e.inscritoTardio,
    retirado: e.estado === 'RETIRADO',
    retiradoEn: e.retiradoEn,
    motivoRetiro: e.motivoRetiro,
    retiradoPor: e.retiradoPor,
    club: { id: e.clubId, nombre: club(e.clubId).nombre },
    delegado: { id: d.id, nombre: d.nombre, telefono: d.telefono, activo: d.activo },
    creadoPor: e.creadoPor,
    creadoEn: e.creadoEn,
  });
}

const ligaCorta = (eid: string) => {
  const l = obtenerEdicion(eid);
  return { id: l.id, nombre: l.nombre, estado: l.estado };
};

function equiposDeDelegado(did: string) {
  return estado.equipos
    .filter((e) => e.delegadoId === did)
    .map((e) => ({
      id: e.id,
      nombre: e.nombre,
      estado: e.estado,
      edicion: ligaCorta(e.edicionId),
    }));
}

function delegadoDto(d: DelegadoInterno): DelegadoDto {
  return clonar({
    id: d.id,
    nombre: d.nombre,
    telefono: d.telefono,
    activo: d.activo,
    acceso: {
      estado: !d.activo ? 'DESACTIVADO' : bloqueado(d) ? 'BLOQUEADO' : 'ACTIVO',
      bloqueadoHasta: d.activo && bloqueado(d) ? d.bloqueadoHasta : null,
    },
    ultimoAccesoEn: d.ultimoAccesoEn,
    pinCambiadoEn: d.pinCambiadoEn,
    equipos: equiposDeDelegado(d.id),
    creadoPor: d.creadoPor,
    creadoEn: d.creadoEn,
  });
}

function accesoDe(d: DelegadoInterno, pin: string) {
  const origen = typeof location === 'undefined' ? 'http://localhost:3001' : location.origin;
  const loginUrl = `${origen}/delegado/${SLUG_CLIENTE}`;
  const texto = `Tu acceso a Cancha Nica:\nEnlace: ${loginUrl}\nTeléfono: ${d.telefono}\nPIN: ${pin}`;
  return {
    pin,
    loginUrl,
    waMeUrl: `https://wa.me/${d.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`,
  };
}

// ---------- clubes ----------

export function listarClubes(q?: string, archivados = false): ClubDto[] {
  const n = q ? normalizarNombre(q) : '';
  return clonar(
    estado.clubes
      .filter((c) => (archivados || c.activo) && (!n || normalizarNombre(c.nombre).includes(n)))
      .map((c) => {
        const suyos = estado.equipos.filter((e) => e.clubId === c.id && vivo(e));
        return {
          ...c,
          equipos: suyos.length,
          ligas: suyos.map((e) => ({ id: e.edicionId, nombre: ligaCorta(e.edicionId).nombre })),
        };
      }),
  );
}

function buscarClub(cid: string) {
  const c = estado.clubes.find((x) => x.id === cid);
  if (!c) throw noEncontrado('Club');
  return c;
}

/** Archivar y restaurar son idempotentes. */
export function archivarClub(cid: string, archivar: boolean): ClubDto {
  buscarClub(cid).activo = !archivar;
  return listarClubes(undefined, true).find((c) => c.id === cid)!;
}

// ---------- delegados ----------

export const listarDelegados = (): DelegadoDto[] => estado.delegados.map(delegadoDto);

function buscarDelegado(did: string) {
  const d = estado.delegados.find((x) => x.id === did);
  if (!d) throw noEncontrado('Delegado');
  return d;
}

function validarNombrePersona(nombre: string | undefined) {
  const limpio = (nombre ?? '').trim();
  if (limpio.length < 1 || limpio.length > 80)
    throw errorValidacion('El nombre del delegado va de 1 a 80 caracteres.');
  return limpio;
}

export function actualizarDelegado(did: string, b: ActualizarDelegadoDto): DelegadoDto {
  const d = buscarDelegado(did);
  const nombre = b.nombre === undefined ? d.nombre : validarNombrePersona(b.nombre);
  let telefono = d.telefono;
  if (b.telefono !== undefined) {
    telefono = normalizarTelefono(b.telefono);
    if (estado.delegados.some((x) => x.id !== did && x.telefono === telefono))
      throw new Problema(409, 'DELEGADO_PHONE_DUPLICATED', 'Teléfono ya registrado');
  }
  d.nombre = nombre;
  if (telefono !== d.telefono) {
    d.telefono = telefono;
    // Cambiar el teléfono cierra sus sesiones.
    if (estado.sesionDelegadoId === did) estado.sesionDelegadoId = null;
  }
  return delegadoDto(d);
}

export function resetearPinDelegado(did: string): DelegadoConPinDto {
  const d = buscarDelegado(did);
  d.pin = nuevoPin();
  while (pinEsDebil(d.pin)) d.pin = nuevoPin();
  d.pinCambiadoEn = null;
  d.ultimoAccesoEn = null;
  d.fallos = 0;
  d.bloqueadoHasta = null;
  if (estado.sesionDelegadoId === did) estado.sesionDelegadoId = null;
  return { delegado: delegadoDto(d), ...accesoDe(d, d.pin) };
}

export function desbloquearDelegado(did: string): DelegadoDto {
  const d = buscarDelegado(did);
  d.fallos = 0;
  d.bloqueadoHasta = null;
  return delegadoDto(d);
}

/** Activar y desactivar son idempotentes; desactivar corta el acceso al instante. */
export function activarDelegado(did: string, activar: boolean): DelegadoDto {
  const d = buscarDelegado(did);
  if (!activar) {
    const conEquipo = estado.equipos.some(
      (e) => e.delegadoId === did && vivo(e) && obtenerEdicion(e.edicionId).estado !== 'FINALIZADA',
    );
    if (conEquipo)
      throw new Problema(409, 'DELEGADO_CON_EQUIPOS_ACTIVOS', 'El delegado lleva equipos activos');
    if (estado.sesionDelegadoId === did) estado.sesionDelegadoId = null;
  }
  d.activo = activar;
  return delegadoDto(d);
}

// ---------- equipos de la liga ----------

type Liga = EdicionDto;

function ligaDe(eid: string): Liga {
  return obtenerEdicion(eid); // 404 si no existe
}

function buscarEquipo(eid: string, equipoId: string) {
  const e = estado.equipos.find((x) => x.id === equipoId && x.edicionId === eid);
  if (!e) throw noEncontrado('Equipo');
  return e;
}

export function listarEquipos(edicionId: string, filtro?: EstadoEquipo): EquipoDto[] {
  ligaDe(edicionId);
  return estado.equipos
    .filter((e) => e.edicionId === edicionId && (!filtro || e.estado === filtro))
    .map(equipoDto);
}

export function obtenerEquipo(edicionId: string, equipoId: string): EquipoDto {
  ligaDe(edicionId);
  return equipoDto(buscarEquipo(edicionId, equipoId));
}

/** Liga que ya no admite cambios de datos (renombrar, reasignar). */
function exigirEditable(liga: Liga) {
  if (liga.archivadaEn) throw new Problema(409, 'EDICION_ARCHIVADA', 'Liga archivada');
  if (liga.estado === 'FINALIZADA')
    throw new Problema(409, 'EDICION_SOLO_LECTURA', 'Liga finalizada');
}

function validarNombreEquipo(nombre: string | undefined) {
  const limpio = (nombre ?? '').trim();
  if (!normalizarNombre(limpio)) throw errorValidacion('El nombre del equipo es obligatorio.');
  if (limpio.length > 80) throw errorValidacion('El nombre admite hasta 80 caracteres.');
  return limpio;
}

/** Un equipo retirado sigue ocupando su nombre en la liga. */
function exigirNombreLibre(edicionId: string, nombre: string, excepto?: string) {
  const n = normalizarNombre(nombre);
  if (
    estado.equipos.some(
      (e) => e.edicionId === edicionId && e.id !== excepto && normalizarNombre(e.nombre) === n,
    )
  )
    throw new Problema(409, 'EQUIPO_DUPLICADO', 'Equipo duplicado', {
      detail: 'Ya hay un equipo con ese nombre en esta liga.',
    });
}

type EntradaDelegado = ReasignarDelegadoDto['delegado'];
type DelegadoResuelto =
  { existente: DelegadoInterno } | { nuevo: { nombre: string; telefono: string } };

/** Resuelve `{ id }` o `{ nombre, telefono }` sin crear nada (todo se valida antes de escribir). */
function resolverDelegado(entrada: EntradaDelegado | undefined): DelegadoResuelto {
  const e = entrada as Record<string, unknown> | undefined;
  if (!e || typeof e !== 'object') throw errorValidacion('Falta el delegado.');
  if (typeof e.id === 'string') {
    const d = buscarDelegado(e.id);
    if (!d.activo) throw new Problema(409, 'DELEGADO_DESACTIVADO', 'Delegado desactivado');
    return { existente: d };
  }
  const nombre = validarNombrePersona(e.nombre as string | undefined);
  const telefono = normalizarTelefono(String(e.telefono ?? ''));
  const d = estado.delegados.find((x) => x.telefono === telefono);
  if (d) {
    if (!d.activo) throw new Problema(409, 'DELEGADO_DESACTIVADO', 'Delegado desactivado');
    return { existente: d };
  }
  return { nuevo: { nombre, telefono } };
}

function exigirDelegadoLibre(edicionId: string, d: DelegadoInterno, excepto?: string) {
  if (
    estado.equipos.some(
      (e) => e.edicionId === edicionId && e.id !== excepto && e.delegadoId === d.id && vivo(e),
    )
  )
    throw new Problema(
      409,
      'DELEGADO_PHONE_DUPLICATED',
      'El delegado ya lleva un equipo en esta liga',
    );
}

function crearDelegado(n: { nombre: string; telefono: string }): DelegadoInterno {
  let pin = nuevoPin();
  while (pinEsDebil(pin)) pin = nuevoPin();
  const d: DelegadoInterno = {
    id: id('del'),
    nombre: n.nombre,
    telefono: n.telefono,
    pin,
    activo: true,
    pinCambiadoEn: null,
    ultimoAccesoEn: null,
    fallos: 0,
    bloqueadoHasta: null,
    creadoPor: DUENO,
    creadoEn: ahora(),
  };
  estado.delegados.push(d);
  return d;
}

export function inscribirEquipo(
  edicionId: string,
  b: InscribirEquipoDto,
  dueno = esDuenoActual(),
): EquipoConAccesoDto {
  const liga = ligaDe(edicionId);
  if (liga.archivadaEn) throw new Problema(409, 'INSCRIPCION_CERRADA', 'Inscripción cerrada');
  if (liga.estado === 'EN_CURSO') soloDueno(dueno);
  else if (liga.estado !== 'CONFIGURACION' && liga.estado !== 'EN_REGISTRO')
    throw new Problema(409, 'INSCRIPCION_CERRADA', 'Inscripción cerrada');

  const nombre = validarNombreEquipo(b.nombre);
  const resuelto = resolverDelegado(b.delegado);
  exigirNombreLibre(edicionId, nombre);

  // Club: el elegido o, en silencio, el del mismo nombre normalizado; si no existe se crea.
  let clubExistente: ClubInterno | undefined;
  if (b.club?.id) clubExistente = buscarClub(b.club.id);
  else
    clubExistente = estado.clubes.find(
      (c) => normalizarNombre(c.nombre) === normalizarNombre(nombre),
    );
  if (clubExistente && !clubExistente.activo)
    throw new Problema(409, 'CLUB_ARCHIVADO', 'Club archivado');
  if (
    clubExistente &&
    estado.equipos.some((e) => e.edicionId === edicionId && e.clubId === clubExistente.id)
  )
    throw new Problema(409, 'EQUIPO_CLUB_DUPLICADO', 'El club ya está en esta liga');
  if ('existente' in resuelto) exigirDelegadoLibre(edicionId, resuelto.existente);

  // Todo validado: ahora se escribe.
  const c: ClubInterno = clubExistente ?? {
    id: id('club'),
    nombre,
    escudoUrl: null,
    activo: true,
    creadoPor: DUENO,
    creadoEn: ahora(),
  };
  if (!clubExistente) estado.clubes.push(c);
  const d = 'existente' in resuelto ? resuelto.existente : crearDelegado(resuelto.nuevo);
  const e: EquipoInterno = {
    id: id('eq'),
    edicionId,
    clubId: c.id,
    delegadoId: d.id,
    nombre,
    estado: 'CONFIRMADO',
    habilitado: true,
    inscritoTardio: liga.estado === 'EN_CURSO',
    retiradoEn: null,
    motivoRetiro: null,
    retiradoPor: null,
    creadoPor: DUENO,
    creadoEn: ahora(),
  };
  estado.equipos.push(e);
  return conAcceso(e, d, 'nuevo' in resuelto);
}

function conAcceso(e: EquipoInterno, d: DelegadoInterno, esNuevo: boolean): EquipoConAccesoDto {
  const acceso = esNuevo ? accesoDe(d, d.pin) : { pin: null, loginUrl: null, waMeUrl: null };
  return { equipo: equipoDto(e), delegadoExistente: !esNuevo, ...acceso };
}

export function renombrarEquipo(edicionId: string, equipoId: string, nombre: string): EquipoDto {
  const liga = ligaDe(edicionId);
  const e = buscarEquipo(edicionId, equipoId);
  exigirEditable(liga);
  const limpio = validarNombreEquipo(nombre);
  exigirNombreLibre(edicionId, limpio, equipoId);
  e.nombre = limpio;
  return equipoDto(e);
}

export function reasignarDelegado(
  edicionId: string,
  equipoId: string,
  b: ReasignarDelegadoDto,
): EquipoConAccesoDto {
  const liga = ligaDe(edicionId);
  const e = buscarEquipo(edicionId, equipoId);
  exigirEditable(liga);
  if (!vivo(e))
    throw new Problema(409, 'DELEGADO_REASIGNACION_INVALIDA', 'El equipo está retirado');
  const resuelto = resolverDelegado(b.delegado);
  if ('existente' in resuelto) exigirDelegadoLibre(edicionId, resuelto.existente, equipoId);
  const d = 'existente' in resuelto ? resuelto.existente : crearDelegado(resuelto.nuevo);
  // El delegado anterior pierde este equipo al instante: el alcance se consulta en cada petición.
  e.delegadoId = d.id;
  return conAcceso(e, d, 'nuevo' in resuelto);
}

export function retirarEquipo(
  edicionId: string,
  equipoId: string,
  motivo: string | undefined,
  dueno = esDuenoActual(),
): EquipoDto {
  const liga = ligaDe(edicionId);
  const e = buscarEquipo(edicionId, equipoId);
  if (liga.archivadaEn || liga.estado === 'EN_ELIMINATORIAS' || liga.estado === 'FINALIZADA')
    throw new Problema(409, 'RETIRO_CERRADO', 'Retiro cerrado');
  if (liga.estado === 'EN_CURSO' || liga.estado === 'PAUSADA') soloDueno(dueno);
  const texto = (motivo ?? '').trim();
  if (!texto) throw errorValidacion('El motivo es obligatorio.');
  if (texto.length > 500) throw errorValidacion('El motivo admite hasta 500 caracteres.');
  // Idempotente: repetir no sobrescribe el motivo original.
  if (vivo(e)) {
    e.estado = 'RETIRADO';
    e.retiradoEn = ahora();
    e.motivoRetiro = texto;
    e.retiradoPor = DUENO;
  }
  return equipoDto(e);
}

export function reincorporarEquipo(edicionId: string, equipoId: string): EquipoDto {
  const liga = ligaDe(edicionId);
  const e = buscarEquipo(edicionId, equipoId);
  if (liga.archivadaEn || (liga.estado !== 'CONFIGURACION' && liga.estado !== 'EN_REGISTRO'))
    throw new Problema(409, 'REINCORPORACION_CERRADA', 'Reincorporación cerrada');
  if (!vivo(e)) {
    e.estado = 'CONFIRMADO';
    e.retiradoEn = null;
    e.motivoRetiro = null;
    e.retiradoPor = null;
  }
  return equipoDto(e);
}

// ---------- enlace con el arranque de la liga (fase 2) ----------

puenteEquipos.contar = (edicionId, excluidos) =>
  estado.equipos.filter(
    (e) => e.edicionId === edicionId && vivo(e) && e.habilitado && !excluidos.includes(e.id),
  ).length;
puenteEquipos.validarExcluidos = (edicionId, ids) => {
  for (const eid of ids)
    if (!estado.equipos.some((e) => e.id === eid && e.edicionId === edicionId))
      throw noEncontrado('Equipo');
};
puenteEquipos.excluir = (edicionId, ids) => {
  for (const e of estado.equipos)
    if (e.edicionId === edicionId && ids.includes(e.id)) e.habilitado = false;
};

// ---------- lectura de plataforma (solo GET, sin PIN ni teléfono) ----------

export function delegadosDeOrganizacion(): DelegadoPlataformaDto[] {
  return estado.delegados.map((d) => {
    const { acceso: _acceso, telefono: _tel, ...resto } = delegadoDto(d);
    void _acceso;
    void _tel;
    return resto;
  });
}

export function equiposDeOrganizacion(): EquipoPlataformaDto[] {
  return clonar(
    estado.equipos.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      estado: e.estado,
      club: { id: e.clubId, nombre: club(e.clubId).nombre },
      delegado: { id: e.delegadoId, nombre: delegadoDe(e.delegadoId).nombre },
      edicion: ligaCorta(e.edicionId),
      creadoPor: e.creadoPor,
      creadoEn: e.creadoEn,
    })),
  );
}

/** Conteos de la ficha del cliente: delegados activos y equipos inscritos (sin retirados). */
export const conteosDeOrganizacion = () => ({
  delegados: estado.delegados.filter((d) => d.activo).length,
  equipos: estado.equipos.filter(vivo).length,
});

// ---------- portal del delegado ----------

const ORG = { id: 'org-1', nombre: NOMBRE_CLIENTE, slug: SLUG_CLIENTE };

function principal(d: DelegadoInterno): DelegadoPrincipalDto {
  return clonar({
    id: d.id,
    nombre: d.nombre,
    telefono: d.telefono,
    pinCambiadoEn: d.pinCambiadoEn,
    organizacion: ORG,
    // Solo las ligas no finalizadas (ni archivadas); el equipo retirado sale marcado.
    equipos: estado.equipos
      .filter((e) => {
        const l = obtenerEdicion(e.edicionId);
        return e.delegadoId === d.id && l.estado !== 'FINALIZADA' && !l.archivadaEn;
      })
      .map((e) => {
        const l = obtenerEdicion(e.edicionId);
        return {
          id: e.id,
          nombre: e.nombre,
          estado: e.estado,
          retirado: !vivo(e),
          retiradoEn: e.retiradoEn,
          club: { id: e.clubId, nombre: club(e.clubId).nombre },
          edicion: ligaDelegado(l),
        };
      }),
  });
}

const ligaDelegado = (l: Liga) => ({
  id: l.id,
  nombre: l.nombre,
  slug: l.slug,
  modalidad: l.modalidad,
  estado: l.estado,
  categoria: { id: l.categoria.id, nombre: l.categoria.nombre },
});

function registrarFallo(d: DelegadoInterno) {
  d.fallos += 1;
  if (d.fallos >= MAX_FALLOS) {
    d.bloqueadoHasta = new Date(Date.now() + MIN_BLOQUEO * 60_000).toISOString();
    d.fallos = 0;
  }
}

const sesionActual = () => {
  const d = estado.delegados.find((x) => x.id === estado.sesionDelegadoId);
  if (!d || !d.activo) throw new Problema(401, 'UNAUTHORIZED', 'Sin sesión');
  return d;
};

export function loginDelegado(
  orgSlug: string,
  telefono: string,
  pin: string,
): DelegadoPrincipalDto {
  // Un solo mensaje: cliente inexistente, teléfono mal escrito o desconocido, PIN errado y desactivado.
  const invalido = new Problema(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas');
  if (orgSlug !== SLUG_CLIENTE) throw invalido;
  let tel: string;
  try {
    tel = normalizarTelefono(telefono);
  } catch {
    throw invalido;
  }
  const d = estado.delegados.find((x) => x.telefono === tel);
  if (!d || !d.activo) throw invalido;
  if (bloqueado(d)) throw new Problema(429, 'DELEGADO_BLOQUEADO', 'Delegado bloqueado');
  if (d.pin !== pin) {
    registrarFallo(d);
    throw invalido;
  }
  d.fallos = 0;
  d.ultimoAccesoEn = ahora();
  estado.sesionDelegadoId = d.id;
  return principal(d);
}

export function cerrarSesionDelegado() {
  estado.sesionDelegadoId = null;
}

export const delegadoMe = (): DelegadoPrincipalDto => principal(sesionActual());

/** Alcance por liga: se consulta en cada petición (§6). */
export function delegadoEdicion(edicionId: string): LigaDelegadoDetalleDto {
  const d = sesionActual();
  const liga = obtenerEdicionOrNull(edicionId);
  if (!liga || liga.archivadaEn) throw noEncontrado('Liga');
  const e = estado.equipos.find(
    (x) => x.edicionId === edicionId && x.delegadoId === d.id && vivo(x),
  );
  if (!e || !e.habilitado) throw new Problema(403, 'FORBIDDEN', 'No llevas un equipo en esta liga');
  if (liga.estado === 'FINALIZADA')
    throw new Problema(409, 'EDICION_SOLO_LECTURA', 'La liga ya finalizó');
  return clonar({
    edicion: ligaDelegado(liga),
    equipo: {
      id: e.id,
      nombre: e.nombre,
      estado: e.estado,
      retirado: false,
      retiradoEn: null,
      club: { id: e.clubId, nombre: club(e.clubId).nombre },
    },
  });
}

function obtenerEdicionOrNull(eid: string): Liga | null {
  try {
    return obtenerEdicion(eid);
  } catch {
    return null;
  }
}

export function cambiarPin(b: CambiarPinDto): void {
  const d = sesionActual();
  if (!/^\d{6}$/.test(b.pinNuevo ?? '')) throw errorValidacion('El PIN nuevo tiene 6 números.');
  if (bloqueado(d)) throw new Problema(429, 'DELEGADO_BLOQUEADO', 'Delegado bloqueado');
  // Un PIN actual incorrecto cuenta como intento fallido (mismo bloqueo que el login).
  if (d.pin !== b.pinActual) {
    registrarFallo(d);
    throw new Problema(400, 'PIN_ACTUAL_INCORRECTO', 'El PIN actual no es correcto');
  }
  if (b.pinNuevo === b.pinActual || pinEsDebil(b.pinNuevo))
    throw new Problema(400, 'PIN_DEBIL', 'El PIN es demasiado obvio');
  d.pin = b.pinNuevo;
  d.pinCambiadoEn = ahora();
  d.fallos = 0;
}
