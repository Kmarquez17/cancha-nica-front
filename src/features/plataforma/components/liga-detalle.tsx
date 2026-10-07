'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/shared/api/mutator';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import type { InvitacionCreadaDto, OrganizacionDto } from '@/shared/api/generated/models';
import {
  getGetOrganizacionQueryKey,
  useActualizarOrganizacion,
  useBloquearOrganizacion,
  useGetOrganizacion,
  useReactivarOrganizacion,
} from '@/shared/api/generated/plataforma/plataforma';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { aE164, fechaCorta } from '../lib/formato';
import {
  bloquearSchema,
  editarLigaSchema,
  vacioAUndefined,
  type BloquearValues,
  type EditarLigaValues,
} from '../schemas';
import { EnlaceInvitacionDialog } from './enlace-invitacion';
import { EstadoBadge } from './estado-badge';
import { InvitarDuenoDialog } from './invitar-dueno-dialog';

function refrescarLigas(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({
    predicate: (q) => String(q.queryKey[0]).startsWith('/plataforma/organizaciones'),
  });
}

export function LigaDetalle({
  id,
  invitacionFallida,
}: {
  id: string;
  invitacionFallida?: boolean;
}) {
  const { data: liga, isLoading, error } = useGetOrganizacion(id);
  const [invitando, setInvitando] = useState(false);
  const [bloqueando, setBloqueando] = useState(false);
  const [reactivando, setReactivando] = useState(false);
  // El enlace en claro vive solo aquí, hasta que se cierra el diálogo.
  const [enlace, setEnlace] = useState<{
    invitacion: InvitacionCreadaDto;
    telefono?: string;
  } | null>(null);

  if (isLoading) {
    return (
      <p role="status" className="text-muted-foreground">
        Cargando liga…
      </p>
    );
  }
  if (error || !liga) {
    return (
      <AlertaError>
        {error instanceof ApiError && error.status === 404
          ? 'Esa liga no existe.'
          : error instanceof ApiError
            ? mensajeDeError(error)
            : mensajeGenerico()}
      </AlertaError>
    );
  }

  const bloqueada = liga.estado === 'BLOQUEADA';

  return (
    <div className="grid max-w-3xl gap-8">
      <header className="grid gap-2">
        <Link
          href="/plataforma/ligas"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Todas las ligas
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{liga.nombre}</h1>
          <EstadoBadge estado={liga.estado} />
        </div>
        <p className="text-sm text-muted-foreground">
          {liga.slug} · alta {fechaCorta(liga.creadoEn)}
        </p>
        {bloqueada ? (
          <p className="text-sm">
            Bloqueada{liga.bloqueadaEn ? ` el ${fechaCorta(liga.bloqueadaEn)}` : ''}
            {liga.motivoBloqueo ? `. Motivo: ${liga.motivoBloqueo}` : '.'}
          </p>
        ) : null}
      </header>

      {invitacionFallida ? (
        <AlertaError>
          La liga se creó, pero no se pudo crear la invitación del dueño. Vuelve a intentarlo con el
          botón de abajo.
        </AlertaError>
      ) : null}

      <section aria-labelledby="dueno" className="grid gap-3">
        <h2 id="dueno" className="text-lg font-medium">
          Dueño
        </h2>
        {liga.owner ? (
          <p>
            {liga.owner.nombre} · {liga.owner.email}
          </p>
        ) : liga.invitacionOwner ? (
          <>
            <p>
              Invitación pendiente para <strong>{liga.invitacionOwner.email}</strong>, vence el{' '}
              {fechaCorta(liga.invitacionOwner.expiraEn)}.
            </p>
            <div>
              <Button variant="outline" onClick={() => setInvitando(true)}>
                Reenviar invitación
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">Esta liga todavía no tiene dueño.</p>
            <div>
              <Button onClick={() => setInvitando(true)}>Invitar al dueño</Button>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="estado" className="grid gap-3">
        <h2 id="estado" className="text-lg font-medium">
          Acceso
        </h2>
        <p className="text-sm text-muted-foreground">
          {bloqueada
            ? 'Al reactivarla, sus usuarios vuelven a entrar y su sitio público se vuelve a ver.'
            : 'Al bloquearla, sus usuarios pierden el acceso de inmediato y su sitio público deja de verse. No se borra nada.'}
        </p>
        <div>
          {bloqueada ? (
            <Button variant="outline" onClick={() => setReactivando(true)}>
              Reactivar liga
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setBloqueando(true)}>
              Bloquear liga
            </Button>
          )}
        </div>
      </section>

      <EditarLiga liga={liga} />

      <InvitarDuenoDialog
        organizacion={liga}
        open={invitando}
        onOpenChange={setInvitando}
        onCreada={(invitacion, telefono) => setEnlace({ invitacion, telefono })}
      />
      <EnlaceInvitacionDialog
        invitacion={enlace?.invitacion ?? null}
        telefono={enlace?.telefono}
        onCerrar={() => setEnlace(null)}
      />
      <BloquearDialog liga={liga} open={bloqueando} onOpenChange={setBloqueando} />
      <ReactivarDialog liga={liga} open={reactivando} onOpenChange={setReactivando} />
    </div>
  );
}

function EditarLiga({ liga }: { liga: OrganizacionDto }) {
  const queryClient = useQueryClient();
  const actualizar = useActualizarOrganizacion();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditarLigaValues>({
    resolver: zodResolver(editarLigaSchema),
    defaultValues: {
      nombre: liga.nombre,
      telefonoContacto: liga.telefonoContacto ?? '',
      zonaHoraria: liga.zonaHoraria,
      moneda: liga.moneda,
      pais: liga.pais,
      colorPrimario: liga.colorPrimario,
    },
  });

  async function onSubmit(v: EditarLigaValues) {
    setError(null);
    try {
      const actualizada = await actualizar.mutateAsync({
        id: liga.id,
        data: {
          nombre: v.nombre.trim(),
          telefonoContacto: v.telefonoContacto
            ? (aE164(v.telefonoContacto) ?? undefined)
            : undefined,
          zonaHoraria: vacioAUndefined(v.zonaHoraria),
          moneda: vacioAUndefined(v.moneda),
          pais: vacioAUndefined(v.pais),
          colorPrimario: vacioAUndefined(v.colorPrimario),
        },
      });
      queryClient.setQueryData(getGetOrganizacionQueryKey(liga.id), actualizada);
      await refrescarLigas(queryClient);
      toast.success('Cambios guardados.');
    } catch (e) {
      setError(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <section aria-labelledby="datos" className="grid gap-3">
      <h2 id="datos" className="text-lg font-medium">
        Datos de la liga
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <Campo id="ed-nombre" etiqueta="Nombre" error={errors.nombre?.message}>
          <Input id="ed-nombre" aria-invalid={!!errors.nombre} {...register('nombre')} />
        </Campo>
        <Campo
          id="ed-tel"
          etiqueta="Teléfono de contacto"
          ayuda="Formato internacional, p. ej. +50588888888."
          error={errors.telefonoContacto?.message}
        >
          <Input id="ed-tel" type="tel" inputMode="tel" {...register('telefonoContacto')} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="ed-zona" etiqueta="Zona horaria" error={errors.zonaHoraria?.message}>
            <Input id="ed-zona" {...register('zonaHoraria')} />
          </Campo>
          <Campo
            id="ed-color"
            etiqueta="Color"
            ayuda="#RRGGBB"
            error={errors.colorPrimario?.message}
          >
            <Input id="ed-color" {...register('colorPrimario')} />
          </Campo>
          <Campo id="ed-moneda" etiqueta="Moneda" error={errors.moneda?.message}>
            <Input id="ed-moneda" {...register('moneda')} />
          </Campo>
          <Campo id="ed-pais" etiqueta="País" error={errors.pais?.message}>
            <Input id="ed-pais" {...register('pais')} />
          </Campo>
        </div>
        <p className="text-xs text-muted-foreground">
          El identificador ({liga.slug}) no se puede cambiar porque va en las direcciones públicas.
        </p>
        <div>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function BloquearDialog({
  liga,
  open,
  onOpenChange,
}: {
  liga: OrganizacionDto;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const bloquear = useBloquearOrganizacion();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BloquearValues>({
    resolver: zodResolver(bloquearSchema),
    defaultValues: { motivo: '' },
  });

  async function onSubmit(v: BloquearValues) {
    setError(null);
    try {
      const actualizada = await bloquear.mutateAsync({
        id: liga.id,
        data: { motivo: v.motivo.trim() },
      });
      queryClient.setQueryData(getGetOrganizacionQueryKey(liga.id), actualizada);
      await refrescarLigas(queryClient);
      toast.success('Liga bloqueada.');
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear {liga.nombre}</DialogTitle>
          <DialogDescription>
            Sus usuarios (admin, delegados y mesa) pierden el acceso de inmediato y su sitio público
            deja de verse. No se borra nada y puedes reactivarla cuando quieras.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {error ? <AlertaError>{error}</AlertaError> : null}
          <Campo id="motivo" etiqueta="Motivo" error={errors.motivo?.message}>
            <textarea
              id="motivo"
              rows={3}
              aria-invalid={!!errors.motivo}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
              {...register('motivo')}
            />
          </Campo>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Bloqueando…' : 'Bloquear liga'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReactivarDialog({
  liga,
  open,
  onOpenChange,
}: {
  liga: OrganizacionDto;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const reactivar = useReactivarOrganizacion();
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setError(null);
    try {
      const actualizada = await reactivar.mutateAsync({ id: liga.id });
      queryClient.setQueryData(getGetOrganizacionQueryKey(liga.id), actualizada);
      await refrescarLigas(queryClient);
      toast.success('Liga reactivada.');
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivar {liga.nombre}</DialogTitle>
          <DialogDescription>
            Sus usuarios vuelven a entrar con la misma sesión y su sitio público se vuelve a ver.
          </DialogDescription>
        </DialogHeader>
        {error ? <AlertaError>{error}</AlertaError> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={reactivar.isPending}>
            {reactivar.isPending ? 'Reactivando…' : 'Reactivar liga'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
