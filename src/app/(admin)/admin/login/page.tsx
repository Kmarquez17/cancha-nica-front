import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';
import { TarjetaAcceso } from '@/shared/ui/tarjeta-acceso';

export const metadata: Metadata = { title: 'Admin · Iniciar sesión', robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<'/admin/login'>) {
  const { next, restablecida } = await searchParams;
  return (
    <TarjetaAcceso
      titulo="Administración de la liga"
      descripcion="Entra con tu correo y contraseña."
    >
      {restablecida ? (
        <p role="status" className="mb-4 rounded-lg bg-primary/10 px-3 py-2 text-sm">
          Contraseña actualizada. Ya puedes iniciar sesión.
        </p>
      ) : null}
      <LoginForm portal="admin" next={typeof next === 'string' ? next : undefined} />
    </TarjetaAcceso>
  );
}
