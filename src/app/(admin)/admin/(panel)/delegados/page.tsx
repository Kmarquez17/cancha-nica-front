import type { Metadata } from 'next';
import { DelegadosLista } from '@/features/delegados/components/delegados-lista';

export const metadata: Metadata = { title: 'Delegados' };

export default function DelegadosPage() {
  return <DelegadosLista />;
}
