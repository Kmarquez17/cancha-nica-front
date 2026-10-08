import type { Metadata } from 'next';
import { TarjetaAcceso } from '@/shared/ui/tarjeta-acceso';

export const metadata: Metadata = { title: 'Delegado', robots: { index: false } };

/** Sin el enlace del cliente no se sabe a qué liga entrar: se pide el enlace al organizador. */
export default function DelegadoSinEnlacePage() {
  return (
    <TarjetaAcceso titulo="Delegado" descripcion="Entra con el enlace que te mandó el organizador.">
      <p className="text-sm text-muted-foreground">
        Tu enlace termina con el nombre de la liga, por ejemplo <strong>/delegado/mi-liga</strong>.
        Si lo perdiste, pídele al organizador que te lo reenvíe.
      </p>
    </TarjetaAcceso>
  );
}
