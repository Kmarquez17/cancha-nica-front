import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/mutator';
import { accionParaError } from '@/shared/api/session-errors';

function error(code: string, status: number, portal?: ApiError['portal']) {
  const e = new ApiError(status, code, 't');
  e.portal = portal;
  return e;
}

describe('accionParaError', () => {
  it('ORG_BLOQUEADA lleva a la pantalla de liga bloqueada del portal', () => {
    expect(
      accionParaError(error('ORG_BLOQUEADA', 403, 'admin'), { rutaActual: '/admin/ediciones' }),
    ).toEqual({ tipo: 'bloqueada', portal: 'admin', destino: '/admin/bloqueada' });
  });

  it('no redirige si ya está en la pantalla bloqueada (sin bucles)', () => {
    expect(
      accionParaError(error('ORG_BLOQUEADA', 403, 'admin'), { rutaActual: '/admin/bloqueada' }),
    ).toBeNull();
  });

  it('UNAUTHORIZED (refresh ya falló) lleva al login del portal', () => {
    expect(
      accionParaError(error('UNAUTHORIZED', 401, 'plataforma'), {
        rutaActual: '/plataforma/ligas',
      }),
    ).toEqual({ tipo: 'login', portal: 'plataforma', destino: '/plataforma/login' });
  });

  it('no redirige al login si ya está en el login', () => {
    expect(
      accionParaError(error('UNAUTHORIZED', 401, 'admin'), { rutaActual: '/admin/login' }),
    ).toBeNull();
  });

  it('los formularios de login/invitación manejan su propio ORG_BLOQUEADA', () => {
    for (const mutacion of [
      'adminLogin',
      'plataformaLogin',
      'aceptarInvitacion',
      'restablecerContrasena',
    ]) {
      expect(
        accionParaError(error('ORG_BLOQUEADA', 403, 'admin'), {
          rutaActual: '/admin/login',
          nombreMutacion: mutacion,
        }),
      ).toBeNull();
    }
  });

  it('ignora otros errores, errores sin portal y valores que no son ApiError', () => {
    expect(accionParaError(error('ROSTER_FULL', 409, 'admin'), { rutaActual: '/' })).toBeNull();
    expect(accionParaError(error('ORG_BLOQUEADA', 403), { rutaActual: '/' })).toBeNull();
    expect(accionParaError(new Error('x'), { rutaActual: '/' })).toBeNull();
  });
});
