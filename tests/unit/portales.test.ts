import { describe, expect, it } from 'vitest';
import {
  destinoSeguro,
  portalDeRuta,
  rutaBloqueada,
  rutaInicio,
  rutaLogin,
  rutaRefresh,
} from '@/shared/api/portales';

describe('portalDeRuta', () => {
  it('deduce el portal de rutas del API y de la app', () => {
    expect(portalDeRuta('/plataforma/organizaciones?estado=ACTIVA')).toBe('plataforma');
    expect(portalDeRuta('/admin/me')).toBe('admin');
    expect(portalDeRuta('/delegado/me')).toBe('delegado');
    expect(portalDeRuta('/mesa/me')).toBe('mesa');
  });

  it('devuelve null para rutas sin portal (auth, ping, públicas)', () => {
    expect(portalDeRuta('/auth/refresh?portal=admin')).toBeNull();
    expect(portalDeRuta('/ping')).toBeNull();
    expect(portalDeRuta('/public/organizaciones/x')).toBeNull();
  });
});

describe('rutas por portal', () => {
  it('login, bloqueada, inicio y refresh', () => {
    expect(rutaLogin('admin')).toBe('/admin/login');
    expect(rutaLogin('plataforma')).toBe('/plataforma/login');
    expect(rutaBloqueada('delegado')).toBe('/delegado/bloqueada');
    expect(rutaInicio('plataforma')).toBe('/plataforma/clientes');
    expect(rutaInicio('admin')).toBe('/admin');
    expect(rutaRefresh('admin', '/admin/x?a=1')).toBe('/admin/refresh?next=%2Fadmin%2Fx%3Fa%3D1');
  });
});

describe('destinoSeguro (anti open redirect)', () => {
  it('acepta rutas internas', () => {
    expect(destinoSeguro('/admin/ediciones?x=1', '/admin')).toBe('/admin/ediciones?x=1');
  });

  it.each([undefined, null, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'admin'])(
    'rechaza %s',
    (valor) => {
      expect(destinoSeguro(valor as string | null | undefined, '/admin')).toBe('/admin');
    },
  );
});
