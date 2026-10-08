import {
  CircleCheck,
  ClipboardList,
  Pause,
  Play,
  Settings,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { ESTADO_TEXTO, MODALIDAD_TEXTO } from '../lib/textos';
import type { EstadoEdicion, Modalidad } from '../tipos';

const ESTADOS: Record<EstadoEdicion, { clases: string; icono: LucideIcon }> = {
  CONFIGURACION: { clases: 'bg-pendiente text-pendiente-foreground', icono: Settings },
  EN_REGISTRO: { clases: 'bg-info text-info-foreground', icono: ClipboardList },
  EN_CURSO: { clases: 'bg-success text-success-foreground', icono: Play },
  EN_ELIMINATORIAS: { clases: 'bg-wo text-wo-foreground', icono: Trophy },
  PAUSADA: { clases: 'bg-warning text-warning-foreground', icono: Pause },
  FINALIZADA: { clases: 'bg-finalizado text-finalizado-foreground', icono: CircleCheck },
};

/** Estado de una liga: forma + icono + texto, con los tokens de marca (cumplen contraste en claro y oscuro). */
export function EstadoLiga({ estado, className }: { estado: EstadoEdicion; className?: string }) {
  const { clases, icono: Icono } = ESTADOS[estado];
  return (
    <span
      data-estado={estado}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider uppercase',
        clases,
        className,
      )}
    >
      <Icono aria-hidden="true" className="size-3.5" />
      {ESTADO_TEXTO[estado]}
    </span>
  );
}

export function ModalidadInsignia({ modalidad }: { modalidad: Modalidad }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wider uppercase">
      {MODALIDAD_TEXTO[modalidad]}
    </span>
  );
}
