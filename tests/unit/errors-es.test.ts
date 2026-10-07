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
});
