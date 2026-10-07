'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { refrescarSesion } from '@/shared/api/mutator';
import {
  destinoSeguro,
  rutaBloqueada,
  rutaInicio,
  rutaLogin,
  type Portal,
} from '@/shared/api/portales';

/**
 * Ruta cliente `/<portal>/refresh?next=…` (R1): el servidor nunca rota el refresh. Un Server
 * Component que recibe 401 redirige aquí; se refresca en single-flight y se vuelve a `next`.
 */
export function RefrescarSesion({ portal, next }: { portal: Portal; next?: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelado = false;
    refrescarSesion(portal).then((resultado) => {
      if (cancelado) return;
      if (resultado === 'ok') router.replace(destinoSeguro(next, rutaInicio(portal)));
      else if (resultado === 'bloqueada') router.replace(rutaBloqueada(portal));
      else router.replace(rutaLogin(portal));
    });
    return () => {
      cancelado = true;
    };
  }, [portal, next, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <p role="status" className="text-muted-foreground">
        Reanudando tu sesión…
      </p>
    </main>
  );
}
