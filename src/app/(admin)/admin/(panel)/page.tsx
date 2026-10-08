import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin' };

// Placeholder del shell: el dashboard de la edición llega en la Fase 2.
export default function AdminInicioPage() {
  return (
    <section className="grid gap-2">
      <h1 className="text-2xl font-semibold">Bienvenido</h1>
      <p className="text-muted-foreground">
        Aquí vivirán las ediciones, mesas, clubes y demás secciones de tu cuenta.
      </p>
    </section>
  );
}
