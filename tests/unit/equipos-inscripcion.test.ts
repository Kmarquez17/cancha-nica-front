import { describe, expect, it } from 'vitest';
import {
  aDelegadoEntrada,
  aInscripcion,
  camposVacios,
  hayErrores,
  validarEquipo,
  vistaPreviaTelefono,
} from '@/features/equipos/lib/inscripcion';
import {
  esTardio,
  puedeEditar,
  puedeInscribir,
  puedeReincorporar,
  puedeRetirar,
  retiroDefinitivo,
} from '@/features/equipos/lib/permisos';

const nuevo = {
  ...camposVacios(false),
  nombre: ' Real Peña ',
  delegadoNombre: ' Pedro ',
  delegadoTelefono: ' 8888 8888 ',
};

describe('alta de equipo', () => {
  it('con delegados empieza en «existente»; sin delegados, en «nuevo»', () => {
    expect(camposVacios(true).delegadoModo).toBe('existente');
    expect(camposVacios(false).delegadoModo).toBe('nuevo');
  });

  it('exige nombre del equipo y delegado, pero el formato del teléfono lo decide el API', () => {
    expect(hayErrores(validarEquipo(nuevo))).toBe(false);
    const malo = validarEquipo({
      ...nuevo,
      nombre: '',
      delegadoTelefono: '12',
      delegadoNombre: '',
    });
    expect(malo.nombre).toBeDefined();
    expect(malo.delegadoNombre).toBeDefined();
    expect(malo.delegadoTelefono).toBeUndefined();
    expect(validarEquipo({ ...nuevo, delegadoTelefono: ' ' }).delegadoTelefono).toBeDefined();
    expect(validarEquipo({ ...camposVacios(true), nombre: 'X1' }).delegadoId).toBeDefined();
  });

  it('solo escribe el nombre del club: no envía `club`', () => {
    const cuerpo = aInscripcion({ ...nuevo, clubTexto: 'Real Peña' });
    expect(cuerpo).toEqual({
      nombre: 'Real Peña',
      delegado: { nombre: 'Pedro', telefono: '8888 8888' },
    });
    expect('club' in cuerpo).toBe(false);
  });

  it('elige un club de la lista: envía `club.id`', () => {
    expect(aInscripcion({ ...nuevo, clubTexto: 'Real Peña', clubId: 'c1' }).club).toEqual({
      id: 'c1',
    });
  });

  it('delegado existente: solo el id; nuevo: el teléfono tal cual (el API lo normaliza)', () => {
    expect(aDelegadoEntrada({ ...nuevo, delegadoModo: 'existente', delegadoId: 'd1' })).toEqual({
      id: 'd1',
    });
    expect(aDelegadoEntrada(nuevo)).toEqual({ nombre: 'Pedro', telefono: '8888 8888' });
  });

  it('vista previa del teléfono: E.164 si lo reconoce, null si no', () => {
    expect(vistaPreviaTelefono('8888 8888', 'NI')).toBe('+50588888888');
    expect(vistaPreviaTelefono('12', 'NI')).toBeNull();
    expect(vistaPreviaTelefono('', 'NI')).toBeNull();
  });
});

describe('qué se puede hacer según el estado de la liga y el rol (§3)', () => {
  const liga = (estado: string, archivadaEn: string | null = null) =>
    ({ estado, archivadaEn }) as Parameters<typeof puedeInscribir>[0];
  const vivo = { retirado: false };
  const retirado = { retirado: true };

  it('inscribir: dueño y admin hasta EN_REGISTRO; EN_CURSO solo el dueño; nunca después', () => {
    for (const e of ['CONFIGURACION', 'EN_REGISTRO']) {
      expect(puedeInscribir(liga(e), false)).toBe(true);
    }
    expect(puedeInscribir(liga('EN_CURSO'), false)).toBe(false);
    expect(puedeInscribir(liga('EN_CURSO'), true)).toBe(true);
    for (const e of ['PAUSADA', 'EN_ELIMINATORIAS', 'FINALIZADA']) {
      expect(puedeInscribir(liga(e), true)).toBe(false);
    }
    expect(puedeInscribir(liga('EN_REGISTRO', '2026-01-01'), true)).toBe(false);
    expect(esTardio(liga('EN_CURSO'))).toBe(true);
    expect(esTardio(liga('EN_REGISTRO'))).toBe(false);
  });

  it('retirar: con la liga en marcha o pausada solo el dueño; no en eliminatorias ni finalizada', () => {
    expect(puedeRetirar(liga('EN_REGISTRO'), vivo, false)).toBe(true);
    expect(puedeRetirar(liga('EN_CURSO'), vivo, false)).toBe(false);
    expect(puedeRetirar(liga('EN_CURSO'), vivo, true)).toBe(true);
    expect(puedeRetirar(liga('PAUSADA'), vivo, true)).toBe(true);
    expect(puedeRetirar(liga('EN_ELIMINATORIAS'), vivo, true)).toBe(false);
    expect(puedeRetirar(liga('FINALIZADA'), vivo, true)).toBe(false);
    expect(puedeRetirar(liga('EN_REGISTRO'), retirado, true)).toBe(false);
    expect(retiroDefinitivo(liga('EN_CURSO'))).toBe(true);
    expect(retiroDefinitivo(liga('CONFIGURACION'))).toBe(false);
  });

  it('reincorporar: solo un retirado y antes de arrancar', () => {
    expect(puedeReincorporar(liga('EN_REGISTRO'), retirado)).toBe(true);
    expect(puedeReincorporar(liga('CONFIGURACION'), retirado)).toBe(true);
    expect(puedeReincorporar(liga('EN_CURSO'), retirado)).toBe(false);
    expect(puedeReincorporar(liga('EN_REGISTRO'), vivo)).toBe(false);
  });

  it('renombrar / reasignar: no en finalizada, archivada ni sobre un retirado', () => {
    expect(puedeEditar(liga('EN_CURSO'), vivo)).toBe(true);
    expect(puedeEditar(liga('FINALIZADA'), vivo)).toBe(false);
    expect(puedeEditar(liga('EN_REGISTRO', '2026-01-01'), vivo)).toBe(false);
    expect(puedeEditar(liga('EN_REGISTRO'), retirado)).toBe(false);
  });
});
