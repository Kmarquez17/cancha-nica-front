'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError } from '@/shared/ui/campo';
import { useCategorias, useCrearEdicion } from '../api';
import { LigaFormulario } from './liga-formulario';

export function LigaNueva() {
  const router = useRouter();
  const { data: categorias, isLoading, error } = useCategorias(false);
  const crear = useCrearEdicion();

  if (isLoading) return <p role="status">Cargando…</p>;
  if (error)
    return (
      <AlertaError>
        {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
      </AlertaError>
    );

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl">Nueva liga</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Elige la categoría y la modalidad: cargamos las reglas habituales y puedes ajustarlas
          mientras la liga no haya empezado.
        </p>
      </div>

      {categorias && categorias.length === 0 ? (
        <div className="grid max-w-prose gap-3 rounded-lg border border-dashed p-6">
          <p className="text-sm">Primero necesitas al menos una categoría (por ejemplo «Libre»).</p>
          <Button asChild className="w-fit">
            <Link href="/admin/categorias">Crear una categoría</Link>
          </Button>
        </div>
      ) : (
        <LigaFormulario
          modo="crear"
          categorias={categorias ?? []}
          onGuardar={async (body) => {
            const liga = await crear.mutateAsync(body);
            toast.success('Liga creada.');
            router.push(`/admin/ligas/${liga.id}`);
          }}
        />
      )}
    </section>
  );
}
