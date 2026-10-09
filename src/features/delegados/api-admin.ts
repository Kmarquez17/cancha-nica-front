'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  useActivarDelegado as useActivarDelegadoApi,
  useActualizarDelegado as useActualizarDelegadoApi,
  useDesactivarDelegado as useDesactivarDelegadoApi,
  useDesbloquearDelegado as useDesbloquearDelegadoApi,
  useListarDelegados,
  useResetearPinDelegado as useResetearPinDelegadoApi,
} from '@/shared/api/generated/admin/admin';

/** Delegados (admin): hooks generados con Orval + volver a leer lo afectado. El portal del delegado va en `api.ts`. */
const AFECTADOS = ['/admin/delegados', '/admin/ediciones', '/admin/clubes', '/plataforma'];

function useRefrescar() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) => AFECTADOS.some((p) => String(q.queryKey[0]).startsWith(p)),
    });
}

export const useDelegados = () => useListarDelegados();

export const useActualizarDelegado = () =>
  useActualizarDelegadoApi({ mutation: { onSuccess: useRefrescar() } });
export const useActivarDelegado = () =>
  useActivarDelegadoApi({ mutation: { onSuccess: useRefrescar() } });
export const useDesactivarDelegado = () =>
  useDesactivarDelegadoApi({ mutation: { onSuccess: useRefrescar() } });
export const useDesbloquearDelegado = () =>
  useDesbloquearDelegadoApi({ mutation: { onSuccess: useRefrescar() } });
// gcTime 0: el PIN de la respuesta no se queda en la caché de mutaciones.
export const useResetearPinDelegado = () =>
  useResetearPinDelegadoApi({ mutation: { gcTime: 0, onSuccess: useRefrescar() } });
