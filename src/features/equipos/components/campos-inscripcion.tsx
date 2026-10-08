'use client';

import type { ClubDto, DelegadoDto } from '../tipos';
import {
  yaTieneCategoria,
  type ClubCampos,
  type DelegadoCampos,
  type ErroresClub,
  type ErroresDelegado,
} from '../lib/inscripcion';
import { Campo } from '@/shared/ui/campo';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';

function Modo({
  nombre,
  valor,
  onCambio,
  opciones,
}: {
  nombre: string;
  valor: 'existente' | 'nuevo';
  onCambio: (v: 'existente' | 'nuevo') => void;
  opciones: { valor: 'existente' | 'nuevo'; texto: string; deshabilitada?: boolean }[];
}) {
  return (
    <div className="flex flex-wrap gap-4" role="radiogroup">
      {opciones.map((o) => (
        <label key={o.valor} className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={nombre}
            className="size-4 accent-primary"
            checked={valor === o.valor}
            disabled={o.deshabilitada}
            onChange={() => onCambio(o.valor)}
          />
          {o.texto}
        </label>
      ))}
    </div>
  );
}

export function CamposClub({
  valor,
  onChange,
  clubes,
  errores,
  deshabilitado,
}: {
  valor: ClubCampos;
  onChange: (v: ClubCampos) => void;
  /** Clubes que se pueden elegir (activos y que aún no están en la liga). */
  clubes: ClubDto[];
  errores: ErroresClub;
  deshabilitado?: boolean;
}) {
  return (
    <fieldset className="grid gap-3" disabled={deshabilitado}>
      <legend className="mb-1 text-base font-semibold">Club</legend>
      <Modo
        nombre="club-modo"
        valor={valor.modo}
        onCambio={(modo) => onChange({ ...valor, modo })}
        opciones={[
          { valor: 'existente', texto: 'Uno que ya existe', deshabilitada: clubes.length === 0 },
          { valor: 'nuevo', texto: 'Un club nuevo' },
        ]}
      />
      {valor.modo === 'existente' ? (
        <Campo id="insc-club" etiqueta="Club" error={errores.id}>
          <Select
            id="insc-club"
            value={valor.id}
            aria-invalid={!!errores.id}
            onChange={(e) => onChange({ ...valor, id: e.target.value })}
          >
            <option value="">Elige un club</option>
            {clubes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Campo>
      ) : (
        <Campo id="insc-club-nombre" etiqueta="Nombre del club" error={errores.nombre}>
          <Input
            id="insc-club-nombre"
            autoComplete="off"
            maxLength={80}
            value={valor.nombre}
            aria-invalid={!!errores.nombre}
            onChange={(e) => onChange({ ...valor, nombre: e.target.value })}
          />
        </Campo>
      )}
    </fieldset>
  );
}

export function CamposDelegado({
  valor,
  onChange,
  delegados,
  categoria,
  ignorarEquipoId,
  errores,
  deshabilitado,
}: {
  valor: DelegadoCampos;
  onChange: (v: DelegadoCampos) => void;
  delegados: DelegadoDto[];
  /** Categoría de la liga: un delegado nunca lleva dos equipos de la misma. */
  categoria: string;
  ignorarEquipoId?: string;
  errores: ErroresDelegado;
  deshabilitado?: boolean;
}) {
  return (
    <fieldset className="grid gap-3" disabled={deshabilitado}>
      <legend className="mb-1 text-base font-semibold">Delegado</legend>
      <Modo
        nombre="delegado-modo"
        valor={valor.modo}
        onCambio={(modo) => onChange({ ...valor, modo })}
        opciones={[
          { valor: 'existente', texto: 'Uno que ya existe', deshabilitada: delegados.length === 0 },
          { valor: 'nuevo', texto: 'Un delegado nuevo' },
        ]}
      />
      {valor.modo === 'existente' ? (
        <Campo id="insc-delegado" etiqueta="Delegado" error={errores.id}>
          <Select
            id="insc-delegado"
            value={valor.id}
            aria-invalid={!!errores.id}
            onChange={(e) => onChange({ ...valor, id: e.target.value })}
          >
            <option value="">Elige un delegado</option>
            {delegados.map((d) => {
              const choca = yaTieneCategoria(d, categoria, ignorarEquipoId);
              return (
                <option key={d.id} value={d.id} disabled={choca}>
                  {d.nombre} · {d.telefono}
                  {choca ? ' (ya lleva un equipo de esta categoría)' : ''}
                </option>
              );
            })}
          </Select>
        </Campo>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="insc-del-nombre" etiqueta="Nombre del delegado" error={errores.nombre}>
            <Input
              id="insc-del-nombre"
              autoComplete="off"
              maxLength={80}
              value={valor.nombre}
              aria-invalid={!!errores.nombre}
              onChange={(e) => onChange({ ...valor, nombre: e.target.value })}
            />
          </Campo>
          <Campo
            id="insc-del-telefono"
            etiqueta="Teléfono (WhatsApp)"
            ayuda="Con código de país. Es su usuario para entrar."
            error={errores.telefono}
          >
            <Input
              id="insc-del-telefono"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="+50588888888"
              value={valor.telefono}
              aria-invalid={!!errores.telefono}
              onChange={(e) => onChange({ ...valor, telefono: e.target.value })}
            />
          </Campo>
        </div>
      )}
    </fieldset>
  );
}
