'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/shared/api/mutator';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import type { ActualizarConfigDto, OrganizacionConfigDto } from '@/shared/api/generated/models';
import {
  getGetAdminOrganizacionQueryKey,
  useActualizarAdminOrganizacion,
  useGetAdminOrganizacion,
} from '@/shared/api/generated/admin/admin';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { configEditarSchema, type ConfigValues } from '../schemas';

const CAMPOS = ['zonaHoraria', 'moneda', 'pais', 'colorPrimario'] as const;

/** Solo viajan al API los campos que cambiaron (y solo estos cuatro: el resto da 400). */
export function cambiosDeConfig(
  original: OrganizacionConfigDto,
  nuevo: ConfigValues,
): ActualizarConfigDto {
  const cambios: ActualizarConfigDto = {};
  for (const campo of CAMPOS) {
    const valor = nuevo[campo].trim();
    if (valor !== original[campo]) cambios[campo] = valor;
  }
  return cambios;
}

export function ConfiguracionCliente() {
  const { data: cliente, isLoading, error } = useGetAdminOrganizacion();

  if (isLoading) {
    return (
      <p role="status" className="text-muted-foreground">
        Cargando configuración…
      </p>
    );
  }
  if (error || !cliente) {
    return (
      <AlertaError>
        {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
      </AlertaError>
    );
  }
  return <Formulario cliente={cliente} />;
}

function Formulario({ cliente }: { cliente: OrganizacionConfigDto }) {
  const queryClient = useQueryClient();
  const actualizar = useActualizarAdminOrganizacion();
  const [error, setError] = useState<string | null>(null);

  const valores: ConfigValues = {
    zonaHoraria: cliente.zonaHoraria,
    moneda: cliente.moneda,
    pais: cliente.pais,
    colorPrimario: cliente.colorPrimario,
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ConfigValues>({
    resolver: zodResolver(configEditarSchema),
    defaultValues: valores,
  });

  async function onSubmit(v: ConfigValues) {
    setError(null);
    const data = cambiosDeConfig(cliente, v);
    if (Object.keys(data).length === 0) return;
    try {
      const guardado = await actualizar.mutateAsync({ data });
      queryClient.setQueryData(getGetAdminOrganizacionQueryKey(), guardado);
      reset({
        zonaHoraria: guardado.zonaHoraria,
        moneda: guardado.moneda,
        pais: guardado.pais,
        colorPrimario: guardado.colorPrimario,
      });
      toast.success('Configuración guardada.');
    } catch (e) {
      if (!(e instanceof ApiError)) return setError(mensajeGenerico());
      setError(e.errors?.length ? `${mensajeDeError(e)} ${e.errors.join(' ')}` : mensajeDeError(e));
    }
  }

  return (
    <div className="grid max-w-2xl gap-8">
      <section aria-labelledby="datos" className="grid gap-3">
        <h2 id="datos" className="text-lg font-medium">
          Datos del cliente
        </h2>
        <p className="text-sm text-muted-foreground">
          Los administra la plataforma. Si necesitas cambiarlos, contacta al administrador de la
          app.
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Nombre</dt>
            <dd>{cliente.nombre}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Identificador (slug)</dt>
            <dd>{cliente.slug}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Teléfono de contacto</dt>
            <dd>{cliente.telefonoContacto ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="regional" className="grid gap-3">
        <h2 id="regional" className="text-lg font-medium">
          Configuración regional
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {error ? <AlertaError>{error}</AlertaError> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="zonaHoraria"
              etiqueta="Zona horaria"
              ayuda="Ej. America/Managua"
              error={errors.zonaHoraria?.message}
            >
              <Input
                id="zonaHoraria"
                aria-invalid={!!errors.zonaHoraria}
                {...register('zonaHoraria')}
              />
            </Campo>
            <Campo
              id="colorPrimario"
              etiqueta="Color principal"
              ayuda="#RRGGBB"
              error={errors.colorPrimario?.message}
            >
              <Input
                id="colorPrimario"
                aria-invalid={!!errors.colorPrimario}
                {...register('colorPrimario')}
              />
            </Campo>
            <Campo
              id="moneda"
              etiqueta="Moneda"
              ayuda="Código ISO, ej. NIO"
              error={errors.moneda?.message}
            >
              <Input id="moneda" aria-invalid={!!errors.moneda} {...register('moneda')} />
            </Campo>
            <Campo
              id="pais"
              etiqueta="País"
              ayuda="Código ISO, ej. NI"
              error={errors.pais?.message}
            >
              <Input id="pais" aria-invalid={!!errors.pais} {...register('pais')} />
            </Campo>
          </div>
          <div>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? 'Guardando…' : 'Guardar configuración'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
