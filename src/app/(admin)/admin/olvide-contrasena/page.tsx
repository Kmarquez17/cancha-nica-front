import type { Metadata } from 'next';
import { OlvideForm } from '@/features/auth/components/olvide-form';
import { TarjetaAcceso } from '@/shared/ui/tarjeta-acceso';

export const metadata: Metadata = { title: 'Olvidé mi contraseña', robots: { index: false } };

export default function OlvideContrasenaPage() {
  return (
    <TarjetaAcceso
      titulo="Olvidé mi contraseña"
      descripcion="Te enviaremos un enlace para crear una contraseña nueva."
    >
      <OlvideForm />
    </TarjetaAcceso>
  );
}
