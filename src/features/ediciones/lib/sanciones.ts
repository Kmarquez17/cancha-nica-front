import { z } from 'zod';
import type { CostosEdicion, ReglasFinancieras, ReglasSanciones } from '../tipos';

/**
 * Valores por defecto de las reglas de sanción (PLAN_BACKEND 4.12), de las financieras (H15) y de los costos.
 * Al crear una liga se precargan y el dueño los ajusta hasta que arranque (EN_CURSO); los costos se pueden
 * cambiar siempre (aplican a cargos futuros). Su efecto llega en las Fases 6 y 7.
 */
export const SANCIONES_POR_DEFECTO: ReglasSanciones = {
  rojaDirectaFechas: 1,
  dobleAmarillaFechas: 1,
  amarillasAcumuladasParaFecha: 5,
  conteoAmarillasEnEliminatorias: 'MANTIENE',
  multaAmarilla: '0.00',
  multaRoja: '0.00',
  multaBloqueaConvocatoria: true,
  walkover: { marcador: [3, 0], multaInfractor: '0.00', exclusionTrasNWalkovers: null },
  inferioridadNumerica: { multaInfractor: '0.00' },
};

export const FINANZAS_POR_DEFECTO: ReglasFinancieras = {
  bloquearEquipoPorDeudaInscripcion: false,
  bloquearEquipoPorDeudaArbitraje: false,
};

export const COSTOS_POR_DEFECTO: CostosEdicion = {
  costoInscripcion: '0.00',
  costoArbitraje: '0.00',
};

/** Valores planos del formulario (importes como texto; el marcador del W.O. como los goles del ganador). */
export type DineroForm = {
  rojaDirectaFechas: number;
  dobleAmarillaFechas: number;
  amarillasAcumuladasParaFecha: number;
  conteoAmarillasEnEliminatorias: 'MANTIENE' | 'REINICIA';
  multaAmarilla: string;
  multaRoja: string;
  multaBloqueaConvocatoria: boolean;
  woGoles: number;
  woMulta: string;
  woExclusionTrasN: number | null;
  inferioridadMulta: string;
  bloquearDeudaInscripcion: boolean;
  bloquearDeudaArbitraje: boolean;
  costoInscripcion: string;
  costoArbitraje: string;
};

/** Importe con hasta 2 decimales: «15», «15.5», «15.50». Acepta coma como separador decimal. */
const importe = z
  .string()
  .trim()
  .regex(/^\d{1,8}([.,]\d{1,2})?$/, 'Escribe un importe, por ejemplo 150 o 12.50.');

const entero = (min: number, max = 99) =>
  z
    .number({ error: 'Escribe un número.' })
    .int('Debe ser un número entero.')
    .min(min, `Mínimo ${min}.`)
    .max(max, `Máximo ${max}.`);

export const dineroObjeto = z.object({
  rojaDirectaFechas: entero(0),
  dobleAmarillaFechas: entero(0),
  amarillasAcumuladasParaFecha: entero(1),
  conteoAmarillasEnEliminatorias: z.enum(['MANTIENE', 'REINICIA']),
  multaAmarilla: importe,
  multaRoja: importe,
  multaBloqueaConvocatoria: z.boolean(),
  woGoles: entero(1),
  woMulta: importe,
  woExclusionTrasN: entero(1).nullable(),
  inferioridadMulta: importe,
  bloquearDeudaInscripcion: z.boolean(),
  bloquearDeudaArbitraje: z.boolean(),
  costoInscripcion: importe,
  costoArbitraje: importe,
});

/** «12,5» -> «12.50». */
export function aImporte(texto: string): string {
  const n = Number(texto.trim().replace(',', '.'));
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

export function dineroPorDefecto(): DineroForm {
  return dineroAForm(SANCIONES_POR_DEFECTO, FINANZAS_POR_DEFECTO, COSTOS_POR_DEFECTO);
}

export function dineroAForm(
  s: ReglasSanciones,
  f: ReglasFinancieras,
  c: CostosEdicion,
): DineroForm {
  return {
    rojaDirectaFechas: s.rojaDirectaFechas,
    dobleAmarillaFechas: s.dobleAmarillaFechas,
    amarillasAcumuladasParaFecha: s.amarillasAcumuladasParaFecha,
    conteoAmarillasEnEliminatorias: s.conteoAmarillasEnEliminatorias,
    multaAmarilla: s.multaAmarilla,
    multaRoja: s.multaRoja,
    multaBloqueaConvocatoria: s.multaBloqueaConvocatoria,
    woGoles: s.walkover.marcador[0],
    woMulta: s.walkover.multaInfractor,
    woExclusionTrasN: s.walkover.exclusionTrasNWalkovers,
    inferioridadMulta: s.inferioridadNumerica.multaInfractor,
    bloquearDeudaInscripcion: f.bloquearEquipoPorDeudaInscripcion,
    bloquearDeudaArbitraje: f.bloquearEquipoPorDeudaArbitraje,
    costoInscripcion: c.costoInscripcion,
    costoArbitraje: c.costoArbitraje,
  };
}

export function formADinero(d: DineroForm): {
  sanciones: ReglasSanciones;
  finanzas: ReglasFinancieras;
  costos: CostosEdicion;
} {
  return {
    sanciones: {
      rojaDirectaFechas: d.rojaDirectaFechas,
      dobleAmarillaFechas: d.dobleAmarillaFechas,
      amarillasAcumuladasParaFecha: d.amarillasAcumuladasParaFecha,
      conteoAmarillasEnEliminatorias: d.conteoAmarillasEnEliminatorias,
      multaAmarilla: aImporte(d.multaAmarilla),
      multaRoja: aImporte(d.multaRoja),
      multaBloqueaConvocatoria: d.multaBloqueaConvocatoria,
      walkover: {
        marcador: [d.woGoles, 0],
        multaInfractor: aImporte(d.woMulta),
        exclusionTrasNWalkovers: d.woExclusionTrasN,
      },
      inferioridadNumerica: { multaInfractor: aImporte(d.inferioridadMulta) },
    },
    finanzas: {
      bloquearEquipoPorDeudaInscripcion: d.bloquearDeudaInscripcion,
      bloquearEquipoPorDeudaArbitraje: d.bloquearDeudaArbitraje,
    },
    costos: {
      costoInscripcion: aImporte(d.costoInscripcion),
      costoArbitraje: aImporte(d.costoArbitraje),
    },
  };
}
