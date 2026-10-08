import { cssTemaCliente, temaDeCliente } from '@/shared/lib/color-cliente';

/**
 * Pinta con el color del cliente los botones y acentos (--primary y relacionados). Sin `alcance` afecta a toda
 * la página mientras el componente esté montado, también a diálogos y avisos que se abren fuera del layout.
 * Si el color no es válido no hace nada y se queda la marca de Cancha Nica.
 */
export function TemaCliente({
  color,
  nivel = 'normal',
  alcance,
}: {
  color: string | null | undefined;
  nivel?: 'normal' | 'mesa';
  alcance?: string;
}) {
  const tema = temaDeCliente(color, nivel);
  if (!tema) return null;
  // El CSS solo contiene valores #RRGGBB validados por temaDeCliente.
  return <style dangerouslySetInnerHTML={{ __html: cssTemaCliente(tema, alcance) }} />;
}
