import type { Metadata } from 'next';
import { DefinirPasswordForm } from '@/features/auth/components/definir-password-form';
import { TarjetaAcceso } from '@/shared/ui/tarjeta-acceso';

// El token viaja en la URL: sin indexar y (en next.config) sin enviar Referer.
export const metadata: Metadata = {
  title: 'Aceptar invitación',
  robots: { index: false, follow: false },
};

export default function AceptarInvitacionPage() {
  return (
    <TarjetaAcceso
      titulo="Crea tu contraseña"
      descripcion="Te invitaron a administrar una liga en Cancha Nica."
    >
      <DefinirPasswordForm modo="invitacion" />
    </TarjetaAcceso>
  );
}
