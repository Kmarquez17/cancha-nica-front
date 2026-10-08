import Image from 'next/image';
import { cn } from '@/shared/lib/utils';

/**
 * Logo de Cancha Nica. El texto cambia de color según el tema (variantes «claro» y «oscuro» del
 * manual); la insignia lleva su propio fondo verde. No se recolorea ni se estira
 * (docs/marca/MANUAL-DE-MARCA.md §2).
 * - `horizontal`: insignia + texto, para cabeceras.
 * - `vertical`: insignia sobre el texto, para pantallas de acceso.
 */
const VARIANTES = {
  horizontal: { archivo: 'logo-horizontal', ancho: 308, alto: 64 },
  vertical: { archivo: 'logo-vertical', ancho: 231, alto: 118 },
} as const;

export function Logo({
  variante = 'horizontal',
  className,
}: {
  variante?: keyof typeof VARIANTES;
  className?: string;
}) {
  const { archivo, ancho, alto } = VARIANTES[variante];
  const comun = { width: ancho, height: alto, unoptimized: true, priority: true } as const;
  return (
    <>
      <Image
        {...comun}
        src={`/marca/${archivo}-claro.svg`}
        alt="Cancha Nica"
        className={cn('h-auto dark:hidden', className)}
      />
      <Image
        {...comun}
        src={`/marca/${archivo}-oscuro.svg`}
        alt="Cancha Nica"
        className={cn('hidden h-auto dark:block', className)}
      />
    </>
  );
}
