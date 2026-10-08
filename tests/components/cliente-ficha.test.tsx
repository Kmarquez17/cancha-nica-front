import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClienteFicha } from '@/features/plataforma/components/cliente-ficha';
import { ConteosCliente, TablaAdmins } from '@/features/plataforma/components/ficha-secciones';
import { textoConteo } from '@/features/plataforma/lib/formato';
import type { ClienteFichaDto } from '@/shared/api/generated/models';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const ficha: ClienteFichaDto = {
  id: 'org-1',
  nombre: 'SOPA',
  slug: 'sopa',
  estado: 'ACTIVA',
  creadoEn: '2026-10-01T12:00:00.000Z',
  zonaHoraria: 'America/Managua',
  moneda: 'NIO',
  pais: 'NI',
  colorPrimario: '#16A34A',
  telefonoContacto: '+50588888888',
  motivoBloqueo: null,
  bloqueadaEn: null,
  owner: { id: 'u1', nombre: 'Sopa Dueño', email: 'sopa@correo.com' },
  invitacionOwner: null,
  admins: [
    {
      id: 'a1',
      nombre: 'Ana Admin',
      email: 'ana@correo.com',
      estado: 'ACTIVO',
      desde: '2026-10-02T12:00:00.000Z',
    },
    {
      id: 'a2',
      nombre: 'Beto Baja',
      email: 'beto@correo.com',
      estado: 'INACTIVO',
      desde: '2026-10-03T12:00:00.000Z',
    },
    {
      id: null,
      nombre: 'Carla Pendiente',
      email: 'carla@correo.com',
      estado: 'INVITACION_PENDIENTE',
      desde: '2026-10-04T12:00:00.000Z',
      expiraEn: '2026-10-11T12:00:00.000Z',
    },
  ],
  conteos: {
    admins: 3,
    adminsActivos: 1,
    invitacionesAdminPendientes: 1,
    categorias: null,
    ediciones: null,
    mesas: null,
    delegados: null,
    equipos: null,
  },
};

const envolver = (ui: ReactNode) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {ui}
  </QueryClientProvider>
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('textoConteo', () => {
  it('null y undefined son «—», pero 0 es 0', () => {
    expect(textoConteo(null)).toBe('—');
    expect(textoConteo(undefined)).toBe('—');
    expect(textoConteo(0)).toBe('0');
    expect(textoConteo(7)).toBe('7');
  });
});

describe('ConteosCliente', () => {
  it('los conteos null se muestran «—» y nunca 0, con «Aún no disponible»', () => {
    render(<ConteosCliente conteos={ficha.conteos} />);
    for (const titulo of ['Categorías', 'Ligas', 'Mesas', 'Delegados', 'Equipos']) {
      const item = screen.getByText(titulo).closest('div')!;
      expect(within(item).getByText('—')).toBeInTheDocument();
      expect(within(item).getByText('Aún no disponible')).toBeInTheDocument();
      expect(within(item).queryByText('0')).toBeNull();
    }
    const admins = screen.getByText('Admins').closest('div')!;
    expect(within(admins).getByText('3')).toBeInTheDocument();
  });

  it('cuando un conteo deja de ser null, la ficha se llena sola (incluido el 0)', () => {
    render(<ConteosCliente conteos={{ ...ficha.conteos, ediciones: 4, mesas: 0 }} />);
    expect(within(screen.getByText('Ligas').closest('div')!).getByText('4')).toBeInTheDocument();
    const mesas = screen.getByText('Mesas').closest('div')!;
    expect(within(mesas).getByText('0')).toBeInTheDocument();
    expect(within(mesas).queryByText('Aún no disponible')).toBeNull();
  });
});

describe('TablaAdmins', () => {
  it('muestra nombre, correo, estado y fecha; la invitación pendiente muestra cuándo vence', () => {
    render(<TablaAdmins admins={ficha.admins} />);
    expect(screen.getByText('Ana Admin')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
    expect(screen.getByText('Invitación pendiente')).toBeInTheDocument();
    expect(screen.getByText(/^Vence /)).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4); // cabecera + 3 admins
  });

  it('sin admins explica que no hay', () => {
    render(<TablaAdmins admins={[]} />);
    expect(screen.getByText(/todavía no tiene admins/i)).toBeInTheDocument();
  });
});

describe('ClienteFicha', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('es de solo lectura: datos, dueño, admins y acciones permitidas', async () => {
    fetchMock.mockResolvedValue(json(ficha));
    render(envolver(<ClienteFicha id="org-1" />));
    expect(await screen.findByRole('heading', { name: 'SOPA' })).toBeInTheDocument();
    expect(screen.getByText(/Sopa Dueño · sopa@correo.com/)).toBeInTheDocument();
    expect(screen.getByText('America/Managua')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bloquear cliente' })).toBeInTheDocument();
    // Sin invitación pendiente del dueño no hay «Reenviar».
    expect(screen.queryByRole('button', { name: 'Reenviar invitación' })).toBeNull();
  });

  it('con invitación del dueño pendiente ofrece «Reenviar invitación»', async () => {
    fetchMock.mockResolvedValue(
      json({
        ...ficha,
        owner: null,
        invitacionOwner: {
          email: 'sopa@correo.com',
          nombre: 'Sopa',
          expiraEn: '2026-10-14T12:00:00.000Z',
        },
      }),
    );
    render(envolver(<ClienteFicha id="org-1" />));
    expect(await screen.findByRole('button', { name: 'Reenviar invitación' })).toBeInTheDocument();
  });

  it('un cliente bloqueado muestra el motivo y permite reactivar', async () => {
    fetchMock.mockResolvedValue(
      json({
        ...ficha,
        estado: 'BLOQUEADA',
        motivoBloqueo: 'Falta de pago',
        bloqueadaEn: '2026-10-05T12:00:00.000Z',
      }),
    );
    render(envolver(<ClienteFicha id="org-1" />));
    expect(await screen.findByText(/Motivo: Falta de pago/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivar cliente' })).toBeInTheDocument();
  });

  it('CAMBIO ROMPEDOR: editar envía SOLO nombre y telefonoContacto', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PATCH' ? json({ ...ficha, nombre: 'SOPA Renovada' }) : json(ficha),
      ),
    );
    render(envolver(<ClienteFicha id="org-1" />));
    await screen.findByRole('heading', { name: 'SOPA' });

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'SOPA Renovada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(true),
    );
    const [url, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH')!;
    expect(url).toBe('/api/plataforma/organizaciones/org-1');
    const cuerpo = JSON.parse(init.body);
    expect(Object.keys(cuerpo).sort()).toEqual(['nombre', 'telefonoContacto']);
    for (const prohibido of ['zonaHoraria', 'moneda', 'pais', 'colorPrimario', 'slug']) {
      expect(cuerpo).not.toHaveProperty(prohibido);
    }
  });

  it('no ofrece editar zona horaria, moneda, país ni color', async () => {
    fetchMock.mockResolvedValue(json(ficha));
    render(envolver(<ClienteFicha id="org-1" />));
    await screen.findByRole('heading', { name: 'SOPA' });
    expect(screen.queryByLabelText('Zona horaria')).toBeNull();
    expect(screen.queryByLabelText('Moneda')).toBeNull();
    expect(screen.queryByLabelText('País')).toBeNull();
    expect(screen.queryByLabelText('Color')).toBeNull();
  });
});
