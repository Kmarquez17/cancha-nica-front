'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { EstadoLiga } from '@/features/ediciones/components/estado-liga';
import { campoDeError, mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import type { EquipoDelegadoDto } from '@/shared/api/generated/models';
import { ApiError } from '@/shared/api/mutator';
import { PIN_VALIDO, pinDebil } from '@/shared/lib/pin';
import { cn } from '@/shared/lib/utils';
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
import { Logo } from '@/shared/ui/logo';
import { useCambiarPin, useDelegadoEdicion, useDelegadoLogout, useDelegadoMe } from '../api';

/** Inicio del delegado: un selector con sus equipos (uno por liga) y el cambio de su PIN. */
export function DelegadoInicio() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useDelegadoMe();
  const sesion = useDelegadoLogout();
  const [elegido, setElegido] = useState<string | null>(null);
  const [cambiandoPin, setCambiandoPin] = useState(false);

  // `me` dice 401 cuando el delegado fue desactivado o la sesión venció (y el refresh ya falló).
  const sesionPerdida = error instanceof ApiError && error.status === 401;
  useEffect(() => {
    if (sesionPerdida) router.replace('/delegado/login');
  }, [sesionPerdida, router]);

  async function cerrarSesion() {
    const slug = data?.organizacion.slug;
    try {
      await sesion.salir();
    } finally {
      router.replace(slug ? `/delegado/${slug}` : '/delegado/login');
    }
  }

  // Un equipo retirado se muestra marcado pero no se abre: nunca queda como el activo.
  const abribles = data?.equipos.filter((e) => !e.retirado) ?? [];
  const equipo = abribles.find((e) => e.id === elegido) ?? abribles[0];

  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-start gap-6 p-4">
      <header className="flex items-center justify-between gap-3">
        <Logo className="w-32" />
        <Button variant="outline" onClick={cerrarSesion} disabled={sesion.isPending}>
          Salir
        </Button>
      </header>

      {isLoading ? <p role="status">Cargando…</p> : null}
      {error && !sesionPerdida ? (
        <AlertaError>
          {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()} Vuelve a entrar
          con el enlace que te dio el organizador.
        </AlertaError>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">{data.organizacion.nombre}</p>
            <h1 className="text-3xl">{data.nombre}</h1>
          </div>

          {data.pinCambiadoEn === null ? (
            <div
              role="status"
              className="grid gap-2 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"
            >
              <p>
                <strong>Cambia tu PIN.</strong> El que te dieron es temporal: cámbialo por uno que
                solo tú conozcas. Puedes hacerlo cuando quieras.
              </p>
              <Button size="sm" className="w-fit" onClick={() => setCambiandoPin(true)}>
                <KeyRound data-icon="inline-start" />
                Cambiar mi PIN
              </Button>
            </div>
          ) : null}

          <section aria-labelledby="mis-equipos" className="grid gap-3">
            <h2 id="mis-equipos" className="text-2xl">
              {data.equipos.length > 1 ? 'Mis equipos' : 'Mi equipo'}
            </h2>
            {data.equipos.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Sin ligas activas. Cuando el organizador te asigne un equipo en una liga, aparecerá
                aquí.
              </p>
            ) : (
              <ul className="grid gap-2" role="radiogroup" aria-label="Equipo activo">
                {data.equipos.map((e) => (
                  <li key={e.id}>
                    <TarjetaEquipo
                      equipo={e}
                      activo={e.id === equipo?.id}
                      onElegir={() => setElegido(e.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {equipo ? (
            <DetalleEquipo
              key={equipo.edicion.id}
              equipo={equipo}
              onSinAcceso={() => {
                setElegido(null);
                void refetch();
              }}
            />
          ) : null}

          {data.pinCambiadoEn !== null ? (
            <Button variant="outline" className="w-fit" onClick={() => setCambiandoPin(true)}>
              <KeyRound data-icon="inline-start" />
              Cambiar mi PIN
            </Button>
          ) : null}

          <Dialog open={cambiandoPin} onOpenChange={setCambiandoPin}>
            <DialogContent>
              {cambiandoPin ? <FormularioPin onListo={() => setCambiandoPin(false)} /> : null}
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </main>
  );
}

function TarjetaEquipo({
  equipo,
  activo,
  onElegir,
}: {
  equipo: EquipoDelegadoDto;
  activo: boolean;
  onElegir: () => void;
}) {
  const contenido = (
    <>
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-heading text-xl font-extrabold italic">{equipo.nombre}</span>
        {equipo.retirado ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Retirado
          </span>
        ) : (
          <EstadoLiga estado={equipo.edicion.estado} />
        )}
      </span>
      <span className="text-sm text-muted-foreground">
        {equipo.edicion.nombre} · {equipo.edicion.categoria.nombre}
        {equipo.club.nombre !== equipo.nombre ? ` · club ${equipo.club.nombre}` : ''}
      </span>
    </>
  );
  if (equipo.retirado)
    return (
      <div className="grid w-full gap-1 rounded-lg border border-dashed bg-muted/40 p-4 opacity-80">
        {contenido}
        <span className="text-xs text-muted-foreground">
          Este equipo se retiró de la liga y ya no se puede abrir.
        </span>
      </div>
    );
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activo}
      onClick={onElegir}
      className={cn(
        'grid w-full gap-1 rounded-lg border bg-card p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        activo ? 'border-primary ring-2 ring-primary/40' : 'hover:bg-muted/50',
      )}
    >
      {contenido}
    </button>
  );
}

/** Su equipo en la liga elegida. El API decide el acceso en cada petición (FRONT_FASE_03 §6). */
function DetalleEquipo({
  equipo,
  onSinAcceso,
}: {
  equipo: EquipoDelegadoDto;
  onSinAcceso: () => void;
}) {
  const { data, error } = useDelegadoEdicion(equipo.edicion.id);
  const sinAcceso = error instanceof ApiError && [401, 403, 404, 409].includes(error.status);

  if (sinAcceso)
    return (
      <section className="grid gap-2 rounded-lg border bg-card p-4" role="alert">
        <p className="text-sm">Ya no tienes acceso a esta liga.</p>
        <Button size="sm" variant="outline" className="w-fit" onClick={onSinAcceso}>
          Actualizar mis equipos
        </Button>
      </section>
    );
  if (error)
    return (
      <AlertaError>
        {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
      </AlertaError>
    );
  if (!data) return <p role="status">Cargando liga…</p>;
  return (
    <section className="grid gap-2 rounded-lg border bg-card p-4">
      <h2 className="text-xl">{data.equipo.nombre}</h2>
      <p className="text-sm text-muted-foreground">
        {data.edicion.nombre} · {data.edicion.categoria.nombre}
      </p>
      <p className="text-sm text-muted-foreground">
        La plantilla de jugadores, el calendario y las cuentas de este equipo aparecerán aquí en las
        próximas versiones.
      </p>
    </section>
  );
}

type ErroresPin = { pinActual?: string; pinNuevo?: string; repetido?: string };

function FormularioPin({ onListo }: { onListo: () => void }) {
  const cambiar = useCambiarPin();
  const [actual, setActual] = useState('');
  const [nuevo, setNuevo] = useState('');
  const [repetido, setRepetido] = useState('');
  const [errores, setErrores] = useState<ErroresPin>({});
  const [error, setError] = useState<string | null>(null);

  // Solo retroalimentación: el API manda (`PIN_DEBIL`), así que la advertencia no bloquea el envío.
  const advertencia =
    nuevo.length === 6 && pinDebil(nuevo, actual || undefined)
      ? 'Parece un PIN fácil de adivinar: sin repetidos, escaleras ni patrones, y distinto al actual.'
      : undefined;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs: ErroresPin = {};
    if (!PIN_VALIDO.test(actual)) errs.pinActual = 'Escribe tu PIN actual (6 números).';
    if (!PIN_VALIDO.test(nuevo)) errs.pinNuevo = 'El PIN nuevo tiene 6 números.';
    if (repetido !== nuevo) errs.repetido = 'Los dos PIN nuevos no coinciden.';
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await cambiar.mutateAsync({ data: { pinActual: actual, pinNuevo: nuevo } });
      toast.success('PIN actualizado.');
      onListo();
    } catch (err) {
      if (!(err instanceof ApiError)) return setError(mensajeGenerico());
      const campo = campoDeError(err);
      if (campo === 'pinActual' || campo === 'pinNuevo')
        setErrores({ [campo]: mensajeDeError(err) });
      else setError(mensajeDeError(err));
    }
  }

  const pin = (id: string, valor: string, set: (v: string) => void, invalido?: string) => (
    <Input
      id={id}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={6}
      className="marcador h-12 text-xl tracking-[0.3em]"
      value={valor}
      aria-invalid={!!invalido}
      onChange={(e) => set(e.target.value.replace(/\D/g, ''))}
    />
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cambiar mi PIN</DialogTitle>
        <DialogDescription>
          Usa 6 números que recuerdes y no compartas. Si lo olvidas, el organizador te da uno nuevo.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={guardar} noValidate className="grid gap-4">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <Campo id="pin-actual" etiqueta="PIN actual" error={errores.pinActual}>
          {pin('pin-actual', actual, setActual, errores.pinActual)}
        </Campo>
        <Campo
          id="pin-nuevo"
          etiqueta="PIN nuevo"
          error={errores.pinNuevo}
          ayuda={errores.pinNuevo ? undefined : advertencia}
        >
          {pin('pin-nuevo', nuevo, setNuevo, errores.pinNuevo)}
        </Campo>
        <Campo id="pin-repetido" etiqueta="Repite el PIN nuevo" error={errores.repetido}>
          {pin('pin-repetido', repetido, setRepetido, errores.repetido)}
        </Campo>
        <Button type="submit" size="lg" disabled={cambiar.isPending}>
          {cambiar.isPending ? 'Guardando…' : 'Guardar PIN'}
        </Button>
      </form>
    </>
  );
}
