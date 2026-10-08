'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError } from '@/shared/ui/campo';
import { useEdiciones } from '../api';
import { EstadoLiga, ModalidadInsignia } from './estado-liga';

export function LigasLista() {
  const [verArchivadas, setVerArchivadas] = useState(false);
  const { data, isLoading, error } = useEdiciones(verArchivadas);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl">Ligas</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Cada liga es un torneo de una categoría y una modalidad.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/ligas/nueva">
            <Plus data-icon="inline-start" />
            Nueva liga
          </Link>
        </Button>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={verArchivadas}
          onChange={(e) => setVerArchivadas(e.target.checked)}
          className="size-4 accent-primary"
        />
        Mostrar archivadas
      </label>

      {error ? (
        <AlertaError>
          {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
        </AlertaError>
      ) : null}
      {isLoading ? <p role="status">Cargando ligas…</p> : null}

      {data && data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay ligas. Crea la primera para empezar a inscribir equipos.
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {data.map((l) => (
            <li key={l.id}>
              <Link
                href={`/admin/ligas/${l.id}`}
                className="grid gap-2 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-heading text-xl font-extrabold italic">{l.nombre}</p>
                  <EstadoLiga estado={l.estado} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <ModalidadInsignia modalidad={l.modalidad} />
                  <span>{l.categoria.nombre}</span>
                  <span>· inicia {l.fechaInicio}</span>
                  {l.archivadaEn ? <span>· archivada</span> : null}
                </div>
                <p className="text-xs text-muted-foreground">Registrada por {l.creadoPor.nombre}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
