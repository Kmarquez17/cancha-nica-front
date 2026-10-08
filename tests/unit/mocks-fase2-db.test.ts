import { beforeEach, describe, expect, it } from 'vitest';
import { presetDe } from '@/features/ediciones/lib/reglas';
import {
  COSTOS_POR_DEFECTO,
  FINANZAS_POR_DEFECTO,
  SANCIONES_POR_DEFECTO,
} from '@/features/ediciones/lib/sanciones';
import * as db from '@/mocks/fase2/db';

const codigo = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof db.Problema) return e.code;
    throw e;
  }
  return null;
};

const cuerpoLiga = (
  categoriaId: string,
  modalidad: 'FUTSAL' | 'FUTBOL_9' | 'FUTBOL_11' = 'FUTSAL',
) => {
  const { reglas, parametros } = presetDe(modalidad);
  return {
    nombre: 'Copa Nueva',
    categoriaId,
    modalidad,
    fechaInicio: '2027-01-10',
    reglasModalidad: reglas,
    reglasSanciones: structuredClone(SANCIONES_POR_DEFECTO),
    reglasFinancieras: { ...FINANZAS_POR_DEFECTO },
    ...COSTOS_POR_DEFECTO,
    ...parametros,
  };
};

beforeEach(() => db.reiniciarDb());

describe('categorías', () => {
  it('«sub 18» choca con «Sub-18» (409)', () => {
    expect(codigo(() => db.crearCategoria({ nombre: 'sub 18' }))).toBe('CATEGORIA_DUPLICADA');
  });
  it('rango de edad invertido (400)', () => {
    expect(
      codigo(() => db.crearCategoria({ nombre: 'Veteranos', edadMinima: 40, edadMaxima: 30 })),
    ).toBe('VALIDATION_ERROR');
  });
  it('archivar oculta del listado y restaurar la devuelve', () => {
    db.archivarCategoria('cat-1', true);
    expect(db.listarCategorias(false).some((c) => c.id === 'cat-1')).toBe(false);
    expect(db.listarCategorias(true).some((c) => c.id === 'cat-1')).toBe(true);
    db.archivarCategoria('cat-1', false);
    expect(db.listarCategorias(false).some((c) => c.id === 'cat-1')).toBe(true);
  });
  it('una categoría archivada no admite ligas nuevas', () => {
    expect(codigo(() => db.crearEdicion(cuerpoLiga('cat-3')))).toBe('CATEGORIA_ARCHIVADA');
  });
});

describe('ligas', () => {
  it('crea en configuración con slug automático y la edad de la categoría', () => {
    const l = db.crearEdicion(cuerpoLiga('cat-2', 'FUTBOL_9'));
    expect(l.estado).toBe('CONFIGURACION');
    expect(l.slug).toBe('copa-nueva');
    expect(l.edadMaxima).toBe(17);
  });
  it('un slug repetido se resuelve con sufijo, sin error', () => {
    db.crearEdicion(cuerpoLiga('cat-2', 'FUTBOL_9'));
    expect(db.crearEdicion(cuerpoLiga('cat-2', 'FUTBOL_11')).slug).toBe('copa-nueva-2');
  });
  it('reglas incoherentes se rechazan con el detalle', () => {
    const malo = cuerpoLiga('cat-1');
    malo.rosterMax = 3;
    try {
      db.crearEdicion(malo);
      expect.unreachable();
    } catch (e) {
      expect((e as db.Problema).code).toBe('MODALIDAD_REGLAS_INVALIDAS');
      expect((e as db.Problema).errors?.join(' ')).toContain('rosterMax');
    }
  });
  it('en juego solo se cambian nombre y fin estimado', () => {
    db.cambiarEstado('ed-1', { a: 'EN_CURSO', forzar: true });
    expect(
      db.actualizarEdicion('ed-1', { nombre: 'Apertura', fechaFinEstimada: null }).nombre,
    ).toBe('Apertura');
    expect(codigo(() => db.actualizarEdicion('ed-1', { rosterMax: 20 }))).toBe(
      'EDICION_SOLO_LECTURA',
    );
    expect(codigo(() => db.actualizarEdicion('ed-1', { modalidad: 'FUTBOL_9' }))).toBe(
      'MODALIDAD_BLOQUEADA',
    );
  });
  it('en juego las sanciones se congelan pero los costos se pueden cambiar', () => {
    db.cambiarEstado('ed-1', { a: 'EN_CURSO', forzar: true });
    expect(
      db.actualizarEdicion('ed-1', { costoInscripcion: '25.00', costoArbitraje: '10.00' }),
    ).toMatchObject({ costoInscripcion: '25.00', costoArbitraje: '10.00' });
    const sanciones = { ...SANCIONES_POR_DEFECTO, multaRoja: '5.00' };
    expect(codigo(() => db.actualizarEdicion('ed-1', { reglasSanciones: sanciones }))).toBe(
      'EDICION_SOLO_LECTURA',
    );
    expect(
      codigo(() =>
        db.actualizarEdicion('ed-1', {
          reglasFinancieras: { ...FINANZAS_POR_DEFECTO, bloquearEquipoPorDeudaArbitraje: true },
        }),
      ),
    ).toBe('EDICION_SOLO_LECTURA');
  });
  it('antes de empezar las sanciones sí se ajustan', () => {
    const sanciones = { ...SANCIONES_POR_DEFECTO, multaRoja: '5.00' };
    expect(
      db.actualizarEdicion('ed-1', { reglasSanciones: sanciones }).reglasSanciones.multaRoja,
    ).toBe('5.00');
  });
  it('una liga nueva nace con los valores del plan', () => {
    const l = db.crearEdicion(cuerpoLiga('cat-1', 'FUTBOL_9'));
    expect(l.reglasSanciones).toEqual(SANCIONES_POR_DEFECTO);
    expect(l.reglasFinancieras).toEqual(FINANZAS_POR_DEFECTO);
    expect(l.costoInscripcion).toBe('0.00');
  });
  it('archivar solo en configuración', () => {
    expect(codigo(() => db.archivarEdicion('ed-1', true))).toBe('EDICION_SOLO_LECTURA');
    expect(db.archivarEdicion('ed-2', true).archivadaEn).not.toBeNull();
    expect(db.listarEdiciones(false).some((l) => l.id === 'ed-2')).toBe(false);
    expect(db.archivarEdicion('ed-2', false).archivadaEn).toBeNull();
  });
});

describe('estado de la liga', () => {
  it('rechaza un salto que el plan no permite', () => {
    expect(codigo(() => db.cambiarEstado('ed-2', { a: 'FINALIZADA', confirmar: true }))).toBe(
      'EDICION_TRANSICION_INVALIDA',
    );
  });
  it('empezar sin requisitos devuelve el reporte; forzar lo permite al dueño', () => {
    try {
      db.cambiarEstado('ed-1', { a: 'EN_CURSO' });
      expect.unreachable();
    } catch (e) {
      expect((e as db.Problema).code).toBe('EDICION_PRECONDICIONES');
      expect((e as db.Problema).errors?.length).toBeGreaterThan(0);
    }
    expect(db.cambiarEstado('ed-1', { a: 'EN_CURSO', forzar: true }).estado).toBe('EN_CURSO');
  });
  it('un admin que intenta forzar recibe 403', () => {
    expect(codigo(() => db.cambiarEstado('ed-1', { a: 'EN_CURSO', forzar: true }, false))).toBe(
      'FORBIDDEN',
    );
  });
  it('finalizar exige confirmación explícita', () => {
    db.cambiarEstado('ed-1', { a: 'EN_CURSO', forzar: true });
    db.cambiarEstado('ed-1', { a: 'EN_ELIMINATORIAS' });
    expect(codigo(() => db.cambiarEstado('ed-1', { a: 'FINALIZADA' }))).toBe(
      'CONFIRMACION_REQUERIDA',
    );
    expect(db.cambiarEstado('ed-1', { a: 'FINALIZADA', confirmar: true }).estado).toBe(
      'FINALIZADA',
    );
  });
  it('pausar guarda el estado previo y reanudar lo restaura', () => {
    const pausada = db.cambiarEstado('ed-1', { a: 'PAUSADA' });
    expect(pausada.estadoPrevioPausa).toBe('EN_REGISTRO');
    const vuelve = db.cambiarEstado('ed-1', { a: 'EN_REGISTRO' });
    expect(vuelve.estado).toBe('EN_REGISTRO');
    expect(vuelve.estadoPrevioPausa).toBeNull();
  });
  it('una sola liga abierta por categoría y modalidad, pero otra modalidad sí', () => {
    const otra = db.crearEdicion({ ...cuerpoLiga('cat-1'), nombre: 'Otra Libre' });
    expect(codigo(() => db.cambiarEstado(otra.id, { a: 'EN_REGISTRO' }))).toBe(
      'EDICION_CATEGORIA_ABIERTA',
    );
    const f9 = db.crearEdicion({ ...cuerpoLiga('cat-1', 'FUTBOL_9'), nombre: 'Libre F9' });
    expect(db.cambiarEstado(f9.id, { a: 'EN_REGISTRO' }).estado).toBe('EN_REGISTRO');
  });
});

describe('mesas', () => {
  it('la 7.ª mesa se rechaza y los usuarios son MESA1 a MESA6', () => {
    for (let i = 0; i < 4; i++) db.crearMesa({});
    expect(db.listarMesas().map((m) => m.username)).toEqual([
      'MESA1',
      'MESA2',
      'MESA3',
      'MESA4',
      'MESA5',
      'MESA6',
    ]);
    expect(codigo(() => db.crearMesa({}))).toBe('MESA_LIMIT_REACHED');
  });
  it('el PIN tiene 6 dígitos, se ve en el alta y no en el listado', () => {
    const m = db.crearMesa({ nombreOperador: 'Ana' });
    expect(m.pin).toMatch(/^\d{6}$/);
    expect(JSON.stringify(db.listarMesas())).not.toContain(m.pin);
  });
  it('resetear invalida el PIN anterior', () => {
    const m = db.crearMesa({});
    const nuevo = db.resetearPin(m.id);
    expect(codigo(() => db.loginMesa('sopa', m.username, m.pin))).toBe(
      nuevo.pin === m.pin ? null : 'INVALID_CREDENTIALS',
    );
    expect(codigo(() => db.loginMesa('sopa', m.username, nuevo.pin))).toBeNull();
  });
  it('asigna ligas y rechaza una que no existe', () => {
    expect(db.asignarEdiciones('mesa-1', ['ed-1', 'ed-2']).ediciones).toHaveLength(2);
    expect(codigo(() => db.asignarEdiciones('mesa-1', ['ed-x']))).toBe('NOT_FOUND');
  });
});

describe('login de mesa', () => {
  it('entra con el PIN correcto y /mesa/me trae sus ligas no finalizadas', () => {
    db.loginMesa('sopa', 'MESA1', '123456');
    const yo = db.mesaMe();
    expect(yo.username).toBe('MESA1');
    expect(yo.ediciones.map((e) => e.slug)).toEqual(['apertura-2026']);
  });
  it('cuenta inexistente, PIN errónea, cliente inexistente y mesa inactiva responden igual', () => {
    db.actualizarMesa('mesa-1', { activa: false });
    const casos = [
      () => db.loginMesa('sopa', 'MESA9', '123456'),
      () => db.loginMesa('sopa', 'MESA1', '000000'),
      () => db.loginMesa('otro', 'MESA1', '123456'),
      () => db.loginMesa('sopa', 'MESA1', '123456'),
    ];
    expect(casos.map(codigo)).toEqual(Array(4).fill('INVALID_CREDENTIALS'));
  });
  it('una mesa bloqueada responde MESA_BLOQUEADA hasta que se desbloquea', () => {
    expect(codigo(() => db.loginMesa('sopa', 'MESA2', '654321'))).toBe('MESA_BLOQUEADA');
    db.desbloquearMesa('mesa-2');
    expect(codigo(() => db.loginMesa('sopa', 'MESA2', '654321'))).toBeNull();
  });
  it('quitarle una liga a la mesa surte efecto al instante', () => {
    db.loginMesa('sopa', 'MESA1', '123456');
    db.asignarEdiciones('mesa-1', []);
    expect(db.mesaMe().ediciones).toEqual([]);
  });
  it('sin sesión /mesa/me da 401', () => {
    expect(codigo(() => db.mesaMe())).toBe('UNAUTHORIZED');
  });
});
