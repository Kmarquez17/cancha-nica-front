'use client';

import Link from 'next/link';
import { useState } from 'react';
import { KeyRound, LockOpen, Pencil, Power } from 'lucide-react';
import { toast } from 'sonner';
import { campoDeError, mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import type { DelegadoDto } from '@/shared/api/generated/models';
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
  useActivarDelegado,
  useActualizarDelegado,
  useDelegados,
  useDesactivarDelegado,
  useDesbloquearDelegado,
  useResetearPinDelegado,
} from '../api-admin';
import { accesoDeReset, EntregaPinDelegado, type AccesoDelegado } from './entrega-pin-delegado';

/** Estado del PIN de un delegado (R13): nunca entró, sigue con el temporal, o ya lo cambió. */
export function estadoPin(d: Pick<DelegadoDto, 'ultimoAccesoEn' | 'pinCambiadoEn'>) {
  if (d.ultimoAccesoEn === null)
    return { texto: 'PIN aún no usado', clases: 'bg-warning text-warning-foreground' };
  if (d.pinCambiadoEn === null)
    return { texto: 'PIN temporal', clases: 'bg-info text-info-foreground' };
  return { texto: 'PIN propio', clases: 'bg-success text-success-foreground' };
}

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

/** Equipos vivos (no retirados) en ligas que no han terminado: lo que impide desactivar al delegado. */
const equiposVivos = (d: DelegadoDto) =>
  d.equipos.filter((e) => e.estado !== 'RETIRADO' && e.edicion.estado !== 'FINALIZADA');

export function DelegadosLista() {
  const { data, isLoading, error } = useDelegados();
  const [aResetear, setAResetear] = useState<DelegadoDto | null>(null);
  const [aEditar, setAEditar] = useState<DelegadoDto | null>(null);
  const [aDesactivar, setADesactivar] = useState<DelegadoDto | null>(null);
  const [conPin, setConPin] = useState<AccesoDelegado | null>(null);
  const activar = useActivarDelegado();
  const desbloquear = useDesbloquearDelegado();

  async function accion(que: () => Promise<unknown>, ok: string) {
    try {
      await que();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl">Delegados</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Quienes llevan un equipo. Entran con su teléfono y un PIN de 6 dígitos. Se crean al
          inscribir un equipo. Si alguien perdió su PIN, resetéalo y entrégale el nuevo.
        </p>
      </div>

      {error ? (
        <AlertaError>
          {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
        </AlertaError>
      ) : null}
      {isLoading ? <p role="status">Cargando delegados…</p> : null}
      {data && data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no hay delegados. Se crean al inscribir un equipo.
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((d) => {
            const pin = estadoPin(d);
            return (
              <li key={d.id} className="grid gap-3 rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{d.nombre}</p>
                    <p className="marcador text-sm font-normal text-muted-foreground">
                      {d.telefono}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {d.acceso.estado === 'DESACTIVADO' ? (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Desactivado
                      </span>
                    ) : null}
                    {d.acceso.estado === 'BLOQUEADO' ? (
                      <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold tracking-wider text-destructive uppercase">
                        Bloqueado
                        {d.acceso.bloqueadoHasta
                          ? ` hasta las ${hora(d.acceso.bloqueadoHasta)}`
                          : ''}
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider uppercase ${pin.clases}`}
                    >
                      {pin.texto}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-sm">
                  {d.equipos.length === 0 ? (
                    <span className="text-muted-foreground">Sin equipos</span>
                  ) : (
                    d.equipos.map((e) => (
                      <Link
                        key={e.id}
                        href={`/admin/ligas/${e.edicion.id}/equipos`}
                        className={`rounded-full border px-2 py-0.5 text-xs underline-offset-2 hover:underline ${
                          e.estado === 'RETIRADO' ? 'text-muted-foreground line-through' : ''
                        }`}
                      >
                        {e.nombre} · {e.edicion.nombre}
                        {e.estado === 'RETIRADO' ? ' (retirado)' : ''}
                      </Link>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Registrado por {d.creadoPor.nombre}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAEditar(d)}>
                    <Pencil data-icon="inline-start" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAResetear(d)}>
                    <KeyRound data-icon="inline-start" />
                    Resetear PIN
                  </Button>
                  {d.acceso.estado === 'BLOQUEADO' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={desbloquear.isPending}
                      onClick={() =>
                        accion(
                          () => desbloquear.mutateAsync({ id: d.id }),
                          'Delegado desbloqueado.',
                        )
                      }
                    >
                      <LockOpen data-icon="inline-start" />
                      Desbloquear
                    </Button>
                  ) : null}
                  {d.activo ? (
                    <Button variant="outline" size="sm" onClick={() => setADesactivar(d)}>
                      <Power data-icon="inline-start" />
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activar.isPending}
                      onClick={() =>
                        accion(() => activar.mutateAsync({ id: d.id }), 'Delegado activado.')
                      }
                    >
                      <Power data-icon="inline-start" />
                      Activar
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <EditarDialog delegado={aEditar} onCerrar={() => setAEditar(null)} />
      <DesactivarDialog delegado={aDesactivar} onCerrar={() => setADesactivar(null)} />
      <ResetearPinDialog
        delegado={aResetear}
        onCerrar={() => setAResetear(null)}
        onListo={(a) => {
          setAResetear(null);
          setConPin(a);
        }}
      />
      <EntregaPinDelegado
        acceso={conPin}
        titulo="PIN nuevo"
        reseteo
        onCerrar={() => setConPin(null)}
      />
    </section>
  );
}

function EditarDialog({
  delegado,
  onCerrar,
}: {
  delegado: DelegadoDto | null;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={delegado !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {delegado ? (
          <FormularioEditar key={delegado.id} delegado={delegado} onCerrar={onCerrar} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioEditar({ delegado, onCerrar }: { delegado: DelegadoDto; onCerrar: () => void }) {
  const actualizar = useActualizarDelegado();
  const [nombre, setNombre] = useState(delegado.nombre);
  const [telefono, setTelefono] = useState(delegado.telefono);
  const [errNombre, setErrNombre] = useState<string>();
  const [errTelefono, setErrTelefono] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const cambiaTelefono = telefono.trim() !== delegado.telefono;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrNombre(undefined);
    setErrTelefono(undefined);
    if (nombre.trim().length < 2) return setErrNombre('Escribe el nombre (mínimo 2 letras).');
    if (telefono.trim() === '') return setErrTelefono('Escribe el teléfono.');
    // Solo se envía lo que cambió.
    const data: { nombre?: string; telefono?: string } = {};
    if (nombre.trim() !== delegado.nombre) data.nombre = nombre.trim();
    if (cambiaTelefono) data.telefono = telefono.trim();
    if (Object.keys(data).length === 0) return onCerrar();
    try {
      await actualizar.mutateAsync({ id: delegado.id, data });
      toast.success('Delegado actualizado.');
      onCerrar();
    } catch (err) {
      if (!(err instanceof ApiError)) return setError(mensajeGenerico());
      if (campoDeError(err) === 'delegadoTelefono') setErrTelefono(mensajeDeError(err));
      else setError(mensajeDeError(err));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar a {delegado.nombre}</DialogTitle>
        <DialogDescription>
          Cambiar el teléfono cambia su usuario y cierra sus sesiones abiertas.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={guardar} noValidate className="grid gap-4">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <Campo id="del-nombre" etiqueta="Nombre" error={errNombre}>
          <Input
            id="del-nombre"
            autoComplete="off"
            maxLength={80}
            value={nombre}
            aria-invalid={!!errNombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </Campo>
        <Campo
          id="del-telefono"
          etiqueta="Teléfono"
          ayuda={
            cambiaTelefono
              ? 'Al guardar se cerrarán sus sesiones: tendrá que entrar de nuevo con el teléfono nuevo.'
              : undefined
          }
          error={errTelefono}
        >
          <Input
            id="del-telefono"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={telefono}
            aria-invalid={!!errTelefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </Campo>
        <Button type="submit" disabled={actualizar.isPending}>
          {actualizar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>
    </>
  );
}

function DesactivarDialog({
  delegado,
  onCerrar,
}: {
  delegado: DelegadoDto | null;
  onCerrar: () => void;
}) {
  const desactivar = useDesactivarDelegado();
  const [conflicto, setConflicto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cerrar() {
    setConflicto(false);
    setError(null);
    onCerrar();
  }

  async function confirmar() {
    if (!delegado) return;
    setError(null);
    try {
      await desactivar.mutateAsync({ id: delegado.id });
      toast.success('Delegado desactivado.');
      cerrar();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DELEGADO_CON_EQUIPOS_ACTIVOS') setConflicto(true);
      else setError(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  const vivos = delegado ? equiposVivos(delegado) : [];

  return (
    <Dialog open={delegado !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desactivar a {delegado?.nombre}</DialogTitle>
          <DialogDescription>
            Pierde el acceso al instante, incluso si tiene la sesión abierta. Puedes volver a
            activarlo cuando quieras.
          </DialogDescription>
        </DialogHeader>
        {error ? <AlertaError>{error}</AlertaError> : null}
        {conflicto ? (
          <div role="alert" className="grid gap-2 rounded-lg border border-warning/40 p-3 text-sm">
            <p>Reasigna sus equipos antes de desactivarlo. Aún lleva:</p>
            <ul className="grid gap-1">
              {vivos.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/admin/ligas/${e.edicion.id}/equipos`}
                    className="underline underline-offset-4"
                  >
                    {e.nombre} · {e.edicion.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <DialogFooter showCloseButton>
          <Button variant="destructive" onClick={confirmar} disabled={desactivar.isPending}>
            {desactivar.isPending ? 'Desactivando…' : 'Desactivar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetearPinDialog({
  delegado,
  onCerrar,
  onListo,
}: {
  delegado: DelegadoDto | null;
  onCerrar: () => void;
  onListo: (a: AccesoDelegado) => void;
}) {
  const resetear = useResetearPinDelegado();
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (!delegado) return;
    setError(null);
    try {
      onListo(accesoDeReset(await resetear.mutateAsync({ id: delegado.id })));
    } catch (e) {
      setError(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <Dialog open={delegado !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetear el PIN de {delegado?.nombre}</DialogTitle>
          <DialogDescription>
            Se crea un PIN nuevo y el anterior deja de funcionar; también se cierran sus sesiones y
            se levanta el bloqueo. El acceso ya abierto puede durar hasta 15 minutos.
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
