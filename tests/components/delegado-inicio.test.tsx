import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DelegadoInicio } from '@/features/delegados/components/delegado-inicio';
import type { DelegadoPrincipalDto } from '@/shared/api/generated/models';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const liga = (id: string, nombre: string) => ({
  id,
  nombre,
  slug: id,
  modalidad: 'FUTSAL',
  estado: 'EN_REGISTRO',
  categoria: { id: 'c', nombre: 'Libre' },
});
const equipo = (id: string, nombre: string, retirado = false) => ({
  id,
  nombre,
  estado: retirado ? 'RETIRADO' : 'CONFIRMADO',
  retirado,
  retiradoEn: retirado ? '2026-10-08T00:00:00.000Z' : null,
  club: { id: 'k', nombre: 'Real Peña' },
  edicion: liga(`l-${id}`, `Liga ${nombre}`),
});

let me: DelegadoPrincipalDto;
let edicionStatus = 200;
let pedidos: string[];

function Con({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
  });

beforeEach(() => {
  pedidos = [];
  edicionStatus = 200;
  me = {
    id: 'd1',
    nombre: 'Pedro',
    telefono: '+50588880001',
    pinCambiadoEn: null,
    organizacion: { id: 'o', nombre: 'SOPA', slug: 'sopa' },
    equipos: [equipo('q1', 'Real Peña'), equipo('q2', 'Peña Sub-18', true)],
  } as unknown as DelegadoPrincipalDto;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      pedidos.push(String(url));
      if (url === '/api/delegado/me') return respuesta(200, me);
      if (String(url).startsWith('/api/delegado/ediciones/'))
        return edicionStatus === 200
          ? respuesta(200, {
              edicion: liga('l-q1', 'Liga Real Peña'),
              equipo: equipo('q1', 'Real Peña'),
            })
          : respuesta(edicionStatus, { status: edicionStatus, code: 'FORBIDDEN', title: 'x' });
      return respuesta(404, { status: 404, code: 'NOT_FOUND', title: 'x' });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('DelegadoInicio', () => {
  it('muestra el aviso «Cambia tu PIN» mientras pinCambiadoEn es null, sin bloquear nada', async () => {
    render(<DelegadoInicio />, { wrapper: Con });
    expect(await screen.findByText(/Cambia tu PIN/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Real Peña/ })).toBeEnabled();
  });

  it('el aviso desaparece cuando el PIN ya tiene fecha', async () => {
    me = { ...me, pinCambiadoEn: '2026-10-08T00:00:00.000Z' };
    render(<DelegadoInicio />, { wrapper: Con });
    await screen.findByText('Mis equipos');
    expect(screen.queryByText(/Cambia tu PIN/)).toBeNull();
  });

  it('un equipo retirado sale marcado y no se puede abrir', async () => {
    render(<DelegadoInicio />, { wrapper: Con });
    await screen.findByText('Mis equipos');
    expect(screen.getByText('Retirado')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Peña Sub-18/ })).toBeNull();
    await waitFor(() => expect(pedidos).toContain('/api/delegado/ediciones/l-q1'));
    expect(pedidos).not.toContain('/api/delegado/ediciones/l-q2');
  });

  it('sin equipos muestra «Sin ligas activas»', async () => {
    me = { ...me, equipos: [] };
    render(<DelegadoInicio />, { wrapper: Con });
    expect(await screen.findByText(/Sin ligas activas/)).toBeInTheDocument();
  });

  it('403/404/409 en la liga = «ya no tienes acceso» y se puede releer /me', async () => {
    edicionStatus = 403;
    render(<DelegadoInicio />, { wrapper: Con });
    expect(await screen.findByText(/Ya no tienes acceso a esta liga/)).toBeInTheDocument();
    const antes = pedidos.filter((p) => p === '/api/delegado/me').length;
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar mis equipos' }));
    await waitFor(() =>
      expect(pedidos.filter((p) => p === '/api/delegado/me').length).toBeGreaterThan(antes),
    );
  });
});
