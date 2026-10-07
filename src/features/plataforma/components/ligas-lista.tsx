'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
import type { EstadoOrganizacion, OrganizacionDto } from '@/shared/api/generated/models';
import { useListarOrganizaciones } from '@/shared/api/generated/plataforma/plataforma';
import { Button } from '@/shared/ui/button';
import { AlertaError } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { fechaCorta } from '../lib/formato';
import { EstadoBadge } from './estado-badge';

const POR_PAGINA = 20;

function EstadoInvitacion({ liga }: { liga: OrganizacionDto }) {
  if (liga.owner) return <span>{liga.owner.nombre}</span>;
  if (liga.invitacionOwner) {
    return (
      <span className="text-muted-foreground">
        Invitación pendiente · vence {fechaCorta(liga.invitacionOwner.expiraEn)}
      </span>
    );
  }
  return <span className="text-muted-foreground">Sin dueño</span>;
}

export function LigasLista() {
  const [estado, setEstado] = useState<EstadoOrganizacion | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(0);

  const { data, isLoading, error } = useListarOrganizaciones({
    estado: estado || undefined,
    q: q || undefined,
    limit: POR_PAGINA,
    offset: pagina * POR_PAGINA,
  });

  const total = data?.total ?? 0;
  const ultimaPagina = Math.max(0, Math.ceil(total / POR_PAGINA) - 1);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ligas</h1>
        <Button asChild>
          <Link href="/plataforma/ligas/nueva">
            <Plus data-icon="inline-start" />
            Nueva liga
          </Link>
        </Button>
      </div>

      <form
        role="search"
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(busqueda.trim());
          setPagina(0);
        }}
      >
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o slug"
          aria-label="Buscar ligas"
          className="max-w-xs"
        />
        <select
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoOrganizacion | '');
            setPagina(0);
          }}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="">Todas</option>
          <option value="ACTIVA">Activas</option>
          <option value="BLOQUEADA">Bloqueadas</option>
        </select>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {error ? (
        <AlertaError>
          {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
        </AlertaError>
      ) : null}

      {isLoading ? (
        <p role="status" className="text-muted-foreground">
          Cargando ligas…
        </p>
      ) : data && data.items.length === 0 ? (
        <p className="text-muted-foreground">No hay ligas que coincidan.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Ligas de la plataforma</caption>
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Liga
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Estado
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Dueño
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Alta
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((liga) => (
                <tr key={liga.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link
                      href={`/plataforma/ligas/${liga.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {liga.nombre}
                    </Link>
                    <div className="text-xs text-muted-foreground">{liga.slug}</div>
                  </td>
                  <td className="px-3 py-2">
                    <EstadoBadge estado={liga.estado} />
                  </td>
                  <td className="px-3 py-2">
                    <EstadoInvitacion liga={liga} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{fechaCorta(liga.creadoEn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > POR_PAGINA ? (
        <nav aria-label="Paginación" className="flex items-center justify-between text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={pagina === 0}
            onClick={() => setPagina(pagina - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {pagina + 1} de {ultimaPagina + 1} · {total} ligas
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina >= ultimaPagina}
            onClick={() => setPagina(pagina + 1)}
          >
            Siguiente
          </Button>
        </nav>
      ) : null}
    </section>
  );
}
