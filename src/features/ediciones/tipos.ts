/**
 * Vistas tipadas de lo que el contrato deja como objeto libre. El snapshot declara `reglasModalidad`,
 * `reglasSanciones` y `reglasFinancieras` como `{ [key: string]: unknown }`; aquí se les da forma según
 * `FRONT_FASE_02.md` (secciones 3.2 y 3.4) y PLAN_BACKEND 4.12, 4.14 y H15. Los DTO de la API vienen de
 * `@/shared/api/generated/models`.
 */
import { Modalidad as ModalidadApi } from '@/shared/api/generated/models/modalidad';

export const MODALIDADES = Object.values(ModalidadApi);
export type Modalidad = (typeof MODALIDADES)[number];

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

/** Reglas de sanción por liga. Los importes son decimales como texto («0.00»). */
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

export type ReglasFinancieras = {
  bloquearEquipoPorDeudaInscripcion: boolean;
  bloquearEquipoPorDeudaArbitraje: boolean;
};

export type CostosEdicion = { costoInscripcion: string; costoArbitraje: string };

/** Condición que impide un cambio de estado (`incumplimientos` del error). */
export type Incumplimiento = { codigo: string; mensaje: string; forzable: boolean };

/** Invariante de la modalidad que se rompe (`erroresReglas` del error). */
export type ErrorRegla = { codigo: string; campo: string; mensaje: string };

/** Campo bloqueado por el estado de la liga (`camposBloqueados` del error). */
export type CampoBloqueado = { campo: string; codigo: string };
