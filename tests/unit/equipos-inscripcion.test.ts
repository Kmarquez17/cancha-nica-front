import { describe, expect, it } from 'vitest';
import {
  aClubInscripcion,
  aDelegadoInscripcion,
  clubVacio,
  delegadoVacio,
  hayErrores,
  validarClub,
  validarDelegado,
  yaTieneCategoria,
} from '@/features/equipos/lib/inscripcion';

describe('club', () => {
  it('con clubes empieza en «existente»; sin clubes, en «nuevo»', () => {
    expect(clubVacio(true).modo).toBe('existente');
    expect(clubVacio(false).modo).toBe('nuevo');
  });
  it('existente exige elegir uno', () => {
    expect(validarClub({ modo: 'existente', id: '', nombre: '' }).id).toBeDefined();
    expect(hayErrores(validarClub({ modo: 'existente', id: 'club-1', nombre: '' }))).toBe(false);
  });
  it('nuevo exige un nombre de al menos 2 letras', () => {
    expect(validarClub({ modo: 'nuevo', id: '', nombre: ' a ' }).nombre).toBeDefined();
    expect(hayErrores(validarClub({ modo: 'nuevo', id: '', nombre: 'Los Pumas' }))).toBe(false);
  });
  it('arma el cuerpo según el modo', () => {
    expect(aClubInscripcion({ modo: 'existente', id: 'club-1', nombre: 'x' })).toEqual({
      id: 'club-1',
    });
    expect(aClubInscripcion({ modo: 'nuevo', id: '', nombre: '  Los Pumas ' })).toEqual({
      nombre: 'Los Pumas',
    });
  });
});

describe('delegado', () => {
  it('existente exige elegir uno', () => {
    expect(validarDelegado({ ...delegadoVacio(true) }).id).toBeDefined();
  });
  it('nuevo exige nombre y un teléfono internacional válido', () => {
    const e = validarDelegado({ modo: 'nuevo', id: '', nombre: '', telefono: '88888888' });
    expect(e.nombre).toBeDefined();
    expect(e.telefono).toMatch(/código de país/);
  });
  it('acepta un teléfono de Nicaragua con espacios', () => {
    expect(
      hayErrores(
        validarDelegado({ modo: 'nuevo', id: '', nombre: 'Luis Mora', telefono: '+505 8888 8888' }),
      ),
    ).toBe(false);
  });
  it('arma el cuerpo con el teléfono en E.164', () => {
    expect(
      aDelegadoInscripcion({
        modo: 'nuevo',
        id: '',
        nombre: ' Luis Mora ',
        telefono: '+505 8888 8888',
      }),
    ).toEqual({ nombre: 'Luis Mora', telefono: '+50588888888' });
    expect(
      aDelegadoInscripcion({ modo: 'existente', id: 'del-1', nombre: '', telefono: '' }),
    ).toEqual({
      id: 'del-1',
    });
  });
});

describe('regla de la categoría', () => {
  const delegado = {
    equipos: [
      {
        id: 'eq-1',
        club: 'Los Tigres',
        edicion: { id: 'ed-1', nombre: 'Apertura' },
        categoria: 'Libre',
      },
    ],
  };
  it('detecta una categoría repetida', () => {
    expect(yaTieneCategoria(delegado, 'Libre')).toBe(true);
    expect(yaTieneCategoria(delegado, 'Sub-18')).toBe(false);
  });
  it('al reasignar no cuenta el equipo que se está cambiando', () => {
    expect(yaTieneCategoria(delegado, 'Libre', 'eq-1')).toBe(false);
  });
});
