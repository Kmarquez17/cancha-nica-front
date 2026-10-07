import { RefrescarSesion } from '@/features/auth/components/refrescar-sesion';

export default async function PlataformaRefreshPage({
  searchParams,
}: PageProps<'/plataforma/refresh'>) {
  const { next } = await searchParams;
  return <RefrescarSesion portal="plataforma" next={typeof next === 'string' ? next : undefined} />;
}
