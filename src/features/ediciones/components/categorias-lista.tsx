'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { campoDeError, mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import type { CategoriaDto } from '@/shared/api/generated/models';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import {
  useActualizarCategoria,
  useArchivarCategoria,
  useCategorias,
  useCrearCategoria,
  useRestaurarCategoria,
} from '../api';

/** Edad opcional entre 5 y 80 (límites del contrato); vacío = sin límite. */
const edad = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || (/^\d{1,2}$/.test(v) && Number(v) >= 5 && Number(v) <= 80),
    'Escribe una edad entre 5 y 80, o déjala vacía.',
  );

const categoriaSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, 'Escribe el nombre (mínimo 2 letras).')
      .max(60, 'Máximo 60 caracteres.'),
    edadMinima: edad,
    edadMaxima: edad,
  })
  .refine(
    (v) =>
      v.edadMinima === '' || v.edadMaxima === '' || Number(v.edadMinima) <= Number(v.edadMaxima),
    { path: ['edadMinima'], message: 'La edad mínima no puede ser mayor que la máxima.' },
  );
type CategoriaValues = z.infer<typeof categoriaSchema>;

export function textoEdades(c: Pick<CategoriaDto, 'edadMinima' | 'edadMaxima'>): string {
  if (c.edadMinima === null && c.edadMaxima === null) return 'Sin límite de edad';
  if (c.edadMinima !== null && c.edadMaxima !== null)
    return `${c.edadMinima} a ${c.edadMaxima} años`;
  return c.edadMinima !== null ? `Desde ${c.edadMinima} años` : `Hasta ${c.edadMaxima} años`;
}

const textoLigas = (n: number) => (n === 0 ? 'Sin ligas' : n === 1 ? 'En 1 liga' : `En ${n} ligas`);

export function CategoriasLista() {
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [editando, setEditando] = useState<CategoriaDto | 'nueva' | null>(null);
  const { data, isLoading, error } = useCategorias(verArchivadas);
  const archivar = useArchivarCategoria();
  const restaurar = useRestaurarCategoria();
  const pendiente = archivar.isPending || restaurar.isPending;

  async function cambiarArchivo(c: CategoriaDto) {
    try {
      if (c.activa) await archivar.mutateAsync({ id: c.id });
      else await restaurar.mutateAsync({ id: c.id });
      toast.success(c.activa ? 'Categoría archivada.' : 'Categoría restaurada.');
    } catch (e) {
      toast.error(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl">Categorías</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            El catálogo de tu cliente (Libre, Sub-18…). Cada liga elige una y hereda su rango de
            edad. Una categoría no se borra: se archiva.
          </p>
        </div>
        <Button onClick={() => setEditando('nueva')}>
          <Plus data-icon="inline-start" />
          Nueva categoría
        </Button>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={verArchivadas}
          onChange={(e) => setVerArchivadas(e.target.checked)}
          className="size-4 accent-primary"
        />
        Mostrar archivadas
      </label>

      {error ? (
        <AlertaError>
          {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
        </AlertaError>
      ) : null}
      {isLoading ? <p role="status">Cargando categorías…</p> : null}

      {data && data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no tienes categorías. Crea la primera para poder armar una liga.
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <ul className="grid gap-2">
          {data.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3"
            >
              <div className="grid gap-0.5">
                <p className="font-semibold">
                  {c.nombre}
                  {!c.activa ? (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                      Archivada
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {textoEdades(c)} · {textoLigas(c.ediciones)} · registrada por {c.creadoPor.nombre}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditando(c)}
                  disabled={!c.activa}
                >
                  <Pencil data-icon="inline-start" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cambiarArchivo(c)}
                  disabled={pendiente}
                >
                  {c.activa ? (
                    <Archive data-icon="inline-start" />
                  ) : (
                    <ArchiveRestore data-icon="inline-start" />
                  )}
                  {c.activa ? 'Archivar' : 'Restaurar'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={editando !== null} onOpenChange={(abierto) => !abierto && setEditando(null)}>
        <DialogContent>
          {editando !== null ? (
            <FormularioCategoria
              key={editando === 'nueva' ? 'nueva' : editando.id}
              categoria={editando === 'nueva' ? null : editando}
              onListo={() => setEditando(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function FormularioCategoria({
  categoria,
  onListo,
}: {
  categoria: CategoriaDto | null;
  onListo: () => void;
}) {
  const crear = useCrearCategoria();
  const actualizar = useActualizarCategoria();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setCampo,
    formState: { errors, isSubmitting },
  } = useForm<CategoriaValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: categoria?.nombre ?? '',
      edadMinima: categoria?.edadMinima?.toString() ?? '',
      edadMaxima: categoria?.edadMaxima?.toString() ?? '',
    },
  });

  async function onSubmit(v: CategoriaValues) {
    setError(null);
    // En el PATCH, `null` borra el límite y omitirlo lo deja como estaba: aquí siempre se envía el valor.
    const data = {
      nombre: v.nombre.trim(),
      edadMinima: v.edadMinima === '' ? null : Number(v.edadMinima),
      edadMaxima: v.edadMaxima === '' ? null : Number(v.edadMaxima),
    };
    try {
      if (categoria) await actualizar.mutateAsync({ id: categoria.id, data });
      else await crear.mutateAsync({ data });
      toast.success(categoria ? 'Categoría actualizada.' : 'Categoría creada.');
      onListo();
    } catch (e) {
      if (!(e instanceof ApiError)) return setError(mensajeGenerico());
      if (campoDeError(e) === 'nombre') setCampo('nombre', { message: mensajeDeError(e) });
      else
        setError(
          e.errors?.length ? `${mensajeDeError(e)} ${e.errors.join(' ')}` : mensajeDeError(e),
        );
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{categoria ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        <DialogDescription>
          Las edades (de 5 a 80) son opcionales. Cada liga las copia al crearse y puede ajustarlas;
          cambiarlas aquí no toca las ligas que ya existen.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <Campo id="cat-nombre" etiqueta="Nombre" error={errors.nombre?.message}>
          <Input
            id="cat-nombre"
            autoComplete="off"
            aria-invalid={!!errors.nombre}
            {...register('nombre')}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo id="cat-min" etiqueta="Edad mínima" error={errors.edadMinima?.message}>
            <Input
              id="cat-min"
              inputMode="numeric"
              aria-invalid={!!errors.edadMinima}
              {...register('edadMinima')}
            />
          </Campo>
          <Campo id="cat-max" etiqueta="Edad máxima" error={errors.edadMaxima?.message}>
            <Input
              id="cat-max"
              inputMode="numeric"
              aria-invalid={!!errors.edadMaxima}
              {...register('edadMaxima')}
            />
          </Campo>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>
    </>
  );
}
