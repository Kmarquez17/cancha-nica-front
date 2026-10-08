import { describe, expect, it } from 'vitest';
import {
  FONDO_CLARO,
  FONDO_OSCURO,
  TEXTO_BLANCO,
  TEXTO_TINTA,
  contraste,
  cssTemaCliente,
  esHex,
  temaDeCliente,
  textoSobre,
} from '@/shared/lib/color-cliente';

describe('contraste', () => {
  it('blanco sobre negro es 21:1 y es simétrico', () => {
    expect(contraste('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });
});

describe('textoSobre', () => {
  it('Tinta sobre colores claros y blanco sobre oscuros', () => {
    expect(textoSobre('#FDE047')).toBe(TEXTO_TINTA);
    expect(textoSobre('#0B1F4D')).toBe(TEXTO_BLANCO);
  });
});

describe('esHex', () => {
  it('acepta solo #RRGGBB', () => {
    expect(esHex('#16A34A')).toBe(true);
    expect(esHex('#16a34a')).toBe(true);
    expect(esHex('16A34A')).toBe(false);
    expect(esHex('#fff')).toBe(false);
    expect(esHex('')).toBe(false);
    expect(esHex(null)).toBe(false);
  });
});

describe('temaDeCliente', () => {
  it('devuelve null si el color no es válido', () => {
    expect(temaDeCliente('rojo')).toBeNull();
    expect(temaDeCliente('')).toBeNull();
    expect(temaDeCliente(undefined)).toBeNull();
  });

  it('no toca un color que ya cumple', () => {
    const t = temaDeCliente('#16A34A')!;
    expect(t.claro).toMatchObject({ primary: '#16A34A', ajustado: false });
  });

  it.each(['#16A34A', '#FDE047', '#0B1F4D', '#DC2626', '#7C3AED', '#FFFFFF', '#000000', '#808080'])(
    'cumple contraste en claro y oscuro para %s',
    (hex) => {
      const t = temaDeCliente(hex)!;
      expect(contraste(t.claro.primary, FONDO_CLARO)).toBeGreaterThanOrEqual(3);
      expect(contraste(t.claro.primaryForeground, t.claro.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(t.oscuro.primary, FONDO_OSCURO)).toBeGreaterThanOrEqual(3);
      expect(contraste(t.oscuro.primaryForeground, t.oscuro.primary)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('oscurece en claro y aclara en oscuro un amarillo y un azul marino', () => {
    const amarillo = temaDeCliente('#FDE047')!;
    expect(amarillo.claro.ajustado).toBe(true);
    expect(amarillo.oscuro.ajustado).toBe(false);
    const marino = temaDeCliente('#0B1F4D')!;
    expect(marino.claro.ajustado).toBe(false);
    expect(marino.oscuro.ajustado).toBe(true);
  });

  it('en Mesa el texto sobre el color llega a 7:1', () => {
    for (const hex of ['#16A34A', '#7C3AED', '#DC2626']) {
      const t = temaDeCliente(hex, 'mesa')!;
      expect(contraste(t.claro.primaryForeground, t.claro.primary)).toBeGreaterThanOrEqual(7);
      expect(contraste(t.oscuro.primaryForeground, t.oscuro.primary)).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('cssTemaCliente', () => {
  const tema = temaDeCliente('#16A34A')!;

  it('sin alcance usa :root y :root.dark e incluye ring y sidebar', () => {
    const css = cssTemaCliente(tema);
    expect(css).toContain(':root:root{--primary:#16A34A;');
    expect(css).toContain(':root.dark{--primary:');
    expect(css).toContain('--ring:#16A34A');
    expect(css).toContain('--sidebar-primary:#16A34A');
  });

  it('con alcance limita las reglas al contenedor', () => {
    const css = cssTemaCliente(tema, '[data-liga="1"]');
    expect(css.startsWith('[data-liga="1"]{')).toBe(true);
    expect(css).toContain('.dark [data-liga="1"]{');
  });
});
