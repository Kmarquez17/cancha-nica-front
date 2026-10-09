'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';
import { mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import type { ClubDto } from '@/shared/api/generated/models';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { useArchivarClub, useClubes, useRestaurarClub } from '../api';

export function ClubesLista() {
  const [q, setQ] = useState('');
  const [archivados, setArchivados] = useState(false);
  const { data, isLoading, error } = useClubes({ q: q.trim(), archivados });
  const archivar = useArchivarClub();
  const restaurar = useRestaurarClub();

  async function alternar(c: ClubDto) {
    try {
      if (c.activo) await archivar.mutateAsync({ id: c.id });
      else await restaurar.mutateAsync({ id: c.id });
      toast.success(c.activo ? 'Club archivado.' : 'Club restaurado.');
    } catch (e) {
      toast.error(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl">Clubes</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          La identidad permanente de cada equipo de tu cliente. Un club se crea solo al inscribir un
          equipo y se reutiliza en cada liga en la que juega. Si archivas uno, deja de ofrecerse al
          inscribir; sus equipos siguen donde están.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          aria-label="Buscar club"
          placeholder="Buscar club…"
          autoComplete="off"
          className="max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={archivados}
            onChange={(e) => setArchivados(e.target.checked)}
          />
          Ver archivados
        </label>
      </div>

      {error ? (
        <AlertaError>
          {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
        </AlertaError>
      ) : null}
      {isLoading ? <p role="status">Cargando clubes…</p> : null}
      {data && data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {q.trim() || archivados
            ? 'No hay clubes que coincidan.'
            : 'Aún no hay clubes. Se crean al inscribir el primer equipo de una liga.'}
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <ul className="grid gap-2">
          {data.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3"
            >
              <div className="grid gap-1">
                <p className="font-semibold">
                  {c.nombre}
                  {!c.activo ? (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                      Archivado
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {c.equipos === 0
                    ? 'Sin equipos'
                    : `${c.equipos} ${c.equipos === 1 ? 'equipo' : 'equipos'}`}
                  {c.ligas.length > 0 ? ` · ${c.ligas.map((l) => l.nombre).join(', ')}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">Registrado por {c.creadoPor.nombre}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => alternar(c)}
                disabled={archivar.isPending || restaurar.isPending}
              >
                {c.activo ? (
                  <Archive data-icon="inline-start" />
                ) : (
                  <ArchiveRestore data-icon="inline-start" />
                )}
                {c.activo ? 'Archivar' : 'Restaurar'}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
