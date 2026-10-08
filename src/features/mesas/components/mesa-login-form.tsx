'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { useMesaLogin } from '@/shared/api/generated/mesa/mesa';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';

const schema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^mesa[1-6]$/i, 'Escribe tu usuario, por ejemplo MESA1.'),
  pin: z.string().regex(/^\d{6}$/, 'El PIN tiene 6 números.'),
});
type Values = z.infer<typeof schema>;

/** Login de la mesa por el slug del cliente: usuario MESAn + PIN de 6 dígitos. Controles grandes para usarse en la cancha. */
export function MesaLoginForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const login = useMesaLogin();
  const [error, setError] = useState<{ mensaje: string; code?: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(v: Values) {
    setError(null);
    try {
      await login.mutateAsync({
        orgSlug,
        data: { username: v.username.trim().toUpperCase(), pin: v.pin },
      });
      router.replace('/mesa');
    } catch (e) {
      if (!(e instanceof ApiError)) return setError({ mensaje: mensajeGenerico() });
      setError({
        // Misma respuesta para cuenta inexistente, PIN errónea o mesa inactiva: no se distingue.
        mensaje:
          e.code === 'INVALID_CREDENTIALS' ? 'Usuario o PIN incorrectos.' : mensajeDeError(e),
        code: e.code,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {error ? <AlertaError>{error.mensaje}</AlertaError> : null}
      <Campo id="mesa-usuario" etiqueta="Usuario" error={errors.username?.message}>
        <Input
          id="mesa-usuario"
          autoComplete="username"
          autoCapitalize="characters"
          placeholder="MESA1"
          className="h-14 text-lg uppercase"
          aria-invalid={!!errors.username}
          {...register('username')}
        />
      </Campo>
      <Campo id="mesa-pin" etiqueta="PIN" error={errors.pin?.message}>
        <Input
          id="mesa-pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="marcador h-14 text-2xl tracking-[0.3em]"
          aria-invalid={!!errors.pin}
          {...register('pin')}
        />
      </Campo>
      <Button type="submit" size="lg" className="h-14 text-lg" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
