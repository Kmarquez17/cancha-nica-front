'use client';

import { useState } from 'react';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import {
  useListarCategoriasDeOrganizacion,
  useListarDelegadosDeOrganizacion,
  useListarEdicionesDeOrganizacion,
  useListarEquiposDeOrganizacion,
  useListarMesasDeOrganizacion,
} from '@/shared/api/generated/plataforma/plataforma';
import { ApiError } from '@/shared/api/mutator';
import { cn } from '@/shared/lib/utils';
import { AlertaError } from '@/shared/ui/campo';

type Pestana = 'categorias' | 'ligas' | 'mesas' | 'equipos' | 'delegados';

const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: 'categorias', texto: 'Categorías' },
  { id: 'ligas', texto: 'Ligas' },
  { id: 'mesas', texto: 'Mesas' },
  { id: 'equipos', texto: 'Equipos' },
  { id: 'delegados', texto: 'Delegados' },
];

const NOMBRE_ESTADO: Record<string, string> = {
  CONFIGURACION: 'En configuración',
  EN_REGISTRO: 'Inscripciones abiertas',
  EN_CURSO: 'En juego',
  EN_ELIMINATORIAS: 'Eliminatorias',
  PAUSADA: 'Pausada',
  FINALIZADA: 'Finalizada',
};

const NOMBRE_MODALIDAD: Record<string, string> = {
  FUTSAL: 'Fútbol sala',
  FUTBOL_9: 'Fútbol 9',
  FUTBOL_11: 'Fútbol 11',
};

const hora = (iso: string) =>
  new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/**
 * Lo que el cliente ya armó: categorías, ligas, mesas, equipos y delegados, **solo lectura** (Plataforma no escribe nada de esto).
 * Cada lista se pide cuando se abre su pestaña.
 */
export function ActividadCliente({ clienteId }: { clienteId: string }) {
  const [pestana, setPestana] = useState<Pestana | null>(null);

  return (
    <div className="grid gap-3">
      <div role="group" aria-label="Qué ver del cliente" className="flex flex-wrap gap-2">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={pestana === p.id}
            onClick={() => setPestana(pestana === p.id ? null : p.id)}
            className={cn(
              'h-8 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              pestana === p.id ? 'border-primary bg-primary/10' : 'hover:bg-muted',
            )}
          >
            {p.texto}
          </button>
        ))}
      </div>
      {pestana === 'categorias' ? <Categorias id={clienteId} /> : null}
      {pestana === 'ligas' ? <Ligas id={clienteId} /> : null}
      {pestana === 'mesas' ? <Mesas id={clienteId} /> : null}
      {pestana === 'equipos' ? <Equipos id={clienteId} /> : null}
      {pestana === 'delegados' ? <Delegados id={clienteId} /> : null}
    </div>
  );
}

function Estado({
  cargando,
  error,
  vacio,
  textoVacio,
}: {
  cargando: boolean;
  error: unknown;
  vacio: boolean;
  textoVacio: string;
}) {
  if (cargando) return <p role="status">Cargando…</p>;
  if (error)
    return (
      <AlertaError>
        {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
      </AlertaError>
    );
  if (vacio) return <p className="text-sm text-muted-foreground">{textoVacio}</p>;
  return null;
}

function Categorias({ id }: { id: string }) {
  const { data, isLoading, error } = useListarCategoriasDeOrganizacion(id);
  return (
    <>
      <Estado
        cargando={isLoading}
        error={error}
        vacio={data?.length === 0}
        textoVacio="Este cliente aún no tiene categorías."
      />
      {data && data.length > 0 ? (
        <ul aria-label="Categorías del cliente" className="grid gap-2">
          {data.map((c) => (
            <li key={c.id} className="rounded-lg border bg-card p-3 text-sm">
              <span className="font-semibold">{c.nombre}</span>
              {!c.activa ? <span className="text-muted-foreground"> · archivada</span> : null}
              <span className="text-muted-foreground">
                {' '}
                · {c.ediciones} {c.ediciones === 1 ? 'liga' : 'ligas'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function Ligas({ id }: { id: string }) {
  const { data, isLoading, error } = useListarEdicionesDeOrganizacion(id);
  return (
    <>
      <Estado
        cargando={isLoading}
        error={error}
        vacio={data?.length === 0}
        textoVacio="Este cliente aún no tiene ligas."
      />
      {data && data.length > 0 ? (
        <ul aria-label="Ligas del cliente" className="grid gap-2">
          {data.map((l) => (
            <li key={l.id} className="rounded-lg border bg-card p-3 text-sm">
              <span className="font-semibold">{l.nombre}</span>
              <span className="text-muted-foreground">
                {' '}
                · {l.categoria.nombre} · {NOMBRE_MODALIDAD[l.modalidad] ?? l.modalidad} ·{' '}
                {NOMBRE_ESTADO[l.estado] ?? l.estado}
                {l.archivadaEn ? ' · archivada' : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function Mesas({ id }: { id: string }) {
  const { data, isLoading, error } = useListarMesasDeOrganizacion(id);
  return (
    <>
      <Estado
        cargando={isLoading}
        error={error}
        vacio={data?.length === 0}
        textoVacio="Este cliente aún no tiene mesas."
      />
      {data && data.length > 0 ? (
        <ul aria-label="Mesas del cliente" className="grid gap-2">
          {data.map((m) => (
            <li key={m.id} className="rounded-lg border bg-card p-3 text-sm">
              <span className="marcador font-semibold">{m.username}</span>
              <span className="text-muted-foreground">
                {m.nombreOperador ? ` · ${m.nombreOperador}` : ''} ·{' '}
                {m.acceso.estado === 'BLOQUEADA'
                  ? `bloqueada${m.acceso.bloqueadaHasta ? ` hasta las ${hora(m.acceso.bloqueadaHasta)}` : ''}`
                  : m.acceso.estado === 'DESACTIVADA'
                    ? 'desactivada'
                    : 'activa'}{' '}
                · {m.ediciones.length} {m.ediciones.length === 1 ? 'liga' : 'ligas'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function Equipos({ id }: { id: string }) {
  const { data, isLoading, error } = useListarEquiposDeOrganizacion(id);
  return (
    <>
      <Estado
        cargando={isLoading}
        error={error}
        vacio={data?.length === 0}
        textoVacio="Este cliente aún no tiene equipos."
      />
      {data && data.length > 0 ? (
        <ul aria-label="Equipos del cliente" className="grid gap-2">
          {data.map((e) => (
            <li key={e.id} className="rounded-lg border bg-card p-3 text-sm">
              <span className="font-semibold">{e.nombre}</span>
              <span className="text-muted-foreground">
                {' '}
                · club {e.club.nombre} · {e.edicion.nombre} · delegado {e.delegado.nombre}
                {e.estado === 'RETIRADO' ? ' · retirado' : ''} · inscrito por {e.creadoPor.nombre}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function Delegados({ id }: { id: string }) {
  const { data, isLoading, error } = useListarDelegadosDeOrganizacion(id);
  return (
    <>
      <Estado
        cargando={isLoading}
        error={error}
        vacio={data?.length === 0}
        textoVacio="Este cliente aún no tiene delegados."
      />
      {data && data.length > 0 ? (
        <ul aria-label="Delegados del cliente" className="grid gap-2">
          {data.map((d) => (
            <li key={d.id} className="rounded-lg border bg-card p-3 text-sm">
              <span className="font-semibold">{d.nombre}</span>
              <span className="text-muted-foreground">
                {d.activo ? '' : ' · desactivado'}
                {d.ultimoAccesoEn === null ? ' · aún no ha entrado' : ''} · {d.equipos.length}{' '}
                {d.equipos.length === 1 ? 'equipo' : 'equipos'} · registrado por{' '}
                {d.creadoPor.nombre}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
