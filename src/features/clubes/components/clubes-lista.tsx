'use client';

import { useState } from 'react';
import { Pencil, Plus, Power } from 'lucide-react';
import { toast } from 'sonner';
import { useActualizarClub, useClubes, useCrearClub } from '@/features/equipos/api';
import type { ClubDto } from '@/features/equipos/tipos';
import { campoDeError, mensajeDeError, mensajeGenerico } from '@/shared/api/errors/es';
import { ApiError } from '@/shared/api/mutator';
import { Button } from '@/shared/ui/button';
import { AlertaError, Campo } from '@/shared/ui/campo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';

export function ClubesLista() {
  const { data, isLoading, error } = useClubes();
  const [editando, setEditando] = useState<ClubDto | 'nuevo' | null>(null);
  const actualizar = useActualizarClub();

  async function alternarActivo(c: ClubDto) {
    try {
      await actualizar.mutateAsync({ id: c.id, data: { activo: !c.activo } });
      toast.success(c.activo ? 'Club desactivado.' : 'Club activado.');
    } catch (e) {
      toast.error(e instanceof ApiError ? mensajeDeError(e) : mensajeGenerico());
    }
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl">Clubes</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Los clubes de tu cliente. Un club se reutiliza en cada liga en la que juega. Normalmente
            se crean al inscribir un equipo; aquí puedes verlos, renombrarlos o desactivarlos.
          </p>
        </div>
        <Button onClick={() => setEditando('nuevo')}>
          <Plus data-icon="inline-start" />
          Nuevo club
        </Button>
      </div>

      {error ? (
        <AlertaError>
          {error instanceof ApiError ? mensajeDeError(error) : mensajeGenerico()}
        </AlertaError>
      ) : null}
      {isLoading ? <p role="status">Cargando clubes…</p> : null}
      {data && data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no hay clubes. Se crean al inscribir el primer equipo de una liga.
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <ul className="grid gap-2">
          {data.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3"
            >
              <div className="grid gap-0.5">
                <p className="font-semibold">
                  {c.nombre}
                  {!c.activo ? (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                      Desactivado
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {c.equipos === 0
                    ? 'Sin ligas'
                    : `En ${c.equipos} ${c.equipos === 1 ? 'liga' : 'ligas'}`}{' '}
                  · registrado por {c.creadoPor.nombre}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditando(c)}>
                  <Pencil data-icon="inline-start" />
                  Renombrar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alternarActivo(c)}
                  disabled={actualizar.isPending}
                >
                  <Power data-icon="inline-start" />
                  {c.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={editando !== null} onOpenChange={(abierto) => !abierto && setEditando(null)}>
        <DialogContent>
          {editando !== null ? (
            <FormularioClub
              key={editando === 'nuevo' ? 'nuevo' : editando.id}
              club={editando === 'nuevo' ? null : editando}
              onListo={() => setEditando(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function FormularioClub({ club, onListo }: { club: ClubDto | null; onListo: () => void }) {
  const crear = useCrearClub();
  const actualizar = useActualizarClub();
  const [nombre, setNombre] = useState(club?.nombre ?? '');
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendiente = crear.isPending || actualizar.isPending;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorCampo(null);
    const limpio = nombre.trim();
    if (limpio.length < 2) return setErrorCampo('Escribe el nombre del club (mínimo 2 letras).');
    try {
      if (club) await actualizar.mutateAsync({ id: club.id, data: { nombre: limpio } });
      else await crear.mutateAsync(limpio);
      toast.success(club ? 'Club actualizado.' : 'Club creado.');
      onListo();
    } catch (err) {
      if (!(err instanceof ApiError)) return setError(mensajeGenerico());
      if (campoDeError(err) === 'clubNombre') setErrorCampo(mensajeDeError(err));
      else setError(mensajeDeError(err));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{club ? 'Renombrar club' : 'Nuevo club'}</DialogTitle>
        <DialogDescription>
          El nombre es único en tu cliente, sin importar mayúsculas, tildes ni guiones.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={guardar} noValidate className="grid gap-4">
        {error ? <AlertaError>{error}</AlertaError> : null}
        <Campo id="club-nombre" etiqueta="Nombre del club" error={errorCampo ?? undefined}>
          <Input
            id="club-nombre"
            autoComplete="off"
            maxLength={80}
            value={nombre}
            aria-invalid={!!errorCampo}
            onChange={(e) => setNombre(e.target.value)}
          />
        </Campo>
        <Button type="submit" disabled={pendiente}>
          {pendiente ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>
    </>
  );
}
