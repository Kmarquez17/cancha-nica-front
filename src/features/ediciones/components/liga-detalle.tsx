'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Archive, ArchiveRestore, ArrowLeft, Ban, Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { useGetAdminMe } from '@/shared/api/generated/admin/admin';
import type { EdicionDto, EstadoEdicion } from '@/shared/api/generated/models';
import { ApiError } from '@/shared/api/mutator';
import { HAY_PROTOTIPOS } from '@/shared/config/prototipos';
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
import {
  useActualizarEdicion,
  useArchivarEdicion,
  useCambiarEstado,
  useCategorias,
  useEdicion,
  useRestaurarEdicion,
} from '../api';
import { incumplimientosDe, sePuedeForzar } from '../lib/errores';
import { accionDeEstado, ESTADO_TEXTO } from '../lib/textos';
import type { Incumplimiento } from '../tipos';
import { EstadoLiga, ModalidadInsignia } from './estado-liga';
import { LigaFormulario } from './liga-formulario';

export function LigaDetalle({ id }: { id: string }) {
  const { data: liga, isLoading, error } = useEdicion(id);
  const { data: categorias } = useCategorias(true);
  const actualizar = useActualizarEdicion();

  if (isLoading) return <p role="status">Cargando liga…</p>;
  if (error || !liga)
    return (
      <AlertaError>
        {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
      </AlertaError>
    );

  return (
    <section className="grid gap-8">
      <div className="grid gap-3">
        <Link
          href="/admin/ligas"
          className="flex w-fit items-center gap-1 text-sm underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Todas las ligas
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-2">
            <h1 className="text-3xl">{liga.nombre}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <ModalidadInsignia modalidad={liga.modalidad} />
              <span>{liga.categoria.nombre}</span>
              <span>· registrada por {liga.creadoPor.nombre}</span>
              {liga.archivadaEn ? <span>· archivada</span> : null}
            </div>
          </div>
          <EstadoLiga estado={liga.estado} />
        </div>
      </div>

      {HAY_PROTOTIPOS ? (
        <Button variant="outline" className="w-fit" asChild>
          <Link href={`/admin/ligas/${liga.id}/equipos`}>
            <Users data-icon="inline-start" />
            Equipos inscritos
          </Link>
        </Button>
      ) : null}

      {!liga.archivadaEn ? <PanelEstado liga={liga} /> : null}

      <div className="grid gap-3">
        <h2 className="text-2xl">Configuración</h2>
        <LigaFormulario
          // Si cambia el estado o se archiva, el formulario se arma de nuevo con lo que la API ahora permite.
          key={`${liga.id}-${liga.estado}-${liga.archivadaEn ?? ''}`}
          edicion={liga}
          categorias={categorias ?? []}
          onGuardar={async (cambios) => {
            const nueva = await actualizar.mutateAsync({ id: liga.id, data: cambios });
            toast.success('Cambios guardados.');
            return nueva;
          }}
        />
      </div>

      {liga.estado === 'CONFIGURACION' || liga.archivadaEn ? <Archivar liga={liga} /> : null}
    </section>
  );
}

function PanelEstado({ liga }: { liga: EdicionDto }) {
  const [destino, setDestino] = useState<EstadoEdicion | null>(null);
  // Los botones salen de lo que la API dice que se puede hacer: no se duplica la matriz de estados.
  const siguientes = liga.transicionesPosibles;

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4">
      <h2 className="text-xl">Estado de la liga</h2>
      {siguientes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {liga.estado === 'FINALIZADA'
            ? 'La liga terminó. No hay forma de reabrirla.'
            : 'No hay cambios de estado disponibles.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {siguientes.map((a) => (
            <Button
              key={a}
              variant={a === 'FINALIZADA' ? 'destructive' : a === 'PAUSADA' ? 'outline' : 'default'}
              onClick={() => setDestino(a)}
            >
              {accionDeEstado(a, liga.estado)}
            </Button>
          ))}
        </div>
      )}
      <CambioEstadoDialog
        key={destino ?? 'cerrado'}
        liga={liga}
        destino={destino}
        onCerrar={() => setDestino(null)}
      />
    </div>
  );
}

type Fallo = { mensaje: string; incumplimientos: Incumplimiento[]; code: string };

function CambioEstadoDialog({
  liga,
  destino,
  onCerrar,
}: {
  liga: EdicionDto;
  destino: EstadoEdicion | null;
  onCerrar: () => void;
}) {
  const cambiar = useCambiarEstado();
  const { data: yo } = useGetAdminMe();
  const [entiendo, setEntiendo] = useState(false);
  const [fallo, setFallo] = useState<Fallo | null>(null);
  const esDueno = yo?.role === 'OWNER';
  const finaliza = destino === 'FINALIZADA';
  const faltantes = fallo?.incumplimientos ?? [];
  const forzable =
    fallo?.code === 'EDICION_PRECONDICIONES_NO_CUMPLIDAS' && sePuedeForzar(faltantes);

  async function aplicar(forzar = false) {
    if (!destino) return;
    setFallo(null);
    try {
      await cambiar.mutateAsync({
        id: liga.id,
        data: { a: destino, forzar: forzar || undefined, confirmar: finaliza || undefined },
      });
      toast.success(`La liga ahora está: ${ESTADO_TEXTO[destino].toLowerCase()}.`);
      onCerrar();
    } catch (e) {
      if (!(e instanceof ApiError))
        return setFallo({ mensaje: mensajeGenerico(), incumplimientos: [], code: 'UNKNOWN' });
      setFallo({ mensaje: mensajeDeError(e), incumplimientos: incumplimientosDe(e), code: e.code });
    }
  }

  return (
    <Dialog open={destino !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {destino ? (
          <>
            <DialogHeader>
              <DialogTitle>{accionDeEstado(destino, liga.estado)}</DialogTitle>
              <DialogDescription>
                {finaliza
                  ? 'Finalizar es definitivo: la liga queda solo de lectura y no se puede reabrir.'
                  : `La liga pasará de «${ESTADO_TEXTO[liga.estado]}» a «${ESTADO_TEXTO[destino]}».`}
              </DialogDescription>
            </DialogHeader>

            {fallo ? <AlertaError>{fallo.mensaje}</AlertaError> : null}

            {faltantes.length > 0 ? (
              <ul aria-label="Requisitos" className="grid gap-2 text-sm">
                {faltantes.map((i) => (
                  <li key={`${i.codigo}-${i.mensaje}`} className="flex items-start gap-2">
                    {i.forzable ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                    ) : (
                      <Ban className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                    )}
                    <span>
                      {i.mensaje}{' '}
                      <span className="text-muted-foreground">
                        {i.forzable ? '(se puede saltar)' : '(no se puede saltar)'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {finaliza ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={entiendo}
                  onChange={(e) => setEntiendo(e.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                Entiendo que no se puede deshacer.
              </label>
            ) : null}

            {fallo?.code === 'EDICION_PRECONDICIONES_NO_CUMPLIDAS' ? (
              <p className="text-sm text-muted-foreground">
                {!forzable
                  ? 'Hay requisitos que no se pueden saltar: resuélvelos para continuar.'
                  : esDueno
                    ? 'Como dueño puedes forzar el cambio; quedará registrado en la auditoría.'
                    : 'Solo el dueño puede forzar el cambio.'}
              </p>
            ) : null}

            <DialogFooter showCloseButton>
              {forzable && esDueno ? (
                <Button
                  variant="destructive"
                  onClick={() => aplicar(true)}
                  disabled={cambiar.isPending}
                >
                  Forzar de todos modos
                </Button>
              ) : null}
              <Button
                variant={finaliza ? 'destructive' : 'default'}
                onClick={() => aplicar()}
                disabled={cambiar.isPending || (finaliza && !entiendo)}
              >
                {cambiar.isPending ? 'Aplicando…' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Archivar({ liga }: { liga: EdicionDto }) {
  const archivar = useArchivarEdicion();
  const restaurar = useRestaurarEdicion();
  const archivada = liga.archivadaEn !== null;
  const pendiente = archivar.isPending || restaurar.isPending;

  async function alternar() {
    try {
      if (archivada) await restaurar.mutateAsync({ id: liga.id });
      else await archivar.mutateAsync({ id: liga.id });
      toast.success(archivada ? 'Liga restaurada.' : 'Liga archivada.');
    } catch (e) {
      toast.error(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <div className="grid max-w-prose gap-2 rounded-lg border border-dashed p-4">
      <h2 className="text-xl">{archivada ? 'Liga archivada' : '¿Creaste esta liga por error?'}</h2>
      <p className="text-sm text-muted-foreground">
        {archivada
          ? 'No aparece en el listado y no se puede editar ni cambiar de estado. Puedes restaurarla cuando quieras.'
          : 'Archívala para ocultarla. Nada se borra y puedes restaurarla después.'}
      </p>
      <Button variant="outline" className="w-fit" onClick={alternar} disabled={pendiente}>
        {archivada ? (
          <ArchiveRestore data-icon="inline-start" />
        ) : (
          <Archive data-icon="inline-start" />
        )}
        {archivada ? 'Restaurar liga' : 'Archivar liga'}
      </Button>
    </div>
  );
}
