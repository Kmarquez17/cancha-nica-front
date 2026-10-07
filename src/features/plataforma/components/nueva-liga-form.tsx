'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/mutator';
import { campoDeError, mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import type { InvitacionCreadaDto } from '@/shared/api/generated/models';
import {
  useCrearOrganizacion,
  useInvitarDueno,
} from '@/shared/api/generated/plataforma/plataforma';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { aE164, slugDeNombre } from '../lib/formato';
import { nuevaLigaSchema, vacioAUndefined, type NuevaLigaValues } from '../schemas';
import { EnlaceInvitacionDialog } from './enlace-invitacion';

type Resultado = { orgId: string; invitacion: InvitacionCreadaDto; telefono?: string };

export function NuevaLigaForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const crear = useCrearOrganizacion();
  const invitar = useInvitarDueno({ mutation: { gcTime: 0 } });
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [slugEditado, setSlugEditado] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError: setCampo,
    formState: { errors, isSubmitting },
  } = useForm<NuevaLigaValues>({
    resolver: zodResolver(nuevaLigaSchema),
    defaultValues: {
      nombre: '',
      slug: '',
      telefonoContacto: '',
      zonaHoraria: '',
      moneda: '',
      pais: '',
      colorPrimario: '',
      duenoNombre: '',
      duenoEmail: '',
      duenoTelefono: '',
      enviarEmail: true,
    },
  });

  const nombreReg = register('nombre');

  async function onSubmit(v: NuevaLigaValues) {
    setError(null);
    let orgId: string;
    try {
      const org = await crear.mutateAsync({
        data: {
          nombre: v.nombre.trim(),
          slug: v.slug.trim(),
          telefonoContacto: v.telefonoContacto
            ? (aE164(v.telefonoContacto) ?? undefined)
            : undefined,
          zonaHoraria: vacioAUndefined(v.zonaHoraria),
          moneda: vacioAUndefined(v.moneda),
          pais: vacioAUndefined(v.pais),
          colorPrimario: vacioAUndefined(v.colorPrimario),
        },
      });
      orgId = org.id;
    } catch (e) {
      if (!(e instanceof ApiError)) return setError(mensajeGenerico());
      const campo = campoDeError(e);
      if (campo === 'slug') setCampo('slug', { message: mensajeDeError(e) });
      else setError(mensajeDeError(e));
      return;
    }

    await queryClient.invalidateQueries({
      predicate: (q) => String(q.queryKey[0]).startsWith('/plataforma/organizaciones'),
    });

    // La liga ya existe: si la invitación falla, se reintenta desde su detalle (no se recrea).
    const telefono = v.duenoTelefono ? (aE164(v.duenoTelefono) ?? undefined) : undefined;
    try {
      const invitacion = await invitar.mutateAsync({
        id: orgId,
        data: {
          nombre: v.duenoNombre.trim(),
          email: v.duenoEmail,
          telefono,
          enviarEmail: v.enviarEmail,
        },
      });
      setResultado({ orgId, invitacion, telefono });
    } catch {
      // El detalle de la liga explica que la invitación falló y permite reintentarla.
      router.replace(`/plataforma/ligas/${orgId}?invitacion=fallida`);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-2xl gap-6">
        {error ? <AlertaError>{error}</AlertaError> : null}

        <fieldset className="grid gap-4">
          <legend className="mb-2 text-lg font-medium">Liga</legend>
          <Campo id="nombre" etiqueta="Nombre" error={errors.nombre?.message}>
            <Input
              id="nombre"
              autoComplete="off"
              aria-invalid={!!errors.nombre}
              {...nombreReg}
              onChange={(e) => {
                void nombreReg.onChange(e);
                if (!slugEditado)
                  setValue('slug', slugDeNombre(e.target.value), { shouldValidate: false });
              }}
            />
          </Campo>
          <Campo
            id="slug"
            etiqueta="Identificador en la URL (slug)"
            ayuda="Va en las direcciones públicas y no se puede cambiar después."
            error={errors.slug?.message}
          >
            <Input
              id="slug"
              autoComplete="off"
              aria-invalid={!!errors.slug}
              {...register('slug', { onChange: () => setSlugEditado(true) })}
            />
          </Campo>
          <Campo
            id="telefonoContacto"
            etiqueta="Teléfono de contacto (opcional)"
            ayuda="Formato internacional, p. ej. +50588888888."
            error={errors.telefonoContacto?.message}
          >
            <Input
              id="telefonoContacto"
              type="tel"
              inputMode="tel"
              {...register('telefonoContacto')}
            />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="zonaHoraria"
              etiqueta="Zona horaria (opcional)"
              ayuda="Ej. America/Managua"
              error={errors.zonaHoraria?.message}
            >
              <Input id="zonaHoraria" {...register('zonaHoraria')} />
            </Campo>
            <Campo
              id="colorPrimario"
              etiqueta="Color (opcional)"
              ayuda="#RRGGBB"
              error={errors.colorPrimario?.message}
            >
              <Input id="colorPrimario" {...register('colorPrimario')} />
            </Campo>
            <Campo
              id="moneda"
              etiqueta="Moneda (opcional)"
              ayuda="Ej. NIO"
              error={errors.moneda?.message}
            >
              <Input id="moneda" {...register('moneda')} />
            </Campo>
            <Campo id="pais" etiqueta="País (opcional)" ayuda="Ej. NI" error={errors.pais?.message}>
              <Input id="pais" {...register('pais')} />
            </Campo>
          </div>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="mb-2 text-lg font-medium">Dueño de la liga</legend>
          <Campo id="duenoNombre" etiqueta="Nombre" error={errors.duenoNombre?.message}>
            <Input
              id="duenoNombre"
              autoComplete="off"
              aria-invalid={!!errors.duenoNombre}
              {...register('duenoNombre')}
            />
          </Campo>
          <Campo id="duenoEmail" etiqueta="Correo" error={errors.duenoEmail?.message}>
            <Input
              id="duenoEmail"
              type="email"
              inputMode="email"
              autoComplete="off"
              aria-invalid={!!errors.duenoEmail}
              {...register('duenoEmail')}
            />
          </Campo>
          <Campo
            id="duenoTelefono"
            etiqueta="Teléfono para WhatsApp (opcional)"
            ayuda="Formato internacional, p. ej. +50588888888."
            error={errors.duenoTelefono?.message}
          >
            <Input id="duenoTelefono" type="tel" inputMode="tel" {...register('duenoTelefono')} />
          </Campo>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" {...register('enviarEmail')} />
            Enviar también la invitación por correo
          </label>
        </fieldset>

        <div className="flex gap-2">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear liga e invitar al dueño'}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>

      <EnlaceInvitacionDialog
        invitacion={resultado?.invitacion ?? null}
        telefono={resultado?.telefono}
        onCerrar={() => {
          const id = resultado?.orgId;
          setResultado(null); // el secreto se descarta al cerrar
          if (id) router.replace(`/plataforma/ligas/${id}`);
        }}
      />
    </>
  );
}
