import type { Metadata } from 'next';
import { DelegadoLoginForm } from '@/features/delegados/components/delegado-login-form';
import { TarjetaAcceso } from '@/shared/ui/tarjeta-acceso';

export const metadata: Metadata = { title: 'Delegado · Iniciar sesión', robots: { index: false } };

/** Login del delegado por el slug del cliente: /delegado/<slug-del-cliente> (el teléfono es único por cliente). */
export default async function DelegadoLoginPage({ params }: PageProps<'/delegado/[orgSlug]'>) {
  const { orgSlug } = await params;
  return (
    <TarjetaAcceso titulo="Delegado" descripcion="Entra con tu teléfono y tu PIN de 6 números.">
      <DelegadoLoginForm orgSlug={orgSlug} />
    </TarjetaAcceso>
  );
}
