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

beforeEach(() => {
  db2.reiniciarDb();
  db.reiniciarDb3();
});

describe('clubes', () => {
  it('«los tigres» choca con «Los Tigres»', () => {
    expect(codigo(() => db.crearClub('los  tigres'))).toBe('CLUB_DUPLICADO');
  });
  it('lista cuántos equipos tiene cada club', () => {
    const tigres = db.listarClubes().find((c) => c.nombre === 'Los Tigres')!;
    expect(tigres.equipos).toBe(1);
    expect(db.listarClubes().find((c) => c.nombre === 'Atlético Sur')!.equipos).toBe(0);
  });
  it('se renombra y se desactiva', () => {
    const c = db.crearClub('Los Halcones');
    expect(db.actualizarClub(c.id, { nombre: 'Halcones FC' }).nombre).toBe('Halcones FC');
    expect(db.actualizarClub(c.id, { activo: false }).activo).toBe(false);
  });
});

describe('inscribir un equipo en un solo formulario (R12)', () => {
  it('crea el club y el delegado nuevos y entrega el PIN una vez', () => {
    const r = db.inscribirEquipo('ed-1', {
      club: { nombre: 'Estrella Roja' },
      delegado: { nombre: 'Luis Mora', telefono: '+50588880003' },
    });
    expect(r.club.nombre).toBe('Estrella Roja');
    expect(r.delegado.nombre).toBe('Luis Mora');
    expect(r.pinEntregado?.pin).toMatch(/^\d{6}$/);
    expect(r.pinEntregado?.loginUrl).toBe('/delegado/sopa');
    // El listado no vuelve a traer el PIN.
    expect(JSON.stringify(db.listarEquipos('ed-1'))).not.toContain(r.pinEntregado!.pin);
    expect(JSON.stringify(db.listarDelegados())).not.toContain(r.pinEntregado!.pin);
  });

  it('con un delegado que ya existe no hay PIN nuevo', () => {
    const r = db.inscribirEquipo('ed-1', { club: { id: 'club-3' }, delegado: { id: 'del-3' } });
    expect(r.pinEntregado).toBeNull();
    expect(db.listarEquipos('ed-1')).toHaveLength(3);
  });

  it('el equipo nuevo marca «PIN sin usar» si el delegado nunca entró', () => {
    const r = db.inscribirEquipo('ed-1', {
      club: { nombre: 'Estrella Roja' },
      delegado: { nombre: 'Luis Mora', telefono: '+50588880003' },
    });
    expect(r.delegado.pinSinUsar).toBe(true);
  });

  it('exige inscripciones abiertas', () => {
    expect(
      codigo(() =>
        db.inscribirEquipo('ed-2', { club: { id: 'club-3' }, delegado: { id: 'del-1' } }),
      ),
    ).toBe('EDICION_NO_ACEPTA_INSCRIPCIONES');
  });

  it('un club no se inscribe dos veces en la misma liga', () => {
    expect(
      codigo(() =>
        db.inscribirEquipo('ed-1', { club: { id: 'club-1' }, delegado: { id: 'del-2' } }),
      ),
    ).toBe('EQUIPO_DUPLICADO');
  });

  it('un delegado nunca tiene dos equipos de la misma categoría', () => {
    expect(
      codigo(() =>
        db.inscribirEquipo('ed-1', { club: { id: 'club-3' }, delegado: { id: 'del-1' } }),
      ),
    ).toBe('DELEGADO_MISMA_CATEGORIA');
  });

  it('un teléfono ya registrado se rechaza: hay que elegir al delegado existente', () => {
    expect(
      codigo(() =>
        db.inscribirEquipo('ed-1', {
          club: { id: 'club-3' },
          delegado: { nombre: 'Otro Pedro', telefono: '+50588880001' },
        }),
      ),
    ).toBe('TELEFONO_DUPLICADO');
  });

  it('valida el teléfono internacional', () => {
    expect(
      codigo(() =>
        db.inscribirEquipo('ed-1', {
          club: { id: 'club-3' },
          delegado: { nombre: 'Luis Mora', telefono: '88880003' },
        }),
      ),
    ).toBe('VALIDATION_ERROR');
  });

  it('si algo falla no queda un club ni un delegado a medias', () => {
    const clubes = db.listarClubes().length;
    const delegados = db.listarDelegados().length;
    expect(
      codigo(() =>
        db.inscribirEquipo('ed-1', {
          club: { nombre: 'Club Fantasma' },
          delegado: { nombre: 'Pedro Dos', telefono: '+50588880001' },
        }),
      ),
    ).toBe('TELEFONO_DUPLICADO');
    expect(db.listarClubes()).toHaveLength(clubes);
    expect(db.listarDelegados()).toHaveLength(delegados);
  });

  it('un club desactivado no se puede inscribir', () => {
    db.actualizarClub('club-3', { activo: false });
    expect(
      codigo(() =>
        db.inscribirEquipo('ed-1', { club: { id: 'club-3' }, delegado: { id: 'del-2' } }),
      ),
    ).toBe('CLUB_INACTIVO');
  });
});

describe('reasignar delegado', () => {
  it('pasa el equipo a otro delegado existente', () => {
    const r = db.reasignarDelegado('eq-1', { id: 'del-3' });
    expect(r.delegado.id).toBe('del-3');
  });
  it('con un delegado nuevo entrega su PIN', () => {
    const r = db.reasignarDelegado('eq-1', { nombre: 'Luis Mora', telefono: '+50588880003' });
    expect(r.pinEntregado?.pin).toMatch(/^\d{6}$/);
  });
  it('respeta la regla de la categoría', () => {
    db.inscribirEquipo('ed-1', {
      club: { id: 'club-3' },
      delegado: { nombre: 'Luis', telefono: '+50588880003' },
    });
    expect(codigo(() => db.reasignarDelegado('eq-1', { id: 'del-2' }))).toBe(
      'DELEGADO_MISMA_CATEGORIA',
    );
  });
});

describe('PIN del delegado', () => {
  it('resetear invalida el anterior, desbloquea y vuelve a marcar «PIN sin usar»', () => {
    const anterior = '222222';
    const r = db.resetearPinDelegado('del-2');
    expect(r.pin).toMatch(/^\d{6}$/);
    if (r.pin !== anterior)
      expect(codigo(() => db.loginDelegado('sopa', '+50588880002', anterior))).toBe(
        'INVALID_CREDENTIALS',
      );
    expect(codigo(() => db.loginDelegado('sopa', '+50588880002', r.pin))).toBeNull();
  });
  it('el listado distingue a quien nunca entró', () => {
    const lista = db.listarDelegados();
    expect(lista.find((d) => d.id === 'del-1')!.ultimoAccesoEn).toBeNull();
    expect(lista.find((d) => d.id === 'del-2')!.ultimoAccesoEn).not.toBeNull();
  });
  it('el listado nunca trae el PIN', () => {
    expect(JSON.stringify(db.listarDelegados())).not.toMatch(/111111|222222/);
  });
});

describe('login del delegado', () => {
  it('entra, queda de «PIN usado» y /delegado/me trae sus equipos', () => {
    db.loginDelegado('sopa', '+50588880001', '111111');
    const yo = db.delegadoMe();
    expect(yo.nombre).toBe('Pedro Gómez');
    expect(yo.pinTemporal).toBe(true);
    expect(yo.equipos.map((e) => e.club.nombre)).toEqual(['Los Tigres']);
    expect(db.listarDelegados().find((d) => d.id === 'del-1')!.ultimoAccesoEn).not.toBeNull();
  });
  it('teléfono inexistente, PIN errónea, cliente inexistente y delegado inactivo responden igual', () => {
    const casos = [
      () => db.loginDelegado('sopa', '+50588889999', '111111'),
      () => db.loginDelegado('sopa', '+50588880001', '000000'),
      () => db.loginDelegado('otra', '+50588880001', '111111'),
      () => db.loginDelegado('sopa', 'no-es-telefono', '111111'),
    ];
    expect(casos.map(codigo)).toEqual(Array(4).fill('INVALID_CREDENTIALS'));
  });
  it('sin sesión /delegado/me da 401', () => {
    expect(codigo(() => db.delegadoMe())).toBe('UNAUTHORIZED');
  });
});

describe('cambiar el PIN', () => {
  beforeEach(() => db.loginDelegado('sopa', '+50588880001', '111111'));

  it('con el PIN actual correcto deja de ser temporal', () => {
    db.cambiarPin({ pinActual: '111111', pinNuevo: '999888' });
    expect(db.delegadoMe().pinTemporal).toBe(false);
    expect(codigo(() => db.loginDelegado('sopa', '+50588880001', '111111'))).toBe(
      'INVALID_CREDENTIALS',
    );
    expect(codigo(() => db.loginDelegado('sopa', '+50588880001', '999888'))).toBeNull();
  });
  it('rechaza el PIN actual incorrecto', () => {
    expect(codigo(() => db.cambiarPin({ pinActual: '000000', pinNuevo: '999888' }))).toBe(
      'INVALID_CREDENTIALS',
    );
  });
  it('rechaza un PIN que no tiene 6 números o es igual al actual', () => {
    expect(codigo(() => db.cambiarPin({ pinActual: '111111', pinNuevo: '12ab56' }))).toBe(
      'VALIDATION_ERROR',
    );
    expect(codigo(() => db.cambiarPin({ pinActual: '111111', pinNuevo: '111111' }))).toBe(
      'VALIDATION_ERROR',
    );
  });
});
