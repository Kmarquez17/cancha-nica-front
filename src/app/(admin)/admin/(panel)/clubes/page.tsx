import type { Metadata } from 'next';
import { ClubesLista } from '@/features/clubes/components/clubes-lista';

export const metadata: Metadata = { title: 'Clubes' };

export default function ClubesPage() {
  return <ClubesLista />;
}
