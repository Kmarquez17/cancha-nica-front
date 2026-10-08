'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { AlertaError } from '@/shared/ui/campo';
import { EstadoLiga } from '@/features/ediciones/components/estado-liga';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
import { Logo } from '@/shared/ui/logo';
import { useMesaLogout, useMesaMe } from '../api';

/** Inicio de la mesa: las ligas que puede operar. Los partidos llegan con el calendario (Fase 5) y la consola (Fase 7). */
export function MesaInicio() {
  const router = useRouter();
  const { data, isLoading, error } = useMesaMe();
  const salir = useMesaLogout();

  async function cerrarSesion() {
    try {
      await salir.mutateAsync();
    } finally {
      router.replace('/');
    }
  }

  return (
    <main className="mesa mx-auto grid min-h-dvh max-w-xl content-start gap-6 p-4">
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
          con el enlace que te dieron.
        </AlertaError>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">{data.organizacion.nombre}</p>
            <h1 className="text-3xl">
              {data.username}
              {data.nombreOperador ? ` · ${data.nombreOperador}` : ''}
            </h1>
          </div>

          <section aria-labelledby="mis-ligas" className="grid gap-3">
            <h2 id="mis-ligas" className="text-2xl">
              Mis ligas
            </h2>
            {data.ediciones.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Todavía no tienes ligas asignadas. Pídele al organizador que te asigne una.
              </p>
            ) : (
              <ul className="grid gap-3">
                {data.ediciones.map((l) => (
                  <li key={l.id} className="grid gap-2 rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-heading text-xl font-extrabold italic">{l.nombre}</p>
                      <EstadoLiga estado={l.estado} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Los partidos de hoy aparecerán aquí cuando el organizador arme el calendario.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
