import type { Metadata } from 'next';
import { ConfiguracionCliente } from '@/features/configuracion/components/configuracion-cliente';

export const metadata: Metadata = { title: 'Configuración del cliente' };

export default function ConfiguracionPage() {
  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">Configuración del cliente</h1>
      <ConfiguracionCliente />
    </section>
  );
}
