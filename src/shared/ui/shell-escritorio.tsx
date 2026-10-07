import Link from 'next/link';
import type { ReactNode } from 'react';

/** Cabecera + contenido para los portales de escritorio (plataforma y admin). */
export function ShellEscritorio({
  marca,
  nav,
  usuario,
  acciones,
  children,
}: {
  marca: string;
  nav: { href: string; etiqueta: string }[];
  usuario: string;
  acciones: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">{marca}</span>
          <nav aria-label="Principal" className="flex gap-4 text-sm">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="underline-offset-4 hover:underline">
                {item.etiqueta}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{usuario}</span>
            {acciones}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
