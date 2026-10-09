import { beforeEach, describe, expect, it } from 'vitest';
import * as db2 from '@/mocks/fase2/db';
import * as db from '@/mocks/fase3/db';

const codigo = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof db2.Problema) return e.code;
    throw e;
  }
  return null;
};

const nuevo = (nombre: string, telefono: string) => ({ nombre, telefono });
const LIBRE = 'ed-1'; // EN_REGISTRO
const SUB18 = 'ed-2'; // CONFIGURACION

beforeEach(() => {
  db2.reiniciarDb();
  db.reiniciarDb3();
});

describe('teléfono y PIN', () => {
  it('normaliza el número local con el país del cliente', () => {
    expect(db.normalizarTelefono('8888 8888')).toBe('+50588888888');
    expect(db.normalizarTelefono('+505 8888-8888')).toBe('+50588888888');
    expect(db.normalizarTelefono('00505 88888888')).toBe('+50588888888');
    expect(db.normalizarTelefono('50588888888')).toBe('+50588888888');
  });
  it('rechaza lo que no se puede normalizar', () => {
    expect(codigo(() => db.normalizarTelefono('888'))).toBe('TELEFONO_INVALIDO');
    expect(codigo(() => db.normalizarTelefono('88a88888'))).toBe('TELEFONO_INVALIDO');
  });
  it('detecta los PIN obvios', () => {
    for (const p of ['000000', '777777', '123456', '654321', '121212', '123123', '120120'])
      expect(db.pinEsDebil(p), p).toBe(true);
    for (const p of ['890123', '482915', '135792']) expect(db.pinEsDebil(p), p).toBe(false);
  });
});

describe('clubes', () => {
  it('lista cuántos equipos tiene y en qué ligas juega', () => {
    const tigres = db.listarClubes().find((c) => c.nombre === 'Los Tigres')!;
    expect(tigres.equipos).toBe(2);
    expect(tigres.ligas.map((l) => l.id).sort()).toEqual([LIBRE, SUB18]);
    expect(db.listarClubes().find((c) => c.nombre === 'Atlético Sur')!.equipos).toBe(0);
  });
  it('el buscador no distingue mayúsculas ni tildes', () => {
    expect(db.listarClubes('atletico').map((c) => c.nombre)).toEqual(['Atlético Sur']);
  });
  it('archivar y restaurar son idempotentes; los archivados solo salen con ?archivados', () => {
    expect(db.archivarClub('club-3', true).activo).toBe(false);
    expect(db.archivarClub('club-3', true).activo).toBe(false);
    expect(db.listarClubes().some((c) => c.id === 'club-3')).toBe(false);
    expect(db.listarClubes(undefined, true).some((c) => c.id === 'club-3')).toBe(true);
    expect(db.archivarClub('club-3', false).activo).toBe(true);
  });
});

describe('inscribir un equipo (formulario único)', () => {
  it('crea el club y el delegado nuevos y entrega el PIN una sola vez', () => {
    const r = db.inscribirEquipo(LIBRE, {
      nombre: 'Estrella Roja',
      delegado: nuevo('Luis Mora', '8888 0003'),
    });
    expect(r.delegadoExistente).toBe(false);
    expect(r.equipo.club.nombre).toBe('Estrella Roja');
    expect(r.equipo.delegado.telefono).toBe('+50588880003');
    expect(r.pin).toMatch(/^\d{6}$/);
    expect(r.loginUrl).toContain('/delegado/sopa');
    expect(r.waMeUrl).toContain('wa.me/50588880003');
    // Los listados no vuelven a traer el PIN.
    expect(JSON.stringify(db.listarEquipos(LIBRE))).not.toContain(`"${r.pin}"`);
    expect(JSON.stringify(db.listarDelegados())).not.toContain(`"${r.pin}"`);
    expect(JSON.stringify(db.delegadosDeOrganizacion())).not.toContain(`"${r.pin}"`);
  });

  it('reutiliza el club en silencio por nombre normalizado', () => {
    const antes = db.listarClubes().length;
    // «Atlético Sur» ya existe como club: no se avisa nada.
    const r = db.inscribirEquipo(LIBRE, {
      nombre: 'atletico  sur',
      delegado: nuevo('Luis Mora', '88880003'),
    });
    expect(r.equipo.club.id).toBe('club-3');
    expect(db.listarClubes().length).toBe(antes);
  });

  it('un club elegido de la lista puede llamarse distinto en cada liga', () => {
    const r = db.inscribirEquipo(SUB18, {
      nombre: 'Halcones B',
      club: { id: 'club-2' },
      delegado: { id: 'del-2' },
    });
    expect(r.equipo.nombre).toBe('Halcones B');
    expect(r.equipo.club.nombre).toBe('Deportivo Norte');
    expect(r.delegadoExistente).toBe(true);
    expect(r.pin).toBeNull();
    expect(r.loginUrl).toBeNull();
    expect(r.waMeUrl).toBeNull();
  });

  it('un teléfono que ya existe reutiliza al delegado, con su nombre y su PIN', () => {
    const r = db.inscribirEquipo(LIBRE, {
      nombre: 'Estrella Roja',
      delegado: nuevo('Otro nombre', '8888 0009'), // Marta Díaz
    });
    expect(r.delegadoExistente).toBe(true);
    expect(r.equipo.delegado.nombre).toBe('Marta Díaz');
    expect(r.pin).toBeNull();
    expect(db.listarDelegados()).toHaveLength(3);
  });

  it('EQUIPO_DUPLICADO en la misma liga (incluso retirado) pero no entre ligas', () => {
    const dup =
      (nombre: string, liga = LIBRE) =>
      () =>
        db.inscribirEquipo(liga, { nombre, delegado: nuevo('Luis', '88880003') });
    expect(codigo(dup('deportivo  NORTE'))).toBe('EQUIPO_DUPLICADO');
    db.retirarEquipo(LIBRE, 'eq-2', 'Se salió', true);
    expect(codigo(dup('Deportivo Norte'))).toBe('EQUIPO_DUPLICADO');
    expect(codigo(dup('Deportivo Norte', SUB18))).toBeNull();
  });

  it('un club nunca tiene dos equipos en la misma liga', () => {
    expect(
      codigo(() =>
        db.inscribirEquipo(LIBRE, {
          nombre: 'Tigres B',
          club: { id: 'club-1' },
          delegado: { id: 'del-3' },
        }),
      ),
    ).toBe('EQUIPO_CLUB_DUPLICADO');
  });

  it('un delegado lleva un equipo por liga, y uno en cada liga distinta', () => {
    expect(
      codigo(() => db.inscribirEquipo(LIBRE, { nombre: 'Otro', delegado: { id: 'del-1' } })),
    ).toBe('DELEGADO_PHONE_DUPLICATED');
    // Ana (del-2) solo lleva uno en la Libre: puede llevar otro en la Sub-18.
    expect(
      codigo(() => db.inscribirEquipo(SUB18, { nombre: 'Otro', delegado: { id: 'del-2' } })),
    ).toBeNull();
  });

  it('un club archivado no se reutiliza', () => {
    db.archivarClub('club-3', true);
    expect(
      codigo(() =>
        db.inscribirEquipo(LIBRE, { nombre: 'Atlético Sur', delegado: nuevo('Luis', '88880003') }),
      ),
    ).toBe('CLUB_ARCHIVADO');
  });

  it('no deja restos si algo falla', () => {
    const clubes = db.listarClubes(undefined, true).length;
    const delegados = db.listarDelegados().length;
    expect(
      codigo(() =>
        db.inscribirEquipo(LIBRE, { nombre: 'Nuevo FC', delegado: nuevo('Luis', 'abc') }),
      ),
    ).toBe('TELEFONO_INVALIDO');
    expect(
      codigo(() =>
        db.inscribirEquipo(LIBRE, { nombre: 'Los Tigres', delegado: nuevo('Luis', '88880003') }),
      ),
    ).toBe('EQUIPO_DUPLICADO');
    expect(db.listarClubes(undefined, true)).toHaveLength(clubes);
    expect(db.listarDelegados()).toHaveLength(delegados);
  });

  it('un delegado desactivado no recibe equipos', () => {
    db.activarDelegado('del-3', false);
    expect(
      codigo(() => db.inscribirEquipo(LIBRE, { nombre: 'Nuevo', delegado: { id: 'del-3' } })),
    ).toBe('DELEGADO_DESACTIVADO');
  });
});

describe('inscribir según el estado de la liga y el rol', () => {
  const alta = (dueno: boolean) => () =>
    db.inscribirEquipo(LIBRE, { nombre: 'Tardío FC', delegado: nuevo('Luis', '88880003') }, dueno);
  const forzarArranque = () => {
    db2.cambiarEstado(LIBRE, { a: 'EN_CURSO', forzar: true });
  };

  it('con la liga en curso solo el dueño inscribe (equipo tardío)', () => {
    forzarArranque();
    expect(codigo(alta(false))).toBe('FORBIDDEN');
    expect(alta(true)().equipo.inscritoTardio).toBe(true);
  });
  it('pausada: INSCRIPCION_CERRADA', () => {
    forzarArranque();
    db2.cambiarEstado(LIBRE, { a: 'PAUSADA' });
    expect(codigo(alta(true))).toBe('INSCRIPCION_CERRADA');
  });
  it('en registro, dueño y admin', () => {
    expect(codigo(alta(false))).toBeNull();
  });
});

describe('renombrar, reasignar, retirar y reincorporar', () => {
  it('renombrar solo toca esa liga y respeta el nombre único', () => {
    db.renombrarEquipo(LIBRE, 'eq-1', 'Tigres FC');
    const sub = db.listarEquipos(SUB18).find((e) => e.id === 'eq-3')!;
    expect(sub.nombre).toBe('Tigres Sub-18');
    expect(codigo(() => db.renombrarEquipo(LIBRE, 'eq-1', 'deportivo norte'))).toBe(
      'EQUIPO_DUPLICADO',
    );
  });

  it('reasignar a un delegado nuevo entrega PIN; el anterior conserva sus otros equipos', () => {
    const r = db.reasignarDelegado(LIBRE, 'eq-1', { delegado: nuevo('Luis Mora', '88880003') });
    expect(r.pin).toMatch(/^\d{6}$/);
    expect(r.equipo.delegado.nombre).toBe('Luis Mora');
    const pedro = db.listarDelegados().find((d) => d.id === 'del-1')!;
    expect(pedro.equipos.map((e) => e.id)).toEqual(['eq-3']);
  });

  it('reasignar a un delegado que ya lleva otro equipo en la liga se rechaza', () => {
    expect(codigo(() => db.reasignarDelegado(LIBRE, 'eq-1', { delegado: { id: 'del-2' } }))).toBe(
      'DELEGADO_PHONE_DUPLICATED',
    );
  });

  it('no se renombra ni reasigna en una liga finalizada', () => {
    db2.cambiarEstado(LIBRE, { a: 'EN_CURSO', forzar: true });
    db2.cambiarEstado(LIBRE, { a: 'FINALIZADA', confirmar: true, forzar: true });
    expect(codigo(() => db.renombrarEquipo(LIBRE, 'eq-1', 'Nuevo'))).toBe('EDICION_SOLO_LECTURA');
    expect(codigo(() => db.reasignarDelegado(LIBRE, 'eq-1', { delegado: { id: 'del-3' } }))).toBe(
      'EDICION_SOLO_LECTURA',
    );
  });

  it('retirar no borra; es idempotente y no pisa el motivo original', () => {
    const r = db.retirarEquipo(LIBRE, 'eq-2', 'Se salió', true);
    expect(r.estado).toBe('RETIRADO');
    expect(r.retirado).toBe(true);
    expect(r.retiradoPor).not.toBeNull();
    expect(db.retirarEquipo(LIBRE, 'eq-2', 'Otro motivo', true).motivoRetiro).toBe('Se salió');
    expect(db.listarEquipos(LIBRE, 'RETIRADO')).toHaveLength(1);
    expect(db.listarEquipos(LIBRE)).toHaveLength(2);
    expect(codigo(() => db.retirarEquipo(LIBRE, 'eq-1', '  ', true))).toBe('VALIDATION_ERROR');
  });

  it('reincorporar solo antes de arrancar; con la liga en marcha, REINCORPORACION_CERRADA', () => {
    db.retirarEquipo(LIBRE, 'eq-2', 'Se salió', true);
    expect(db.reincorporarEquipo(LIBRE, 'eq-2').estado).toBe('CONFIRMADO');
    db.retirarEquipo(LIBRE, 'eq-2', 'Se salió', true);
    db2.cambiarEstado(LIBRE, { a: 'EN_CURSO', forzar: true });
    expect(codigo(() => db.reincorporarEquipo(LIBRE, 'eq-2'))).toBe('REINCORPORACION_CERRADA');
  });

  it('con la liga en marcha retira solo el dueño', () => {
    db2.cambiarEstado(LIBRE, { a: 'EN_CURSO', forzar: true });
    expect(codigo(() => db.retirarEquipo(LIBRE, 'eq-2', 'x', false))).toBe('FORBIDDEN');
    expect(codigo(() => db.retirarEquipo(LIBRE, 'eq-2', 'x', true))).toBeNull();
  });
});

describe('delegados', () => {
  it('el listado distingue «PIN aún no usado», «PIN temporal» y «PIN propio»', () => {
    const [pedro, ana, marta] = db.listarDelegados();
    expect(pedro.ultimoAccesoEn).toBeNull();
    expect(ana.ultimoAccesoEn).not.toBeNull();
    expect(ana.pinCambiadoEn).toBeNull();
    expect(marta.pinCambiadoEn).not.toBeNull();
    expect(pedro.acceso.estado).toBe('ACTIVO');
  });

  it('resetear el PIN invalida el anterior y vuelve a marcar «aún no usado»', () => {
    const r = db.resetearPinDelegado('del-2');
    expect(r.pin).toMatch(/^\d{6}$/);
    expect(r.delegado.ultimoAccesoEn).toBeNull();
    expect(codigo(() => db.loginDelegado('sopa', '+50588880002', '222222'))).toBe(
      'INVALID_CREDENTIALS',
    );
    expect(JSON.stringify(db.listarDelegados())).not.toContain(`"${r.pin}"`);
  });

  it('desactivar con un equipo vivo en una liga no finalizada se rechaza', () => {
    expect(codigo(() => db.activarDelegado('del-2', false))).toBe('DELEGADO_CON_EQUIPOS_ACTIVOS');
    db.retirarEquipo(LIBRE, 'eq-2', 'Se salió', true);
    expect(db.activarDelegado('del-2', false).acceso.estado).toBe('DESACTIVADO');
    expect(db.activarDelegado('del-3', false).activo).toBe(false); // sin equipos
  });

  it('editar el teléfono revalida y cierra sus sesiones', () => {
    db.loginDelegado('sopa', '+50588880002', '222222');
    expect(db.actualizarDelegado('del-2', { telefono: '8888 0020' }).telefono).toBe('+50588880020');
    expect(codigo(() => db.delegadoMe())).toBe('UNAUTHORIZED');
    expect(codigo(() => db.actualizarDelegado('del-2', { telefono: '88880001' }))).toBe(
      'DELEGADO_PHONE_DUPLICATED',
    );
  });

  it('el bloqueo por intentos se muestra y se levanta', () => {
    for (let i = 0; i < 5; i++) codigo(() => db.loginDelegado('sopa', '+50588880002', '999999'));
    const d = db.listarDelegados().find((x) => x.id === 'del-2')!;
    expect(d.acceso.estado).toBe('BLOQUEADO');
    expect(d.acceso.bloqueadoHasta).not.toBeNull();
    expect(codigo(() => db.loginDelegado('sopa', '+50588880002', '222222'))).toBe(
      'DELEGADO_BLOQUEADO',
    );
    expect(db.desbloquearDelegado('del-2').acceso.estado).toBe('ACTIVO');
    expect(() => db.loginDelegado('sopa', '+50588880002', '222222')).not.toThrow();
  });
});

describe('portal del delegado', () => {
  it('no distingue la causa de un fallo de login', () => {
    const fallos = [
      () => db.loginDelegado('sopa', '+50588880002', '000000'),
      () => db.loginDelegado('sopa', '+50599999999', '222222'),
      () => db.loginDelegado('otro', '+50588880002', '222222'),
      () => db.loginDelegado('sopa', 'basura', '222222'),
    ];
    for (const f of fallos) expect(codigo(f)).toBe('INVALID_CREDENTIALS');
  });

  it('entra con el número local, registra el acceso y trae sus equipos de ligas no finalizadas', () => {
    const me = db.loginDelegado('sopa', '8888 0001', '111111');
    expect(me.pinCambiadoEn).toBeNull();
    expect(me.equipos.map((e) => e.nombre).sort()).toEqual(['Los Tigres', 'Tigres Sub-18']);
    expect(me.equipos.map((e) => e.edicion.categoria.nombre).sort()).toEqual(['Libre', 'Sub-18']);
    expect(db.listarDelegados().find((d) => d.id === 'del-1')!.ultimoAccesoEn).not.toBeNull();
  });

  it('un equipo retirado sale marcado y no abre la liga', () => {
    db.loginDelegado('sopa', '+50588880002', '222222');
    db.retirarEquipo(LIBRE, 'eq-2', 'Se salió', true);
    expect(db.delegadoMe().equipos[0].retirado).toBe(true);
    expect(codigo(() => db.delegadoEdicion(LIBRE))).toBe('FORBIDDEN');
  });

  it('el alcance se consulta en cada petición: reasignar lo corta al instante', () => {
    db.loginDelegado('sopa', '+50588880002', '222222');
    expect(db.delegadoEdicion(LIBRE).equipo.nombre).toBe('Deportivo Norte');
    db.reasignarDelegado(LIBRE, 'eq-2', { delegado: { id: 'del-3' } });
    expect(codigo(() => db.delegadoEdicion(LIBRE))).toBe('FORBIDDEN');
  });

  it('una liga finalizada sale de su alcance', () => {
    db.loginDelegado('sopa', '+50588880002', '222222');
    db2.cambiarEstado(LIBRE, { a: 'EN_CURSO', forzar: true });
    db2.cambiarEstado(LIBRE, { a: 'FINALIZADA', confirmar: true, forzar: true });
    expect(codigo(() => db.delegadoEdicion(LIBRE))).toBe('EDICION_SOLO_LECTURA');
    expect(db.delegadoMe().equipos).toHaveLength(0);
  });

  it('cambia su PIN pidiendo el actual y rechaza los obvios', () => {
    db.loginDelegado('sopa', '+50588880002', '222222');
    expect(codigo(() => db.cambiarPin({ pinActual: '000000', pinNuevo: '482915' }))).toBe(
      'PIN_ACTUAL_INCORRECTO',
    );
    expect(codigo(() => db.cambiarPin({ pinActual: '222222', pinNuevo: '123456' }))).toBe(
      'PIN_DEBIL',
    );
    expect(codigo(() => db.cambiarPin({ pinActual: '222222', pinNuevo: '222222' }))).toBe(
      'PIN_DEBIL',
    );
    expect(codigo(() => db.cambiarPin({ pinActual: '222222', pinNuevo: '12ab' }))).toBe(
      'VALIDATION_ERROR',
    );
    db.cambiarPin({ pinActual: '222222', pinNuevo: '482915' });
    expect(db.delegadoMe().pinCambiadoEn).not.toBeNull();
    expect(codigo(() => db.loginDelegado('sopa', '+50588880002', '222222'))).toBe(
      'INVALID_CREDENTIALS',
    );
  });

  it('un PIN actual errado cuenta como intento fallido hasta bloquear', () => {
    db.loginDelegado('sopa', '+50588880002', '222222');
    for (let i = 0; i < 5; i++)
      codigo(() => db.cambiarPin({ pinActual: '000000', pinNuevo: '482915' }));
    expect(codigo(() => db.cambiarPin({ pinActual: '222222', pinNuevo: '482915' }))).toBe(
      'DELEGADO_BLOQUEADO',
    );
  });

  it('sin sesión: UNAUTHORIZED', () => {
    expect(codigo(() => db.delegadoMe())).toBe('UNAUTHORIZED');
  });
});

describe('arranque de la liga con equipos reales', () => {
  const incumplimientos = (...excluir: string[]) => {
    try {
      db2.cambiarEstado(LIBRE, { a: 'EN_CURSO', excluirEquipos: excluir });
    } catch (e) {
      const x = e as db2.Problema;
      return (x.extras?.incumplimientos as { codigo: string }[]).map((i) => i.codigo);
    }
    return [];
  };

  it('cuenta los equipos reales y excluirEquipos baja el conteo', () => {
    // Libre tiene 2 equipos y el mínimo es 4.
    expect(incumplimientos()).toContain('EQUIPOS_INSUFICIENTES');
    db.inscribirEquipo(LIBRE, { nombre: 'C', delegado: nuevo('C', '88880011') });
    db.inscribirEquipo(LIBRE, { nombre: 'D', delegado: nuevo('D', '88880012') });
    // 4 equipos: ya no faltan, pero ROSTER_INCOMPLETO (Fase 4) sigue saliendo.
    expect(incumplimientos()).not.toContain('EQUIPOS_INSUFICIENTES');
    expect(incumplimientos()).toContain('ROSTER_INCOMPLETO');
    // Excluir uno deja 3 < 4.
    expect(incumplimientos('eq-1')).toContain('EQUIPOS_INSUFICIENTES');
  });

  it('un equipo retirado no cuenta para el arranque', () => {
    db.inscribirEquipo(LIBRE, { nombre: 'C', delegado: nuevo('C', '88880011') });
    db.inscribirEquipo(LIBRE, { nombre: 'D', delegado: nuevo('D', '88880012') });
    db.retirarEquipo(LIBRE, 'eq-2', 'Se salió', true);
    expect(incumplimientos()).toContain('EQUIPOS_INSUFICIENTES');
  });

  it('un equipo de otra liga en excluirEquipos es 404', () => {
    expect(
      codigo(() => db2.cambiarEstado(LIBRE, { a: 'EN_CURSO', excluirEquipos: ['eq-3'] })),
    ).toBe('NOT_FOUND');
  });

  it('los excluidos quedan habilitado=false; excluirEquipos fuera del arranque es 400', () => {
    db2.cambiarEstado(LIBRE, { a: 'EN_CURSO', forzar: true, excluirEquipos: ['eq-2'] });
    expect(db.listarEquipos(LIBRE).find((e) => e.id === 'eq-2')!.habilitado).toBe(false);
    expect(codigo(() => db2.cambiarEstado(LIBRE, { a: 'PAUSADA', excluirEquipos: ['eq-1'] }))).toBe(
      'VALIDATION_ERROR',
    );
  });
});

describe('lectura de plataforma', () => {
  it('trae delegados y equipos sin PIN ni teléfono, y los conteos de la ficha', () => {
    const delegados = db.delegadosDeOrganizacion();
    expect(delegados).toHaveLength(3);
    expect(JSON.stringify(delegados)).not.toMatch(/pin"|telefono|\+5058888/);
    expect(db.equiposDeOrganizacion()).toHaveLength(3);
    expect(db.conteosDeOrganizacion()).toEqual({ delegados: 3, equipos: 3 });
    db.retirarEquipo(LIBRE, 'eq-2', 'x', true);
    expect(db.conteosDeOrganizacion().equipos).toBe(2);
  });
});
