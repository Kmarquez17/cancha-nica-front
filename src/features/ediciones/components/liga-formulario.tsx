'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import type { ActualizarEdicionDto, CategoriaDto, EdicionDto } from '@/shared/api/generated/models';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import {
  cambiosDeEdicion,
  edicionAForm,
  ligaSchema,
  puedeEditar,
  type LigaValues,
} from '../lib/edicion-form';
import { camposBloqueadosDe, erroresReglasDe } from '../lib/errores';
import { presetAForm, type ReglasForm } from '../lib/reglas';
import { MODALIDAD_TEXTO } from '../lib/textos';
import { MODALIDADES, type Modalidad } from '../tipos';
import {
  ArranqueCampos,
  DineroCampos,
  EdadesCampos,
  ReglasCampos,
  SancionesCampos,
} from './liga-campos';

export type { LigaValues } from '../lib/edicion-form';

/** `campo` de un error de regla (`roja.cancelaPorGolRival`) -> nombre del campo del formulario. */
const CAMPO_DE_REGLA: Record<string, keyof LigaValues> = {
  'roja.cancelaPorGolRival': 'cancelaPorGolRival',
  'roja.inferioridadMs': 'inferioridadMin',
};
const campoDeRegla = (campo: string) => (CAMPO_DE_REGLA[campo] ?? campo) as keyof LigaValues;

type Props = {
  edicion: EdicionDto;
  categorias: CategoriaDto[];
  /** Guarda los cambios y devuelve la liga ya actualizada. */
  onGuardar: (cambios: ActualizarEdicionDto) => Promise<EdicionDto>;
};

/**
 * Edición de una liga. Qué campos se pueden tocar lo dice la API (`camposEditables`): aquí no se duplica la regla.
 * Solo se envía lo que cambió, porque el servidor es «todo o nada» ante un campo bloqueado.
 */
export function LigaFormulario({ edicion, categorias, onGuardar }: Props) {
  const puede = (g: Parameters<typeof puedeEditar>[1]) =>
    !edicion.archivadaEn && puedeEditar(edicion, g);
  const [base, setBase] = useState(() => edicionAForm(edicion));
  const [error, setError] = useState<{ mensaje: string; detalles?: string[] } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError: setCampo,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<LigaValues>({ resolver: zodResolver(ligaSchema), defaultValues: base });

  const registraFaltas = useWatch({ control, name: 'registraFaltas' });
  const modalidad = useWatch({ control, name: 'modalidad' });
  const modalidadReg = register('modalidad');
  const nadaEditable = edicion.camposEditables.length === 0;

  function cargarPreset(m: Modalidad) {
    for (const [k, v] of Object.entries(presetAForm(m)))
      setValue(k as keyof ReglasForm, v as never, { shouldDirty: true, shouldValidate: true });
    setAviso(
      `Cargamos las reglas de ${MODALIDAD_TEXTO[m]}. Reemplazan los ajustes de reglas que habías hecho; puedes volver a ajustarlas antes de guardar.`,
    );
  }

  async function onSubmit(v: LigaValues) {
    setError(null);
    const cambios = cambiosDeEdicion(base, v);
    if (Object.keys(cambios).length === 0) return;
    try {
      const nueva = await onGuardar(cambios);
      const valores = edicionAForm(nueva);
      setBase(valores);
      reset(valores);
      setAviso(null);
    } catch (e) {
      if (!(e instanceof ApiError)) return setError({ mensaje: mensajeGenerico() });
      const reglas = erroresReglasDe(e);
      for (const r of reglas) setCampo(campoDeRegla(r.campo), { message: r.mensaje });
      const bloqueados = camposBloqueadosDe(e).map((c) => c.campo);
      setError({
        mensaje: mensajeDeError(e),
        detalles: [
          ...(e.errors ?? []),
          ...reglas.map((r) => r.mensaje),
          ...(bloqueados.length
            ? [`Campos que ya no se pueden cambiar: ${bloqueados.join(', ')}.`]
            : []),
        ],
      });
    }
  }

  const deshabilitado = (g: Parameters<typeof puedeEditar>[1]) => !puede(g) || isSubmitting;
  const categoriasElegibles = categorias.filter((c) => c.activa || c.id === edicion.categoria.id);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Configuración de la liga"
      className="grid max-w-3xl gap-8"
    >
      {error ? (
        <AlertaError>
          {error.mensaje}
          {error.detalles?.length ? (
            <ul className="mt-1 list-disc pl-5">
              {error.detalles.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
        </AlertaError>
      ) : null}
      {edicion.archivadaEn ? (
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          Esta liga está archivada. Restáurala para poder cambiar algo.
        </p>
      ) : nadaEditable ? (
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          Esta liga está finalizada y ya no se puede cambiar nada.
        </p>
      ) : null}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Datos de la liga</legend>
        <div className="sm:col-span-2">
          <Campo id="liga-nombre" etiqueta="Nombre" error={errors.nombre?.message}>
            <Input
              id="liga-nombre"
              autoComplete="off"
              disabled={deshabilitado('nombre')}
              aria-invalid={!!errors.nombre}
              {...register('nombre')}
            />
          </Campo>
        </div>

        <Campo
          id="liga-categoria"
          etiqueta="Categoría"
          error={errors.categoriaId?.message}
          ayuda={
            !puede('categoria')
              ? 'Solo se cambia mientras la liga está en configuración.'
              : undefined
          }
        >
          <Select
            id="liga-categoria"
            disabled={deshabilitado('categoria')}
            aria-invalid={!!errors.categoriaId}
            {...register('categoriaId')}
          >
            {categoriasElegibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo
          id="liga-modalidad"
          etiqueta="Modalidad"
          error={errors.modalidad?.message}
          ayuda={!puede('modalidad') ? 'Ya no se puede cambiar en este estado.' : undefined}
        >
          <Select
            id="liga-modalidad"
            disabled={deshabilitado('modalidad')}
            {...modalidadReg}
            onChange={(e) => {
              modalidadReg.onChange(e);
              cargarPreset(e.target.value as Modalidad);
            }}
          >
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>
                {MODALIDAD_TEXTO[m]}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo
          id="liga-inicio"
          etiqueta="Fecha de inicio"
          error={errors.fechaInicio?.message}
          ayuda="Define la edad de los jugadores. Solo se cambia mientras la liga está en configuración."
        >
          <Input
            id="liga-inicio"
            type="date"
            disabled={deshabilitado('fechaInicio')}
            {...register('fechaInicio')}
          />
        </Campo>
        <Campo
          id="liga-fin"
          etiqueta="Fin estimado (opcional)"
          error={errors.fechaFinEstimada?.message}
          ayuda="Solo informativa."
        >
          <Input
            id="liga-fin"
            type="date"
            disabled={deshabilitado('fechaFin')}
            {...register('fechaFinEstimada')}
          />
        </Campo>

        <div className="sm:col-span-2">
          <Campo
            id="liga-slug"
            etiqueta="Dirección pública (slug)"
            error={errors.slug?.message}
            ayuda={
              puede('slug')
                ? 'Va en el enlace público de la liga. Después de abrir inscripciones queda fijo.'
                : 'Quedó fijo al abrir inscripciones.'
            }
          >
            <Input id="liga-slug" disabled={deshabilitado('slug')} {...register('slug')} />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="grid gap-4" disabled={!puede('edades') || isSubmitting}>
        <legend className="mb-2 text-lg font-semibold">Edad de los jugadores</legend>
        <EdadesCampos register={register} errors={errors} />
      </fieldset>

      <fieldset className="grid gap-4" disabled={!puede('reglas') || isSubmitting}>
        <legend className="mb-2 text-lg font-semibold">
          Reglas de {MODALIDAD_TEXTO[modalidad]}
        </legend>
        {aviso ? (
          <p role="status" className="text-sm text-muted-foreground">
            {aviso}
          </p>
        ) : null}
        {!puede('reglas') && !edicion.archivadaEn && !nadaEditable ? (
          <p className="text-sm text-muted-foreground">
            Con la liga en juego las reglas quedan congeladas. Solo se cambian el nombre, el fin
            estimado y los costos.
          </p>
        ) : null}
        <ReglasCampos register={register} errors={errors} registraFaltas={registraFaltas} />
      </fieldset>

      <fieldset className="grid gap-4" disabled={!puede('arranque') || isSubmitting}>
        <legend className="mb-2 text-lg font-semibold">Arranque y eliminatorias</legend>
        <ArranqueCampos register={register} errors={errors} />
      </fieldset>

      <fieldset className="grid gap-4" disabled={!puede('sanciones') || isSubmitting}>
        <legend className="mb-2 text-lg font-semibold">Sanciones y multas</legend>
        <p className="text-sm text-muted-foreground">
          Valores habituales ya cargados. Hoy solo se guardan: se aplicarán al cerrar cada acta
          (llega en próximas fases). Se ajustan hasta que la liga empiece.
        </p>
        <SancionesCampos register={register} errors={errors} />
      </fieldset>

      <fieldset className="grid gap-4" disabled={isSubmitting}>
        <legend className="mb-2 text-lg font-semibold">Dinero</legend>
        <DineroCampos
          register={register}
          errors={errors}
          costosEditables={puede('costos')}
          reglasEditables={puede('finanzas')}
        />
      </fieldset>

      {!nadaEditable && !edicion.archivadaEn ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
