import type { MesaPrincipalDto } from '@/shared/api/generated/models';
import { env } from '@/shared/config/env';
import { exigirSesion } from '@/shared/api/server-session';

/**
 * Guarda de servidor del portal de la mesa: `GET /mesa/me` con la cookie `at_mesa`. Sin sesión va al inicio, con el
 * acceso vencido pasa por `/mesa/refresh` y con el cliente bloqueado, a su pantalla. El login (`/mesa/<slug>`) queda
 * fuera de este grupo, así que no se protege.
 */
export default async function PanelMesaLayout({ children }: LayoutProps<'/mesa'>) {
  // Con MSW la sesión de la mesa es simulada (no hay cookie real): solo en desarrollo y en el E2E sin backend.
  if (env.NEXT_PUBLIC_USE_MSW !== 'true') await exigirSesion<MesaPrincipalDto>('mesa');
  return children;
}
