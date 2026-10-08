import { beforeEach, describe, expect, it } from 'vitest';
import { SANCIONES_POR_DEFECTO } from '@/features/ediciones/lib/sanciones';
import * as db from '@/mocks/fase2/db';
import type { CrearEdicionDto } from '@/shared/api/generated/models';

/** Código del error que lanza la operación (o `null` si no falla). */
const codigo = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof db.Problema) return e.code;
    throw e;
  }
  return null;
};
/** Campos extra del error (`incumplimientos`, `erroresReglas`, `camposBloqueados`). */
const extras = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof db.Problema) return e.extras ?? {};
    throw e;
  }
  return {};
};

const nueva = (
  categoriaId: string,
  modalidad: CrearEdicionDto['modalidad'] = 'FUTSAL',
): CrearEdicionDto => ({
  nombre: 'Copa Nueva',
  categoriaId,
  modalidad,
});

beforeEach(() => db.reiniciarDb());

describe('categorías', () => {
  it('«sub 18» choca con «Sub-18» (409)', () => {
    expect(codigo(() => db.crearCategoria({ nombre: 'sub 18' }))).toBe('CATEGORIA_DUPLICADA');
  });
  it('«SUB.18» también es la misma', () => {
    expect(codigo(() => db.crearCategoria({ nombre: 'SUB.18' }))).toBe('CATEGORIA_DUPLICADA');
  });
  it('rango invertido, edades fuera de 5 a 80 y nombre sin letras (400)', () => {
    expect(
      codigo(() => db.crearCategoria({ nombre: 'Veteranos', edadMinima: 40, edadMaxima: 30 })),
    ).toBe('VALIDATION_ERROR');
    expect(codigo(() => db.crearCategoria({ nombre: 'Niños', edadMaxima: 3 }))).toBe(
      'VALIDATION_ERROR',
    );
    expect(codigo(() => db.crearCategoria({ nombre: '---' }))).toBe('VALIDATION_ERROR');
  });
  it('cuenta las ligas que la usan', () => {
    expect(db.listarCategorias().find((c) => c.nombre === 'Libre')?.ediciones).toBe(1);
  });
  it('archivar oculta del listado, restaurar la devuelve y ambos son idempotentes', () => {
    db.archivarCategoria('cat-1', true);
    db.archivarCategoria('cat-1', true);
    expect(db.listarCategorias(false).some((c) => c.id === 'cat-1')).toBe(false);
    const archivada = db.listarCategorias(true).find((c) => c.id === 'cat-1');
    expect(archivada?.activa).toBe(false);
    db.archivarCategoria('cat-1', false);
    expect(db.listarCategorias(false).some((c) => c.id === 'cat-1')).toBe(true);
  });
  it('en el PATCH, null borra un límite y omitirlo lo deja', () => {
    expect(db.actualizarCategoria('cat-2', { nombre: 'Sub-18' }).edadMaxima).toBe(17);
    expect(db.actualizarCategoria('cat-2', { edadMaxima: null }).edadMaxima).toBeNull();
  });
  it('una categoría archivada no admite ligas nuevas', () => {
    expect(codigo(() => db.crearEdicion(nueva('cat-3')))).toBe('CATEGORIA_ARCHIVADA');
  });
});

describe('ligas', () => {
  it('crea en configuración con preset, edades de la categoría y valores por defecto', () => {
    const l = db.crearEdicion({
      ...nueva('cat-2', 'FUTBOL_9'),
      fechaInicio: '2027-01-10T00:00:00.000Z',
    });
    expect(l.estado).toBe('CONFIGURACION');
    expect(l.slug).toBe('copa-nueva');
    expect(l.edadMaxima).toBe(17);
    expect(l.rosterMax).toBe(22);
    expect(l.reglasSanciones).toEqual(SANCIONES_POR_DEFECTO);
    expect(l.costoInscripcion).toBe('0.00');
    expect(l.minEquiposArranque).toBe(4);
    expect(l.clasificadosPlayoff).toBeNull();
  });
  it('un slug repetido se resuelve con sufijo, sin error', () => {
    db.crearEdicion(nueva('cat-2', 'FUTBOL_9'));
    expect(db.crearEdicion(nueva('cat-2', 'FUTBOL_11')).slug).toBe('copa-nueva-2');
  });
  it('la respuesta trae camposEditables y transicionesPosibles', () => {
    const l = db.obtenerEdicion('ed-2');
    expect(l.camposEditables).toContain('slug');
    expect(l.transicionesPosibles).toEqual(['EN_REGISTRO']);
  });
  it('reglas incoherentes se rechazan con erroresReglas y su campo', () => {
    expect(codigo(() => db.actualizarEdicion('ed-2', { rosterMax: 3 }))).toBe(
      'MODALIDAD_REGLAS_INVALIDAS',
    );
    const lista = extras(() => db.actualizarEdicion('ed-2', { rosterMax: 3 })).erroresReglas as {
      campo: string;
    }[];
    expect(lista.map((r) => r.campo)).toContain('rosterMax');
  });
  it('cambiar la modalidad recarga el preset y lo enviado se respeta encima', () => {
    const l = db.actualizarEdicion('ed-2', { modalidad: 'FUTBOL_11', rosterMax: 28 });
    expect(l.modalidad).toBe('FUTBOL_11');
    expect(l.rosterMin).toBe(14);
    expect(l.rosterMax).toBe(28);
  });
  it('todo o nada: un campo bloqueado impide aplicar los demás', () => {
    // ed-1 está en inscripciones: el slug y la fecha de inicio están fijos.
    expect(
      codigo(() => db.actualizarEdicion('ed-1', { nombre: 'Otro nombre', slug: 'nuevo' })),
    ).toBe('EDICION_CAMPO_CONGELADO');
    expect(db.obtenerEdicion('ed-1').nombre).toBe('Apertura 2026');
    const bloqueados = extras(() => db.actualizarEdicion('ed-1', { slug: 'nuevo' }))
      .camposBloqueados as { campo: string }[];
    expect(bloqueados.map((c) => c.campo)).toEqual(['slug']);
  });
  it('en juego solo se cambian nombre, fin estimado y costos', () => {
    db.cambiarEstado('ed-1', { a: 'EN_CURSO', forzar: true });
    expect(
      db.actualizarEdicion('ed-1', { nombre: 'Apertura', costoArbitraje: '12.5' }),
    ).toMatchObject({ nombre: 'Apertura', costoArbitraje: '12.50' });
    expect(codigo(() => db.actualizarEdicion('ed-1', { rosterMax: 20 }))).toBe(
      'EDICION_CAMPO_CONGELADO',
    );
    expect(codigo(() => db.actualizarEdicion('ed-1', { modalidad: 'FUTBOL_9' }))).toBe(
      'MODALIDAD_BLOQUEADA',
    );
    expect(
      codigo(() => db.actualizarEdicion('ed-1', { reglasSanciones: SANCIONES_POR_DEFECTO })),
    ).toBe('EDICION_CAMPO_CONGELADO');
  });
  it('un campo que el PATCH no admite (estado, organizacionId) es un 400', () => {
    expect(codigo(() => db.actualizarEdicion('ed-2', { estado: 'EN_CURSO' } as never))).toBe(
      'VALIDATION_ERROR',
    );
  });
  it('archivar solo en configuración y una liga archivada no se edita ni cambia de estado', () => {
    expect(codigo(() => db.archivarEdicion('ed-1', true))).toBe('EDICION_ESTADO_INVALIDO');
    expect(db.archivarEdicion('ed-2', true).archivadaEn).not.toBeNull();
    expect(db.listarEdiciones(false).some((l) => l.id === 'ed-2')).toBe(false);
    expect(codigo(() => db.actualizarEdicion('ed-2', { nombre: 'x1x' }))).toBe('EDICION_ARCHIVADA');
    expect(codigo(() => db.cambiarEstado('ed-2', { a: 'EN_REGISTRO' }))).toBe('EDICION_ARCHIVADA');
    expect(db.archivarEdicion('ed-2', false).archivadaEn).toBeNull();
  });
});

describe('estado de la liga', () => {
  it('rechaza un salto que no existe', () => {
    expect(codigo(() => db.cambiarEstado('ed-2', { a: 'EN_CURSO' }))).toBe(
      'EDICION_ESTADO_INVALIDO',
    );
  });
  it('empezar sin requisitos devuelve el checklist con lo forzable; forzar lo permite al dueño', () => {
    expect(codigo(() => db.cambiarEstado('ed-1', { a: 'EN_CURSO' }))).toBe(
      'EDICION_PRECONDICIONES_NO_CUMPLIDAS',
    );
    const lista = extras(() => db.cambiarEstado('ed-1', { a: 'EN_CURSO' })).incumplimientos as {
      codigo: string;
      forzable: boolean;
    }[];
    expect(lista.map((i) => i.codigo)).toEqual(
      expect.arrayContaining(['EQUIPOS_INSUFICIENTES', 'FIXTURE_NO_GENERADO']),
    );
    expect(lista.every((i) => i.forzable)).toBe(true);
    expect(db.cambiarEstado('ed-1', { a: 'EN_CURSO', forzar: true }).estado).toBe('EN_CURSO');
  });
  it('un admin que manda forzar recibe 403, incluso si no hacía falta', () => {
    expect(codigo(() => db.cambiarEstado('ed-2', { a: 'EN_REGISTRO', forzar: true }, false))).toBe(
      'FORBIDDEN',
    );
  });
  it('lo no forzable nunca se salta, ni siquiera con forzar', () => {
    db.cambiarEstado('ed-1', { a: 'EN_CURSO', forzar: true });
    // Sin clasificados definidos no se puede pasar a eliminatorias.
    expect(codigo(() => db.cambiarEstado('ed-1', { a: 'EN_ELIMINATORIAS', forzar: true }))).toBe(
      'EDICION_PRECONDICIONES_NO_CUMPLIDAS',
    );
    const lista = extras(() => db.cambiarEstado('ed-1', { a: 'EN_ELIMINATORIAS', forzar: true }))
      .incumplimientos as { codigo: string; forzable: boolean }[];
    expect(lista.find((i) => i.codigo === 'CLASIFICADOS_NO_DEFINIDOS')?.forzable).toBe(false);
  });
  it('una liga con eliminatorias no se finaliza desde «en juego»', () => {
    db.actualizarEdicion('ed-1', { clasificadosPlayoff: 8 });
    db.cambiarEstado('ed-1', { a: 'EN_CURSO', forzar: true });
    expect(
      codigo(() => db.cambiarEstado('ed-1', { a: 'FINALIZADA', confirmar: true, forzar: true })),
    ).toBe('EDICION_PRECONDICIONES_NO_CUMPLIDAS');
  });
  it('finalizar exige confirmación y es irreversible', () => {
    db.cambiarEstado('ed-1', { a: 'EN_CURSO', forzar: true });
    expect(codigo(() => db.cambiarEstado('ed-1', { a: 'FINALIZADA' }))).toBe(
      'CONFIRMACION_REQUERIDA',
    );
    const l = db.cambiarEstado('ed-1', { a: 'FINALIZADA', confirmar: true });
    expect(l.estado).toBe('FINALIZADA');
    expect(l.transicionesPosibles).toEqual([]);
    expect(l.camposEditables).toEqual([]);
    expect(codigo(() => db.cambiarEstado('ed-1', { a: 'EN_CURSO' }))).toBe('EDICION_SOLO_LECTURA');
  });
  it('pausar guarda el estado previo y reanudar lo restaura', () => {
    const pausada = db.cambiarEstado('ed-1', { a: 'PAUSADA' });
    expect(pausada.estadoPrevioPausa).toBe('EN_REGISTRO');
    expect(pausada.transicionesPosibles).toEqual(['EN_REGISTRO']);
    const vuelve = db.cambiarEstado('ed-1', { a: 'EN_REGISTRO' });
    expect(vuelve.estado).toBe('EN_REGISTRO');
    expect(vuelve.estadoPrevioPausa).toBeNull();
  });
  it('una sola liga abierta por categoría y modalidad, pero otra modalidad sí; pausar no libera', () => {
    const otra = db.crearEdicion({ ...nueva('cat-1'), nombre: 'Otra Libre' });
    expect(codigo(() => db.cambiarEstado(otra.id, { a: 'EN_REGISTRO' }))).toBe(
      'EDICION_CATEGORIA_ABIERTA',
    );
    db.cambiarEstado('ed-1', { a: 'PAUSADA' });
    expect(codigo(() => db.cambiarEstado(otra.id, { a: 'EN_REGISTRO' }))).toBe(
      'EDICION_CATEGORIA_ABIERTA',
    );
    const f9 = db.crearEdicion({ ...nueva('cat-1', 'FUTBOL_9'), nombre: 'Libre F9' });
    expect(db.cambiarEstado(f9.id, { a: 'EN_REGISTRO' }).estado).toBe('EN_REGISTRO');
  });
  it('una mesa activa asignada quita el requisito «sin mesa»', () => {
    const lista = (extras(() => db.cambiarEstado('ed-1', { a: 'EN_CURSO' })).incumplimientos ??
      []) as {
      codigo: string;
    }[];
    expect(lista.map((i) => i.codigo)).not.toContain('SIN_MESA_ACTIVA');
    db.definirAlcance('mesa-1', []);
    const sin = (extras(() => db.cambiarEstado('ed-1', { a: 'EN_CURSO' })).incumplimientos ??
      []) as {
      codigo: string;
    }[];
    expect(sin.map((i) => i.codigo)).toContain('SIN_MESA_ACTIVA');
  });
});

describe('mesas', () => {
  it('el listado trae el acceso de cada mesa y nunca el PIN', () => {
    const lista = db.listarMesas();
    expect(lista.find((m) => m.username === 'MESA1')?.acceso.estado).toBe('ACTIVA');
    const bloqueada = lista.find((m) => m.username === 'MESA2')!;
    expect(bloqueada.acceso.estado).toBe('BLOQUEADA');
    expect(bloqueada.acceso.bloqueadaHasta).not.toBeNull();
    expect(JSON.stringify(lista)).not.toMatch(/123456|654321|"pin"/);
  });
  it('el alta devuelve { mesa, pin, loginUrl, waMeUrl } y la 7.ª mesa se rechaza', () => {
    const r = db.crearMesa({ nombreOperador: 'Ana' });
    expect(r.pin).toMatch(/^\d{6}$/);
    expect(r.mesa.username).toBe('MESA3');
    expect(r.loginUrl).toMatch(/\/mesa\/sopa$/);
    expect(r.waMeUrl).toContain('https://wa.me/');
    for (let i = 0; i < 3; i++) db.crearMesa({});
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
  it('desactivar no libera el lugar y es idempotente; activar la devuelve', () => {
    db.activarMesa('mesa-1', false);
    db.activarMesa('mesa-1', false);
    expect(db.listarMesas().find((m) => m.id === 'mesa-1')?.acceso.estado).toBe('DESACTIVADA');
    for (let i = 0; i < 4; i++) db.crearMesa({});
    expect(codigo(() => db.crearMesa({}))).toBe('MESA_LIMIT_REACHED');
    expect(db.activarMesa('mesa-1', true).activo).toBe(true);
  });
  it('resetear invalida el PIN anterior y levanta el bloqueo', () => {
    const r = db.resetearPin('mesa-2');
    expect(r.mesa.acceso.estado).toBe('ACTIVA');
    expect(codigo(() => db.loginMesa('sopa', 'MESA2', r.pin))).toBeNull();
    expect(codigo(() => db.loginMesa('sopa', 'MESA2', '654321'))).toBe(
      r.pin === '654321' ? null : 'INVALID_CREDENTIALS',
    );
  });
  it('el alcance reemplaza y rechaza una liga que no existe', () => {
    expect(db.definirAlcance('mesa-1', ['ed-1', 'ed-2']).ediciones).toHaveLength(2);
    expect(db.definirAlcance('mesa-1', []).ediciones).toEqual([]);
    expect(codigo(() => db.definirAlcance('mesa-1', ['ed-x']))).toBe('NOT_FOUND');
  });
  it('una liga nueva en el alcance no puede estar archivada ni finalizada; las que ya tenía se conservan', () => {
    db.archivarEdicion('ed-2', true);
    expect(codigo(() => db.definirAlcance('mesa-1', ['ed-1', 'ed-2']))).toBe('EDICION_ARCHIVADA');
    db.cambiarEstado('ed-1', { a: 'EN_CURSO', forzar: true });
    db.cambiarEstado('ed-1', { a: 'FINALIZADA', confirmar: true });
    expect(db.definirAlcance('mesa-1', ['ed-1']).ediciones).toHaveLength(1);
    expect(codigo(() => db.definirAlcance('mesa-2', ['ed-1']))).toBe('EDICION_SOLO_LECTURA');
  });
  it('el operador se cambia y se borra con null', () => {
    expect(db.actualizarMesa('mesa-1', { nombreOperador: 'María' }).nombreOperador).toBe('María');
    expect(db.actualizarMesa('mesa-1', { nombreOperador: null }).nombreOperador).toBeNull();
  });
});

describe('login de mesa', () => {
  it('entra con el PIN correcto y /mesa/me trae sus ligas no finalizadas', () => {
    const p = db.loginMesa('sopa', 'mesa1', '123456');
    expect(p.organizacion.slug).toBe('sopa');
    const yo = db.mesaMe();
    expect(yo.username).toBe('MESA1');
    expect(yo.ediciones.map((e) => e.slug)).toEqual(['apertura-2026']);
    expect(yo.ediciones[0].categoria.nombre).toBe('Libre');
  });
  it('PIN errada, mesa inexistente, cliente inexistente y mesa desactivada responden igual', () => {
    db.activarMesa('mesa-1', false);
    const casos = [
      () => db.loginMesa('sopa', 'MESA9', '123456'),
      () => db.loginMesa('sopa', 'MESA2', '000000'),
      () => db.loginMesa('otro', 'MESA1', '123456'),
      () => db.loginMesa('sopa', 'MESA1', '123456'),
    ];
    // MESA2 está bloqueada (429); las demás, indistinguibles.
    expect(casos.map(codigo)).toEqual([
      'INVALID_CREDENTIALS',
      'MESA_BLOQUEADA',
      'INVALID_CREDENTIALS',
      'INVALID_CREDENTIALS',
    ]);
  });
  it('una mesa bloqueada responde MESA_BLOQUEADA hasta que se desbloquea', () => {
    expect(codigo(() => db.loginMesa('sopa', 'MESA2', '654321'))).toBe('MESA_BLOQUEADA');
    db.desbloquearMesa('mesa-2');
    expect(codigo(() => db.loginMesa('sopa', 'MESA2', '654321'))).toBeNull();
  });
  it('quitarle una liga o desactivarla surte efecto al instante', () => {
    db.loginMesa('sopa', 'MESA1', '123456');
    db.definirAlcance('mesa-1', []);
    expect(db.mesaMe().ediciones).toEqual([]);
    db.activarMesa('mesa-1', false);
    expect(codigo(() => db.mesaMe())).toBe('UNAUTHORIZED');
  });
  it('sin sesión /mesa/me da 401', () => {
    expect(codigo(() => db.mesaMe())).toBe('UNAUTHORIZED');
  });
});
