'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  useInscribirEquipo as useInscribirEquipoApi,
  useListarEquipos,
  useReasignarDelegadoEquipo as useReasignarDelegadoApi,
  useReincorporarEquipo as useReincorporarEquipoApi,
  useRenombrarEquipo as useRenombrarEquipoApi,
  useRetirarEquipo as useRetirarEquipoApi,
} from '@/shared/api/generated/admin/admin';

/** Equipos de una liga: hooks generados con Orval + volver a leer lo afectado (clubes, delegados, ligas, plataforma). */
const AFECTADOS = ['/admin/clubes', '/admin/delegados', '/admin/ediciones', '/plataforma'];

function useRefrescar() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) => AFECTADOS.some((p) => String(q.queryKey[0]).startsWith(p)),
    });
}

/** Sin filtro trae todos, incluidos los retirados. */
export const useEquipos = (edicionId: string) => useListarEquipos(edicionId);

// gcTime 0: la respuesta puede traer un PIN que no debe quedar en la caché de mutaciones.
export const useInscribirEquipo = () =>
  useInscribirEquipoApi({ mutation: { gcTime: 0, onSuccess: useRefrescar() } });
export const useReasignarDelegado = () =>
  useReasignarDelegadoApi({ mutation: { gcTime: 0, onSuccess: useRefrescar() } });
export const useRenombrarEquipo = () =>
  useRenombrarEquipoApi({ mutation: { onSuccess: useRefrescar() } });
export const useRetirarEquipo = () =>
  useRetirarEquipoApi({ mutation: { onSuccess: useRefrescar() } });
export const useReincorporarEquipo = () =>
  useReincorporarEquipoApi({ mutation: { onSuccess: useRefrescar() } });
