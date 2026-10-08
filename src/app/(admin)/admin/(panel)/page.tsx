import type { Metadata } from 'next';
import { AdminInicio } from '@/features/ediciones/components/admin-inicio';

export const metadata: Metadata = { title: 'Inicio' };

export default function AdminInicioPage() {
  return <AdminInicio />;
}
