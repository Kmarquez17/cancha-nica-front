import type { ReactNode } from 'react';
import { Logo } from '@/shared/ui/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

/** Contenedor centrado para login, olvidé/restablecer contraseña y aceptar invitación. */
export function TarjetaAcceso({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <Logo variante="vertical" className="w-40" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{titulo}</h1>
          </CardTitle>
          {descripcion ? <CardDescription>{descripcion}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
