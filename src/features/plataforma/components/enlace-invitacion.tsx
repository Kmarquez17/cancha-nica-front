'use client';

import { useRef, useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import type { InvitacionCreadaDto } from '@/shared/api/generated/models';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { armarWaMeUrl, fechaCorta } from '../lib/formato';

/**
 * Muestra el enlace de invitación **una sola vez**. El secreto vive solo en la prop/estado de quien
 * abre el diálogo: nunca en la URL, en storage ni en la caché de Query. Al cerrar se descarta.
 */
export function EnlaceInvitacionDialog({
  invitacion,
  telefono,
  onCerrar,
}: {
  invitacion: InvitacionCreadaDto | null;
  /** E.164 del invitado; solo se usa como respaldo si la API no trae `waMeUrl`. */
  telefono?: string;
  onCerrar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [fallo, setFallo] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  const waMe = invitacion
    ? (invitacion.waMeUrl ?? (telefono ? armarWaMeUrl(telefono, invitacion.enlace) : null))
    : null;

  async function copiar() {
    if (!invitacion) return;
    try {
      await navigator.clipboard.writeText(invitacion.enlace);
      setCopiado(true);
      setFallo(false);
    } catch {
      // Sin permiso de portapapeles: se deja el enlace seleccionado para copiarlo a mano.
      setFallo(true);
      campo.current?.select();
    }
  }

  function cerrar() {
    setCopiado(false);
    setFallo(false);
    onCerrar();
  }

  return (
    <Dialog open={invitacion !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {invitacion?.reenvio ? 'Invitación reenviada' : 'Invitación creada'}
          </DialogTitle>
          <DialogDescription>
            Este enlace solo se muestra ahora. Si lo pierdes, usa «Reenviar invitación».
          </DialogDescription>
        </DialogHeader>

        {invitacion ? (
          <div className="grid gap-3">
            <p className="text-sm">
              Para <strong>{invitacion.email}</strong> · vence el {fechaCorta(invitacion.expiraEn)}
            </p>
            {invitacion.reenvio ? (
              <p className="text-sm text-muted-foreground">El enlace anterior ya no funciona.</p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {invitacion.emailEnviado
                ? 'También se envió por correo.'
                : 'No se envió por correo: compártelo tú.'}
            </p>

            <Input
              ref={campo}
              readOnly
              value={invitacion.enlace}
              aria-label="Enlace de invitación"
              onFocus={(e) => e.currentTarget.select()}
            />

            <div className="flex flex-wrap gap-2">
              <Button onClick={copiar}>
                {copiado ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                {copiado ? 'Copiado' : 'Copiar enlace'}
              </Button>
              {waMe ? (
                <Button variant="outline" asChild>
                  <a href={waMe} target="_blank" rel="noopener noreferrer">
                    <MessageCircle data-icon="inline-start" />
                    Enviar por WhatsApp
                  </a>
                </Button>
              ) : null}
            </div>

            <p role="status" aria-live="polite" className="min-h-5 text-sm">
              {copiado ? 'Enlace copiado al portapapeles.' : null}
              {fallo
                ? 'No se pudo copiar automáticamente: el enlace quedó seleccionado, cópialo con Ctrl+C.'
                : null}
            </p>
          </div>
        ) : null}

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
