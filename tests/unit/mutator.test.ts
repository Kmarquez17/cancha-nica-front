import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, refrescarSesion } from '@/shared/api/mutator';

const problema = (status: number, code: string) =>
  new Response(JSON.stringify({ status, code, title: code, requestId: 'r1' }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
const sinContenido = () => new Response(null, { status: 204 });

let fetchMock: ReturnType<typeof vi.fn>;
const llamadas = () => fetchMock.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('apiFetch', () => {
  it('antepone /api y envía cookies', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true }));
    await expect(apiFetch('/admin/me')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/me',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('401 -> refresh del portal (204) -> reintenta una vez', async () => {
    fetchMock
      .mockResolvedValueOnce(problema(401, 'UNAUTHORIZED'))
      .mockResolvedValueOnce(sinContenido()) // POST /auth/refresh
      .mockResolvedValueOnce(json({ id: 1 }));
    await expect(apiFetch('/admin/me')).resolves.toEqual({ id: 1 });
    expect(llamadas()).toEqual([
      '/api/admin/me',
      '/api/auth/refresh?portal=admin',
      '/api/admin/me',
    ]);
  });

  it('401 con refresh fallido lanza UNAUTHORIZED con el portal, sin reintentar', async () => {
    fetchMock
      .mockResolvedValueOnce(problema(401, 'UNAUTHORIZED'))
      .mockResolvedValueOnce(problema(401, 'UNAUTHORIZED'));
    const error = (await apiFetch('/plataforma/me').catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'UNAUTHORIZED', status: 401, portal: 'plataforma' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('401 cuyo refresh responde ORG_BLOQUEADA lanza ORG_BLOQUEADA (no pide login)', async () => {
    fetchMock
      .mockResolvedValueOnce(problema(401, 'UNAUTHORIZED'))
      .mockResolvedValueOnce(problema(403, 'ORG_BLOQUEADA'));
    const error = (await apiFetch('/admin/me').catch((e) => e)) as ApiError;
    expect(error).toMatchObject({ code: 'ORG_BLOQUEADA', status: 403, portal: 'admin' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('403 ORG_BLOQUEADA directo: no refresca ni reintenta', async () => {
    fetchMock.mockResolvedValueOnce(problema(403, 'ORG_BLOQUEADA'));
    const error = (await apiFetch('/admin/me').catch((e) => e)) as ApiError;
    expect(error).toMatchObject({ code: 'ORG_BLOQUEADA', portal: 'admin' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('los 401 de /auth/* (login) no disparan refresh', async () => {
    fetchMock.mockResolvedValueOnce(problema(401, 'INVALID_CREDENTIALS'));
    const error = (await apiFetch('/auth/admin/login', { method: 'POST' }).catch(
      (e) => e,
    )) as ApiError;
    expect(error).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(error.portal).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('204 devuelve undefined', async () => {
    fetchMock.mockResolvedValueOnce(sinContenido());
    await expect(
      apiFetch('/auth/logout?portal=admin', { method: 'POST' }),
    ).resolves.toBeUndefined();
  });
});

describe('refrescarSesion (single-flight por portal)', () => {
  it('varias llamadas simultáneas comparten una sola petición', async () => {
    let resolver!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (resolver = r)));
    const a = refrescarSesion('admin');
    const b = refrescarSesion('admin');
    resolver(sinContenido());
    await expect(Promise.all([a, b])).resolves.toEqual(['ok', 'ok']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('portales distintos no se pisan', async () => {
    fetchMock.mockResolvedValue(sinContenido());
    await Promise.all([refrescarSesion('admin'), refrescarSesion('plataforma')]);
    expect(llamadas().sort()).toEqual([
      '/api/auth/refresh?portal=admin',
      '/api/auth/refresh?portal=plataforma',
    ]);
  });

  it('tras terminar, un nuevo refresh vuelve a pedirse', async () => {
    fetchMock.mockResolvedValue(sinContenido());
    await refrescarSesion('admin');
    await refrescarSesion('admin');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('error de red = expirada', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network'));
    await expect(refrescarSesion('admin')).resolves.toBe('expirada');
  });
});
