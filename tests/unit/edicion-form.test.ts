import { beforeEach, describe, expect, it } from 'vitest';
import {
  cambiosDeEdicion,
  edicionAForm,
  ligaSchema,
  puedeEditar,
} from '@/features/ediciones/lib/edicion-form';
import {
  camposBloqueadosDe,
  erroresReglasDe,
  incumplimientosDe,
  sePuedeForzar,
} from '@/features/ediciones/lib/errores';
import { aFechaInput, aIso, fechaLarga } from '@/features/ediciones/lib/fechas';
import { reiniciarDb, obtenerEdicion } from '@/mocks/fase2/db';
import { ApiError, problemToApiError } from '@/shared/api/mutator';

beforeEach(() => reiniciarDb());

describe('fechas del contrato (date-time ISO)', () => {
  it('ida y vuelta del día sin correrse por la zona horaria', () => {
    expect(aIso('2026-11-01')).toBe('2026-11-01T00:00:00.000Z');
    expect(aFechaInput('2026-11-01T00:00:00.000Z')).toBe('2026-11-01');
    expect(aFechaInput(aIso('2027-03-01'))).toBe('2027-03-01');
  });
  it('vacío es null y null es vacío', () => {
    expect(aIso('')).toBeNull();
    expect(aFechaInput(null)).toBe('');
  });
  it('muestra el día en UTC', () => {
    expect(fechaLarga('2026-11-01T00:00:00.000Z')).toMatch(/1/);
    expect(fechaLarga(null)).toBe('—');
  });
});

describe('edicionAForm', () => {
  it('trae una liga del contrato a valores válidos del formulario', () => {
    const f = edicionAForm(obtenerEdicion('ed-1'));
    expect(f.nombre).toBe('Apertura 2026');
    expect(f.fechaInicio).toBe('2026-11-01');
    expect(f.rosterMax).toBe(18);
    expect(f.woGoles).toBe(3);
    expect(f.minEquiposArranque).toBe(4);
    expect(f.clasificadosPlayoff).toBe('');
    expect(ligaSchema.safeParse(f).success).toBe(true);
  });
});

describe('cambiosDeEdicion: solo viaja lo que cambió (el backend es «todo o nada»)', () => {
  const inicial = () => edicionAForm(obtenerEdicion('ed-1'));

  it('sin cambios no hay nada que enviar', () => {
    expect(cambiosDeEdicion(inicial(), inicial())).toEqual({});
  });
  it('un nombre nuevo viaja solo, sin tocar los campos que el estado bloquea', () => {
    expect(cambiosDeEdicion(inicial(), { ...inicial(), nombre: ' Apertura 2027 ' })).toEqual({
      nombre: 'Apertura 2027',
    });
  });
  it('un costo cambiado viaja como texto con dos decimales', () => {
    const c = cambiosDeEdicion(inicial(), { ...inicial(), costoArbitraje: '12,5' });
    expect(c).toEqual({ costoArbitraje: '12.50' });
  });
  it('las sanciones viajan completas, no por partes', () => {
    const c = cambiosDeEdicion(inicial(), { ...inicial(), multaRoja: '7.5' });
    expect(Object.keys(c)).toEqual(['reglasSanciones']);
    expect(c.reglasSanciones).toMatchObject({ multaRoja: '7.50', rojaDirectaFechas: 1 });
  });
  it('las reglas de la modalidad viajan completas si cambia una', () => {
    const c = cambiosDeEdicion(inicial(), { ...inicial(), maxConvocados: 13 });
    expect(Object.keys(c)).toEqual(['reglasModalidad']);
    expect(c.reglasModalidad).toMatchObject({ maxConvocados: 13, jugadoresEnCancha: 5 });
  });
  it('un parámetro suelto (plantel) viaja por su nombre', () => {
    expect(cambiosDeEdicion(inicial(), { ...inicial(), rosterMax: 20 })).toEqual({ rosterMax: 20 });
  });
  it('cambiar la modalidad envía la modalidad y las reglas que se ven en pantalla', () => {
    const nuevo = { ...inicial(), modalidad: 'FUTBOL_9' as const };
    const c = cambiosDeEdicion(inicial(), nuevo);
    expect(c.modalidad).toBe('FUTBOL_9');
    expect(c.reglasModalidad).toBeDefined();
    expect(c.rosterMin).toBe(nuevo.rosterMin);
  });
  it('borrar una edad envía null; omitirla no la toca', () => {
    const base = { ...inicial(), edadMaxima: '17' };
    expect(cambiosDeEdicion(base, { ...base, edadMaxima: '' })).toEqual({ edadMaxima: null });
    expect(cambiosDeEdicion(base, { ...base })).toEqual({});
  });
  it('una fecha borrada envía null; una nueva viaja como date-time', () => {
    expect(cambiosDeEdicion(inicial(), { ...inicial(), fechaFinEstimada: '' })).toEqual({
      fechaFinEstimada: null,
    });
    expect(cambiosDeEdicion(inicial(), { ...inicial(), fechaInicio: '2026-12-01' })).toEqual({
      fechaInicio: '2026-12-01T00:00:00.000Z',
    });
  });
  it('eliminatorias: 8 clasificados y tercer puesto', () => {
    const c = cambiosDeEdicion(inicial(), {
      ...inicial(),
      clasificadosPlayoff: '8',
      tercerPuesto: true,
    });
    expect(c).toEqual({ clasificadosPlayoff: 8, tercerPuesto: true });
  });
  it('quitar las eliminatorias envía null', () => {
    const base = { ...inicial(), clasificadosPlayoff: '8' as const };
    expect(cambiosDeEdicion(base, { ...base, clasificadosPlayoff: '' })).toEqual({
      clasificadosPlayoff: null,
    });
  });
  it('un slug vacío no se envía', () => {
    expect(cambiosDeEdicion(inicial(), { ...inicial(), slug: '' })).toEqual({});
  });
});

describe('puedeEditar usa lo que dice la API', () => {
  it('en configuración todo', () => {
    const e = obtenerEdicion('ed-2');
    for (const g of [
      'nombre',
      'slug',
      'categoria',
      'fechaInicio',
      'reglas',
      'sanciones',
      'costos',
    ] as const)
      expect(puedeEditar(e, g)).toBe(true);
  });
  it('con inscripciones abiertas quedan fijos el slug, la fecha de inicio y la categoría', () => {
    const e = obtenerEdicion('ed-1');
    expect(puedeEditar(e, 'slug')).toBe(false);
    expect(puedeEditar(e, 'fechaInicio')).toBe(false);
    expect(puedeEditar(e, 'categoria')).toBe(false);
    expect(puedeEditar(e, 'reglas')).toBe(true);
  });
  it('si la API no lista un campo, no se puede editar', () => {
    expect(puedeEditar({ camposEditables: ['nombre'] }, 'costos')).toBe(false);
    expect(puedeEditar({ camposEditables: [] }, 'nombre')).toBe(false);
  });
});

describe('lectura de los errores del contrato', () => {
  const error = (cuerpo: object) =>
    problemToApiError(409, { status: 409, code: 'X', title: 'x', ...cuerpo });

  it('incumplimientos con su marca de forzable', () => {
    const e = error({
      incumplimientos: [
        { codigo: 'FIXTURE_NO_GENERADO', mensaje: 'Falta el calendario.', forzable: true },
        { codigo: 'PARTIDOS_PENDIENTES', mensaje: 'Hay partidos pendientes.', forzable: false },
      ],
    });
    const lista = incumplimientosDe(e);
    expect(lista).toHaveLength(2);
    expect(lista[0]).toEqual({
      codigo: 'FIXTURE_NO_GENERADO',
      mensaje: 'Falta el calendario.',
      forzable: true,
    });
    expect(sePuedeForzar(lista)).toBe(false);
    expect(sePuedeForzar(lista.filter((i) => i.forzable))).toBe(true);
  });
  it('sin incumplimientos no hay nada que forzar', () => {
    expect(sePuedeForzar([])).toBe(false);
    expect(incumplimientosDe(error({}))).toEqual([]);
  });
  it('errores de reglas y campos bloqueados', () => {
    const e = error({
      erroresReglas: [
        {
          codigo: 'ROSTER_MAX_MENOR_QUE_CONVOCADOS',
          campo: 'rosterMax',
          mensaje: 'Debe ser mayor.',
        },
      ],
      camposBloqueados: [{ campo: 'slug', codigo: 'EDICION_CAMPO_CONGELADO' }],
    });
    expect(erroresReglasDe(e)).toEqual([
      { codigo: 'ROSTER_MAX_MENOR_QUE_CONVOCADOS', campo: 'rosterMax', mensaje: 'Debe ser mayor.' },
    ]);
    expect(camposBloqueadosDe(e)).toEqual([{ campo: 'slug', codigo: 'EDICION_CAMPO_CONGELADO' }]);
  });
  it('un error que no es de la API no rompe nada', () => {
    expect(incumplimientosDe(new Error('red'))).toEqual([]);
    expect(erroresReglasDe(undefined)).toEqual([]);
  });
  it('ApiError conserva el cuerpo completo', () => {
    const e = error({ detail: 'algo', extra: 1 });
    expect(e).toBeInstanceOf(ApiError);
    expect(e.cuerpo).toMatchObject({ extra: 1, detail: 'algo' });
  });
});
