import type { Metadata } from 'next';
import { LigasLista } from '@/features/ediciones/components/ligas-lista';

export const metadata: Metadata = { title: 'Ligas' };

export default function LigasPage() {
  return <LigasLista />;
}
