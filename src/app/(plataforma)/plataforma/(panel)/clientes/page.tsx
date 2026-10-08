import type { Metadata } from 'next';
import { ClientesLista } from '@/features/plataforma/components/clientes-lista';

export const metadata: Metadata = { title: 'Clientes · Plataforma' };

export default function ClientesPage() {
  return <ClientesLista />;
}
