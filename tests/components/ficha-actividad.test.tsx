import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActividadCliente } from '@/features/plataforma/components/ficha-actividad';

const respuestas: Record<string, unknown> = {
  '/api/plataforma/organizaciones/org-1/categorias': [
    { id: 'c1', nombre: 'Libre', activa: true, ediciones: 2 },
    { id: 'c2', nombre: 'Sub-15', activa: false, ediciones: 1 },
  ],
  '/api/plataforma/organizaciones/org-1/ediciones': [
    {
      id: 'e1',
      nombre: 'Apertura 2026',
      categoria: { id: 'c1', nombre: 'Libre' },
      modalidad: 'FUTSAL',
      estado: 'EN_REGISTRO',
      archivadaEn: null,
    },
  ],
  '/api/plataforma/organizaciones/org-1/mesas': [
    {
      id: 'm1',
      username: 'MESA1',
      nombreOperador: 'Carlos',
      acceso: { estado: 'ACTIVA', bloqueadaHasta: null },
      ediciones: [{ id: 'e1', nombre: 'Apertura 2026', estado: 'EN_REGISTRO' }],
    },
    {
      id: 'm2',
      username: 'MESA2',
      nombreOperador: null,
      acceso: { estado: 'DESACTIVADA', bloqueadaHasta: null },
      ediciones: [],
    },
  ],
};

let fetchMock: ReturnType<typeof vi.fn>;
const pedidos = () => fetchMock.mock.calls.map(([url]) => String(url));

function Con({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  fetchMock = vi.fn(async (url: string) => {
    const cuerpo = respuestas[String(url)];
    return cuerpo === undefined
      ? new Response(JSON.stringify({ status: 404, code: 'NOT_FOUND', title: 'x' }), {
          status: 404,
          headers: { 'Content-Type': 'application/problem+json' },
        })
      : new Response(JSON.stringify(cuerpo), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('ActividadCliente (plataforma, solo lectura)', () => {
  it('no pide nada hasta que se abre una pestaña', () => {
    render(<ActividadCliente clienteId="org-1" />, { wrapper: Con });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('categorías: marca las archivadas y cuenta sus ligas', async () => {
    render(<ActividadCliente clienteId="org-1" />, { wrapper: Con });
    fireEvent.click(screen.getByRole('button', { name: 'Categorías' }));
    const lista = await screen.findByRole('list', { name: 'Categorías del cliente' });
    expect(lista).toHaveTextContent('Libre');
    expect(lista).toHaveTextContent('2 ligas');
    expect(lista).toHaveTextContent('Sub-15');
    expect(lista).toHaveTextContent('archivada');
    expect(lista).toHaveTextContent('1 liga');
    expect(pedidos()).toEqual(['/api/plataforma/organizaciones/org-1/categorias']);
  });

  it('ligas: modalidad y estado en español', async () => {
    render(<ActividadCliente clienteId="org-1" />, { wrapper: Con });
    fireEvent.click(screen.getByRole('button', { name: 'Ligas' }));
    const lista = await screen.findByRole('list', { name: 'Ligas del cliente' });
    expect(lista).toHaveTextContent('Apertura 2026');
    expect(lista).toHaveTextContent('Fútbol sala');
    expect(lista).toHaveTextContent('Inscripciones abiertas');
  });

  it('mesas: acceso y cantidad de ligas', async () => {
    render(<ActividadCliente clienteId="org-1" />, { wrapper: Con });
    fireEvent.click(screen.getByRole('button', { name: 'Mesas' }));
    const lista = await screen.findByRole('list', { name: 'Mesas del cliente' });
    expect(lista).toHaveTextContent('MESA1');
    expect(lista).toHaveTextContent('Carlos');
    expect(lista).toHaveTextContent('activa');
    expect(lista).toHaveTextContent('desactivada');
  });

  it('volver a tocar la pestaña la cierra', async () => {
    render(<ActividadCliente clienteId="org-1" />, { wrapper: Con });
    const boton = screen.getByRole('button', { name: 'Mesas' });
    fireEvent.click(boton);
    await screen.findByRole('list', { name: 'Mesas del cliente' });
    fireEvent.click(boton);
    await waitFor(() =>
      expect(screen.queryByRole('list', { name: 'Mesas del cliente' })).toBeNull(),
    );
  });

  it('no ofrece ninguna acción de escritura', () => {
    render(<ActividadCliente clienteId="org-1" />, { wrapper: Con });
    expect(
      screen.queryByRole('button', { name: /Nueva|Crear|Resetear|Editar|Archivar/ }),
    ).toBeNull();
  });

  it('un error de la API se muestra sin romper la ficha', async () => {
    respuestas['/api/plataforma/organizaciones/org-1/mesas'] = undefined;
    render(<ActividadCliente clienteId="org-1" />, { wrapper: Con });
    fireEvent.click(screen.getByRole('button', { name: 'Mesas' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
