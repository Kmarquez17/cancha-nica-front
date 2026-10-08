'use client';

import type { MesaConPinDto } from '@/shared/api/generated/models';
import { PinEntregaDialog, type EntregaPin } from '@/shared/ui/pin-entrega';

/** El API entrega el enlace completo (`{FRONT_URL}/mesa/<slug>`); si llegara relativo se le antepone el origen. */
const enlaceDe = (m: MesaConPinDto, origen: string) =>
  m.loginUrl.startsWith('http') ? m.loginUrl : `${origen}${m.loginUrl}`;

/** Mensaje para la persona de la mesa: enlace de acceso, usuario y PIN. */
export function mensajeAccesoMesa(m: MesaConPinDto, origen: string): string {
  return `Tu acceso a la mesa de Cancha Nica:\nEnlace: ${enlaceDe(m, origen)}\nUsuario: ${m.mesa.username}\nPIN: ${m.pin}`;
}

/** Entrega del PIN de una mesa (una sola vez). El `wa.me` lo arma el API y deja elegir a quién enviarlo. */
export function PinDialog({
  mesa,
  reseteo,
  onCerrar,
}: {
  mesa: MesaConPinDto | null;
  reseteo?: boolean;
  onCerrar: () => void;
}) {
  const origen = typeof window === 'undefined' ? '' : window.location.origin;
  const entrega: EntregaPin | null = mesa
    ? {
        etiquetaUsuario: 'Usuario',
        usuario: mesa.mesa.username,
        pin: mesa.pin,
        enlace: enlaceDe(mesa, origen),
        mensaje: mensajeAccesoMesa(mesa, origen),
        waMeUrl: mesa.waMeUrl,
      }
    : null;
  return (
    <PinEntregaDialog
      entrega={entrega}
      titulo={reseteo ? 'PIN nuevo' : 'Mesa creada'}
      reseteo={reseteo}
      onCerrar={onCerrar}
    />
  );
}
