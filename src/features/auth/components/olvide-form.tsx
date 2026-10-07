'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@/shared/api/mutator';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { useOlvideContrasena } from '@/shared/api/generated/auth/auth';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { olvideSchema, type OlvideValues } from '../schemas';

export function OlvideForm() {
  const olvide = useOlvideContrasena();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OlvideValues>({ resolver: zodResolver(olvideSchema) });

  async function onSubmit(values: OlvideValues) {
    setError(null);
    try {
      // La API responde siempre lo mismo (202), exista o no el correo: se muestra tal cual.
      const r = await olvide.mutateAsync({ data: values });
      setMensaje(r.mensaje);
    } catch (e) {
      setError(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  if (mensaje) {
    return (
      <div className="grid gap-4">
        <p role="status">{mensaje}</p>
        <Link href="/admin/login" className="text-sm underline-offset-4 hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {error ? <AlertaError>{error}</AlertaError> : null}
      <Campo id="email" etiqueta="Correo de tu cuenta" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
      </Campo>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
      </Button>
      <Link
        href="/admin/login"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Volver
      </Link>
    </form>
  );
}
