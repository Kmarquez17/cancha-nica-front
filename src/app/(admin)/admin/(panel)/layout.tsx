import { CerrarSesionButton } from '@/features/auth/components/cerrar-sesion-button';
import type { AdminPrincipalDto } from '@/shared/api/generated/models';
import { exigirSesion } from '@/shared/api/server-session';
import { ShellEscritorio } from '@/shared/ui/shell-escritorio';

export default async function PanelAdminLayout({ children }: LayoutProps<'/admin'>) {
  const yo = await exigirSesion<AdminPrincipalDto>('admin');
  return (
    <ShellEscritorio
      marca={yo.organizacion.nombre}
      nav={[
        { href: '/admin', etiqueta: 'Inicio' },
        { href: '/admin/configuracion', etiqueta: 'Configuración' },
      ]}
      usuario={`${yo.nombre} · ${yo.role === 'OWNER' ? 'Dueño' : 'Admin'}`}
      acciones={<CerrarSesionButton portal="admin" />}
    >
      {children}
    </ShellEscritorio>
  );
}
