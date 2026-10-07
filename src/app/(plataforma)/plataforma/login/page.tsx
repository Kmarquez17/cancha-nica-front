import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';
import { TarjetaAcceso } from '@/shared/ui/tarjeta-acceso';

export const metadata: Metadata = {
  title: 'Plataforma · Iniciar sesión',
  robots: { index: false },
};

export default async function PlataformaLoginPage({
  searchParams,
}: PageProps<'/plataforma/login'>) {
  const { next } = await searchParams;
  return (
    <TarjetaAcceso titulo="Plataforma" descripcion="Acceso del administrador de la app.">
      <LoginForm portal="plataforma" next={typeof next === 'string' ? next : undefined} />
    </TarjetaAcceso>
  );
}
