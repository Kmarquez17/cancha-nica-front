import { CerrarSesionButton } from '@/features/auth/components/cerrar-sesion-button';
import type { PlataformaPrincipalDto } from '@/shared/api/generated/models';
import { exigirSesion } from '@/shared/api/server-session';
import { ShellEscritorio } from '@/shared/ui/shell-escritorio';

export default async function PanelPlataformaLayout({ children }: LayoutProps<'/plataforma'>) {
  const yo = await exigirSesion<PlataformaPrincipalDto>('plataforma');
  return (
    <ShellEscritorio
      marca="Plataforma"
      nav={[{ href: '/plataforma/clientes', etiqueta: 'Clientes' }]}
      usuario={yo.nombre}
      acciones={<CerrarSesionButton portal="plataforma" />}
    >
      {children}
    </ShellEscritorio>
  );
}
