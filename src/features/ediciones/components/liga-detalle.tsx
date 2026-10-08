'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Archive, ArchiveRestore, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { useGetAdminMe } from '@/shared/api/generated/admin/admin';
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
import {
  useActualizarEdicion,
  useArchivarEdicion,
  useCambiarEstado,
  useCategorias,
  useEdicion,
} from '../api';
import { transicionesDe } from '../lib/reglas';
import { accionDeEstado, ESTADO_TEXTO } from '../lib/textos';
import type { EdicionDto, EstadoEdicion } from '../tipos';
import { EstadoLiga, ModalidadInsignia } from './estado-liga';
import { LigaFormulario } from './liga-formulario';

export function LigaDetalle({ id }: { id: string }) {
  const { data: liga, isLoading, error } = useEdicion(id);
  const { data: categorias } = useCategorias(true);
  const actualizar = useActualizarEdicion(id);

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

      <PanelEstado liga={liga} />

      <div className="grid gap-3">
        <h2 className="text-2xl">Configuración</h2>
        <LigaFormulario
          key={`${liga.id}-${liga.estado}-${liga.modalidad}`}
          modo="editar"
          edicion={liga}
          categorias={categorias ?? []}
          onGuardar={async (cambios) => {
            await actualizar.mutateAsync(cambios);
            toast.success('Cambios guardados.');
          }}
        />
      </div>

      {liga.estado === 'CONFIGURACION' ? <Archivar liga={liga} /> : null}
    </section>
  );
}

function PanelEstado({ liga }: { liga: EdicionDto }) {
  const [destino, setDestino] = useState<EstadoEdicion | null>(null);
  const siguientes = transicionesDe(liga.estado, liga.estadoPrevioPausa);

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

function CambioEstadoDialog({
  liga,
  destino,
  onCerrar,
}: {
  liga: EdicionDto;
  destino: EstadoEdicion | null;
  onCerrar: () => void;
}) {
  const cambiar = useCambiarEstado(liga.id);
  const { data: yo } = useGetAdminMe();
  const [entiendo, setEntiendo] = useState(false);
  const [fallo, setFallo] = useState<{
    mensaje: string;
    requisitos?: string[];
    code: string;
  } | null>(null);
  const esDueno = yo?.role === 'OWNER';
  const finaliza = destino === 'FINALIZADA';

  async function aplicar(forzar = false) {
    if (!destino) return;
    setFallo(null);
    try {
      await cambiar.mutateAsync({
        a: destino,
        forzar: forzar || undefined,
        confirmar: finaliza || undefined,
      });
      toast.success(`La liga ahora está: ${ESTADO_TEXTO[destino].toLowerCase()}.`);
      onCerrar();
    } catch (e) {
      if (!(e instanceof ApiError))
        return setFallo({ mensaje: mensajeGenerico(), code: 'UNKNOWN' });
      setFallo({ mensaje: mensajeDeError(e), requisitos: e.errors, code: e.code });
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

            {fallo ? (
              <AlertaError>
                {fallo.mensaje}
                {fallo.requisitos?.length ? (
                  <ul className="mt-1 list-disc pl-5">
                    {fallo.requisitos.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : null}
              </AlertaError>
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

            {fallo?.code === 'EDICION_PRECONDICIONES' ? (
              <p className="text-sm text-muted-foreground">
                {esDueno
                  ? 'Como dueño puedes forzar el cambio; quedará registrado en la auditoría.'
                  : 'Solo el dueño puede forzar el cambio.'}
              </p>
            ) : null}

            <DialogFooter showCloseButton>
              {fallo?.code === 'EDICION_PRECONDICIONES' && esDueno ? (
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
  const archivar = useArchivarEdicion(liga.id);
  const archivada = liga.archivadaEn !== null;

  async function alternar() {
    try {
      await archivar.mutateAsync(!archivada);
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
          ? 'No aparece en el listado. Puedes restaurarla cuando quieras.'
          : 'Archívala para ocultarla. Nada se borra y puedes restaurarla después.'}
      </p>
      <Button variant="outline" className="w-fit" onClick={alternar} disabled={archivar.isPending}>
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
