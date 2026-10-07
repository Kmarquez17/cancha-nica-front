import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnlaceInvitacionDialog } from '@/features/plataforma/components/enlace-invitacion';
import type { InvitacionCreadaDto } from '@/shared/api/generated/models';

const invitacion: InvitacionCreadaDto = {
  email: 'dueno@liga.com',
  emailEnviado: false,
  enlace: 'https://app.test/aceptar-invitacion?token=SECRETO',
  expiraEn: '2026-10-14T12:00:00.000Z',
  reenvio: false,
  waMeUrl: 'https://wa.me/50588888888?text=hola',
};

afterEach(() => vi.restoreAllMocks());

describe('EnlaceInvitacionDialog', () => {
  it('no renderiza nada sin invitación (el secreto no persiste)', () => {
    render(<EnlaceInvitacionDialog invitacion={null} onCerrar={() => {}} />);
    expect(screen.queryByText(/SECRETO/)).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('muestra el enlace una vez, con aviso, y copia al portapapeles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<EnlaceInvitacionDialog invitacion={invitacion} onCerrar={() => {}} />);

    expect(screen.getByLabelText('Enlace de invitación')).toHaveValue(invitacion.enlace);
    expect(screen.getByText(/solo se muestra ahora/i)).toBeInTheDocument();
    expect(screen.getByText(/No se envió por correo/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copiar enlace/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(invitacion.enlace));
    expect(await screen.findByText('Enlace copiado al portapapeles.')).toBeInTheDocument();
  });

  it('si el portapapeles falla, avisa y deja el enlace seleccionado', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) },
    });
    render(<EnlaceInvitacionDialog invitacion={invitacion} onCerrar={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /copiar enlace/i }));
    expect(await screen.findByText(/No se pudo copiar automáticamente/)).toBeInTheDocument();
  });

  it('botón de WhatsApp usa waMeUrl de la API y abre en pestaña nueva sin referrer', () => {
    render(<EnlaceInvitacionDialog invitacion={invitacion} onCerrar={() => {}} />);
    const wa = screen.getByRole('link', { name: /whatsapp/i });
    expect(wa).toHaveAttribute('href', invitacion.waMeUrl);
    expect(wa).toHaveAttribute('target', '_blank');
    expect(wa.getAttribute('rel')).toContain('noreferrer');
  });

  it('sin waMeUrl pero con teléfono arma el enlace de WhatsApp; sin ambos lo oculta', () => {
    const sinWa = { ...invitacion, waMeUrl: null };
    const { rerender } = render(
      <EnlaceInvitacionDialog invitacion={sinWa} telefono="+50588888888" onCerrar={() => {}} />,
    );
    expect(screen.getByRole('link', { name: /whatsapp/i }).getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/50588888888\?text=/,
    );
    rerender(<EnlaceInvitacionDialog invitacion={sinWa} onCerrar={() => {}} />);
    expect(screen.queryByRole('link', { name: /whatsapp/i })).toBeNull();
  });

  it('un reenvío avisa que el enlace anterior ya no funciona', () => {
    render(
      <EnlaceInvitacionDialog invitacion={{ ...invitacion, reenvio: true }} onCerrar={() => {}} />,
    );
    expect(screen.getByText('Invitación reenviada')).toBeInTheDocument();
    expect(screen.getByText(/enlace anterior ya no funciona/i)).toBeInTheDocument();
  });
});
