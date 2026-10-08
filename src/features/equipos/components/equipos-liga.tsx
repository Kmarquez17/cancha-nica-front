'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Plus, UserRoundCog } from 'lucide-react';
import { toast } from 'sonner';
import { useEdicion } from '@/features/ediciones/api';
import { EstadoLiga } from '@/features/ediciones/components/estado-liga';
import type { EdicionDto } from '@/features/ediciones/tipos';
import { EntregaPinDelegado } from '@/features/delegados/components/entrega-pin-delegado';
import { campoDeError, mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError } from '@/shared/ui/campo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  useClubes,
  useDelegados,
  useEquipos,
  useInscribirEquipo,
  useReasignarDelegado,
} from '../api';
import {
  aClubInscripcion,
  aDelegadoInscripcion,
  clubVacio,
  delegadoVacio,
  hayErrores,
  validarClub,
  validarDelegado,
  type ClubCampos,
  type DelegadoCampos,
  type ErroresClub,
  type ErroresDelegado,
} from '../lib/inscripcion';
import type { ClubDto, DelegadoDto, EquipoDto, PinEntregado } from '../tipos';
import { CamposClub, CamposDelegado } from './campos-inscripcion';

export function EquiposLiga({ edicionId }: { edicionId: string }) {
  const { data: liga, isLoading: cargaLiga, error: errorLiga } = useEdicion(edicionId);
  const { data: equipos, isLoading, error } = useEquipos(edicionId);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [reasignando, setReasignando] = useState<EquipoDto | null>(null);
  const [conPin, setConPin] = useState<{ pin: PinEntregado; titulo: string } | null>(null);

  if (cargaLiga) return <p role="status">Cargando…</p>;
  if (errorLiga || !liga)
    return (
      <AlertaError>
        {errorLiga instanceof ApiError ? mensajeDeError(errorLiga) : mensajeGenerico()}
      </AlertaError>
    );

  const abierta = liga.estado === 'EN_REGISTRO';

  return (
    <section className="grid gap-4">
      <div className="grid gap-3">
        <Link
          href={`/admin/ligas/${liga.id}`}
          className="flex w-fit items-center gap-1 text-sm underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {liga.nombre}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl">Equipos de {liga.nombre}</h1>
            <p className="text-sm text-muted-foreground">
              Categoría {liga.categoria.nombre}. Cada delegado lleva un solo equipo por categoría.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <EstadoLiga estado={liga.estado} />
            <Button onClick={() => setInscribiendo(true)} disabled={!abierta}>
              <Plus data-icon="inline-start" />
              Inscribir equipo
            </Button>
          </div>
        </div>
        {!abierta ? (
          <p role="status" className="text-sm text-muted-foreground">
            {liga.estado === 'CONFIGURACION'
              ? 'Abre las inscripciones de la liga para poder inscribir equipos.'
              : 'Esta liga ya no tiene las inscripciones abiertas.'}
          </p>
        ) : null}
      </div>

      {error ? (
        <AlertaError>
          {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
        </AlertaError>
      ) : null}
      {isLoading ? <p role="status">Cargando equipos…</p> : null}
      {equipos && equipos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no hay equipos. Inscribe el primero: puedes crear el club y al delegado en el mismo
          paso.
        </p>
      ) : null}

      {equipos && equipos.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {equipos.map((e) => (
            <li key={e.id} className="grid gap-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-heading text-xl font-extrabold italic">{e.club.nombre}</p>
                {e.delegado.pinSinUsar ? (
                  <span className="rounded-full bg-warning px-2.5 py-1 text-xs font-semibold tracking-wider text-warning-foreground uppercase">
                    PIN aún no usado
                  </span>
                ) : null}
              </div>
              <p className="text-sm">
                Delegado: <strong>{e.delegado.nombre}</strong>{' '}
                <span className="marcador text-muted-foreground">{e.delegado.telefono}</span>
              </p>
              <p className="text-xs text-muted-foreground">Inscrito por {e.creadoPor.nombre}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setReasignando(e)}
              >
                <UserRoundCog data-icon="inline-start" />
                Cambiar delegado
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <InscribirDialog
        liga={liga}
        open={inscribiendo}
        onCerrar={() => setInscribiendo(false)}
        onPin={(pin) => setConPin({ pin, titulo: 'Equipo inscrito' })}
      />
      <ReasignarDialog
        liga={liga}
        equipo={reasignando}
        onCerrar={() => setReasignando(null)}
        onPin={(pin) => setConPin({ pin, titulo: 'Delegado nuevo' })}
      />
      <EntregaPinDelegado
        pin={conPin?.pin ?? null}
        titulo={conPin?.titulo ?? ''}
        onCerrar={() => setConPin(null)}
      />
    </section>
  );
}

function InscribirDialog({
  liga,
  open,
  onCerrar,
  onPin,
}: {
  liga: EdicionDto;
  open: boolean;
  onCerrar: () => void;
  onPin: (pin: PinEntregado) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {open ? <FormularioInscribir liga={liga} onCerrar={onCerrar} onPin={onPin} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioInscribir({
  liga,
  onCerrar,
  onPin,
}: {
  liga: EdicionDto;
  onCerrar: () => void;
  onPin: (pin: PinEntregado) => void;
}) {
  const { data: clubes, error: errClubes } = useClubes();
  const { data: delegados, error: errDelegados } = useDelegados();
  const { data: equipos, error: errEquipos } = useEquipos(liga.id);
  const fallo = errClubes ?? errDelegados ?? errEquipos;

  // El modo inicial (club y delegado «existente» o «nuevo») depende de los datos: no se arma hasta tenerlos.
  if (fallo)
    return (
      <AlertaError>
        {fallo instanceof ApiError ? mensajeDeError(fallo) : mensajeGenerico()}
      </AlertaError>
    );
  if (!clubes || !delegados || !equipos) return <p role="status">Cargando…</p>;
  return (
    <FormularioInscribirListo
      liga={liga}
      clubes={clubes}
      delegados={delegados}
      equipos={equipos}
      onCerrar={onCerrar}
      onPin={onPin}
    />
  );
}

function FormularioInscribirListo({
  liga,
  clubes,
  delegados,
  equipos,
  onCerrar,
  onPin,
}: {
  liga: EdicionDto;
  clubes: ClubDto[];
  delegados: DelegadoDto[];
  equipos: EquipoDto[];
  onCerrar: () => void;
  onPin: (pin: PinEntregado) => void;
}) {
  const inscribir = useInscribirEquipo(liga.id);

  // Solo clubes activos que todavía no juegan en esta liga.
  const enLiga = new Set(equipos.map((e) => e.club.id));
  const elegibles = clubes.filter((c) => c.activo && !enLiga.has(c.id));

  const [club, setClub] = useState<ClubCampos>(() => clubVacio(elegibles.length > 0));
  const [delegado, setDelegado] = useState<DelegadoCampos>(() =>
    delegadoVacio(delegados.length > 0),
  );
  const [errClub, setErrClub] = useState<ErroresClub>({});
  const [errDel, setErrDel] = useState<ErroresDelegado>({});
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ec = validarClub(club);
    const ed = validarDelegado(delegado);
    setErrClub(ec);
    setErrDel(ed);
    if (hayErrores(ec) || hayErrores(ed)) return;
    try {
      const r = await inscribir.mutateAsync({
        club: aClubInscripcion(club),
        delegado: aDelegadoInscripcion(delegado),
      });
      toast.success(`${r.club.nombre} quedó inscrito.`);
      onCerrar();
      if (r.pinEntregado) onPin(r.pinEntregado);
    } catch (err) {
      if (!(err instanceof ApiError)) return setError(mensajeGenerico());
      const campo = campoDeError(err);
      if (campo === 'clubNombre') setErrClub({ nombre: mensajeDeError(err) });
      else if (campo === 'delegadoTelefono') setErrDel({ telefono: mensajeDeError(err) });
      else setError(mensajeDeError(err));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Inscribir equipo</DialogTitle>
        <DialogDescription>
          Si el club o el delegado son nuevos, se crean en este mismo paso. Al delegado nuevo le
          damos un PIN que verás una sola vez.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={enviar} noValidate className="grid gap-5">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <CamposClub
          valor={club}
          onChange={setClub}
          clubes={elegibles}
          errores={errClub}
          deshabilitado={inscribir.isPending}
        />
        <CamposDelegado
          valor={delegado}
          onChange={setDelegado}
          delegados={delegados}
          categoria={liga.categoria.nombre}
          errores={errDel}
          deshabilitado={inscribir.isPending}
        />
        <Button type="submit" disabled={inscribir.isPending}>
          {inscribir.isPending ? 'Inscribiendo…' : 'Inscribir equipo'}
        </Button>
      </form>
    </>
  );
}

function ReasignarDialog({
  liga,
  equipo,
  onCerrar,
  onPin,
}: {
  liga: EdicionDto;
  equipo: EquipoDto | null;
  onCerrar: () => void;
  onPin: (pin: PinEntregado) => void;
}) {
  return (
    <Dialog open={equipo !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {equipo ? (
          <FormularioReasignar liga={liga} equipo={equipo} onCerrar={onCerrar} onPin={onPin} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioReasignar({
  liga,
  equipo,
  onCerrar,
  onPin,
}: {
  liga: EdicionDto;
  equipo: EquipoDto;
  onCerrar: () => void;
  onPin: (pin: PinEntregado) => void;
}) {
  const { data: delegados, error } = useDelegados();
  if (error)
    return (
      <AlertaError>
        {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
      </AlertaError>
    );
  if (!delegados) return <p role="status">Cargando…</p>;
  return (
    <FormularioReasignarListo
      liga={liga}
      equipo={equipo}
      delegados={delegados}
      onCerrar={onCerrar}
      onPin={onPin}
    />
  );
}

function FormularioReasignarListo({
  liga,
  equipo,
  delegados,
  onCerrar,
  onPin,
}: {
  liga: EdicionDto;
  equipo: EquipoDto;
  delegados: DelegadoDto[];
  onCerrar: () => void;
  onPin: (pin: PinEntregado) => void;
}) {
  const reasignar = useReasignarDelegado(liga.id);
  const otros = delegados.filter((d) => d.id !== equipo.delegado.id);
  const [delegado, setDelegado] = useState<DelegadoCampos>(() => delegadoVacio(otros.length > 0));
  const [errDel, setErrDel] = useState<ErroresDelegado>({});
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ed = validarDelegado(delegado);
    setErrDel(ed);
    if (hayErrores(ed)) return;
    try {
      const r = await reasignar.mutateAsync({
        equipoId: equipo.id,
        delegado: aDelegadoInscripcion(delegado),
      });
      toast.success(`${r.club.nombre} ahora lo lleva ${r.delegado.nombre}.`);
      onCerrar();
      if (r.pinEntregado) onPin(r.pinEntregado);
    } catch (err) {
      if (!(err instanceof ApiError)) return setError(mensajeGenerico());
      if (campoDeError(err) === 'delegadoTelefono') setErrDel({ telefono: mensajeDeError(err) });
      else setError(mensajeDeError(err));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cambiar delegado de {equipo.club.nombre}</DialogTitle>
        <DialogDescription>
          Hoy lo lleva {equipo.delegado.nombre}. Su sesión sobre este equipo se cierra al guardar.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={enviar} noValidate className="grid gap-5">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <CamposDelegado
          valor={delegado}
          onChange={setDelegado}
          delegados={otros}
          categoria={liga.categoria.nombre}
          ignorarEquipoId={equipo.id}
          errores={errDel}
          deshabilitado={reasignar.isPending}
        />
        <Button type="submit" disabled={reasignar.isPending}>
          {reasignar.isPending ? 'Guardando…' : 'Cambiar delegado'}
        </Button>
      </form>
    </>
  );
}
