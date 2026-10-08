import type { Metadata } from 'next';
import { MesaInicio } from '@/features/mesas/components/mesa-inicio';

export const metadata: Metadata = { title: 'Mesa', robots: { index: false } };

export default function MesaPage() {
  return <MesaInicio />;
}
