import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/shared/ui/logo';

// Misma pantalla para liga inexistente y cliente bloqueado (la API responde 404 en ambos casos).
export const metadata: Metadata = {
  title: 'Liga no disponible',
  robots: { index: false, follow: false },
};

export default function LigaNoDisponible() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo variante="vertical" className="w-36" />
      <h1 className="text-2xl font-semibold">Esta liga no está disponible</h1>
      <p className="text-muted-foreground">
        Puede que el enlace sea incorrecto o que la liga esté fuera de servicio por ahora.
      </p>
      <Link href="/" className="underline underline-offset-4">
        Ir al inicio
      </Link>
    </main>
  );
}
