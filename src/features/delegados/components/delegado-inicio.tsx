'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { EstadoLiga } from '@/features/ediciones/components/estado-liga';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
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
import { useCambiarPin, useDelegadoLogout, useDelegadoMe } from '../api';

/** Inicio del delegado: sus equipos (puede llevar varios, de categorías distintas) y el cambio de su PIN. */
export function DelegadoInicio() {
  const router = useRouter();
  const { data, isLoading, error } = useDelegadoMe();
  const salir = useDelegadoLogout();
  const [elegido, setElegido] = useState<string | null>(null);
  const [cambiandoPin, setCambiandoPin] = useState(false);

  async function cerrarSesion() {
    try {
      await salir.mutateAsync();
    } finally {
      router.replace('/delegado/login');
    }
  }

  const equipo = data?.equipos.find((e) => e.id === (elegido ?? data.equipos[0]?.id));

  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-start gap-6 p-4">
      <header className="flex items-center justify-between gap-3">
        <Logo className="w-32" />
        <Button variant="outline" onClick={cerrarSesion} disabled={salir.isPending}>
          Salir
        </Button>
      </header>

      {isLoading ? <p role="status">Cargando…</p> : null}
      {error ? (
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

          {data.pinTemporal ? (
            <div
              role="status"
              className="grid gap-2 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"
            >
              <p>
                <strong>Tu PIN es temporal.</strong> Cámbialo por uno que solo tú conozcas.
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
                Todavía no llevas ningún equipo. Pídele al organizador que te asigne uno.
              </p>
            ) : (
              <ul className="grid gap-2" role="radiogroup" aria-label="Equipo activo">
                {data.equipos.map((e) => {
                  const activo = e.id === equipo?.id;
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => setElegido(e.id)}
                        className={cn(
                          'grid w-full gap-1 rounded-lg border bg-card p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                          activo ? 'border-primary ring-2 ring-primary/40' : 'hover:bg-muted/50',
                        )}
                      >
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-heading text-xl font-extrabold italic">
                            {e.club.nombre}
                          </span>
                          <EstadoLiga estado={e.edicion.estado} />
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {e.edicion.nombre} · {e.categoria}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {equipo ? (
            <section className="grid gap-2 rounded-lg border bg-card p-4">
              <h2 className="text-xl">{equipo.club.nombre}</h2>
              <p className="text-sm text-muted-foreground">
                La plantilla de jugadores, el calendario y las cuentas de este equipo aparecerán
                aquí en las próximas versiones.
              </p>
            </section>
          ) : null}

          {!data.pinTemporal ? (
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

function FormularioPin({ onListo }: { onListo: () => void }) {
  const cambiar = useCambiarPin();
  const [actual, setActual] = useState('');
  const [nuevo, setNuevo] = useState('');
  const [repetido, setRepetido] = useState('');
  const [errores, setErrores] = useState<{ actual?: string; nuevo?: string; repetido?: string }>(
    {},
  );
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs: typeof errores = {};
    if (!/^\d{6}$/.test(actual)) errs.actual = 'Escribe tu PIN actual (6 números).';
    if (!/^\d{6}$/.test(nuevo)) errs.nuevo = 'El PIN nuevo tiene 6 números.';
    else if (nuevo === actual) errs.nuevo = 'El PIN nuevo debe ser distinto al actual.';
    if (repetido !== nuevo) errs.repetido = 'Los dos PIN nuevos no coinciden.';
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await cambiar.mutateAsync({ pinActual: actual, pinNuevo: nuevo });
      toast.success('PIN actualizado.');
      onListo();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS')
        return setErrores({ actual: 'Ese no es tu PIN actual.' });
      setError(err instanceof ApiError ? mensajeDeError(err) : mensajeGenerico());
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
        <Campo id="pin-actual" etiqueta="PIN actual" error={errores.actual}>
          {pin('pin-actual', actual, setActual, errores.actual)}
        </Campo>
        <Campo id="pin-nuevo" etiqueta="PIN nuevo" error={errores.nuevo}>
          {pin('pin-nuevo', nuevo, setNuevo, errores.nuevo)}
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
