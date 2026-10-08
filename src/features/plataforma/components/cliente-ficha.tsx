'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/shared/api/mutator';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import type { ClienteFichaDto, InvitacionCreadaDto } from '@/shared/api/generated/models';
import {
  useActualizarOrganizacion,
  useGetOrganizacion,
} from '@/shared/api/generated/plataforma/plataforma';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { aE164, fechaCorta } from '../lib/formato';
import { refrescarClientes } from '../lib/consultas';
import { editarClienteSchema, type EditarClienteValues } from '../schemas';
import { BloquearDialog, ReactivarDialog } from './bloqueo-dialogs';
import { EnlaceInvitacionDialog } from './enlace-invitacion';
import { EstadoBadge } from './estado-badge';
import { ConteosCliente, TablaAdmins } from './ficha-secciones';
import { InvitarDuenoDialog } from './invitar-dueno-dialog';

export function ClienteFicha({
  id,
  invitacionFallida,
}: {
  id: string;
  invitacionFallida?: boolean;
}) {
  const { data: cliente, isLoading, error } = useGetOrganizacion(id);
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
        Cargando cliente…
      </p>
    );
  }
  if (error || !cliente) {
    return (
      <AlertaError>
        {error instanceof ApiError && error.status === 404
          ? 'Ese cliente no existe.'
          : error instanceof ApiError
            ? mensajeDeError(error)
            : mensajeGenerico()}
      </AlertaError>
    );
  }

  const bloqueado = cliente.estado === 'BLOQUEADA';

  return (
    <div className="grid max-w-4xl gap-8">
      <header className="grid gap-2">
        <Link
          href="/plataforma/clientes"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Todos los clientes
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{cliente.nombre}</h1>
          <EstadoBadge estado={cliente.estado} />
        </div>
        <p className="text-sm text-muted-foreground">
          {cliente.slug} · alta {fechaCorta(cliente.creadoEn)}
        </p>
        {bloqueado ? (
          <p
            role="status"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
          >
            Bloqueado{cliente.bloqueadaEn ? ` el ${fechaCorta(cliente.bloqueadaEn)}` : ''}
            {cliente.motivoBloqueo ? `. Motivo: ${cliente.motivoBloqueo}` : '.'}
          </p>
        ) : null}
      </header>

      {invitacionFallida ? (
        <AlertaError>
          El cliente se creó, pero no se pudo crear la invitación del dueño. Vuelve a intentarlo con
          el botón de abajo.
        </AlertaError>
      ) : null}

      <section aria-labelledby="resumen" className="grid gap-3">
        <h2 id="resumen" className="text-lg font-medium">
          Resumen
        </h2>
        <p className="text-sm text-muted-foreground">
          Vista de solo lectura de lo que hace este cliente. Los datos internos los administra su
          dueño.
        </p>
        <ConteosCliente conteos={cliente.conteos} />
      </section>

      <section aria-labelledby="dueno" className="grid gap-3">
        <h2 id="dueno" className="text-lg font-medium">
          Dueño
        </h2>
        {cliente.owner ? (
          <p>
            {cliente.owner.nombre} · {cliente.owner.email}
          </p>
        ) : cliente.invitacionOwner ? (
          <>
            <p>
              Invitación pendiente para <strong>{cliente.invitacionOwner.email}</strong>, vence el{' '}
              {fechaCorta(cliente.invitacionOwner.expiraEn)}.
            </p>
            <div>
              <Button variant="outline" onClick={() => setInvitando(true)}>
                Reenviar invitación
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">Este cliente todavía no tiene dueño.</p>
            <div>
              <Button onClick={() => setInvitando(true)}>Invitar al dueño</Button>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="admins" className="grid gap-3">
        <h2 id="admins" className="text-lg font-medium">
          Admins
        </h2>
        <TablaAdmins admins={cliente.admins} />
      </section>

      <section aria-labelledby="config" className="grid gap-3">
        <h2 id="config" className="text-lg font-medium">
          Configuración
        </h2>
        <p className="text-sm text-muted-foreground">
          La edita el dueño o un admin desde su portal; aquí solo se ve.
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Zona horaria</dt>
            <dd>{cliente.zonaHoraria}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Moneda</dt>
            <dd>{cliente.moneda}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">País</dt>
            <dd>{cliente.pais}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Color</dt>
            <dd className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block size-4 rounded border"
                style={{ backgroundColor: cliente.colorPrimario }}
              />
              {cliente.colorPrimario}
            </dd>
          </div>
        </dl>
      </section>

      <EditarContacto cliente={cliente} />

      <section aria-labelledby="estado" className="grid gap-3">
        <h2 id="estado" className="text-lg font-medium">
          Acceso
        </h2>
        <p className="text-sm text-muted-foreground">
          {bloqueado
            ? 'Al reactivarlo, sus usuarios vuelven a entrar y sus ligas se vuelven a ver.'
            : 'Al bloquearlo, su dueño, admins, delegados y mesas pierden el acceso de inmediato y sus ligas dejan de verse. No se borra nada.'}
        </p>
        <div>
          {bloqueado ? (
            <Button variant="outline" onClick={() => setReactivando(true)}>
              Reactivar cliente
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setBloqueando(true)}>
              Bloquear cliente
            </Button>
          )}
        </div>
      </section>

      <InvitarDuenoDialog
        organizacion={cliente}
        open={invitando}
        onOpenChange={setInvitando}
        onCreada={(invitacion, telefono) => setEnlace({ invitacion, telefono })}
      />
      <EnlaceInvitacionDialog
        invitacion={enlace?.invitacion ?? null}
        telefono={enlace?.telefono}
        onCerrar={() => setEnlace(null)}
      />
      <BloquearDialog cliente={cliente} open={bloqueando} onOpenChange={setBloqueando} />
      <ReactivarDialog cliente={cliente} open={reactivando} onOpenChange={setReactivando} />
    </div>
  );
}

/**
 * Editar cliente desde plataforma: SOLO nombre y teléfono de contacto. Si se enviara zona horaria,
 * moneda, país o color el API respondería 400 (cambio rompedor de la Fase 1b).
 */
function EditarContacto({ cliente }: { cliente: ClienteFichaDto }) {
  const queryClient = useQueryClient();
  const actualizar = useActualizarOrganizacion();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditarClienteValues>({
    resolver: zodResolver(editarClienteSchema),
    defaultValues: {
      nombre: cliente.nombre,
      telefonoContacto: cliente.telefonoContacto ?? '',
    },
  });

  async function onSubmit(v: EditarClienteValues) {
    setError(null);
    try {
      await actualizar.mutateAsync({
        id: cliente.id,
        data: {
          nombre: v.nombre.trim(),
          telefonoContacto: v.telefonoContacto
            ? (aE164(v.telefonoContacto) ?? undefined)
            : undefined,
        },
      });
      await refrescarClientes(queryClient);
      reset(v);
      toast.success('Cambios guardados.');
    } catch (e) {
      setError(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <section aria-labelledby="contacto" className="grid gap-3">
      <h2 id="contacto" className="text-lg font-medium">
        Datos de contacto
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-xl gap-4">
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
        <p className="text-xs text-muted-foreground">
          El identificador ({cliente.slug}) no se puede cambiar porque va en las direcciones
          públicas.
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
