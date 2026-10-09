'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus, RotateCcw, UserMinus, UserRoundCog } from 'lucide-react';
import { toast } from 'sonner';
import { useDelegados } from '@/features/delegados/api-admin';
import {
  accesoDeEquipo,
  EntregaPinDelegado,
  type AccesoDelegado,
} from '@/features/delegados/components/entrega-pin-delegado';
import { useEdicion } from '@/features/ediciones/api';
import { EstadoLiga } from '@/features/ediciones/components/estado-liga';
import { campoDeError } from '@/shared/api/errors/es';
import { useGetAdminMe, useGetAdminOrganizacion } from '@/shared/api/generated/admin/admin';
import type { EdicionDto, EquipoConAccesoDto, EquipoDto } from '@/shared/api/generated/models';
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
  useEquipos,
  useInscribirEquipo,
  useReasignarDelegado,
  useReincorporarEquipo,
  useRenombrarEquipo,
  useRetirarEquipo,
} from '../api';
import { esErrorDeEstado, textoError } from '../lib/errores';
import {
  aDelegadoEntrada,
  aInscripcion,
  camposVacios,
  delegadoVacio,
  hayErrores,
  validarDelegado,
  validarEquipo,
  type CamposDelegado,
  type CamposEquipo,
  type ErroresDelegado,
  type ErroresEquipo,
} from '../lib/inscripcion';
import {
  esTardio,
  puedeEditar,
  puedeInscribir,
  puedeReincorporar,
  puedeRetirar,
  retiroDefinitivo,
} from '../lib/permisos';
import { CampoClub, CamposDelegadoForm } from './campos-inscripcion';

type Resultado = { acceso: AccesoDelegado | null; titulo: string; aviso: string | null };

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

/** Resultado de inscribir / reasignar: con PIN se entrega una sola vez; sin PIN se confirma el delegado. */
function resultadoDe(r: EquipoConAccesoDto, titulo: string): Resultado {
  const acceso = accesoDeEquipo(r);
  return {
    acceso,
    titulo,
    aviso: acceso
      ? null
      : `${titulo} con un delegado existente (no se genera PIN): ${r.equipo.delegado.nombre}.`,
  };
}

/** Tras un error de estado de la liga, vuelve a leerla y a sus equipos para que los botones se corrijan. */
function useRefrescarLiga() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) => String(q.queryKey[0]).startsWith('/admin/ediciones'),
    });
}

export function EquiposLiga({ edicionId }: { edicionId: string }) {
  const { data: liga, isLoading: cargaLiga, error: errorLiga } = useEdicion(edicionId);
  const { data: equipos, isLoading, error } = useEquipos(edicionId);
  const { data: yo } = useGetAdminMe();
  const esDueno = yo?.role === 'OWNER';
  const [inscribiendo, setInscribiendo] = useState(false);
  const [reasignando, setReasignando] = useState<EquipoDto | null>(null);
  const [renombrando, setRenombrando] = useState<EquipoDto | null>(null);
  const [retirando, setRetirando] = useState<EquipoDto | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const reincorporar = useReincorporarEquipo();
  const refrescar = useRefrescarLiga();

  if (cargaLiga) return <p role="status">Cargando…</p>;
  if (errorLiga || !liga) return <AlertaError>{textoError(errorLiga)}</AlertaError>;

  const inscribible = puedeInscribir(liga, esDueno);
  const tardio = esTardio(liga);

  async function reincorporarEquipo(e: EquipoDto) {
    try {
      await reincorporar.mutateAsync({ edicionId, equipoId: e.id });
      toast.success(`${e.nombre} volvió a la liga.`);
    } catch (err) {
      toast.error(textoError(err));
      if (esErrorDeEstado(err)) refrescar();
    }
  }

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
              Categoría {liga.categoria.nombre}. Cada equipo tiene su nombre en esta liga y su
              propio delegado; un delegado lleva un solo equipo por liga.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <EstadoLiga estado={liga.estado} />
            {inscribible ? (
              <Button onClick={() => setInscribiendo(true)}>
                <Plus data-icon="inline-start" />
                {tardio ? 'Agregar equipo' : 'Inscribir equipo'}
              </Button>
            ) : null}
          </div>
        </div>
        {!inscribible ? (
          <p role="status" className="text-sm text-muted-foreground">
            {liga.estado === 'EN_CURSO'
              ? 'Con la liga en marcha, solo el dueño puede agregar un equipo tardío.'
              : 'Esta liga ya no admite inscripciones.'}
          </p>
        ) : tardio ? (
          <p role="status" className="text-sm text-muted-foreground">
            La liga está en marcha: el equipo entra como tardío. Su efecto en el calendario y los
            puntos llega más adelante.
          </p>
        ) : null}
      </div>

      {error ? <AlertaError>{textoError(error)}</AlertaError> : null}
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
            <li
              key={e.id}
              data-retirado={e.retirado || undefined}
              className={`grid gap-3 rounded-lg border bg-card p-4 ${e.retirado ? 'opacity-80' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p
                    className={`font-heading text-xl font-extrabold italic ${
                      e.retirado ? 'line-through' : ''
                    }`}
                  >
                    {e.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">Club {e.club.nombre}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {e.retirado ? (
                    <Marca clases="bg-destructive/10 text-destructive">Retirado</Marca>
                  ) : null}
                  {!e.habilitado ? (
                    <Marca clases="bg-muted text-muted-foreground">Excluido al arrancar</Marca>
                  ) : null}
                  {e.inscritoTardio ? (
                    <Marca clases="bg-info text-info-foreground">Tardío</Marca>
                  ) : null}
                </div>
              </div>
              <p className="text-sm">
                Delegado: <strong>{e.delegado.nombre}</strong>{' '}
                <span className="marcador text-muted-foreground">{e.delegado.telefono}</span>
                {!e.delegado.activo ? (
                  <span className="text-xs text-muted-foreground"> (desactivado)</span>
                ) : null}
              </p>
              {e.retirado ? (
                <p className="text-sm text-muted-foreground">
                  Retirado
                  {e.retiradoEn ? ` el ${fecha(e.retiradoEn)}` : ''}
                  {e.retiradoPor ? ` por ${e.retiradoPor.nombre}` : ''}
                  {e.motivoRetiro ? `. Motivo: ${e.motivoRetiro}` : ''}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">Inscrito por {e.creadoPor.nombre}</p>
              <div className="flex flex-wrap gap-2">
                {puedeEditar(liga, e) ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setRenombrando(e)}>
                      <Pencil data-icon="inline-start" />
                      Renombrar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setReasignando(e)}>
                      <UserRoundCog data-icon="inline-start" />
                      Cambiar delegado
                    </Button>
                  </>
                ) : null}
                {puedeRetirar(liga, e, esDueno) ? (
                  <Button variant="outline" size="sm" onClick={() => setRetirando(e)}>
                    <UserMinus data-icon="inline-start" />
                    Retirar
                  </Button>
                ) : null}
                {puedeReincorporar(liga, e) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reincorporar.isPending}
                    onClick={() => reincorporarEquipo(e)}
                  >
                    <RotateCcw data-icon="inline-start" />
                    Reincorporar
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <InscribirDialog
        liga={liga}
        equipos={equipos ?? []}
        open={inscribiendo}
        onCerrar={() => setInscribiendo(false)}
        onResultado={setResultado}
      />
      <ReasignarDialog
        edicionId={liga.id}
        equipo={reasignando}
        equipos={equipos ?? []}
        onCerrar={() => setReasignando(null)}
        onResultado={setResultado}
      />
      <RenombrarDialog
        edicionId={liga.id}
        equipo={renombrando}
        onCerrar={() => setRenombrando(null)}
      />
      <RetirarDialog
        edicionId={liga.id}
        definitivo={retiroDefinitivo(liga)}
        equipo={retirando}
        onCerrar={() => setRetirando(null)}
      />
      <EntregaPinDelegado
        acceso={resultado?.acceso ?? null}
        titulo={resultado?.titulo ?? ''}
        onCerrar={() => setResultado(null)}
      />
      <Dialog
        open={resultado !== null && resultado.acceso === null}
        onOpenChange={(abierto) => !abierto && setResultado(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resultado?.titulo}</DialogTitle>
            <DialogDescription role="status">{resultado?.aviso}</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Marca({ clases, children }: { clases: string; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider uppercase ${clases}`}
    >
      {children}
    </span>
  );
}

// ---------- inscribir

function InscribirDialog({
  liga,
  equipos,
  open,
  onCerrar,
  onResultado,
}: {
  liga: EdicionDto;
  equipos: EquipoDto[];
  open: boolean;
  onCerrar: () => void;
  onResultado: (r: Resultado) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {open ? (
          <FormularioInscribir
            liga={liga}
            equipos={equipos}
            onCerrar={onCerrar}
            onResultado={onResultado}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioInscribir({
  liga,
  equipos,
  onCerrar,
  onResultado,
}: {
  liga: EdicionDto;
  equipos: EquipoDto[];
  onCerrar: () => void;
  onResultado: (r: Resultado) => void;
}) {
  const { data: delegados, error } = useDelegados();
  const { data: org } = useGetAdminOrganizacion();
  // El modo inicial del delegado («existente» o «nuevo») depende de los datos: no se arma hasta tenerlos.
  if (error) return <AlertaError>{textoError(error)}</AlertaError>;
  if (!delegados) return <p role="status">Cargando…</p>;
  return (
    <FormularioInscribirListo
      liga={liga}
      equipos={equipos}
      delegados={delegados.filter((d) => d.activo)}
      pais={org?.pais}
      onCerrar={onCerrar}
      onResultado={onResultado}
    />
  );
}

function FormularioInscribirListo({
  liga,
  equipos,
  delegados,
  pais,
  onCerrar,
  onResultado,
}: {
  liga: EdicionDto;
  equipos: EquipoDto[];
  delegados: React.ComponentProps<typeof CamposDelegadoForm>['delegados'];
  pais?: string;
  onCerrar: () => void;
  onResultado: (r: Resultado) => void;
}) {
  const inscribir = useInscribirEquipo();
  const refrescar = useRefrescarLiga();
  const [campos, setCampos] = useState<CamposEquipo>(() => camposVacios(delegados.length > 0));
  const [errores, setErrores] = useState<ErroresEquipo>({});
  const [error, setError] = useState<string | null>(null);
  const tardio = esTardio(liga);
  const ocupados = new Set(equipos.filter((e) => !e.retirado).map((e) => e.delegado.id));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ev = validarEquipo(campos);
    setErrores(ev);
    if (hayErrores(ev)) return;
    try {
      const r = await inscribir.mutateAsync({ edicionId: liga.id, data: aInscripcion(campos) });
      toast.success(`${r.equipo.nombre} quedó inscrito.`);
      onCerrar();
      onResultado(resultadoDe(r, tardio ? 'Equipo tardío inscrito' : 'Equipo inscrito'));
    } catch (err) {
      if (esErrorDeEstado(err)) refrescar();
      if (!(err instanceof ApiError)) return setError(textoError(err));
      const campo = campoDeError(err);
      if (campo === 'nombre') setErrores({ nombre: textoError(err) });
      else if (campo === 'clubNombre') setErrores({ clubNombre: textoError(err) });
      else if (campo === 'delegadoTelefono') setErrores({ delegadoTelefono: textoError(err) });
      else setError(textoError(err));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{tardio ? 'Agregar equipo tardío' : 'Inscribir equipo'}</DialogTitle>
        <DialogDescription>
          Si el club o el delegado son nuevos, se crean en este mismo paso. Al delegado nuevo le
          damos un PIN que verás una sola vez.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={enviar} noValidate className="grid gap-5">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <Campo id="insc-nombre" etiqueta="Nombre del equipo en esta liga" error={errores.nombre}>
          <Input
            id="insc-nombre"
            autoComplete="off"
            maxLength={80}
            disabled={inscribir.isPending}
            value={campos.nombre}
            aria-invalid={!!errores.nombre}
            onChange={(e) => setCampos({ ...campos, nombre: e.target.value })}
          />
        </Campo>
        <CampoClub
          valor={campos}
          onChange={(c) => setCampos({ ...campos, ...c })}
          error={errores.clubNombre}
          deshabilitado={inscribir.isPending}
        />
        <CamposDelegadoForm
          valor={campos}
          onChange={(d) => setCampos({ ...campos, ...d })}
          delegados={delegados}
          pais={pais}
          idsOcupados={ocupados}
          errores={errores}
          deshabilitado={inscribir.isPending}
        />
        <Button type="submit" disabled={inscribir.isPending}>
          {inscribir.isPending ? 'Inscribiendo…' : tardio ? 'Agregar equipo' : 'Inscribir equipo'}
        </Button>
      </form>
    </>
  );
}

// ---------- reasignar delegado

function ReasignarDialog({
  edicionId,
  equipo,
  equipos,
  onCerrar,
  onResultado,
}: {
  edicionId: string;
  equipo: EquipoDto | null;
  equipos: EquipoDto[];
  onCerrar: () => void;
  onResultado: (r: Resultado) => void;
}) {
  return (
    <Dialog open={equipo !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {equipo ? (
          <FormularioReasignar
            edicionId={edicionId}
            equipo={equipo}
            equipos={equipos}
            onCerrar={onCerrar}
            onResultado={onResultado}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioReasignar({
  edicionId,
  equipo,
  equipos,
  onCerrar,
  onResultado,
}: {
  edicionId: string;
  equipo: EquipoDto;
  equipos: EquipoDto[];
  onCerrar: () => void;
  onResultado: (r: Resultado) => void;
}) {
  const { data: delegados, error } = useDelegados();
  const { data: org } = useGetAdminOrganizacion();
  if (error) return <AlertaError>{textoError(error)}</AlertaError>;
  if (!delegados) return <p role="status">Cargando…</p>;
  const otros = delegados.filter((d) => d.activo && d.id !== equipo.delegado.id);
  return (
    <FormularioReasignarListo
      edicionId={edicionId}
      equipo={equipo}
      delegados={otros}
      ocupados={new Set(equipos.filter((e) => !e.retirado).map((e) => e.delegado.id))}
      pais={org?.pais}
      onCerrar={onCerrar}
      onResultado={onResultado}
    />
  );
}

function FormularioReasignarListo({
  edicionId,
  equipo,
  delegados,
  ocupados,
  pais,
  onCerrar,
  onResultado,
}: {
  edicionId: string;
  equipo: EquipoDto;
  delegados: React.ComponentProps<typeof CamposDelegadoForm>['delegados'];
  ocupados: Set<string>;
  pais?: string;
  onCerrar: () => void;
  onResultado: (r: Resultado) => void;
}) {
  const reasignar = useReasignarDelegado();
  const refrescar = useRefrescarLiga();
  const [campos, setCampos] = useState<CamposDelegado>(() => delegadoVacio(delegados.length > 0));
  const [errores, setErrores] = useState<ErroresDelegado>({});
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ev = validarDelegado(campos);
    setErrores(ev);
    if (hayErrores(ev)) return;
    try {
      const r = await reasignar.mutateAsync({
        edicionId,
        equipoId: equipo.id,
        data: { delegado: aDelegadoEntrada(campos) },
      });
      toast.success(`${r.equipo.nombre} ahora lo lleva ${r.equipo.delegado.nombre}.`);
      onCerrar();
      onResultado(resultadoDe(r, 'Delegado cambiado'));
    } catch (err) {
      if (esErrorDeEstado(err)) refrescar();
      if (err instanceof ApiError && campoDeError(err) === 'delegadoTelefono')
        setErrores({ delegadoTelefono: textoError(err) });
      else setError(textoError(err));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cambiar delegado de {equipo.nombre}</DialogTitle>
        <DialogDescription>
          Hoy lo lleva {equipo.delegado.nombre}. Pierde el acceso a este equipo al instante y
          conserva los demás que lleve.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={enviar} noValidate className="grid gap-5">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <CamposDelegadoForm
          valor={campos}
          onChange={setCampos}
          delegados={delegados}
          pais={pais}
          idsOcupados={ocupados}
          errores={errores}
          deshabilitado={reasignar.isPending}
        />
        <Button type="submit" disabled={reasignar.isPending}>
          {reasignar.isPending ? 'Guardando…' : 'Cambiar delegado'}
        </Button>
      </form>
    </>
  );
}

// ---------- renombrar

function RenombrarDialog({
  edicionId,
  equipo,
  onCerrar,
}: {
  edicionId: string;
  equipo: EquipoDto | null;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={equipo !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {equipo ? (
          <FormularioRenombrar
            key={equipo.id}
            edicionId={edicionId}
            equipo={equipo}
            onCerrar={onCerrar}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioRenombrar({
  edicionId,
  equipo,
  onCerrar,
}: {
  edicionId: string;
  equipo: EquipoDto;
  onCerrar: () => void;
}) {
  const renombrar = useRenombrarEquipo();
  const refrescar = useRefrescarLiga();
  const [nombre, setNombre] = useState(equipo.nombre);
  const [errorCampo, setErrorCampo] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorCampo(undefined);
    const limpio = nombre.trim();
    if (limpio.length < 2) return setErrorCampo('Escribe el nombre del equipo (mínimo 2 letras).');
    if (limpio === equipo.nombre) return onCerrar();
    try {
      await renombrar.mutateAsync({ edicionId, equipoId: equipo.id, data: { nombre: limpio } });
      toast.success('Equipo renombrado.');
      onCerrar();
    } catch (err) {
      if (esErrorDeEstado(err)) refrescar();
      if (err instanceof ApiError && campoDeError(err) === 'nombre') setErrorCampo(textoError(err));
      else setError(textoError(err));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Renombrar equipo</DialogTitle>
        <DialogDescription>
          El nombre cambia solo en esta liga; el mismo club en otras ligas no se toca.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={guardar} noValidate className="grid gap-4">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <Campo id="ren-nombre" etiqueta="Nombre del equipo" error={errorCampo}>
          <Input
            id="ren-nombre"
            autoComplete="off"
            maxLength={80}
            value={nombre}
            aria-invalid={!!errorCampo}
            onChange={(e) => setNombre(e.target.value)}
          />
        </Campo>
        <Button type="submit" disabled={renombrar.isPending}>
          {renombrar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>
    </>
  );
}

// ---------- retirar

function RetirarDialog({
  edicionId,
  definitivo,
  equipo,
  onCerrar,
}: {
  edicionId: string;
  definitivo: boolean;
  equipo: EquipoDto | null;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={equipo !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {equipo ? (
          <FormularioRetirar
            key={equipo.id}
            edicionId={edicionId}
            definitivo={definitivo}
            equipo={equipo}
            onCerrar={onCerrar}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioRetirar({
  edicionId,
  definitivo,
  equipo,
  onCerrar,
}: {
  edicionId: string;
  definitivo: boolean;
  equipo: EquipoDto;
  onCerrar: () => void;
}) {
  const retirar = useRetirarEquipo();
  const refrescar = useRefrescarLiga();
  const [motivo, setMotivo] = useState('');
  const [errorCampo, setErrorCampo] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorCampo(undefined);
    if (motivo.trim() === '') return setErrorCampo('Cuéntanos el motivo del retiro.');
    try {
      await retirar.mutateAsync({
        edicionId,
        equipoId: equipo.id,
        data: { motivo: motivo.trim() },
      });
      toast.success(`${equipo.nombre} fue retirado de la liga.`);
      onCerrar();
    } catch (err) {
      if (esErrorDeEstado(err)) refrescar();
      setError(textoError(err));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Retirar a {equipo.nombre}</DialogTitle>
        <DialogDescription>
          No se borra: queda retirado, con fecha y motivo.{' '}
          {definitivo
            ? 'Con la liga en marcha el retiro es definitivo: el equipo no vuelve.'
            : 'Antes de que arranque la liga puedes reincorporarlo.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={confirmar} noValidate className="grid gap-4">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <Campo id="ret-motivo" etiqueta="Motivo" error={errorCampo}>
          <Input
            id="ret-motivo"
            autoComplete="off"
            maxLength={500}
            value={motivo}
            aria-invalid={!!errorCampo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>
        <Button type="submit" variant="destructive" disabled={retirar.isPending}>
          {retirar.isPending ? 'Retirando…' : 'Retirar equipo'}
        </Button>
      </form>
    </>
  );
}
