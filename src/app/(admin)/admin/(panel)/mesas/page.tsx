import type { Metadata } from 'next';
import { MesasLista } from '@/features/mesas/components/mesas-lista';

export const metadata: Metadata = { title: 'Mesas' };

export default function MesasPage() {
  return <MesasLista />;
}
