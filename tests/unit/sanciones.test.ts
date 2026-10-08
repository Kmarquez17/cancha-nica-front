import { describe, expect, it } from 'vitest';
import {
  COSTOS_POR_DEFECTO,
  FINANZAS_POR_DEFECTO,
  SANCIONES_POR_DEFECTO,
  aImporte,
  dineroAForm,
  dineroObjeto,
  dineroPorDefecto,
  formADinero,
} from '@/features/ediciones/lib/sanciones';

describe('valores por defecto del plan (4.12 y H15)', () => {
  it('sanciones', () => {
    expect(SANCIONES_POR_DEFECTO).toEqual({
      rojaDirectaFechas: 1,
      dobleAmarillaFechas: 1,
      amarillasAcumuladasParaFecha: 5,
      conteoAmarillasEnEliminatorias: 'MANTIENE',
      multaAmarilla: '0.00',
      multaRoja: '0.00',
      multaBloqueaConvocatoria: true,
      walkover: { marcador: [3, 0], multaInfractor: '0.00', exclusionTrasNWalkovers: null },
      inferioridadNumerica: { multaInfractor: '0.00' },
    });
  });
  it('un jugador con multa sin pagar queda bloqueado por defecto, el equipo con deuda no', () => {
    expect(SANCIONES_POR_DEFECTO.multaBloqueaConvocatoria).toBe(true);
    expect(FINANZAS_POR_DEFECTO).toEqual({
      bloquearEquipoPorDeudaInscripcion: false,
      bloquearEquipoPorDeudaArbitraje: false,
    });
    expect(COSTOS_POR_DEFECTO).toEqual({ costoInscripcion: '0.00', costoArbitraje: '0.00' });
  });
  it('los valores por defecto son válidos', () => {
    expect(dineroObjeto.safeParse(dineroPorDefecto()).success).toBe(true);
  });
});

describe('conversión formulario <-> API', () => {
  it('ida y vuelta sin perder nada', () => {
    const f = dineroAForm(SANCIONES_POR_DEFECTO, FINANZAS_POR_DEFECTO, COSTOS_POR_DEFECTO);
    expect(formADinero(f)).toEqual({
      sanciones: SANCIONES_POR_DEFECTO,
      finanzas: FINANZAS_POR_DEFECTO,
      costos: COSTOS_POR_DEFECTO,
    });
  });
  it('el marcador del W.O. se arma con los goles del ganador contra cero', () => {
    const f = { ...dineroPorDefecto(), woGoles: 2 };
    expect(formADinero(f).sanciones.walkover.marcador).toEqual([2, 0]);
  });
  it('la exclusión por W.O. puede quedar vacía', () => {
    expect(formADinero(dineroPorDefecto()).sanciones.walkover.exclusionTrasNWalkovers).toBeNull();
    expect(
      formADinero({ ...dineroPorDefecto(), woExclusionTrasN: 2 }).sanciones.walkover
        .exclusionTrasNWalkovers,
    ).toBe(2);
  });
});

describe('importes', () => {
  it.each([
    ['15', '15.00'],
    ['15.5', '15.50'],
    ['12,5', '12.50'],
    ['0', '0.00'],
    ['  30  ', '30.00'],
  ])('«%s» se guarda como %s', (entrada, salida) => {
    expect(aImporte(entrada)).toBe(salida);
  });

  it.each(['15', '15.5', '15.50', '12,5', '0'])('acepta «%s»', (v) => {
    const r = dineroObjeto.shape.multaRoja.safeParse(v);
    expect(r.success).toBe(true);
  });
  it.each(['', 'abc', '-5', '1.234', '1,2,3', '$10'])('rechaza «%s»', (v) => {
    const r = dineroObjeto.shape.multaRoja.safeParse(v);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/importe/i);
  });
});

describe('límites de las fechas de suspensión', () => {
  const base = dineroPorDefecto();
  it('las amarillas acumuladas son al menos 1 (si no, nunca se cumpliría)', () => {
    expect(dineroObjeto.safeParse({ ...base, amarillasAcumuladasParaFecha: 0 }).success).toBe(
      false,
    );
  });
  it('la roja directa puede ser 0 fechas', () => {
    expect(dineroObjeto.safeParse({ ...base, rojaDirectaFechas: 0 }).success).toBe(true);
  });
  it('el W.O. da al menos 1 gol al ganador', () => {
    expect(dineroObjeto.safeParse({ ...base, woGoles: 0 }).success).toBe(false);
  });
});
