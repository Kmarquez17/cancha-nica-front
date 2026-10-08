'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  useActivarMesa as useActivarMesaApi,
  useActualizarMesa as useActualizarMesaApi,
  useCrearMesa as useCrearMesaApi,
  useDefinirAlcanceMesa as useDefinirAlcanceApi,
  useDesactivarMesa as useDesactivarMesaApi,
  useDesbloquearMesa as useDesbloquearMesaApi,
  useListarMesas,
  useResetearPinMesa as useResetearPinApi,
} from '@/shared/api/generated/admin/admin';

/**
 * Mesas: hooks generados con Orval más el refresco de datos que el generador no hace. El PIN que devuelven el alta
 * y el reseteo se ve una sola vez: esas mutaciones usan `gcTime: 0` para que no quede en la caché.
 */
const AFECTADOS = ['/admin/mesas', '/plataforma'];

function useRefrescar() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) => AFECTADOS.some((p) => String(q.queryKey[0]).startsWith(p)),
    });
}

export const useMesas = () => useListarMesas();

export const useCrearMesa = () =>
  useCrearMesaApi({ mutation: { gcTime: 0, onSuccess: useRefrescar() } });
export const useResetearPin = () =>
  useResetearPinApi({ mutation: { gcTime: 0, onSuccess: useRefrescar() } });
export const useActualizarMesa = () =>
  useActualizarMesaApi({ mutation: { onSuccess: useRefrescar() } });
export const useDefinirAlcance = () =>
  useDefinirAlcanceApi({ mutation: { onSuccess: useRefrescar() } });
export const useDesbloquearMesa = () =>
  useDesbloquearMesaApi({ mutation: { onSuccess: useRefrescar() } });
export const useActivarMesa = () => useActivarMesaApi({ mutation: { onSuccess: useRefrescar() } });
export const useDesactivarMesa = () =>
  useDesactivarMesaApi({ mutation: { onSuccess: useRefrescar() } });
