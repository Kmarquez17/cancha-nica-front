'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@/shared/api/mutator';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { useAdminLogin } from '@/shared/api/generated/admin/admin';
import { usePlataformaLogin } from '@/shared/api/generated/plataforma/plataforma';
import { destinoSeguro, rutaInicio, type Portal } from '@/shared/api/portales';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { loginSchema, type LoginValues } from '../schemas';

type Props = {
  portal: Extract<Portal, 'plataforma' | 'admin'>;
  /** Ruta interna a la que volver tras entrar (viene del proxy/refresh); se sanea. */
  next?: string;
};

export function LoginForm({ portal, next }: Props) {
  const router = useRouter();
  const [error, setError] = useState<{ mensaje: string; code?: string } | null>(null);
  const loginPlataforma = usePlataformaLogin();
  const loginAdmin = useAdminLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setError(null);
    try {
      if (portal === 'plataforma') await loginPlataforma.mutateAsync({ data: values });
      else await loginAdmin.mutateAsync({ data: values });
      router.replace(destinoSeguro(next, rutaInicio(portal)));
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? { mensaje: mensajeDeError(e), code: e.code }
          : { mensaje: mensajeGenerico() },
      );
    }
  }

  const cuentaBloqueada = error?.code === 'ACCOUNT_LOCKED';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {error ? <AlertaError>{error.mensaje}</AlertaError> : null}

      <Campo id="email" etiqueta="Correo" error={errors.email?.message}>
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

      <Campo id="password" etiqueta="Contraseña" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
      </Campo>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>

      {/* Plataforma no tiene recuperación por correo (se recupera por seed/CLI). */}
      {portal === 'admin' ? (
        <Link
          href="/admin/olvide-contrasena"
          className={`text-sm underline-offset-4 hover:underline ${cuentaBloqueada ? 'font-medium text-primary' : 'text-muted-foreground'}`}
        >
          Olvidé mi contraseña
        </Link>
      ) : null}
    </form>
  );
}
