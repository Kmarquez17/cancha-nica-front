import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MesaConPinDto } from '@/features/ediciones/tipos';
import { accesoDeMesa } from '@/features/mesas/components/mesas-lista';
import { PinDialog, mensajeAccesoMesa, waMeDeMesa } from '@/features/mesas/components/pin-dialog';

const mesa: MesaConPinDto = {
  id: 'm1',
  username: 'MESA3',
  nombreOperador: 'Ana',
  activa: true,
  bloqueadaHasta: null,
  ediciones: [],
  creadoPor: { id: 'u', nombre: 'Dueño' },
  creadaEn: '2026-10-07T00:00:00.000Z',
  pin: '482913',
  waMeUrl: null,
  loginUrl: '/mesa/sopa',
};

describe('PinDialog', () => {
  it('muestra usuario, PIN y enlace, y avisa que solo se ve una vez', () => {
    render(<PinDialog mesa={mesa} onCerrar={() => {}} />);
    expect(screen.getByText('MESA3')).toBeInTheDocument();
    expect(screen.getByText('482913')).toBeInTheDocument();
    expect(screen.getByText(/solo se muestra ahora/i)).toBeInTheDocument();
    expect(screen.getByText(/\/mesa\/sopa/)).toBeInTheDocument();
  });

  it('copia el PIN al portapapeles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<PinDialog mesa={mesa} onCerrar={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar PIN' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('482913'));
    expect(await screen.findByText('Copiado al portapapeles.')).toBeInTheDocument();
  });

  it('si no puede copiar, lo dice', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) },
    });
    render(<PinDialog mesa={mesa} onCerrar={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar PIN' }));
    expect(await screen.findByText(/No se pudo copiar/)).toBeInTheDocument();
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
    const texto = mensajeAccesoMesa(mesa, 'https://cancha.example');
    expect(texto).toContain('https://cancha.example/mesa/sopa');
    expect(texto).toContain('MESA3');
    expect(texto).toContain('482913');
  });
  it('usa el wa.me del API si viene y, si no, uno genérico con el mensaje', () => {
    expect(waMeDeMesa({ ...mesa, waMeUrl: 'https://wa.me/50588888888' }, '')).toBe(
      'https://wa.me/50588888888',
    );
    expect(waMeDeMesa(mesa, 'https://x.test')).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
});

describe('accesoDeMesa', () => {
  const ahora = new Date('2026-10-07T12:00:00Z').getTime();
  it('activa', () => {
    expect(accesoDeMesa({ activa: true, bloqueadaHasta: null }, ahora).texto).toBe('Activa');
  });
  it('desactivada', () => {
    expect(accesoDeMesa({ activa: false, bloqueadaHasta: null }, ahora).texto).toBe('Desactivada');
  });
  it('bloqueada hasta una hora futura', () => {
    const r = accesoDeMesa({ activa: true, bloqueadaHasta: '2026-10-07T12:10:00Z' }, ahora);
    expect(r.texto).toMatch(/^Bloqueada hasta las /);
  });
  it('un bloqueo ya vencido cuenta como activa', () => {
    expect(
      accesoDeMesa({ activa: true, bloqueadaHasta: '2026-10-07T11:00:00Z' }, ahora).texto,
    ).toBe('Activa');
  });
});
