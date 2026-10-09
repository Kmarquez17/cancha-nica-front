import { RefrescarSesion } from '@/features/auth/components/refrescar-sesion';

export default async function DelegadoRefreshPage({
  searchParams,
}: PageProps<'/delegado/refresh'>) {
  const { next } = await searchParams;
  return <RefrescarSesion portal="delegado" next={typeof next === 'string' ? next : undefined} />;
}
