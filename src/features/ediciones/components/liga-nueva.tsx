'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { useCategorias, useCrearEdicion } from '../api';
import { aIso } from '../lib/fechas';
import { PRESETS } from '../lib/reglas';
import { MODALIDAD_TEXTO } from '../lib/textos';
import { MODALIDADES } from '../tipos';

const fecha = z
  .string()
  .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Elige una fecha.');

const schema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(3, 'Escribe el nombre (mínimo 3 letras).')
      .max(80, 'Máximo 80 caracteres.'),
    categoriaId: z.string().min(1, 'Elige una categoría.'),
    modalidad: z.enum(MODALIDADES),
    fechaInicio: fecha,
    fechaFinEstimada: fecha,
  })
  .refine((v) => !v.fechaInicio || !v.fechaFinEstimada || v.fechaFinEstimada >= v.fechaInicio, {
    path: ['fechaFinEstimada'],
    message: 'No puede ser anterior al inicio.',
  });
type Values = z.infer<typeof schema>;

/**
 * Crear una liga pide solo lo básico: el servidor carga el preset de la modalidad, las edades de la categoría y las
 * reglas por defecto. Las reglas se ajustan después en el detalle de la liga (mientras no haya arrancado).
 */
export function LigaNueva() {
  const router = useRouter();
  const { data: categorias, isLoading, error } = useCategorias(false);
  const crear = useCrearEdicion();
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      categoriaId: '',
      modalidad: 'FUTSAL',
      fechaInicio: '',
      fechaFinEstimada: '',
    },
  });
  const modalidad = useWatch({ control, name: 'modalidad' });
  const preset = PRESETS[modalidad];

  if (isLoading) return <p role="status">Cargando…</p>;
  if (error)
    return (
      <AlertaError>
        {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
      </AlertaError>
    );

  async function onSubmit(v: Values) {
    setErrorEnvio(null);
    try {
      const liga = await crear.mutateAsync({
        data: {
          nombre: v.nombre.trim(),
          categoriaId: v.categoriaId,
          modalidad: v.modalidad,
          ...(v.fechaInicio ? { fechaInicio: aIso(v.fechaInicio)! } : {}),
          ...(v.fechaFinEstimada ? { fechaFinEstimada: aIso(v.fechaFinEstimada)! } : {}),
        },
      });
      toast.success('Liga creada. Revisa sus reglas antes de abrir inscripciones.');
      router.push(`/admin/ligas/${liga.id}`);
    } catch (e) {
      setErrorEnvio(
        e instanceof ApiError
          ? e.errors?.length
            ? `${mensajeDeError(e)} ${e.errors.join(' ')}`
            : mensajeDeError(e)
          : mensajeGenerico(),
      );
    }
  }

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl">Nueva liga</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Elige la categoría y la modalidad: cargamos las reglas habituales y después puedes
          ajustarlas en el detalle de la liga.
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
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-3xl gap-6">
          {errorEnvio ? <AlertaError>{errorEnvio}</AlertaError> : null}
          <fieldset className="grid gap-4 sm:grid-cols-2" disabled={isSubmitting}>
            <legend className="mb-2 text-lg font-semibold">Datos de la liga</legend>
            <div className="sm:col-span-2">
              <Campo id="liga-nombre" etiqueta="Nombre" error={errors.nombre?.message}>
                <Input
                  id="liga-nombre"
                  autoComplete="off"
                  aria-invalid={!!errors.nombre}
                  {...register('nombre')}
                />
              </Campo>
            </div>
            <Campo id="liga-categoria" etiqueta="Categoría" error={errors.categoriaId?.message}>
              <Select
                id="liga-categoria"
                aria-invalid={!!errors.categoriaId}
                {...register('categoriaId')}
              >
                <option value="">Elige una categoría</option>
                {(categorias ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo id="liga-modalidad" etiqueta="Modalidad" error={errors.modalidad?.message}>
              <Select id="liga-modalidad" {...register('modalidad')}>
                {MODALIDADES.map((m) => (
                  <option key={m} value={m}>
                    {MODALIDAD_TEXTO[m]}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo
              id="liga-inicio"
              etiqueta="Fecha de inicio (opcional)"
              error={errors.fechaInicio?.message}
              ayuda="Define la edad de los jugadores. Se puede poner después, en configuración."
            >
              <Input id="liga-inicio" type="date" {...register('fechaInicio')} />
            </Campo>
            <Campo
              id="liga-fin"
              etiqueta="Fin estimado (opcional)"
              error={errors.fechaFinEstimada?.message}
              ayuda="Solo informativa."
            >
              <Input id="liga-fin" type="date" {...register('fechaFinEstimada')} />
            </Campo>
          </fieldset>

          <section
            aria-labelledby="preset"
            className="grid gap-2 rounded-lg border bg-muted/30 p-4"
          >
            <h2 id="preset" className="text-xl">
              Reglas de {MODALIDAD_TEXTO[modalidad]}
            </h2>
            <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
              <li>{preset.reglas.jugadoresEnCancha} jugadores en cancha</li>
              <li>
                Mínimo {preset.reglas.minJugadoresPartido} para jugar, hasta{' '}
                {preset.reglas.maxConvocados} convocados
              </li>
              <li>
                Plantel de {preset.parametros.rosterMin} a {preset.parametros.rosterMax} jugadores
              </li>
              <li>
                Tiempos de {preset.parametros.duracionTiempoRegular} min (eliminatorias{' '}
                {preset.parametros.duracionTiempoEliminatoria})
              </li>
              <li>
                {preset.reglas.registraFaltas
                  ? `Faltas: tiro libre desde la ${preset.parametros.limiteFaltasAcumuladas}.ª acumulada`
                  : 'No se registran faltas'}
              </li>
              <li>
                Reloj{' '}
                {preset.reglas.relojModo === 'REGRESIVO' ? 'en cuenta regresiva' : 'progresivo'}
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Son los valores iniciales. Podrás cambiarlos en el detalle de la liga hasta que
              empiece.
            </p>
          </section>

          <Button type="submit" className="w-fit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear liga'}
          </Button>
        </form>
      )}
    </section>
  );
}
