import type { Metadata } from 'next';
import { LigaDetalle } from '@/features/plataforma/components/liga-detalle';

export const metadata: Metadata = { title: 'Liga · Plataforma' };

export default async function LigaPage({
  params,
  searchParams,
}: PageProps<'/plataforma/ligas/[id]'>) {
  const { id } = await params;
  const { invitacion } = await searchParams;
  return <LigaDetalle id={id} invitacionFallida={invitacion === 'fallida'} />;
}
