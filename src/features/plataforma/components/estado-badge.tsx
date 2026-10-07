import { cn } from '@/shared/lib/utils';
import type { EstadoOrganizacion } from '@/shared/api/generated/models';

/** Estado con texto, no solo color. */
export function EstadoBadge({ estado }: { estado: EstadoOrganizacion }) {
  const activa = estado === 'ACTIVA';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        activa ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
      )}
    >
      {activa ? 'Activa' : 'Bloqueada'}
    </span>
  );
}
