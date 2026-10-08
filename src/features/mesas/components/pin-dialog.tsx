'use client';

import type { MesaConPinDto } from '@/features/ediciones/tipos';
import { PinEntregaDialog, type EntregaPin } from '@/shared/ui/pin-entrega';

const enlaceDe = (mesa: MesaConPinDto, origen: string) =>
  mesa.loginUrl.startsWith('http') ? mesa.loginUrl : `${origen}${mesa.loginUrl}`;

/** Mensaje para la persona de la mesa: enlace de acceso, usuario y PIN. */
export function mensajeAccesoMesa(mesa: MesaConPinDto, origen: string): string {
  return `Tu acceso a la mesa de Cancha Nica:\nEnlace: ${enlaceDe(mesa, origen)}\nUsuario: ${mesa.username}\nPIN: ${mesa.pin}`;
}

export function waMeDeMesa(mesa: MesaConPinDto, origen: string): string {
  return (
    mesa.waMeUrl ?? `https://wa.me/?text=${encodeURIComponent(mensajeAccesoMesa(mesa, origen))}`
  );
}

/** Entrega del PIN de una mesa (una sola vez). */
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
        usuario: mesa.username,
        pin: mesa.pin,
        enlace: enlaceDe(mesa, origen),
        mensaje: mensajeAccesoMesa(mesa, origen),
        waMeUrl: waMeDeMesa(mesa, origen),
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
