'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

export type EntregaPin = {
  /** Etiqueta del identificador: «Usuario» (mesa) o «Teléfono» (delegado). */
  etiquetaUsuario: string;
  usuario: string;
  pin: string;
  /** Enlace de acceso ya completo (con origen). */
  enlace: string;
  /** Mensaje listo para pegar en WhatsApp, con enlace, usuario y PIN. */
  mensaje: string;
  /** `wa.me` del API (con el teléfono de la persona) o uno genérico que abre el selector de contactos. */
  waMeUrl: string;
};

/**
 * Entrega de un PIN **una sola vez**. Vive solo en la prop de quien abre el diálogo: nunca en la URL, en storage
 * ni en la caché de Query. Al cerrar se descarta; si se pierde, se resetea y se muestra uno nuevo.
 */
export function PinEntregaDialog({
  entrega,
  titulo,
  reseteo,
  nota,
  onCerrar,
}: {
  entrega: EntregaPin | null;
  titulo: string;
  reseteo?: boolean;
  /** Aviso extra bajo el PIN (p. ej. «es temporal»). */
  nota?: string;
  onCerrar: () => void;
}) {
  const [copiado, setCopiado] = useState<'pin' | 'mensaje' | null>(null);
  const [fallo, setFallo] = useState(false);

  async function copiar(que: 'pin' | 'mensaje') {
    if (!entrega) return;
    try {
      await navigator.clipboard.writeText(que === 'pin' ? entrega.pin : entrega.mensaje);
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
    <Dialog open={entrega !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Este PIN solo se muestra ahora y no se puede recuperar. Si se pierde, resetea el PIN.
          </DialogDescription>
        </DialogHeader>

        {entrega ? (
          <div className="grid gap-4">
            <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-4">
              <div className="min-w-0">
                <dt className="text-xs tracking-wider text-muted-foreground uppercase">
                  {entrega.etiquetaUsuario}
                </dt>
                <dd className="marcador text-xl break-words">{entrega.usuario}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wider text-muted-foreground uppercase">PIN</dt>
                <dd className="marcador text-2xl tracking-[0.2em]">{entrega.pin}</dd>
              </div>
            </dl>
            {reseteo ? (
              <p className="text-sm text-muted-foreground">El PIN anterior ya no funciona.</p>
            ) : null}
            {nota ? <p className="text-sm text-muted-foreground">{nota}</p> : null}
            <p className="text-sm">
              Enlace de acceso: <span className="font-medium break-all">{entrega.enlace}</span>
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
                <a href={entrega.waMeUrl} target="_blank" rel="noopener noreferrer">
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
