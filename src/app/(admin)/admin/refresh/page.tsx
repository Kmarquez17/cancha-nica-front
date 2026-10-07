import { RefrescarSesion } from '@/features/auth/components/refrescar-sesion';

export default async function AdminRefreshPage({ searchParams }: PageProps<'/admin/refresh'>) {
  const { next } = await searchParams;
  return <RefrescarSesion portal="admin" next={typeof next === 'string' ? next : undefined} />;
}
