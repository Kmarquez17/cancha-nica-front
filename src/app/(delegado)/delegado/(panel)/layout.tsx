import type { DelegadoPrincipalDto } from '@/shared/api/generated/models';
import { env } from '@/shared/config/env';
import { exigirSesion } from '@/shared/api/server-session';

/**
 * Guarda de servidor del portal del delegado: `GET /delegado/me` con la cookie `at_delegado`. Sin sesión va a
 * `/delegado/login`, con el acceso vencido pasa por `/delegado/refresh` y con el cliente bloqueado, a su pantalla.
 * El login (`/delegado/<slug>`) queda fuera de este grupo, así que no se protege.
 */
export default async function PanelDelegadoLayout({ children }: LayoutProps<'/delegado'>) {
  // Con MSW la sesión del delegado es simulada (no hay cookie real): solo en desarrollo y en el E2E sin backend.
  if (env.NEXT_PUBLIC_USE_MSW !== 'true') await exigirSesion<DelegadoPrincipalDto>('delegado');
  return children;
}
