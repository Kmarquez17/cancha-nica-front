'use client';

import { useGetPing } from './generated/salud/salud';

export function EstadoApi() {
  const { data, isLoading, error } = useGetPing();
  if (isLoading) return <p>Conectando…</p>;
  if (error) return <p>API sin conexión ❌</p>;
  return <p>API conectada ✅ {data?.serverNow}</p>;
}
