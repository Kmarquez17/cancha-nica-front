import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefinirPasswordForm } from '@/features/auth/components/definir-password-form';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));

const envolver = (ui: ReactNode) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
  >
    {ui}
  </QueryClientProvider>
);

const problema = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  replace.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

function llenar(password: string, repetir = password) {
  fireEvent.change(screen.getByLabelText('Contraseña nueva'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Repite la contraseña'), { target: { value: repetir } });
  fireEvent.click(screen.getByRole('button', { name: /contraseña/i }));
}

describe('DefinirPasswordForm', () => {
  it('lee el token y lo quita de la URL', async () => {
    window.history.replaceState(null, '', '/aceptar-invitacion?token=ABC123&otro=1');
    render(envolver(<DefinirPasswordForm modo="invitacion" />));
    await screen.findByLabelText('Contraseña nueva');
    expect(window.location.search).toBe('?otro=1');
    expect(window.location.href).not.toContain('ABC123');
  });

  it('sin token muestra enlace no válido', async () => {
    window.history.replaceState(null, '', '/aceptar-invitacion');
    render(envolver(<DefinirPasswordForm modo="invitacion" />));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ya no es válido/i);
  });

  it('invitación: envía token + contraseña y entra al panel', async () => {
    window.history.replaceState(null, '', '/aceptar-invitacion?token=ABC123');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    render(envolver(<DefinirPasswordForm modo="invitacion" />));
    await screen.findByLabelText('Contraseña nueva');
    llenar('clave-segura-1');

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/aceptar-invitacion');
    expect(JSON.parse(init.body)).toEqual({ token: 'ABC123', password: 'clave-segura-1' });
  });

  it('restablecer: 204 lleva al login sin sesión', async () => {
    window.history.replaceState(null, '', '/restablecer-contrasena?token=TKN');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(envolver(<DefinirPasswordForm modo="restablecer" />));
    await screen.findByLabelText('Contraseña nueva');
    llenar('clave-segura-1');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/login?restablecida=1'));
  });

  it('no envía si las contraseñas no coinciden', async () => {
    window.history.replaceState(null, '', '/aceptar-invitacion?token=ABC123');
    render(envolver(<DefinirPasswordForm modo="invitacion" />));
    await screen.findByLabelText('Contraseña nueva');
    llenar('clave-segura-1', 'clave-distinta-9');
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('token vencido o anulado reemplaza el formulario por «enlace no válido»', async () => {
    window.history.replaceState(null, '', '/aceptar-invitacion?token=VIEJO');
    fetchMock.mockResolvedValueOnce(
      problema(400, { status: 400, code: 'TOKEN_INVALIDO_O_EXPIRADO', title: 'x' }),
    );
    render(envolver(<DefinirPasswordForm modo="invitacion" />));
    await screen.findByLabelText('Contraseña nueva');
    llenar('clave-segura-1');
    expect(await screen.findByRole('alert')).toHaveTextContent(/ya no es válido/i);
    expect(screen.queryByLabelText('Contraseña nueva')).toBeNull();
  });

  it('PASSWORD_DEBIL muestra el motivo del servidor y deja reintentar', async () => {
    window.history.replaceState(null, '', '/aceptar-invitacion?token=ABC123');
    fetchMock.mockResolvedValueOnce(
      problema(400, {
        status: 400,
        code: 'PASSWORD_DEBIL',
        title: 'x',
        detail: 'No uses tu correo.',
      }),
    );
    render(envolver(<DefinirPasswordForm modo="invitacion" />));
    await screen.findByLabelText('Contraseña nueva');
    llenar('clave-segura-1');
    expect(await screen.findByRole('alert')).toHaveTextContent('No uses tu correo.');
    expect(screen.getByLabelText('Contraseña nueva')).toBeInTheDocument();
  });
});
