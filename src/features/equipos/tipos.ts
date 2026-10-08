/**
 * Tipos de la Fase 3 (clubes, delegados y equipos) escritos a mano a partir de `PLAN_BACKEND.md` (modelos Club,
 * Delegado, EdicionEquipo; decisiones R12 y R13). El backend NO ha publicado aún ni la especificación de la fase
 * ni el contrato: todo es PROVISIONAL y se reemplaza por lo generado con Orval.
 */
import type { EstadoEdicion, RegistradoPor } from '@/features/ediciones/tipos';

export type EstadoEquipo = 'BORRADOR' | 'CONFIRMADO' | 'DECLINADO';

export type ClubDto = {
  id: string;
  nombre: string;
  activo: boolean;
  /** En cuántas ligas juega hoy. */
  equipos: number;
  creadoPor: RegistradoPor;
  creadaEn: string;
};

export type DelegadoEquipoRef = {
  id: string;
  club: string;
  edicion: { id: string; nombre: string };
  categoria: string;
};

export type DelegadoDto = {
  id: string;
  nombre: string;
  telefono: string; // E.164
  activo: boolean;
  /** `false` = sigue con el PIN temporal que le dio el dueño (R13). */
  pinCambiado: boolean;
  /** `null` = nunca ha entrado: «PIN aún no usado» (R13). */
  ultimoAccesoEn: string | null;
  bloqueadoHasta: string | null;
  equipos: DelegadoEquipoRef[];
  creadoPor: RegistradoPor;
  creadaEn: string;
};

export type EquipoDto = {
  id: string;
  edicionId: string;
  club: { id: string; nombre: string };
  delegado: { id: string; nombre: string; telefono: string; pinSinUsar: boolean };
  estado: EstadoEquipo;
  habilitado: boolean;
  creadoPor: RegistradoPor;
  creadaEn: string;
};

/** Club existente (`id`) o nuevo (`nombre`). */
export type ClubInscripcion = { id: string } | { nombre: string };
/** Delegado existente (`id`) o nuevo (`nombre` y `telefono` E.164). */
export type DelegadoInscripcion = { id: string } | { nombre: string; telefono: string };

/** Alta del equipo en un solo formulario (R12): crea el club y el delegado si son nuevos. */
export type InscribirEquipoBody = { club: ClubInscripcion; delegado: DelegadoInscripcion };

/** Solo viene cuando el delegado se creó en este paso: el PIN se ve una sola vez. */
export type PinEntregado = {
  delegado: { id: string; nombre: string; telefono: string };
  pin: string;
  waMeUrl: string | null;
  loginUrl: string;
};

export type EquipoInscritoDto = EquipoDto & { pinEntregado: PinEntregado | null };

export type DelegadoConPinDto = PinEntregado;

export type DelegadoLoginBody = { telefono: string; pin: string };

export type DelegadoMeDto = {
  id: string;
  nombre: string;
  telefono: string;
  /** `true` mientras no haya cambiado el PIN temporal. */
  pinTemporal: boolean;
  organizacion: { id: string; nombre: string; slug: string };
  equipos: {
    id: string;
    club: { id: string; nombre: string };
    categoria: string;
    edicion: { id: string; nombre: string; slug: string; estado: EstadoEdicion };
  }[];
};

export type CambiarPinBody = { pinActual: string; pinNuevo: string };
