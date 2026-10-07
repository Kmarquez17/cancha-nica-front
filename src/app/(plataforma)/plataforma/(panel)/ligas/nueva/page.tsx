import type { Metadata } from 'next';
import { NuevaLigaForm } from '@/features/plataforma/components/nueva-liga-form';

export const metadata: Metadata = { title: 'Nueva liga · Plataforma' };

export default function NuevaLigaPage() {
  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">Nueva liga</h1>
      <NuevaLigaForm />
    </section>
  );
}
