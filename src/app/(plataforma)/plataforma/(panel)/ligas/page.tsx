import type { Metadata } from 'next';
import { LigasLista } from '@/features/plataforma/components/ligas-lista';

export const metadata: Metadata = { title: 'Ligas · Plataforma' };

export default function LigasPage() {
  return <LigasLista />;
}
