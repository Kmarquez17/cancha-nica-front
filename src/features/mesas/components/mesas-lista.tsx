'use client';

import { useState } from 'react';
import { KeyRound, Lock, LockOpen, Pencil, Plus, Power, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useEdiciones } from '@/features/ediciones/api';
import type { MesaConPinDto, MesaDto } from '@/features/ediciones/tipos';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import {
  useActualizarMesa,
  useAsignarEdiciones,
  useCrearMesa,
  useDesbloquearMesa,
  useMesas,
  useResetearPin,
} from '../api';
import { PinDialog } from './pin-dialog';

const MAX_MESAS = 6;

const hora = (iso: string) =>
  new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

type Acceso = { texto: string; clases: string };
export function accesoDeMesa(
  m: Pick<MesaDto, 'activa' | 'bloqueadaHasta'>,
  ahora = Date.now(),
): Acceso {
  if (!m.activa) return { texto: 'Desactivada', clases: 'bg-pendiente text-pendiente-foreground' };
  if (m.bloqueadaHasta && new Date(m.bloqueadaHasta).getTime() > ahora)
    return {
      texto: `Bloqueada hasta las ${hora(m.bloqueadaHasta)}`,
      clases: 'bg-warning text-warning-foreground',
    };
  return { texto: 'Activa', clases: 'bg-success text-success-foreground' };
}

const avisoError = (e: unknown) =>
  toast.error(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());

export function MesasLista() {
  const { data, isLoading, error } = useMesas();
  const [nueva, setNueva] = useState(false);
  const [conPin, setConPin] = useState<{ mesa: MesaConPinDto; reseteo: boolean } | null>(null);
  const [aResetear, setAResetear] = useState<MesaDto | null>(null);
  const [alcance, setAlcance] = useState<MesaDto | null>(null);
  const [renombrando, setRenombrando] = useState<MesaDto | null>(null);
  const actualizar = useActualizarMesa();
  const desbloquear = useDesbloquearMesa();
  const lleno = (data?.length ?? 0) >= MAX_MESAS;

  async function alternarActiva(m: MesaDto) {
    try {
      await actualizar.mutateAsync({ id: m.id, data: { activa: !m.activa } });
      toast.success(m.activa ? 'Mesa desactivada.' : 'Mesa activada.');
    } catch (e) {
      avisoError(e);
    }
  }

  async function quitarBloqueo(m: MesaDto) {
    try {
      await desbloquear.mutateAsync(m.id);
      toast.success('Mesa desbloqueada.');
    } catch (e) {
      avisoError(e);
    }
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl">Mesas</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Quienes llevan el marcador en la cancha. Cada mesa entra con su usuario y un PIN de 6
            dígitos, y solo opera las ligas que le asignes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="marcador text-sm" aria-label="Mesas creadas">
            {data?.length ?? 0} de {MAX_MESAS}
          </p>
          <Button onClick={() => setNueva(true)} disabled={lleno}>
            <Plus data-icon="inline-start" />
            Nueva mesa
          </Button>
        </div>
      </div>
      {lleno ? (
        <p role="status" className="text-sm text-muted-foreground">
          Ya tienes las {MAX_MESAS} mesas que permite un cliente.
        </p>
      ) : null}

      {error ? (
        <AlertaError>
          {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
        </AlertaError>
      ) : null}
      {isLoading ? <p role="status">Cargando mesas…</p> : null}
      {data && data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no tienes mesas. Crea una para que alguien pueda llevar el marcador.
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((m) => {
            const acceso = accesoDeMesa(m);
            const bloqueada = acceso.texto.startsWith('Bloqueada');
            return (
              <li key={m.id} className="grid gap-3 rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="marcador text-xl">{m.username}</p>
                    <p className="text-sm text-muted-foreground">
                      {m.nombreOperador ?? 'Sin nombre de operador'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider uppercase ${acceso.clases}`}
                  >
                    {acceso.texto}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 text-sm">
                  {m.ediciones.length === 0 ? (
                    <span className="text-muted-foreground">Sin ligas asignadas</span>
                  ) : (
                    m.ediciones.map((e) => (
                      <span key={e.id} className="rounded-full border px-2 py-0.5 text-xs">
                        {e.nombre}
                      </span>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Registrada por {m.creadoPor.nombre}</p>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setRenombrando(m)}>
                    <Pencil data-icon="inline-start" />
                    Operador
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAlcance(m)}>
                    <Trophy data-icon="inline-start" />
                    Ligas
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAResetear(m)}>
                    <KeyRound data-icon="inline-start" />
                    Resetear PIN
                  </Button>
                  {bloqueada ? (
                    <Button variant="outline" size="sm" onClick={() => quitarBloqueo(m)}>
                      <LockOpen data-icon="inline-start" />
                      Desbloquear
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => alternarActiva(m)}>
                    {m.activa ? (
                      <Lock data-icon="inline-start" />
                    ) : (
                      <Power data-icon="inline-start" />
                    )}
                    {m.activa ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <NuevaMesaDialog
        open={nueva}
        onCerrar={() => setNueva(false)}
        onCreada={(mesa) => {
          setNueva(false);
          setConPin({ mesa, reseteo: false });
        }}
      />
      <ResetearDialog
        mesa={aResetear}
        onCerrar={() => setAResetear(null)}
        onListo={(mesa) => {
          setAResetear(null);
          setConPin({ mesa, reseteo: true });
        }}
      />
      <AlcanceDialog mesa={alcance} onCerrar={() => setAlcance(null)} />
      <OperadorDialog mesa={renombrando} onCerrar={() => setRenombrando(null)} />
      <PinDialog
        mesa={conPin?.mesa ?? null}
        reseteo={conPin?.reseteo}
        onCerrar={() => setConPin(null)}
      />
    </section>
  );
}

function NuevaMesaDialog({
  open,
  onCerrar,
  onCreada,
}: {
  open: boolean;
  onCerrar: () => void;
  onCreada: (m: MesaConPinDto) => void;
}) {
  const crear = useCrearMesa();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const mesa = await crear.mutateAsync({ nombreOperador: nombre.trim() || null });
      setNombre('');
      onCreada(mesa);
    } catch (err) {
      setError(err instanceof ApiError ? mensajeDeError(err) : mensajeGenerico());
    }
  }

  return (
    <Dialog open={open} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva mesa</DialogTitle>
          <DialogDescription>
            Le asignamos el siguiente usuario libre (MESA1 a MESA6) y un PIN que verás una sola vez.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-4">
          {error ? <AlertaError>{error}</AlertaError> : null}
          <Campo id="mesa-nombre" etiqueta="Nombre de quien opera (opcional)">
            <Input
              id="mesa-nombre"
              autoComplete="off"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Campo>
          <Button type="submit" disabled={crear.isPending}>
            {crear.isPending ? 'Creando…' : 'Crear mesa'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetearDialog({
  mesa,
  onCerrar,
  onListo,
}: {
  mesa: MesaDto | null;
  onCerrar: () => void;
  onListo: (m: MesaConPinDto) => void;
}) {
  const resetear = useResetearPin();
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (!mesa) return;
    setError(null);
    try {
      onListo(await resetear.mutateAsync(mesa.id));
    } catch (err) {
      setError(err instanceof ApiError ? mensajeDeError(err) : mensajeGenerico());
    }
  }

  return (
    <Dialog open={mesa !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetear el PIN de {mesa?.username}</DialogTitle>
          <DialogDescription>
            Se crea un PIN nuevo y el anterior deja de funcionar. Si la mesa estaba bloqueada, se
            desbloquea.
          </DialogDescription>
        </DialogHeader>
        {error ? <AlertaError>{error}</AlertaError> : null}
        <DialogFooter showCloseButton>
          <Button onClick={confirmar} disabled={resetear.isPending}>
            {resetear.isPending ? 'Reseteando…' : 'Resetear PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AlcanceDialog({ mesa, onCerrar }: { mesa: MesaDto | null; onCerrar: () => void }) {
  const { data: ligas } = useEdiciones(false);
  const asignar = useAsignarEdiciones();
  const [marcadas, setMarcadas] = useState<string[] | null>(null);
  const actuales = marcadas ?? mesa?.ediciones.map((e) => e.id) ?? [];
  const asignables = (ligas ?? []).filter((l) => l.estado !== 'FINALIZADA');

  async function guardar() {
    if (!mesa) return;
    try {
      await asignar.mutateAsync({ id: mesa.id, edicionIds: actuales });
      toast.success('Ligas de la mesa actualizadas.');
      setMarcadas(null);
      onCerrar();
    } catch (e) {
      avisoError(e);
    }
  }

  return (
    <Dialog
      open={mesa !== null}
      onOpenChange={(abierto) => {
        if (!abierto) {
          setMarcadas(null);
          onCerrar();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ligas de {mesa?.username}</DialogTitle>
          <DialogDescription>
            La mesa solo puede operar las ligas marcadas. Quitar una surte efecto al instante.
          </DialogDescription>
        </DialogHeader>
        {asignables.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay ligas activas para asignar.</p>
        ) : (
          <fieldset className="grid gap-2">
            <legend className="sr-only">Ligas que puede operar</legend>
            {asignables.map((l) => (
              <label key={l.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={actuales.includes(l.id)}
                  onChange={(e) =>
                    setMarcadas(
                      e.target.checked ? [...actuales, l.id] : actuales.filter((x) => x !== l.id),
                    )
                  }
                />
                {l.nombre} <span className="text-muted-foreground">· {l.categoria.nombre}</span>
              </label>
            ))}
          </fieldset>
        )}
        <DialogFooter showCloseButton>
          <Button onClick={guardar} disabled={asignar.isPending}>
            {asignar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Quién opera la mesa: cambia solo el nombre (el usuario MESAn y el PIN no se tocan). */
function OperadorDialog({ mesa, onCerrar }: { mesa: MesaDto | null; onCerrar: () => void }) {
  return (
    <Dialog open={mesa !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {mesa ? <FormularioOperador key={mesa.id} mesa={mesa} onCerrar={onCerrar} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioOperador({ mesa, onCerrar }: { mesa: MesaDto; onCerrar: () => void }) {
  const actualizar = useActualizarMesa();
  const [nombre, setNombre] = useState(mesa.nombreOperador ?? '');
  const [error, setError] = useState<string | null>(null);
  const cambio = nombre.trim() !== (mesa.nombreOperador ?? '');

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await actualizar.mutateAsync({
        id: mesa.id,
        data: { nombreOperador: nombre.trim() || null },
      });
      toast.success('Operador actualizado.');
      onCerrar();
    } catch (err) {
      setError(err instanceof ApiError ? mensajeDeError(err) : mensajeGenerico());
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Operador de {mesa.username}</DialogTitle>
        <DialogDescription>
          Es solo el nombre de quien lleva la mesa. El usuario y el PIN no cambian.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={guardar} className="grid gap-4">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <Campo
          id="operador-nombre"
          etiqueta="Nombre de quien opera"
          ayuda="Déjalo vacío para quitarlo."
        >
          <Input
            id="operador-nombre"
            autoComplete="off"
            maxLength={80}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </Campo>
        <Button type="submit" disabled={actualizar.isPending || !cambio}>
          {actualizar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>
    </>
  );
}
