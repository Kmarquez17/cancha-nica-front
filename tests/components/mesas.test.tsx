import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { accesoDeMesa } from '@/features/mesas/components/mesas-lista';
import { PinDialog, mensajeAccesoMesa } from '@/features/mesas/components/pin-dialog';
import type { MesaConPinDto } from '@/shared/api/generated/models';

/** Lo que devuelven el alta y el reseteo de una mesa (contrato real): `{ mesa, pin, loginUrl, waMeUrl }`. */
const mesa: MesaConPinDto = {
  mesa: {
    id: 'm1',
    username: 'MESA3',
    nombreOperador: 'Ana',
    activo: true,
    acceso: { estado: 'ACTIVA', bloqueadaHasta: null },
    ediciones: [],
    creadoPor: { id: 'u', nombre: 'Dueño' },
    creadoEn: '2026-10-07T00:00:00.000Z',
  },
  pin: '482913',
  loginUrl: 'https://cancha.example/mesa/sopa',
  waMeUrl: 'https://wa.me/?text=Tu%20acceso',
};

describe('PinDialog', () => {
  it('muestra usuario, PIN y enlace, y avisa que solo se ve una vez', () => {
    render(<PinDialog mesa={mesa} onCerrar={() => {}} />);
    expect(screen.getByText('MESA3')).toBeInTheDocument();
    expect(screen.getByText('482913')).toBeInTheDocument();
    expect(screen.getByText(/solo se muestra ahora/i)).toBeInTheDocument();
    expect(screen.getByText('https://cancha.example/mesa/sopa')).toBeInTheDocument();
  });

  it('copia el PIN al portapapeles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<PinDialog mesa={mesa} onCerrar={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar PIN' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('482913'));
    expect(await screen.findByText('Copiado al portapapeles.')).toBeInTheDocument();
  });

  it('copia el mensaje completo con enlace, usuario y PIN', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<PinDialog mesa={mesa} onCerrar={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar mensaje completo' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const texto = String(writeText.mock.calls[0][0]);
    expect(texto).toContain('https://cancha.example/mesa/sopa');
    expect(texto).toContain('MESA3');
    expect(texto).toContain('482913');
  });

  it('si no puede copiar, lo dice', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) },
    });
    render(<PinDialog mesa={mesa} onCerrar={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar PIN' }));
    expect(await screen.findByText(/No se pudo copiar/)).toBeInTheDocument();
  });

  it('el botón de WhatsApp usa el enlace que arma el API', () => {
    render(<PinDialog mesa={mesa} onCerrar={() => {}} />);
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      'https://wa.me/?text=Tu%20acceso',
    );
  });

  it('el PIN nuevo avisa que el anterior ya no sirve', () => {
    render(<PinDialog mesa={mesa} reseteo onCerrar={() => {}} />);
    expect(screen.getByText('PIN nuevo')).toBeInTheDocument();
    expect(screen.getByText('El PIN anterior ya no funciona.')).toBeInTheDocument();
  });

  it('cerrado no muestra nada', () => {
    render(<PinDialog mesa={null} onCerrar={() => {}} />);
    expect(screen.queryByText('482913')).toBeNull();
  });
});

describe('mensaje de acceso', () => {
  it('arma el enlace completo, el usuario y el PIN', () => {
    const texto = mensajeAccesoMesa(mesa, 'https://otro.example');
    expect(texto).toContain('https://cancha.example/mesa/sopa');
    expect(texto).toContain('MESA3');
    expect(texto).toContain('482913');
  });
  it('si el enlace llegara relativo le antepone el origen', () => {
    const texto = mensajeAccesoMesa({ ...mesa, loginUrl: '/mesa/sopa' }, 'https://x.test');
    expect(texto).toContain('https://x.test/mesa/sopa');
  });
});

describe('accesoDeMesa (el estado lo calcula el API)', () => {
  it('activa', () => {
    expect(accesoDeMesa({ estado: 'ACTIVA', bloqueadaHasta: null }).texto).toBe('Activa');
  });
  it('desactivada', () => {
    expect(accesoDeMesa({ estado: 'DESACTIVADA', bloqueadaHasta: null }).texto).toBe('Desactivada');
  });
  it('bloqueada hasta una hora', () => {
    const r = accesoDeMesa({ estado: 'BLOQUEADA', bloqueadaHasta: '2026-10-07T12:10:00Z' });
    expect(r.texto).toMatch(/^Bloqueada hasta las /);
  });
  it('bloqueada sin hora', () => {
    expect(accesoDeMesa({ estado: 'BLOQUEADA', bloqueadaHasta: null }).texto).toBe('Bloqueada');
  });
});
