'use client';

import type { DelegadoConPinDto, EquipoConAccesoDto } from '@/shared/api/generated/models';
import { PinEntregaDialog, type EntregaPin } from '@/shared/ui/pin-entrega';

/** Acceso de un delegado listo para entregar. El PIN vive solo en memoria de quien lo muestra. */
export type AccesoDelegado = {
  nombre: string;
  telefono: string;
  /** Texto, no número: puede empezar con 0. */
  pin: string;
  loginUrl: string;
  waMeUrl: string;
};

/** De la respuesta de inscribir / reasignar. `null` si el delegado ya existía (no hay PIN que mostrar). */
export function accesoDeEquipo(r: EquipoConAccesoDto): AccesoDelegado | null {
  if (r.pin === null || r.loginUrl === null || r.waMeUrl === null) return null;
  return {
    nombre: r.equipo.delegado.nombre,
    telefono: r.equipo.delegado.telefono,
    pin: r.pin,
    loginUrl: r.loginUrl,
    waMeUrl: r.waMeUrl,
  };
}

/** De la respuesta de `pin/reset`. */
export const accesoDeReset = (r: DelegadoConPinDto): AccesoDelegado => ({
  nombre: r.delegado.nombre,
  telefono: r.delegado.telefono,
  pin: r.pin,
  loginUrl: r.loginUrl,
  waMeUrl: r.waMeUrl,
});

/** Mensaje para pegar a mano (el `wa.me` del API ya trae el suyo, no se reconstruye). */
export const mensajeAcceso = (a: AccesoDelegado) =>
  `Hola ${a.nombre}, tu acceso de delegado en Cancha Nica:\nEnlace: ${a.loginUrl}\nTeléfono: ${a.telefono}\nPIN: ${a.pin}\nEs un PIN temporal: puedes cambiarlo al entrar.`;

/** Entrega del PIN de un delegado (una sola vez): alta de equipo con delegado nuevo, reasignar y resetear. */
export function EntregaPinDelegado({
  acceso,
  titulo,
  reseteo,
  onCerrar,
}: {
  acceso: AccesoDelegado | null;
  titulo: string;
  reseteo?: boolean;
  onCerrar: () => void;
}) {
  const entrega: EntregaPin | null = acceso
    ? {
        etiquetaUsuario: 'Teléfono',
        usuario: acceso.telefono,
        pin: acceso.pin,
        enlace: acceso.loginUrl,
        mensaje: mensajeAcceso(acceso),
        waMeUrl: acceso.waMeUrl,
      }
    : null;
  return (
    <PinEntregaDialog
      entrega={entrega}
      titulo={titulo}
      reseteo={reseteo}
      nota="Es un PIN temporal: el delegado puede cambiarlo cuando entre."
      onCerrar={onCerrar}
    />
  );
}
