'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import type { LigaValues } from '../lib/edicion-form';

type Props = { register: UseFormRegister<LigaValues>; errors: FieldErrors<LigaValues> };

type ClaveNumero = {
  [K in keyof LigaValues]: LigaValues[K] extends number | null ? K : never;
}[keyof LigaValues];

/** Campo numérico; con `nulo`, vacío = sin valor. */
function Numero({
  id,
  etiqueta,
  ayuda,
  register,
  errors,
  nombre,
  nulo,
}: Props & { id: string; etiqueta: string; ayuda?: string; nombre: ClaveNumero; nulo?: boolean }) {
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

type ClaveImporte =
  | 'multaAmarilla'
  | 'multaRoja'
  | 'woMulta'
  | 'inferioridadMulta'
  | 'costoInscripcion'
  | 'costoArbitraje';

function Importe({
  id,
  etiqueta,
  ayuda,
  register,
  errors,
  nombre,
}: Props & { id: string; etiqueta: string; ayuda?: string; nombre: ClaveImporte }) {
  return (
    <Campo id={id} etiqueta={etiqueta} ayuda={ayuda} error={errors[nombre]?.message}>
      <Input id={id} inputMode="decimal" aria-invalid={!!errors[nombre]} {...register(nombre)} />
    </Campo>
  );
}

function Casilla({
  id,
  texto,
  register,
  nombre,
  error,
}: Pick<Props, 'register'> & {
  id: string;
  texto: string;
  nombre: { [K in keyof LigaValues]: LigaValues[K] extends boolean ? K : never }[keyof LigaValues];
  error?: string;
}) {
  return (
    <div className="grid content-start gap-1">
      <label htmlFor={id} className="flex items-center gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          className="size-4 accent-primary"
          {...register(nombre as never)}
        />
        {texto}
      </label>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ReglasCampos({
  register,
  errors,
  registraFaltas,
}: Props & { registraFaltas: boolean }) {
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

      <div className="sm:col-span-2">
        <Casilla
          id="r-faltas"
          texto="Registrar faltas en la mesa"
          register={register}
          nombre="registraFaltas"
        />
      </div>
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
      <div className="pt-6">
        <Casilla
          id="r-cancela"
          texto="Un gol del rival termina la inferioridad"
          register={register}
          nombre="cancelaPorGolRival"
          error={errors.cancelaPorGolRival?.message}
        />
      </div>
    </div>
  );
}

/** Tarjetas, suspensiones, W.O. y multas (PLAN_BACKEND 4.12). */
export function SancionesCampos({ register, errors }: Props) {
  const p = { register, errors };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Numero
        id="s-roja"
        etiqueta="Fechas de suspensión por roja directa"
        nombre="rojaDirectaFechas"
        {...p}
      />
      <Numero
        id="s-doble"
        etiqueta="Fechas por doble amarilla en un partido"
        nombre="dobleAmarillaFechas"
        {...p}
      />
      <Numero
        id="s-acum"
        etiqueta="Amarillas acumuladas para una fecha"
        ayuda="Al llegar a este número se suspende una fecha y el conteo vuelve a cero."
        nombre="amarillasAcumuladasParaFecha"
        {...p}
      />
      <Campo
        id="s-elim"
        etiqueta="Amarillas en eliminatorias"
        error={errors.conteoAmarillasEnEliminatorias?.message}
      >
        <Select id="s-elim" {...register('conteoAmarillasEnEliminatorias')}>
          <option value="MANTIENE">Siguen contando</option>
          <option value="REINICIA">Se reinician al empezar</option>
        </Select>
      </Campo>
      <Importe id="s-multa-am" etiqueta="Multa por amarilla" {...p} nombre="multaAmarilla" />
      <Importe id="s-multa-roja" etiqueta="Multa por roja" {...p} nombre="multaRoja" />
      <div className="sm:col-span-2">
        <Casilla
          id="s-bloquea"
          texto="Un jugador con multa sin pagar no puede jugar"
          register={register}
          nombre="multaBloqueaConvocatoria"
        />
      </div>

      <Numero
        id="s-wo-goles"
        etiqueta="Goles que se dan al ganador por W.O."
        ayuda="El marcador del W.O. es este número a 0."
        nombre="woGoles"
        {...p}
      />
      <Importe
        id="s-wo-multa"
        etiqueta="Multa al equipo que no se presenta"
        {...p}
        nombre="woMulta"
      />
      <Numero
        id="s-wo-excl"
        etiqueta="W.O. para sacar al equipo de la liga"
        ayuda="Déjalo vacío para no excluir a nadie automáticamente."
        nombre="woExclusionTrasN"
        nulo
        {...p}
      />
      <Importe
        id="s-inferioridad"
        etiqueta="Multa por quedarse sin jugadores suficientes"
        {...p}
        nombre="inferioridadMulta"
      />
    </div>
  );
}

/** Costos y bloqueo por deuda (PLAN_BACKEND H15). */
export function DineroCampos({
  register,
  errors,
  costosEditables,
  reglasEditables,
}: Props & { costosEditables: boolean; reglasEditables: boolean }) {
  const p = { register, errors };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <fieldset className="contents" disabled={!costosEditables}>
        <Importe
          id="d-inscripcion"
          etiqueta="Costo de inscripción por equipo"
          ayuda={
            !costosEditables
              ? undefined
              : 'Un cambio aplica solo a los cargos que se creen después.'
          }
          {...p}
          nombre="costoInscripcion"
        />
        <Importe
          id="d-arbitraje"
          etiqueta="Costo de arbitraje por equipo y partido"
          {...p}
          nombre="costoArbitraje"
        />
      </fieldset>
      <fieldset className="grid gap-2 sm:col-span-2" disabled={!reglasEditables}>
        <legend className="sr-only">Bloqueo por deuda</legend>
        <Casilla
          id="d-bloq-ins"
          texto="No dejar jugar al equipo con deuda de inscripción"
          register={register}
          nombre="bloquearDeudaInscripcion"
        />
        <Casilla
          id="d-bloq-arb"
          texto="No dejar jugar al equipo con deuda de arbitraje"
          register={register}
          nombre="bloquearDeudaArbitraje"
        />
        <p className="text-xs text-muted-foreground">
          Si no marcas estas opciones, la mesa solo recibe un aviso antes del partido.
        </p>
      </fieldset>
    </div>
  );
}

/** Edad de los jugadores de esta liga: se copia de la categoría y se puede ajustar. */
export function EdadesCampos({ register, errors }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo
        id="e-edad-min"
        etiqueta="Edad mínima"
        ayuda="De 5 a 80 años. Vacía = sin límite."
        error={errors.edadMinima?.message}
      >
        <Input
          id="e-edad-min"
          inputMode="numeric"
          aria-invalid={!!errors.edadMinima}
          {...register('edadMinima')}
        />
      </Campo>
      <Campo id="e-edad-max" etiqueta="Edad máxima" error={errors.edadMaxima?.message}>
        <Input
          id="e-edad-max"
          inputMode="numeric"
          aria-invalid={!!errors.edadMaxima}
          {...register('edadMaxima')}
        />
      </Campo>
    </div>
  );
}

/** Arranque de la liga y eliminatorias. */
export function ArranqueCampos({ register, errors }: Props) {
  const p = { register, errors };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Numero
        id="a-min-equipos"
        etiqueta="Equipos mínimos para empezar"
        ayuda="Entre 2 y 64."
        nombre="minEquiposArranque"
        {...p}
      />
      <Numero
        id="a-max-equipos"
        etiqueta="Equipos distintos por jugador"
        ayuda="Máximo de equipos en los que puede jugar una persona (1 a 10)."
        nombre="maxEquiposPorJugador"
        {...p}
      />
      <Campo
        id="a-playoff"
        etiqueta="Clasificados a eliminatorias"
        error={errors.clasificadosPlayoff?.message}
      >
        <Select id="a-playoff" {...register('clasificadosPlayoff')}>
          <option value="">Sin eliminatorias</option>
          <option value="4">Los 4 mejores</option>
          <option value="8">Los 8 mejores</option>
          <option value="16">Los 16 mejores</option>
        </Select>
      </Campo>
      <div className="pt-6">
        <Casilla
          id="a-tercer"
          texto="Jugar partido por el tercer puesto"
          register={register}
          nombre="tercerPuesto"
        />
      </div>
    </div>
  );
}
