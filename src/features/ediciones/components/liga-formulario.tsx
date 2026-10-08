'use client';

import { useState } from 'react';
import { useForm, useWatch, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import {
  camposEditables,
  formAReglas,
  presetAForm,
  reglasAForm,
  refinarReglas,
  reglasObjeto,
  type ReglasForm,
} from '../lib/reglas';
import { MODALIDAD_TEXTO } from '../lib/textos';
import {
  MODALIDADES,
  type ActualizarEdicionBody,
  type CategoriaDto,
  type CrearEdicionBody,
  type EdicionDto,
  type Modalidad,
} from '../tipos';

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige una fecha.');

const ligaSchema = reglasObjeto
  .extend({
    nombre: z
      .string()
      .trim()
      .min(3, 'Escribe el nombre (mínimo 3 letras).')
      .max(80, 'Máximo 80 caracteres.'),
    categoriaId: z.string().min(1, 'Elige una categoría.'),
    modalidad: z.enum(MODALIDADES),
    fechaInicio: fecha,
    fechaFinEstimada: z
      .string()
      .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Elige una fecha.'),
    slug: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v),
        'Solo minúsculas, números y guiones.',
      ),
  })
  .superRefine((v, ctx) => {
    refinarReglas(v, ctx);
    if (v.fechaFinEstimada !== '' && v.fechaFinEstimada < v.fechaInicio)
      ctx.addIssue({
        code: 'custom',
        path: ['fechaFinEstimada'],
        message: 'No puede ser anterior al inicio.',
      });
  });
export type LigaValues = z.infer<typeof ligaSchema>;

type Props =
  | {
      modo: 'crear';
      categorias: CategoriaDto[];
      onGuardar: (body: CrearEdicionBody) => Promise<void>;
    }
  | {
      modo: 'editar';
      edicion: EdicionDto;
      categorias: CategoriaDto[];
      onGuardar: (body: ActualizarEdicionBody) => Promise<void>;
    };

const hoy = () => new Date().toISOString().slice(0, 10);

export function LigaFormulario(props: Props) {
  const edicion = props.modo === 'editar' ? props.edicion : null;
  const editables = edicion ? camposEditables(edicion.estado) : null;
  const puede = (c: Parameters<NonNullable<typeof editables>['has']>[0]) =>
    editables ? editables.has(c) : true;
  const [error, setError] = useState<{ mensaje: string; detalles?: string[] } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const inicial: Modalidad = edicion?.modalidad ?? 'FUTSAL';
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<LigaValues>({
    resolver: zodResolver(ligaSchema),
    defaultValues: {
      nombre: edicion?.nombre ?? '',
      categoriaId: edicion?.categoria.id ?? '',
      modalidad: inicial,
      fechaInicio: edicion?.fechaInicio ?? hoy(),
      fechaFinEstimada: edicion?.fechaFinEstimada ?? '',
      slug: edicion?.slug ?? '',
      ...(edicion ? reglasAForm(edicion.reglasModalidad, edicion) : presetAForm(inicial)),
    },
  });

  const registraFaltas = useWatch({ control, name: 'registraFaltas' });
  const modalidad = useWatch({ control, name: 'modalidad' });
  const modalidadReg = register('modalidad');
  const soloLectura = editables !== null && editables.size === 0;

  function cargarPreset(m: Modalidad) {
    for (const [k, v] of Object.entries(presetAForm(m)))
      setValue(k as keyof ReglasForm, v as never, { shouldDirty: true, shouldValidate: true });
    setAviso(`Cargamos las reglas de ${MODALIDAD_TEXTO[m]}. Puedes ajustarlas antes de guardar.`);
  }

  async function onSubmit(v: LigaValues) {
    setError(null);
    const { reglas, parametros } = formAReglas(v);
    try {
      if (props.modo === 'crear') {
        await props.onGuardar({
          nombre: v.nombre.trim(),
          categoriaId: v.categoriaId,
          modalidad: v.modalidad,
          fechaInicio: v.fechaInicio,
          fechaFinEstimada: v.fechaFinEstimada || null,
          reglasModalidad: reglas,
          ...parametros,
        });
      } else {
        const cambios: ActualizarEdicionBody = {};
        if (puede('nombre')) cambios.nombre = v.nombre.trim();
        if (puede('slug') && v.slug && v.slug !== edicion!.slug) cambios.slug = v.slug;
        if (puede('fechaInicio')) cambios.fechaInicio = v.fechaInicio;
        if (puede('fechaFinEstimada')) cambios.fechaFinEstimada = v.fechaFinEstimada || null;
        if (puede('modalidad') && v.modalidad !== edicion!.modalidad)
          cambios.modalidad = v.modalidad;
        if (puede('reglas')) Object.assign(cambios, { reglasModalidad: reglas, ...parametros });
        await props.onGuardar(cambios);
      }
    } catch (e) {
      if (!(e instanceof ApiError)) return setError({ mensaje: mensajeGenerico() });
      setError({ mensaje: mensajeDeError(e), detalles: e.errors });
    }
  }

  const bloqueado = (c: Parameters<typeof puede>[0]) => !puede(c) || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-3xl gap-8">
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
      {soloLectura ? (
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
              disabled={bloqueado('nombre')}
              aria-invalid={!!errors.nombre}
              {...register('nombre')}
            />
          </Campo>
        </div>

        <Campo
          id="liga-categoria"
          etiqueta="Categoría"
          error={errors.categoriaId?.message}
          ayuda={edicion ? 'La categoría no se puede cambiar.' : undefined}
        >
          <Select
            id="liga-categoria"
            disabled={props.modo === 'editar' || isSubmitting}
            aria-invalid={!!errors.categoriaId}
            {...register('categoriaId')}
          >
            <option value="">Elige una categoría</option>
            {props.categorias.map((c) => (
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
            disabled={bloqueado('modalidad')}
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
            disabled={bloqueado('fechaInicio')}
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
            disabled={bloqueado('fechaFinEstimada')}
            {...register('fechaFinEstimada')}
          />
        </Campo>

        {props.modo === 'editar' ? (
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
              <Input id="liga-slug" disabled={bloqueado('slug')} {...register('slug')} />
            </Campo>
          </div>
        ) : null}
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
        {!puede('reglas') && !soloLectura ? (
          <p className="text-sm text-muted-foreground">
            Con la liga en juego las reglas quedan congeladas. Solo se cambian el nombre y el fin
            estimado.
          </p>
        ) : null}
        <ReglasCampos register={register} errors={errors} registraFaltas={registraFaltas} />
      </fieldset>

      {!soloLectura ? (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting || (props.modo === 'editar' && !isDirty)}>
            {isSubmitting
              ? 'Guardando…'
              : props.modo === 'crear'
                ? 'Crear liga'
                : 'Guardar cambios'}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function Numero({
  id,
  etiqueta,
  ayuda,
  register,
  errors,
  nombre,
  nulo,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  register: UseFormRegister<LigaValues>;
  errors: FieldErrors<LigaValues>;
  nombre: keyof ReglasForm;
  nulo?: boolean;
}) {
  return (
    <Campo
      id={id}
      etiqueta={etiqueta}
      ayuda={ayuda}
      error={errors[nombre]?.message as string | undefined}
    >
      <Input
        id={id}
        inputMode="decimal"
        aria-invalid={!!errors[nombre]}
        {...register(nombre, {
          setValueAs: (v) => (nulo && (v === '' || v == null) ? null : Number(v)),
        })}
      />
    </Campo>
  );
}

function ReglasCampos({
  register,
  errors,
  registraFaltas,
}: {
  register: UseFormRegister<LigaValues>;
  errors: FieldErrors<LigaValues>;
  registraFaltas: boolean;
}) {
  const p = { register, errors };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo id="r-cancha" etiqueta="Jugadores en cancha" error={errors.jugadoresEnCancha?.message}>
        <Select id="r-cancha" {...register('jugadoresEnCancha', { valueAsNumber: true })}>
          <option value={5}>5</option>
          <option value={9}>9</option>
          <option value={11}>11</option>
        </Select>
      </Campo>
      <Campo id="r-reloj" etiqueta="Reloj" error={errors.relojModo?.message}>
        <Select id="r-reloj" {...register('relojModo')}>
          <option value="REGRESIVO">Cuenta regresiva</option>
          <option value="PROGRESIVO">Cuenta progresiva</option>
        </Select>
      </Campo>
      <Numero
        id="r-min-partido"
        etiqueta="Mínimo de jugadores para jugar"
        nombre="minJugadoresPartido"
        {...p}
      />
      <Numero
        id="r-convocados"
        etiqueta="Máximo de convocados por partido"
        nombre="maxConvocados"
        {...p}
      />
      <Numero id="r-roster-min" etiqueta="Plantel mínimo" nombre="rosterMin" {...p} />
      <Numero id="r-roster-max" etiqueta="Plantel máximo" nombre="rosterMax" {...p} />
      <Numero
        id="r-dur-reg"
        etiqueta="Minutos por tiempo (fase regular)"
        nombre="duracionTiempoRegular"
        {...p}
      />
      <Numero
        id="r-dur-elim"
        etiqueta="Minutos por tiempo (eliminatorias)"
        nombre="duracionTiempoEliminatoria"
        {...p}
      />

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="size-4 accent-primary" {...register('registraFaltas')} />
        Registrar faltas en la mesa
      </label>
      {registraFaltas ? (
        <>
          <Numero
            id="r-faltas-limite"
            etiqueta="Faltas acumuladas por equipo (tiro libre)"
            nombre="limiteFaltasAcumuladas"
            nulo
            {...p}
          />
          <Numero
            id="r-faltas-amarilla"
            etiqueta="Faltas personales para amarilla"
            nombre="faltasPersonalesParaAmarilla"
            nulo
            {...p}
          />
        </>
      ) : null}

      <Numero
        id="r-roja-min"
        etiqueta="Minutos con uno menos tras una roja"
        ayuda="Déjalo vacío si el equipo queda con uno menos hasta el final del partido."
        nombre="inferioridadMin"
        nulo
        {...p}
      />
      <div className="grid content-start gap-1.5">
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...register('cancelaPorGolRival')}
          />
          Un gol del rival termina la inferioridad
        </label>
        {errors.cancelaPorGolRival?.message ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.cancelaPorGolRival.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
