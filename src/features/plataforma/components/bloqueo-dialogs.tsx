'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/shared/api/mutator';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import type { ClienteFichaDto } from '@/shared/api/generated/models';
import {
  useBloquearOrganizacion,
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
import { bloquearSchema, type BloquearValues } from '../schemas';
import { refrescarClientes } from '../lib/consultas';

type Props = {
  cliente: ClienteFichaDto;
  open: boolean;
  onOpenChange: (abierto: boolean) => void;
};

export function BloquearDialog({ cliente, open, onOpenChange }: Props) {
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
      await bloquear.mutateAsync({ id: cliente.id, data: { motivo: v.motivo.trim() } });
      await refrescarClientes(queryClient);
      toast.success('Cliente bloqueado.');
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
          <DialogTitle>Bloquear a {cliente.nombre}</DialogTitle>
          <DialogDescription>
            Su dueño, sus admins, sus delegados y sus mesas pierden el acceso de inmediato y sus
            ligas dejan de verse en el sitio público. No se borra nada y puedes reactivarlo cuando
            quieras.
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
              {isSubmitting ? 'Bloqueando…' : 'Bloquear cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReactivarDialog({ cliente, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const reactivar = useReactivarOrganizacion();
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setError(null);
    try {
      await reactivar.mutateAsync({ id: cliente.id });
      await refrescarClientes(queryClient);
      toast.success('Cliente reactivado.');
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivar a {cliente.nombre}</DialogTitle>
          <DialogDescription>
            Sus usuarios vuelven a entrar con la misma sesión y sus ligas se vuelven a ver en el
            sitio público.
          </DialogDescription>
        </DialogHeader>
        {error ? <AlertaError>{error}</AlertaError> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={reactivar.isPending}>
            {reactivar.isPending ? 'Reactivando…' : 'Reactivar cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
