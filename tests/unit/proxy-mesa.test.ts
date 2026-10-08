import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { proxy } from '@/proxy';

const pedir = (ruta: string, cookies = '') =>
  proxy(
    new NextRequest(`http://localhost:3001${ruta}`, {
      headers: cookies ? { cookie: cookies } : {},
    }),
  );
const redirige = (r: Response) => r.headers.get('location');

afterEach(() => vi.unstubAllEnvs());

describe('proxy: portal de la mesa', () => {
  it('el login es /mesa/<slug-del-cliente> y abre sin sesión', () => {
    expect(redirige(pedir('/mesa/sopa'))).toBeNull();
  });
  it('/mesa/bloqueada abre sin sesión', () => {
    expect(redirige(pedir('/mesa/bloqueada'))).toBeNull();
  });
  it('el inicio de la mesa exige sesión y vuelve a la home', () => {
    expect(redirige(pedir('/mesa'))).toBe('http://localhost:3001/');
    expect(redirige(pedir('/mesa/'))).not.toBeNull();
  });
  it('rutas internas de la mesa (dos segmentos) exigen sesión', () => {
    expect(redirige(pedir('/mesa/partido/123'))).toBe('http://localhost:3001/');
  });
  it('con cookie de la mesa pasa', () => {
    expect(redirige(pedir('/mesa', 'at_mesa=x'))).toBeNull();
  });
  it('con MSW la sesión de la mesa es simulada y no exige cookie', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MSW', 'true');
    expect(redirige(pedir('/mesa'))).toBeNull();
  });
  it('MSW no abre los otros portales', () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MSW', 'true');
    expect(redirige(pedir('/admin/ligas'))).toBe('http://localhost:3001/admin/login');
  });
});
