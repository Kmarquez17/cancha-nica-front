/**
 * Tipos de la Fase 2 escritos a mano a partir de `FASE_02.md` del backend.
 * PROVISIONAL: se reemplazan por los generados con Orval cuando llegue el snapshot y
 * `FRONT_FASE_02.md` (el nombre exacto de campos y códigos puede variar).
 */
export const MODALIDADES = ['FUTSAL', 'FUTBOL_9', 'FUTBOL_11'] as const;
export type Modalidad = (typeof MODALIDADES)[number];

export const ESTADOS_EDICION = [
  'CONFIGURACION',
  'EN_REGISTRO',
  'EN_CURSO',
  'EN_ELIMINATORIAS',
  'PAUSADA',
  'FINALIZADA',
] as const;
export type EstadoEdicion = (typeof ESTADOS_EDICION)[number];

export type ReglasModalidad = {
  jugadoresEnCancha: 5 | 9 | 11;
  minJugadoresPartido: number;
  maxConvocados: number;
  relojModo: 'REGRESIVO' | 'PROGRESIVO';
  registraFaltas: boolean;
  faltasPersonalesParaAmarilla: number | null;
  roja: { inferioridadMs: number | null; cancelaPorGolRival: boolean };
};

export type ParametrosEdicion = {
  duracionTiempoRegular: number;
  duracionTiempoEliminatoria: number;
  limiteFaltasAcumuladas: number | null;
  rosterMin: number;
  rosterMax: number;
};

/** Reglas de sanción por liga (PLAN_BACKEND 4.12). Los importes son decimales como texto («0.00»). */
export type ReglasSanciones = {
  rojaDirectaFechas: number;
  dobleAmarillaFechas: number;
  amarillasAcumuladasParaFecha: number;
  conteoAmarillasEnEliminatorias: 'MANTIENE' | 'REINICIA';
  multaAmarilla: string;
  multaRoja: string;
  multaBloqueaConvocatoria: boolean;
  walkover: {
    marcador: [number, number];
    multaInfractor: string;
    exclusionTrasNWalkovers: number | null;
  };
  inferioridadNumerica: { multaInfractor: string };
};

/** Reglas financieras por liga (PLAN_BACKEND H15). */
export type ReglasFinancieras = {
  bloquearEquipoPorDeudaInscripcion: boolean;
  bloquearEquipoPorDeudaArbitraje: boolean;
};

export type CostosEdicion = { costoInscripcion: string; costoArbitraje: string };

export type RegistradoPor = { id: string; nombre: string };

export type CategoriaDto = {
  id: string;
  nombre: string;
  edadMinima: number | null;
  edadMaxima: number | null;
  archivada: boolean;
  creadoPor: RegistradoPor;
  creadaEn: string;
};

export type EdicionDto = ParametrosEdicion &
  CostosEdicion & {
    reglasSanciones: ReglasSanciones;
    reglasFinancieras: ReglasFinancieras;
    id: string;
    nombre: string;
    slug: string;
    modalidad: Modalidad;
    categoria: { id: string; nombre: string };
    estado: EstadoEdicion;
    estadoPrevioPausa: EstadoEdicion | null;
    fechaInicio: string; // YYYY-MM-DD
    fechaFinEstimada: string | null;
    edadMinima: number | null;
    edadMaxima: number | null;
    reglasModalidad: ReglasModalidad;
    archivadaEn: string | null;
    creadoPor: RegistradoPor;
    creadaEn: string;
  };

export type MesaDto = {
  id: string;
  username: string; // MESA1..MESA6
  nombreOperador: string | null;
  activa: boolean;
  bloqueadaHasta: string | null;
  ediciones: { id: string; nombre: string }[];
  creadoPor: RegistradoPor;
  creadaEn: string;
};

/** Respuesta del alta y del reseteo: el PIN viaja una sola vez. */
export type MesaConPinDto = MesaDto & { pin: string; waMeUrl: string | null; loginUrl: string };

export type CrearCategoriaBody = {
  nombre: string;
  edadMinima?: number | null;
  edadMaxima?: number | null;
};

export type CrearEdicionBody = ParametrosEdicion &
  CostosEdicion & {
    reglasSanciones: ReglasSanciones;
    reglasFinancieras: ReglasFinancieras;
    nombre: string;
    categoriaId: string;
    modalidad: Modalidad;
    fechaInicio: string;
    fechaFinEstimada?: string | null;
    edadMinima?: number | null;
    edadMaxima?: number | null;
    reglasModalidad: ReglasModalidad;
  };

export type ActualizarEdicionBody = Partial<Omit<CrearEdicionBody, 'categoriaId'>> & {
  slug?: string;
};

export type CambiarEstadoBody = { a: EstadoEdicion; forzar?: boolean; confirmar?: boolean };

export type MesaLoginBody = { username: string; pin: string };
export type MesaMeDto = {
  id: string;
  username: string;
  nombreOperador: string | null;
  organizacion: { id: string; nombre: string; slug: string };
  ediciones: { id: string; nombre: string; slug: string; estado: EstadoEdicion }[];
};
