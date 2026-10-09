'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
import { PIN_VALIDO } from '@/shared/lib/pin';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { useDelegadoLogin } from '../api';

const schema = z.object({
  // Solo se avisa de lo evidente: el API normaliza el número (local, +505… o 00505…) con el país del cliente.
  telefono: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-.()]{6,20}$/, 'Escribe tu teléfono, por ejemplo 8888 8888.'),
  pin: z.string().regex(PIN_VALIDO, 'El PIN tiene 6 números.'),
});
type Values = z.infer<typeof schema>;

/** Login del delegado por el slug del cliente: teléfono + PIN de 6 dígitos. Controles grandes para usarse con una mano. */
export function DelegadoLoginForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const login = useDelegadoLogin();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(v: Values) {
    setError(null);
    try {
      await login.mutateAsync({ orgSlug, data: { telefono: v.telefono, pin: v.pin } });
      router.replace('/delegado');
    } catch (e) {
      if (!(e instanceof ApiError)) return setError(mensajeGenerico());
      // Misma respuesta para cliente o teléfono inexistente, PIN errado y delegado desactivado: no se distingue.
      setError(
        e.code === 'INVALID_CREDENTIALS' ? 'Teléfono o PIN incorrectos.' : mensajeDeError(e),
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {error ? <AlertaError>{error}</AlertaError> : null}
      <Campo id="del-telefono" etiqueta="Teléfono" error={errors.telefono?.message}>
        <Input
          id="del-telefono"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          placeholder="8888 8888"
          className="h-12 text-lg"
          aria-invalid={!!errors.telefono}
          {...register('telefono')}
        />
      </Campo>
      <Campo id="del-pin" etiqueta="PIN" error={errors.pin?.message}>
        <Input
          id="del-pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={6}
          className="marcador h-12 text-2xl tracking-[0.3em]"
          aria-invalid={!!errors.pin}
          {...register('pin')}
        />
      </Campo>
      <Button type="submit" size="lg" className="h-12 text-lg" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
