import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cambiosDeConfig,
  ConfiguracionCliente,
} from '@/features/configuracion/components/configuracion-cliente';
import type { OrganizacionConfigDto } from '@/shared/api/generated/models';

const config: OrganizacionConfigDto = {
  id: 'org-1',
  nombre: 'SOPA',
  slug: 'sopa',
  telefonoContacto: '+50588888888',
  zonaHoraria: 'America/Managua',
  moneda: 'NIO',
  pais: 'NI',
  colorPrimario: '#16A34A',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
  });

const envolver = (ui: ReactNode) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {ui}
  </QueryClientProvider>
);

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe('cambiosDeConfig', () => {
  const igual = {
    zonaHoraria: config.zonaHoraria,
    moneda: config.moneda,
    pais: config.pais,
    colorPrimario: config.colorPrimario,
  };

  it('solo incluye lo que cambió', () => {
    expect(cambiosDeConfig(config, { ...igual, moneda: 'USD' })).toEqual({ moneda: 'USD' });
    expect(cambiosDeConfig(config, igual)).toEqual({});
  });

  it('nunca incluye nombre, slug ni teléfono (el API responde 400)', () => {
    const cambios = cambiosDeConfig(config, { ...igual, pais: 'CR', colorPrimario: '#000000' });
    expect(Object.keys(cambios).sort()).toEqual(['colorPrimario', 'pais']);
  });
});

describe('ConfiguracionCliente (portal admin)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('muestra los datos de plataforma en solo lectura y la configuración editable', async () => {
    fetchMock.mockResolvedValue(json(config));
    render(envolver(<ConfiguracionCliente />));
    expect(await screen.findByLabelText('Zona horaria')).toHaveValue('America/Managua');
    expect(screen.getByLabelText('Moneda')).toHaveValue('NIO');
    expect(screen.getByLabelText('País')).toHaveValue('NI');
    expect(screen.getByLabelText('Color principal')).toHaveValue('#16A34A');
    // Nombre, slug y teléfono los administra la plataforma: solo texto.
    expect(screen.getByText('SOPA')).toBeInTheDocument();
    expect(screen.getByText('+50588888888')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre')).toBeNull();
    expect(screen.queryByLabelText('Teléfono de contacto')).toBeNull();
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeDisabled();
  });

  it('guarda enviando solo el campo cambiado', async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      Promise.resolve(json(init?.method === 'PATCH' ? { ...config, moneda: 'USD' } : config)),
    );
    render(envolver(<ConfiguracionCliente />));
    fireEvent.change(await screen.findByLabelText('Moneda'), { target: { value: 'USD' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PATCH')).toBe(true),
    );
    const [url, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH')!;
    expect(url).toBe('/api/admin/organizacion');
    expect(JSON.parse(init.body)).toEqual({ moneda: 'USD' });
  });

  it('valida zona horaria, moneda, país y color antes de enviar', async () => {
    fetchMock.mockResolvedValue(json(config));
    render(envolver(<ConfiguracionCliente />));
    fireEvent.change(await screen.findByLabelText('Zona horaria'), {
      target: { value: 'Marte/Olimpo' },
    });
    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'nio' } });
    fireEvent.change(screen.getByLabelText('País'), { target: { value: 'NIC' } });
    fireEvent.change(screen.getByLabelText('Color principal'), { target: { value: '#12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));

    expect(await screen.findByText(/Zona horaria IANA válida/)).toBeInTheDocument();
    expect(screen.getByText(/3 letras mayúsculas/)).toBeInTheDocument();
    expect(screen.getByText(/2 letras mayúsculas/)).toBeInTheDocument();
    expect(screen.getByText('Formato #RRGGBB.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PATCH')).toBe(false);
  });

  it('no deja un campo vacío', async () => {
    fetchMock.mockResolvedValue(json(config));
    render(envolver(<ConfiguracionCliente />));
    fireEvent.change(await screen.findByLabelText('Moneda'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    expect(await screen.findByText('Este campo es obligatorio.')).toBeInTheDocument();
  });

  it('un 400 del servidor se muestra sin romper el formulario', async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PATCH'
          ? json(
              {
                status: 400,
                code: 'VALIDATION_ERROR',
                title: 'x',
                errors: ['moneda inválida'],
              },
              400,
            )
          : json(config),
      ),
    );
    render(envolver(<ConfiguracionCliente />));
    fireEvent.change(await screen.findByLabelText('Moneda'), { target: { value: 'USD' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('moneda inválida');
    expect(screen.getByLabelText('Moneda')).toHaveValue('USD');
  });
});
