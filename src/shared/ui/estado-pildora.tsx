import { CircleCheck, Clock, FileX, Goal, Radio, Square } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * Píldora de estado del fútbol («pitazo»): forma + icono + texto, nunca solo color. Los colores salen de los
 * tokens de marca (--gol, --en-vivo, ...), que ya cumplen contraste en claro, oscuro y Mesa.
 */
export const ESTADOS_FUTBOL = [
  'gol',
  'amarilla',
  'roja',
  'en-vivo',
  'finalizado',
  'pendiente',
  'wo',
] as const;
export type EstadoFutbol = (typeof ESTADOS_FUTBOL)[number];

const ESTADOS: Record<
  EstadoFutbol,
  { texto: string; clases: string; icono: typeof Goal; relleno?: boolean }
> = {
  gol: { texto: 'Gol', clases: 'bg-gol text-gol-foreground', icono: Goal },
  amarilla: {
    texto: 'Amarilla',
    clases: 'bg-tarjeta-amarilla text-tarjeta-amarilla-foreground',
    icono: Square,
    relleno: true,
  },
  roja: {
    texto: 'Roja',
    clases: 'bg-tarjeta-roja text-tarjeta-roja-foreground',
    icono: Square,
    relleno: true,
  },
  'en-vivo': { texto: 'En vivo', clases: 'bg-en-vivo text-en-vivo-foreground', icono: Radio },
  finalizado: {
    texto: 'Finalizado',
    clases: 'bg-finalizado text-finalizado-foreground',
    icono: CircleCheck,
  },
  pendiente: { texto: 'Pendiente', clases: 'bg-pendiente text-pendiente-foreground', icono: Clock },
  wo: { texto: 'W.O.', clases: 'bg-wo text-wo-foreground', icono: FileX },
};

export function EstadoPildora({
  estado,
  texto,
  className,
}: {
  estado: EstadoFutbol;
  /** Reemplaza el texto por defecto (p. ej. «Gol de Pérez»). */
  texto?: string;
  className?: string;
}) {
  const { texto: porDefecto, clases, icono: Icono, relleno } = ESTADOS[estado];
  return (
    <span
      data-estado={estado}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider uppercase',
        clases,
        className,
      )}
    >
      <Icono
        aria-hidden="true"
        className={cn(
          'size-3.5',
          estado === 'en-vivo' && 'motion-safe:animate-pulse',
          relleno && 'fill-current',
        )}
      />
      {texto ?? porDefecto}
    </span>
  );
}
