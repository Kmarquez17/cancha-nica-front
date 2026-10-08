'use client';

import Link from 'next/link';
import { Check, Circle } from 'lucide-react';
import { useMesas } from '@/features/mesas/api';
import { useGetAdminMe } from '@/shared/api/generated/admin/admin';
import { useCategorias, useEdiciones } from '../api';
import { ESTADO_TEXTO } from '../lib/textos';
import { EstadoLiga } from './estado-liga';

/** Inicio del admin: qué sigue para dejar la liga lista, y el estado de lo que ya existe. */
export function AdminInicio() {
  const { data: yo } = useGetAdminMe();
  const nombre = yo?.organizacion.nombre ?? '';
  const categorias = useCategorias(false);
  const ligas = useEdiciones(false);
  const mesas = useMesas();

  const nCategorias = categorias.data?.length ?? 0;
  const nLigas = ligas.data?.length ?? 0;
  const nMesas = mesas.data?.length ?? 0;
  const cargando = categorias.isLoading || ligas.isLoading || mesas.isLoading;

  // El orden importa: una liga necesita categoría y una mesa necesita ligas que operar.
  const pasos = [
    {
      hecho: nCategorias > 0,
      texto: 'Crea tus categorías',
      detalle: 'Libre, Sub-18…',
      href: '/admin/categorias',
    },
    {
      hecho: nLigas > 0,
      texto: 'Crea tu primera liga',
      detalle: 'Modalidad, fechas y reglas',
      href: '/admin/ligas/nueva',
    },
    {
      hecho: nMesas > 0,
      texto: 'Crea una mesa',
      detalle: 'Quien lleva el marcador',
      href: '/admin/mesas',
    },
  ];
  const todoListo = pasos.every((p) => p.hecho);

  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <p className="text-sm text-muted-foreground">{nombre}</p>
        <h1 className="text-3xl">Tu liga</h1>
      </div>

      {!cargando && !todoListo ? (
        <div className="grid gap-3 rounded-lg border bg-card p-4">
          <h2 className="text-xl">Para empezar</h2>
          <ol className="grid gap-2">
            {pasos.map((p) => (
              <li key={p.texto}>
                <Link
                  href={p.href}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {p.hecho ? (
                    <Check className="size-5 text-success" aria-label="Hecho" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground" aria-label="Pendiente" />
                  )}
                  <span
                    className={p.hecho ? 'text-muted-foreground line-through' : 'font-semibold'}
                  >
                    {p.texto}
                  </span>
                  <span className="text-sm text-muted-foreground">{p.detalle}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Resumen
          titulo="Categorías"
          valor={nCategorias}
          href="/admin/categorias"
          cargando={categorias.isLoading}
        />
        <Resumen titulo="Ligas" valor={nLigas} href="/admin/ligas" cargando={ligas.isLoading} />
        <Resumen
          titulo="Mesas"
          valor={`${nMesas} de 6`}
          href="/admin/mesas"
          cargando={mesas.isLoading}
        />
      </div>

      {ligas.data && ligas.data.length > 0 ? (
        <div className="grid gap-3">
          <h2 className="text-2xl">Ligas</h2>
          <ul className="grid gap-2">
            {ligas.data.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/admin/ligas/${l.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="font-semibold">
                    {l.nombre}{' '}
                    <span className="font-normal text-muted-foreground">
                      · {l.categoria.nombre}
                    </span>
                  </span>
                  <EstadoLiga estado={l.estado} />
                  <span className="sr-only">{ESTADO_TEXTO[l.estado]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Resumen({
  titulo,
  valor,
  href,
  cargando,
}: {
  titulo: string;
  valor: number | string;
  href: string;
  cargando: boolean;
}) {
  return (
    <Link
      href={href}
      className="grid gap-1 rounded-lg border bg-card p-4 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="text-sm text-muted-foreground">{titulo}</span>
      <span className="marcador text-3xl">{cargando ? '—' : valor}</span>
    </Link>
  );
}
