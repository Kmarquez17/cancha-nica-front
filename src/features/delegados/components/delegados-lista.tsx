'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useDelegados, useResetearPinDelegado } from '@/features/equipos/api';
import type { DelegadoDto, PinEntregado } from '@/features/equipos/tipos';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError } from '@/shared/ui/campo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { EntregaPinDelegado } from './entrega-pin-delegado';

/** Estado del PIN de un delegado (R13): nunca entró, sigue con el temporal, o ya lo cambió. */
export function estadoPin(d: Pick<DelegadoDto, 'ultimoAccesoEn' | 'pinCambiado'>) {
  if (d.ultimoAccesoEn === null)
    return { texto: 'PIN aún no usado', clases: 'bg-warning text-warning-foreground' };
  if (!d.pinCambiado) return { texto: 'PIN temporal', clases: 'bg-info text-info-foreground' };
  return { texto: 'PIN propio', clases: 'bg-success text-success-foreground' };
}

export function DelegadosLista() {
  const { data, isLoading, error } = useDelegados();
  const [aResetear, setAResetear] = useState<DelegadoDto | null>(null);
  const [conPin, setConPin] = useState<PinEntregado | null>(null);

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl">Delegados</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Quienes llevan un equipo. Entran con su teléfono y un PIN de 6 dígitos. Se crean al
          inscribir un equipo. Si alguien perdió su PIN, resetéalo y entrégale el nuevo.
        </p>
      </div>

      {error ? (
        <AlertaError>
          {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
        </AlertaError>
      ) : null}
      {isLoading ? <p role="status">Cargando delegados…</p> : null}
      {data && data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no hay delegados. Se crean al inscribir un equipo.
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((d) => {
            const pin = estadoPin(d);
            return (
              <li key={d.id} className="grid gap-3 rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{d.nombre}</p>
                    <p className="marcador text-sm font-normal text-muted-foreground">
                      {d.telefono}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider uppercase ${pin.clases}`}
                  >
                    {pin.texto}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-sm">
                  {d.equipos.length === 0 ? (
                    <span className="text-muted-foreground">Sin equipos</span>
                  ) : (
                    d.equipos.map((e) => (
                      <span key={e.id} className="rounded-full border px-2 py-0.5 text-xs">
                        {e.club} · {e.edicion.nombre} ({e.categoria})
                      </span>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Registrado por {d.creadoPor.nombre}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setAResetear(d)}
                >
                  <KeyRound data-icon="inline-start" />
                  Resetear PIN
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ResetearPinDialog
        delegado={aResetear}
        onCerrar={() => setAResetear(null)}
        onListo={(p) => {
          setAResetear(null);
          setConPin(p);
        }}
      />
      <EntregaPinDelegado
        pin={conPin}
        titulo="PIN nuevo"
        reseteo
        onCerrar={() => setConPin(null)}
      />
    </section>
  );
}

function ResetearPinDialog({
  delegado,
  onCerrar,
  onListo,
}: {
  delegado: DelegadoDto | null;
  onCerrar: () => void;
  onListo: (p: PinEntregado) => void;
}) {
  const resetear = useResetearPinDelegado();
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (!delegado) return;
    setError(null);
    try {
      onListo(await resetear.mutateAsync(delegado.id));
    } catch (e) {
      setError(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <Dialog open={delegado !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetear el PIN de {delegado?.nombre}</DialogTitle>
          <DialogDescription>
            Se crea un PIN nuevo y el anterior deja de funcionar. Si la cuenta estaba bloqueada, se
            desbloquea. Después se marcará «PIN aún no usado» hasta que vuelva a entrar.
          </DialogDescription>
        </DialogHeader>
        {error ? <AlertaError>{error}</AlertaError> : null}
        <DialogFooter showCloseButton>
          <Button onClick={confirmar} disabled={resetear.isPending}>
            {resetear.isPending ? 'Reseteando…' : 'Resetear PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
