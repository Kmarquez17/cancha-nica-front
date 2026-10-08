import type { Metadata } from 'next';
import { NuevoClienteForm } from '@/features/plataforma/components/nuevo-cliente-form';

export const metadata: Metadata = { title: 'Nuevo cliente · Plataforma' };

export default function NuevoClientePage() {
  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
      <NuevoClienteForm />
    </section>
  );
}
