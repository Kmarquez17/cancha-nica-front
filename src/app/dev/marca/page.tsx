import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { contraste, temaDeCliente } from '@/shared/lib/color-cliente';
import { Button } from '@/shared/ui/button';
import { ESTADOS_FUTBOL, EstadoPildora } from '@/shared/ui/estado-pildora';
import { Logo } from '@/shared/ui/logo';
import { TemaCliente } from '@/shared/ui/tema-cliente';

export const metadata: Metadata = { title: 'Marca (solo desarrollo)', robots: { index: false } };

const COLORES_MARCA = [
  ['Noche', '#07180F'],
  ['Bosque', '#14532D'],
  ['Césped', '#6AA23A'],
  ['Dorado', '#DDB34E'],
  ['Tiza', '#FFFFFF'],
  ['Cal', '#F4F8F3'],
  ['Tinta', '#04110A'],
  ['Pizarra', '#4B5E52'],
] as const;

// Ligas de ejemplo: incluye colores difíciles (muy claro, muy oscuro) para ver el ajuste automático.
const LIGAS = [
  ['Liga Sopa (verde)', '#16A34A'],
  ['Liga Amarilla', '#FDE047'],
  ['Liga Marino', '#0B1F4D'],
  ['Liga Roja', '#DC2626'],
  ['Liga Violeta', '#7C3AED'],
] as const;

/** Galería interna de la marca. No existe en producción. */
export default function MarcaDevPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <p className="text-sm text-muted-foreground">Galería de marca · solo desarrollo</p>
      </header>

      <section aria-labelledby="colores" className="flex flex-col gap-3">
        <h2 id="colores" className="text-3xl">
          Colores
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLORES_MARCA.map(([nombre, hex]) => (
            <li key={hex} className="overflow-hidden rounded-lg border">
              <div className="h-14" style={{ backgroundColor: hex }} />
              <p className="p-2 text-sm">
                <span className="font-semibold">{nombre}</span>{' '}
                <span className="marcador">{hex}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="estados" className="flex flex-col gap-3">
        <h2 id="estados" className="text-3xl">
          Estados del fútbol
        </h2>
        <ul className="flex flex-wrap gap-3">
          {ESTADOS_FUTBOL.map((e) => (
            <li key={e}>
              <EstadoPildora estado={e} />
            </li>
          ))}
        </ul>
        <p className="marcador text-6xl">2 – 1</p>
      </section>

      <section aria-labelledby="ligas" className="flex flex-col gap-3">
        <h2 id="ligas" className="text-3xl">
          Color de la liga
        </h2>
        <p className="text-sm text-muted-foreground">
          Cada tarjeta usa el color de una liga de ejemplo. Si no se lee bien, se ajusta; el valor
          final aparece abajo. Cambia el tema para ver el oscuro.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {LIGAS.map(([nombre, hex], i) => {
            const alcance = `[data-liga="${i}"]`;
            const tema = temaDeCliente(hex)!;
            return (
              <li
                key={hex}
                data-liga={i}
                className="flex flex-col gap-3 rounded-lg border bg-card p-4"
              >
                <TemaCliente color={hex} alcance={alcance} />
                <p className="font-semibold">{nombre}</p>
                <div className="flex flex-wrap gap-2">
                  <Button>Inscribir equipo</Button>
                  <Button variant="outline">Ver tabla</Button>
                </div>
                <p className="marcador text-xs font-normal text-muted-foreground">
                  Elegido {hex} · claro {tema.claro.primary}
                  {tema.claro.ajustado ? ' (ajustado)' : ''} · oscuro {tema.oscuro.primary}
                  {tema.oscuro.ajustado ? ' (ajustado)' : ''} · texto{' '}
                  {contraste(tema.claro.primaryForeground, tema.claro.primary).toFixed(1)}:1
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
