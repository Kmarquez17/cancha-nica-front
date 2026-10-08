import { describe, expect, it } from 'vitest';
import { ApiError, problemToApiError } from '@/shared/api/mutator';
import { campoDeError, esKnownCode, mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';

describe('problemToApiError + es.ts', () => {
  it('construye ApiError desde problem+json y traduce ROSTER_FULL', () => {
    const err = problemToApiError(409, {
      status: 409,
      code: 'ROSTER_FULL',
      title: 'Roster full',
      requestId: 'req-1',
    });
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 409,
      code: 'ROSTER_FULL',
      title: 'Roster full',
      requestId: 'req-1',
    });
    expect(esKnownCode('ROSTER_FULL')).toBe(true);
    expect(mensajeDeError(err)).toBe('La plantilla de este equipo ya está completa.');
  });

  it('code desconocido devuelve mensaje genérico con requestId', () => {
    const err = problemToApiError(500, { code: 'WAT', title: 'x', requestId: 'abc-123' });
    expect(esKnownCode('WAT')).toBe(false);
    expect(mensajeDeError(err)).toBe(mensajeGenerico('abc-123'));
    expect(mensajeDeError(err)).toContain('abc-123');
  });

  it('cuerpo inválido usa status y code UNKNOWN', () => {
    const err = problemToApiError(502, null);
    expect(err).toMatchObject({ status: 502, code: 'UNKNOWN', title: 'Error' });
    expect(mensajeDeError(err)).toBe('Ocurrió un error inesperado.');
  });

  it('campoDeError es undefined si el code no mapea a un campo', () => {
    expect(campoDeError(problemToApiError(409, { code: 'ROSTER_FULL' }))).toBeUndefined();
    expect(campoDeError(problemToApiError(400, { code: 'WAT' }))).toBeUndefined();
  });

  it('traduce los códigos de la Fase 1', () => {
    for (const code of [
      'INVALID_CREDENTIALS',
      'ACCOUNT_LOCKED',
      'IP_LOCKED',
      'TOO_MANY_REQUESTS',
      'UNAUTHORIZED',
      'ORG_BLOQUEADA',
      'ORG_SLUG_DUPLICATED',
      'ORG_ESTADO_INVALIDO',
      'ORG_YA_TIENE_OWNER',
      'EMAIL_YA_REGISTRADO',
      'TOKEN_INVALIDO_O_EXPIRADO',
      'VALIDATION_ERROR',
    ]) {
      expect(esKnownCode(code), code).toBe(true);
      expect(mensajeDeError(problemToApiError(400, { code }))).not.toContain('inesperado');
    }
    expect(mensajeDeError(problemToApiError(403, { code: 'ORG_BLOQUEADA' }))).toBe(
      'La cuenta del cliente está bloqueada. Contacta al administrador de la app.',
    );
  });

  it('mapea slug y email duplicados a su campo', () => {
    expect(campoDeError(problemToApiError(409, { code: 'ORG_SLUG_DUPLICATED' }))).toBe('slug');
    expect(campoDeError(problemToApiError(409, { code: 'EMAIL_YA_REGISTRADO' }))).toBe('email');
  });

  it('PASSWORD_DEBIL muestra el motivo que manda el servidor', () => {
    const err = problemToApiError(400, { code: 'PASSWORD_DEBIL', detail: 'No uses tu correo.' });
    expect(mensajeDeError(err)).toBe('No uses tu correo.');
    expect(esKnownCode('PASSWORD_DEBIL')).toBe(true);
  });

  it('PLATAFORMA_SOLO_LECTURA se trata como error inesperado, con código de soporte', () => {
    const err = problemToApiError(403, { code: 'PLATAFORMA_SOLO_LECTURA', requestId: 'req-9' });
    expect(esKnownCode('PLATAFORMA_SOLO_LECTURA')).toBe(false);
    expect(mensajeDeError(err)).toBe('Ocurrió un error inesperado. Código de soporte: req-9.');
  });
});
