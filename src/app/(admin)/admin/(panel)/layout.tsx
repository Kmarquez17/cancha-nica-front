import { CerrarSesionButton } from '@/features/auth/components/cerrar-sesion-button';
import type { AdminPrincipalDto } from '@/shared/api/generated/models';
import { exigirSesion, leerColorCliente } from '@/shared/api/server-session';
import { ShellEscritorio } from '@/shared/ui/shell-escritorio';
import { TemaCliente } from '@/shared/ui/tema-cliente';

export default async function PanelAdminLayout({ children }: LayoutProps<'/admin'>) {
  const yo = await exigirSesion<AdminPrincipalDto>('admin');
  const color = await leerColorCliente('admin');
  return (
    <>
      <TemaCliente color={color} />
      <ShellEscritorio
        marca={yo.organizacion.nombre}
        nav={[
          { href: '/admin', etiqueta: 'Inicio' },
          { href: '/admin/ligas', etiqueta: 'Ligas' },
          { href: '/admin/categorias', etiqueta: 'Categorías' },
          { href: '/admin/clubes', etiqueta: 'Clubes' },
          { href: '/admin/delegados', etiqueta: 'Delegados' },
          { href: '/admin/mesas', etiqueta: 'Mesas' },
          { href: '/admin/configuracion', etiqueta: 'Configuración' },
        ]}
        usuario={`${yo.nombre} · ${yo.role === 'OWNER' ? 'Dueño' : 'Admin'}`}
        acciones={<CerrarSesionButton portal="admin" />}
      >
        {children}
      </ShellEscritorio>
    </>
  );
}
