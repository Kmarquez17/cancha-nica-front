import type { Metadata } from 'next';
import { MesaLoginForm } from '@/features/mesas/components/mesa-login-form';
import { TarjetaAcceso } from '@/shared/ui/tarjeta-acceso';

export const metadata: Metadata = { title: 'Mesa · Iniciar sesión', robots: { index: false } };

/** Login de la mesa por el slug del cliente: /mesa/<slug-del-cliente> (R15). */
export default async function MesaLoginPage({ params }: PageProps<'/mesa/[orgSlug]'>) {
  const { orgSlug } = await params;
  return (
    <div className="mesa">
      <TarjetaAcceso titulo="Mesa" descripcion="Entra con tu usuario y tu PIN de 6 números.">
        <MesaLoginForm orgSlug={orgSlug} />
      </TarjetaAcceso>
    </div>
  );
}
