import type { Metadata } from 'next';
import { DefinirPasswordForm } from '@/features/auth/components/definir-password-form';
import { TarjetaAcceso } from '@/shared/ui/tarjeta-acceso';

export const metadata: Metadata = {
  title: 'Restablecer contraseña',
  robots: { index: false, follow: false },
};

export default function RestablecerContrasenaPage() {
  return (
    <TarjetaAcceso titulo="Restablecer contraseña" descripcion="Elige una contraseña nueva.">
      <DefinirPasswordForm modo="restablecer" />
    </TarjetaAcceso>
  );
}
