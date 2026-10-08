'use client';

import type { PinEntregado } from '@/features/equipos/tipos';
import { PinEntregaDialog, type EntregaPin } from '@/shared/ui/pin-entrega';

/** Mensaje para el delegado: enlace de acceso, teléfono (su usuario) y PIN. */
export function mensajeAccesoDelegado(p: PinEntregado, origen: string): string {
  const enlace = p.loginUrl.startsWith('http') ? p.loginUrl : `${origen}${p.loginUrl}`;
  return `Hola ${p.delegado.nombre}, tu acceso de delegado en Cancha Nica:\nEnlace: ${enlace}\nTeléfono: ${p.delegado.telefono}\nPIN: ${p.pin}\nPuedes cambiar el PIN al entrar.`;
}

/** `wa.me` del API si viene; si no, uno al teléfono del delegado con el mensaje ya escrito. */
export function waMeDeDelegado(p: PinEntregado, origen: string): string {
  const base = p.waMeUrl ?? `https://wa.me/${p.delegado.telefono.replace(/\D/g, '')}`;
  return p.waMeUrl?.includes('text=')
    ? p.waMeUrl
    : `${base}?text=${encodeURIComponent(mensajeAccesoDelegado(p, origen))}`;
}

/** Entrega del PIN de un delegado (una sola vez): al inscribir un equipo con delegado nuevo o al resetear. */
export function EntregaPinDelegado({
  pin,
  titulo,
  reseteo,
  onCerrar,
}: {
  pin: PinEntregado | null;
  titulo: string;
  reseteo?: boolean;
  onCerrar: () => void;
}) {
  const origen = typeof window === 'undefined' ? '' : window.location.origin;
  const entrega: EntregaPin | null = pin
    ? {
        etiquetaUsuario: 'Teléfono',
        usuario: pin.delegado.telefono,
        pin: pin.pin,
        enlace: pin.loginUrl.startsWith('http') ? pin.loginUrl : `${origen}${pin.loginUrl}`,
        mensaje: mensajeAccesoDelegado(pin, origen),
        waMeUrl: waMeDeDelegado(pin, origen),
      }
    : null;
  return (
    <PinEntregaDialog entrega={entrega} titulo={titulo} reseteo={reseteo} onCerrar={onCerrar} />
  );
}
