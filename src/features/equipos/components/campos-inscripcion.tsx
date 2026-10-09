'use client';

import { useDeferredValue } from 'react';
import { useClubes } from '@/features/clubes/api';
import type { DelegadoDto } from '@/shared/api/generated/models';
import { Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import {
  vistaPreviaTelefono,
  type CamposDelegado,
  type CamposEquipo,
  type ErroresDelegado,
  type ErroresEquipo,
} from '../lib/inscripcion';

/**
 * Club opcional con autocompletar sobre `listarClubes?q=`. Elegir uno envía `club: { id }`; si solo se escribe un
 * nombre no se envía nada y el API reutiliza o crea el club en silencio (sin avisos de «ya existe»).
 */
export function CampoClub({
  valor,
  onChange,
  error,
  deshabilitado,
}: {
  valor: Pick<CamposEquipo, 'clubTexto' | 'clubId'>;
  onChange: (v: Pick<CamposEquipo, 'clubTexto' | 'clubId'>) => void;
  error?: ErroresEquipo['clubNombre'];
  deshabilitado?: boolean;
}) {
  const q = useDeferredValue(valor.clubTexto.trim());
  const { data } = useClubes({ q });
  const sugerencias =
    !valor.clubId && q !== '' ? (data ?? []).filter((c) => c.activo).slice(0, 6) : [];

  return (
    <div className="grid gap-1.5">
      <Campo
        id="insc-club"
        etiqueta="Club (opcional)"
        ayuda="Si no eliges uno, usamos el club con ese nombre o creamos uno nuevo."
        error={error}
      >
        <Input
          id="insc-club"
          autoComplete="off"
          maxLength={80}
          disabled={deshabilitado}
          value={valor.clubTexto}
          aria-invalid={!!error}
          aria-controls="insc-club-lista"
          onChange={(e) => onChange({ clubTexto: e.target.value, clubId: '' })}
        />
      </Campo>
      {sugerencias.length > 0 ? (
        <ul
          id="insc-club-lista"
          aria-label="Clubes que coinciden"
          className="grid gap-1 rounded-lg border bg-card p-1"
        >
          {sugerencias.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm hover:bg-muted focus-visible:bg-muted"
                onClick={() => onChange({ clubTexto: c.nombre, clubId: c.id })}
              >
                <span>{c.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {c.equipos} {c.equipos === 1 ? 'equipo' : 'equipos'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {valor.clubId ? (
        <p role="status" className="text-xs text-muted-foreground">
          Club elegido de la lista.
        </p>
      ) : null}
    </div>
  );
}

export function CamposDelegadoForm({
  valor,
  onChange,
  delegados,
  pais,
  idsOcupados,
  errores,
  deshabilitado,
}: {
  valor: CamposDelegado;
  onChange: (v: CamposDelegado) => void;
  /** Delegados que se pueden elegir (activos). */
  delegados: DelegadoDto[];
  /** País del cliente (ISO) para la vista previa del teléfono local. */
  pais?: string | null;
  /** Delegados que ya llevan un equipo en esta liga: solo se anota, el API manda. */
  idsOcupados?: Set<string>;
  errores: ErroresDelegado;
  deshabilitado?: boolean;
}) {
  const e164 = vistaPreviaTelefono(valor.delegadoTelefono, pais);
  const hayTelefono = valor.delegadoTelefono.trim() !== '';

  return (
    <fieldset className="grid gap-3" disabled={deshabilitado}>
      <legend className="mb-1 text-base font-semibold">Delegado</legend>
      <div className="flex flex-wrap gap-4" role="radiogroup" aria-label="Tipo de delegado">
        {(
          [
            ['existente', 'Uno que ya existe'],
            ['nuevo', 'Un delegado nuevo'],
          ] as const
        ).map(([modo, texto]) => (
          <label key={modo} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="delegado-modo"
              className="size-4 accent-primary"
              checked={valor.delegadoModo === modo}
              disabled={modo === 'existente' && delegados.length === 0}
              onChange={() => onChange({ ...valor, delegadoModo: modo })}
            />
            {texto}
          </label>
        ))}
      </div>

      {valor.delegadoModo === 'existente' ? (
        <Campo
          id="insc-delegado"
          etiqueta="Delegado"
          error={errores.delegadoId ?? errores.delegadoTelefono}
        >
          <Select
            id="insc-delegado"
            value={valor.delegadoId}
            aria-invalid={!!(errores.delegadoId ?? errores.delegadoTelefono)}
            onChange={(e) => onChange({ ...valor, delegadoId: e.target.value })}
          >
            <option value="">Elige un delegado</option>
            {delegados.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre} · {d.telefono}
                {idsOcupados?.has(d.id) ? ' (ya lleva un equipo en esta liga)' : ''}
              </option>
            ))}
          </Select>
        </Campo>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="insc-del-nombre" etiqueta="Nombre del delegado" error={errores.delegadoNombre}>
            <Input
              id="insc-del-nombre"
              autoComplete="off"
              maxLength={80}
              value={valor.delegadoNombre}
              aria-invalid={!!errores.delegadoNombre}
              onChange={(e) => onChange({ ...valor, delegadoNombre: e.target.value })}
            />
          </Campo>
          <Campo
            id="insc-del-telefono"
            etiqueta="Teléfono (WhatsApp)"
            ayuda={
              hayTelefono
                ? e164
                  ? `Se guardará como ${e164}.`
                  : 'No reconocemos este formato; igual lo revisará el sistema al guardar.'
                : 'Puedes escribirlo local (8888 8888) o con código de país (+505…). Es su usuario para entrar.'
            }
            error={errores.delegadoTelefono}
          >
            <Input
              id="insc-del-telefono"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={valor.delegadoTelefono}
              aria-invalid={!!errores.delegadoTelefono}
              onChange={(e) => onChange({ ...valor, delegadoTelefono: e.target.value })}
            />
          </Campo>
        </div>
      )}
      {valor.delegadoModo === 'nuevo' ? (
        <p className="text-xs text-muted-foreground">
          Si ese teléfono ya es de un delegado de tu cliente, se reutiliza: conserva su nombre y su
          PIN, y no se genera uno nuevo.
        </p>
      ) : null}
    </fieldset>
  );
}
