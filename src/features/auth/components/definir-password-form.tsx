'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@/shared/api/mutator';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { useAceptarInvitacion, useRestablecerContrasena } from '@/shared/api/generated/auth/auth';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { definirPasswordSchema, type DefinirPasswordValues } from '../schemas';

type Modo = 'invitacion' | 'restablecer';

const TEXTOS: Record<Modo, { boton: string; enviando: string }> = {
  invitacion: { boton: 'Crear contraseña y entrar', enviando: 'Creando cuenta…' },
  restablecer: { boton: 'Restablecer contraseña', enviando: 'Guardando…' },
};

/**
 * Pantallas públicas `/aceptar-invitacion` y `/restablecer-contrasena`. El token llega en la URL:
 * se lee una vez y se quita del historial; nunca se guarda en storage ni en la caché de Query.
 * - invitación: la API abre sesión `admin` al aceptar → panel.
 * - restablecer: 204 sin sesión → login.
 */
export function DefinirPasswordForm({ modo }: { modo: Modo }) {
  const router = useRouter();
  const aceptar = useAceptarInvitacion();
  const restablecer = useRestablecerContrasena();
  // `undefined` = aún no leído (SSR/primer render); `null` = no había token.
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<{ mensaje: string; code?: string } | null>(null);

  const leido = useRef(false); // StrictMode ejecuta el efecto dos veces: el token solo se lee una

  useEffect(() => {
    if (leido.current) return;
    leido.current = true;
    const url = new URL(window.location.href);
    setToken(url.searchParams.get('token'));
    if (url.searchParams.has('token')) {
      url.searchParams.delete('token');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DefinirPasswordValues>({ resolver: zodResolver(definirPasswordSchema) });

  async function onSubmit({ password }: DefinirPasswordValues) {
    if (!token) return;
    setError(null);
    try {
      if (modo === 'invitacion') {
        await aceptar.mutateAsync({ data: { token, password } });
        router.replace('/admin');
        router.refresh();
      } else {
        await restablecer.mutateAsync({ data: { token, password } });
        router.replace('/admin/login?restablecida=1');
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? { mensaje: mensajeDeError(e), code: e.code }
          : { mensaje: mensajeGenerico() },
      );
    }
  }

  if (token === undefined) return null;

  const sinEnlace = token === null || error?.code === 'TOKEN_INVALIDO_O_EXPIRADO';
  if (sinEnlace) {
    return (
      <div className="grid gap-4">
        <AlertaError>
          {error?.mensaje ?? 'Este enlace ya no es válido. Pide uno nuevo a quien te invitó.'}
        </AlertaError>
        <Link href="/admin/login" className="text-sm underline-offset-4 hover:underline">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {error ? <AlertaError>{error.mensaje}</AlertaError> : null}
      <Campo
        id="password"
        etiqueta="Contraseña nueva"
        ayuda="Entre 10 y 128 caracteres."
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : 'password-ayuda'}
          {...register('password')}
        />
      </Campo>
      <Campo id="repetir" etiqueta="Repite la contraseña" error={errors.repetir?.message}>
        <Input
          id="repetir"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.repetir}
          aria-describedby={errors.repetir ? 'repetir-error' : undefined}
          {...register('repetir')}
        />
      </Campo>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? TEXTOS[modo].enviando : TEXTOS[modo].boton}
      </Button>
    </form>
  );
}
