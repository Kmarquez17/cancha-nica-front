'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/mutator';
import { campoDeError, mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import type { InvitacionCreadaDto, OrganizacionDto } from '@/shared/api/generated/models';
import { useInvitarDueno } from '@/shared/api/generated/plataforma/plataforma';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { aE164 } from '../lib/formato';
import { invitarSchema, vacioAUndefined, type InvitarValues } from '../schemas';

type Props = {
  organizacion: OrganizacionDto;
  open: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** Recibe el enlace en claro (una sola vez) y el teléfono E.164 usado, si hubo. */
  onCreada: (invitacion: InvitacionCreadaDto, telefono?: string) => void;
};

/** Invitar al dueño o **reenviar** (genera un enlace nuevo y anula el anterior). */
export function InvitarDuenoDialog({ organizacion, open, onOpenChange, onCreada }: Props) {
  const pendiente = organizacion.invitacionOwner;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pendiente ? 'Reenviar invitación' : 'Invitar al dueño'}</DialogTitle>
          <DialogDescription>
            {pendiente
              ? 'Se creará un enlace nuevo y el enlace anterior dejará de funcionar.'
              : `La persona que invites será la única dueña de ${organizacion.nombre}.`}
          </DialogDescription>
        </DialogHeader>
        <FormularioInvitar
          organizacion={organizacion}
          onCreada={(inv, tel) => {
            onOpenChange(false);
            onCreada(inv, tel);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function FormularioInvitar({
  organizacion,
  onCreada,
}: {
  organizacion: OrganizacionDto;
  onCreada: Props['onCreada'];
}) {
  const queryClient = useQueryClient();
  // gcTime 0: el enlace de la respuesta no se queda en la caché de mutaciones.
  const invitar = useInvitarDueno({ mutation: { gcTime: 0 } });
  const [error, setError] = useState<string | null>(null);
  const pendiente = organizacion.invitacionOwner;

  const {
    register,
    handleSubmit,
    setError: setCampo,
    formState: { errors, isSubmitting },
  } = useForm<InvitarValues>({
    resolver: zodResolver(invitarSchema),
    defaultValues: {
      nombre: pendiente?.nombre ?? '',
      email: pendiente?.email ?? '',
      telefono: '',
      enviarEmail: true,
    },
  });

  async function onSubmit(v: InvitarValues) {
    setError(null);
    const telefono = vacioAUndefined(v.telefono) ? (aE164(v.telefono) ?? undefined) : undefined;
    try {
      const invitacion = await invitar.mutateAsync({
        id: organizacion.id,
        data: { nombre: v.nombre.trim(), email: v.email, telefono, enviarEmail: v.enviarEmail },
      });
      await queryClient.invalidateQueries({
        predicate: (q) => String(q.queryKey[0]).startsWith('/plataforma/organizaciones'),
      });
      onCreada(invitacion, telefono);
    } catch (e) {
      if (!(e instanceof ApiError)) return setError(mensajeGenerico());
      const campo = campoDeError(e);
      if (campo === 'email') setCampo('email', { message: mensajeDeError(e) });
      else setError(mensajeDeError(e));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {error ? <AlertaError>{error}</AlertaError> : null}

      <Campo id="inv-nombre" etiqueta="Nombre del dueño" error={errors.nombre?.message}>
        <Input
          id="inv-nombre"
          autoComplete="off"
          aria-invalid={!!errors.nombre}
          {...register('nombre')}
        />
      </Campo>
      <Campo id="inv-email" etiqueta="Correo" error={errors.email?.message}>
        <Input
          id="inv-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
      </Campo>
      <Campo
        id="inv-telefono"
        etiqueta="Teléfono (para WhatsApp, opcional)"
        ayuda="Formato internacional, p. ej. +50588888888."
        error={errors.telefono?.message}
      >
        <Input
          id="inv-telefono"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          aria-invalid={!!errors.telefono}
          {...register('telefono')}
        />
      </Campo>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" {...register('enviarEmail')} />
        Enviar también por correo
      </label>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creando enlace…' : pendiente ? 'Reenviar invitación' : 'Crear invitación'}
      </Button>
    </form>
  );
}
