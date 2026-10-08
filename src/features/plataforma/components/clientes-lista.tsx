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

function EstadoDueno({ cliente }: { cliente: OrganizacionDto }) {
  if (cliente.owner) return <span>{cliente.owner.nombre}</span>;
  if (cliente.invitacionOwner) {
    return (
      <span className="text-muted-foreground">
        Invitación pendiente · vence {fechaCorta(cliente.invitacionOwner.expiraEn)}
      </span>
    );
  }
  return <span className="text-muted-foreground">Sin dueño</span>;
}

export function ClientesLista() {
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
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Button asChild>
          <Link href="/plataforma/clientes/nuevo">
            <Plus data-icon="inline-start" />
            Nuevo cliente
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
          aria-label="Buscar clientes"
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
          <option value="">Todos</option>
          <option value="ACTIVA">Activos</option>
          <option value="BLOQUEADA">Bloqueados</option>
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
          Cargando clientes…
        </p>
      ) : data && data.items.length === 0 ? (
        <p className="text-muted-foreground">No hay clientes que coincidan.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Clientes de la plataforma</caption>
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Cliente
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
              {data?.items.map((cliente) => (
                <tr key={cliente.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link
                      href={`/plataforma/clientes/${cliente.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {cliente.nombre}
                    </Link>
                    <div className="text-xs text-muted-foreground">{cliente.slug}</div>
                  </td>
                  <td className="px-3 py-2">
                    <EstadoBadge estado={cliente.estado} />
                  </td>
                  <td className="px-3 py-2">
                    <EstadoDueno cliente={cliente} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {fechaCorta(cliente.creadoEn)}
                  </td>
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
            Página {pagina + 1} de {ultimaPagina + 1} · {total} clientes
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
