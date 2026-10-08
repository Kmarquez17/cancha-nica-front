'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import type { MesaConPinDto } from '@/features/ediciones/tipos';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

/** Mensaje para la persona de la mesa: enlace de acceso, usuario y PIN. */
export function mensajeAccesoMesa(mesa: MesaConPinDto, origen: string): string {
  const enlace = mesa.loginUrl.startsWith('http') ? mesa.loginUrl : `${origen}${mesa.loginUrl}`;
  return `Tu acceso a la mesa de Cancha Nica:\nEnlace: ${enlace}\nUsuario: ${mesa.username}\nPIN: ${mesa.pin}`;
}

export function waMeDeMesa(mesa: MesaConPinDto, origen: string): string {
  return (
    mesa.waMeUrl ?? `https://wa.me/?text=${encodeURIComponent(mensajeAccesoMesa(mesa, origen))}`
  );
}

/**
 * Muestra el PIN **una sola vez**. Vive solo en la prop de quien abre el diálogo: nunca en la URL, en storage ni
 * en la caché de Query. Al cerrar se descarta; si se pierde, se resetea y se muestra uno nuevo.
 */
export function PinDialog({
  mesa,
  reseteo,
  onCerrar,
}: {
  mesa: MesaConPinDto | null;
  reseteo?: boolean;
  onCerrar: () => void;
}) {
  const [copiado, setCopiado] = useState<'pin' | 'mensaje' | null>(null);
  const [fallo, setFallo] = useState(false);
  const origen = typeof window === 'undefined' ? '' : window.location.origin;

  async function copiar(que: 'pin' | 'mensaje') {
    if (!mesa) return;
    try {
      await navigator.clipboard.writeText(
        que === 'pin' ? mesa.pin : mensajeAccesoMesa(mesa, origen),
      );
      setCopiado(que);
      setFallo(false);
    } catch {
      setFallo(true);
    }
  }

  function cerrar() {
    setCopiado(null);
    setFallo(false);
    onCerrar();
  }

  return (
    <Dialog open={mesa !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reseteo ? 'PIN nuevo' : 'Mesa creada'}</DialogTitle>
          <DialogDescription>
            Este PIN solo se muestra ahora y no se puede recuperar. Si se pierde, resetea el PIN de
            la mesa.
          </DialogDescription>
        </DialogHeader>

        {mesa ? (
          <div className="grid gap-4">
            <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-4">
              <div>
                <dt className="text-xs tracking-wider text-muted-foreground uppercase">Usuario</dt>
                <dd className="marcador text-2xl">{mesa.username}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wider text-muted-foreground uppercase">PIN</dt>
                <dd className="marcador text-2xl tracking-[0.2em]">{mesa.pin}</dd>
              </div>
            </dl>
            {reseteo ? (
              <p className="text-sm text-muted-foreground">El PIN anterior ya no funciona.</p>
            ) : null}
            <p className="text-sm">
              Enlace de acceso:{' '}
              <span className="break-all font-medium">
                {mesa.loginUrl.startsWith('http') ? mesa.loginUrl : `${origen}${mesa.loginUrl}`}
              </span>
            </p>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => copiar('pin')}>
                {copiado === 'pin' ? (
                  <Check data-icon="inline-start" />
                ) : (
                  <Copy data-icon="inline-start" />
                )}
                {copiado === 'pin' ? 'PIN copiado' : 'Copiar PIN'}
              </Button>
              <Button variant="outline" onClick={() => copiar('mensaje')}>
                {copiado === 'mensaje' ? (
                  <Check data-icon="inline-start" />
                ) : (
                  <Copy data-icon="inline-start" />
                )}
                {copiado === 'mensaje' ? 'Mensaje copiado' : 'Copiar mensaje completo'}
              </Button>
              <Button variant="outline" asChild>
                <a href={waMeDeMesa(mesa, origen)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle data-icon="inline-start" />
                  Enviar por WhatsApp
                </a>
              </Button>
            </div>
            <p role="status" aria-live="polite" className="min-h-5 text-sm">
              {copiado ? 'Copiado al portapapeles.' : null}
              {fallo ? 'No se pudo copiar automáticamente: anótalo o selecciónalo a mano.' : null}
            </p>
          </div>
        ) : null}

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
