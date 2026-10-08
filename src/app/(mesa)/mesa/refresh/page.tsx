import { RefrescarSesion } from '@/features/auth/components/refrescar-sesion';

export default async function MesaRefreshPage({ searchParams }: PageProps<'/mesa/refresh'>) {
  const { next } = await searchParams;
  return <RefrescarSesion portal="mesa" next={typeof next === 'string' ? next : undefined} />;
}
