'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mensajesEs } from '@/shared/api/errors/es';
import { useLogout } from '@/shared/api/generated/auth/auth';
import { rutaInicio, rutaLogin, type Portal } from '@/shared/api/portales';
import { Button } from '@/shared/ui/button';

/**
 * Cliente bloqueado (R11). Las cookies NO se borran: si el cliente se reactiva, la misma sesión vuelve a
 * funcionar. «Reintentar» solo vuelve a entrar al portal (el guard del layout vuelve a preguntar).
 */
export function PantallaBloqueada({ portal }: { portal: Exclude<Portal, 'plataforma'> }) {
  const router = useRouter();
  const logout = useLogout();
  const [saliendo, setSaliendo] = useState(false);

  async function cerrarSesion() {
    setSaliendo(true);
    try {
      await logout.mutateAsync({ params: { portal } });
    } finally {
      router.replace(rutaLogin(portal));
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Cuenta del cliente bloqueada</h1>
      <p role="status" className="text-muted-foreground">
        {mensajesEs.ORG_BLOQUEADA.message}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => router.replace(rutaInicio(portal))}>Reintentar</Button>
        <Button variant="outline" onClick={cerrarSesion} disabled={saliendo}>
          Cerrar sesión
        </Button>
      </div>
    </main>
  );
}
