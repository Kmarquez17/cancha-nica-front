import { describe, expect, it } from 'vitest';
import { aE164, normalizarTelefono } from '@/shared/lib/telefono';

describe('normalizarTelefono', () => {
  it('completa un número local con el país del cliente', () => {
    expect(normalizarTelefono('8888 8888', 'NI')).toBe('+50588888888');
    expect(normalizarTelefono('(8888)-8888', 'ni')).toBe('+50588888888');
  });
  it('acepta + y 00 y el código sin +', () => {
    expect(normalizarTelefono('+505 8888 8888', 'CR')).toBe('+50588888888');
    expect(normalizarTelefono('00505 88888888', null)).toBe('+50588888888');
    expect(normalizarTelefono('50588888888', 'NI')).toBe('+50588888888');
  });
  it('rechaza largo inválido, letras y nacionales que empiezan con 0', () => {
    expect(normalizarTelefono('8888 888', 'NI')).toBeNull();
    expect(normalizarTelefono('88a88888', 'NI')).toBeNull();
    expect(normalizarTelefono('08888888', 'NI')).toBeNull();
    expect(normalizarTelefono('', 'NI')).toBeNull();
  });
  it('quita el prefijo troncal', () => {
    expect(normalizarTelefono('0991234567', 'EC')).toBe('+593991234567');
    expect(normalizarTelefono('1 555 123 4567', 'US')).toBe('+15551234567');
  });
  it('país no soportado: solo internacional', () => {
    expect(normalizarTelefono('8888 8888', 'AR')).toBeNull();
    expect(normalizarTelefono('+54 11 2345 6789', 'AR')).toBe('+541123456789');
  });
});

describe('aE164', () => {
  it('sigue exigiendo el + y un número válido', () => {
    expect(aE164('+50588888888')).toBe('+50588888888');
    expect(aE164('88888888')).toBeNull();
  });
});
