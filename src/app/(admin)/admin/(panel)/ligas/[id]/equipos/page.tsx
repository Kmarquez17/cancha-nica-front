import type { Metadata } from 'next';
import { EquiposLiga } from '@/features/equipos/components/equipos-liga';

export const metadata: Metadata = { title: 'Equipos de la liga' };

export default async function EquiposLigaPage({ params }: PageProps<'/admin/ligas/[id]/equipos'>) {
  const { id } = await params;
  return <EquiposLiga edicionId={id} />;
}
