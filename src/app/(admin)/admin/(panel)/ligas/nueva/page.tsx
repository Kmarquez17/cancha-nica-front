import type { Metadata } from 'next';
import { LigaNueva } from '@/features/ediciones/components/liga-nueva';

export const metadata: Metadata = { title: 'Nueva liga' };

export default function NuevaLigaPage() {
  return <LigaNueva />;
}
