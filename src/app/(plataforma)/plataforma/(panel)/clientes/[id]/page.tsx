import type { Metadata } from 'next';
import { ClienteFicha } from '@/features/plataforma/components/cliente-ficha';

export const metadata: Metadata = { title: 'Cliente · Plataforma' };

export default async function ClientePage({
  params,
  searchParams,
}: PageProps<'/plataforma/clientes/[id]'>) {
  const { id } = await params;
  const { invitacion } = await searchParams;
  return <ClienteFicha id={id} invitacionFallida={invitacion === 'fallida'} />;
}
