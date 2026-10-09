'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useLogout } from '@/shared/api/generated/auth/auth';
import {
  getGetDelegadoMeQueryKey,
  useCambiarPinDelegado as useCambiarPinApi,
  useDelegadoLogin as useDelegadoLoginApi,
  useGetDelegadoEdicion,
  useGetDelegadoMe,
} from '@/shared/api/generated/delegado/delegado';

/**
 * Portal del delegado: hooks generados con Orval más lo que el generador no hace (releer `/delegado/me` tras
 * cambiar el PIN, limpiar la caché al entrar y al salir). Ninguna cookie ni PIN se lee desde JavaScript.
 */
export const useDelegadoMe = () => useGetDelegadoMe({ query: { retry: false } });
export const useDelegadoEdicion = (edicionId: string) =>
  useGetDelegadoEdicion(edicionId, { query: { retry: false } });

export function useDelegadoLogin() {
  const qc = useQueryClient();
  // El cuerpo de la respuesta es el mismo de `/delegado/me`: se siembra la caché para no repetir la petición.
  return useDelegadoLoginApi({
    mutation: { onSuccess: (me) => qc.setQueryData(getGetDelegadoMeQueryKey(), me) },
  });
}

export function useCambiarPin() {
  const qc = useQueryClient();
  return useCambiarPinApi({
    // El aviso «cambia tu PIN» sale de `pinCambiadoEn`: hay que volver a leer `/delegado/me`.
    mutation: {
      gcTime: 0,
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetDelegadoMeQueryKey() }),
    },
  });
}

export function useDelegadoLogout() {
  const qc = useQueryClient();
  const logout = useLogout();
  return {
    isPending: logout.isPending,
    async salir() {
      try {
        await logout.mutateAsync({ params: { portal: 'delegado' } });
      } finally {
        qc.clear();
      }
    },
  };
}
