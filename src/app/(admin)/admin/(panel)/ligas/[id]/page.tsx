import type { Metadata } from 'next';
import { LigaDetalle } from '@/features/ediciones/components/liga-detalle';

export const metadata: Metadata = { title: 'Liga' };

export default async function LigaPage({ params }: PageProps<'/admin/ligas/[id]'>) {
  const { id } = await params;
  return <LigaDetalle id={id} />;
}
