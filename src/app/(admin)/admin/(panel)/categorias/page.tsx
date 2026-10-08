import type { Metadata } from 'next';
import { CategoriasLista } from '@/features/ediciones/components/categorias-lista';

export const metadata: Metadata = { title: 'Categorías' };

export default function CategoriasPage() {
  return <CategoriasLista />;
}
