import type { Metadata } from 'next';
import { DelegadoInicio } from '@/features/delegados/components/delegado-inicio';

export const metadata: Metadata = { title: 'Delegado', robots: { index: false } };

export default function DelegadoPage() {
  return <DelegadoInicio />;
}
