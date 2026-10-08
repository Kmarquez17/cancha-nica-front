'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  useActualizarCategoria as useActualizarCategoriaApi,
  useActualizarEdicion as useActualizarEdicionApi,
  useArchivarCategoria as useArchivarCategoriaApi,
  useArchivarEdicion as useArchivarEdicionApi,
  useCambiarEstadoEdicion as useCambiarEstadoApi,
  useCrearCategoria as useCrearCategoriaApi,
  useCrearEdicion as useCrearEdicionApi,
  useGetEdicion,
  useListarCategorias,
  useListarEdiciones,
  useRestaurarCategoria as useRestaurarCategoriaApi,
  useRestaurarEdicion as useRestaurarEdicionApi,
} from '@/shared/api/generated/admin/admin';

/**
 * Categorías y ligas: los hooks son los generados con Orval. Aquí solo se les agrega lo que el generador no hace:
 * volver a leer los datos que cambian tras una escritura (listados, detalle, mesas y la ficha de plataforma).
 */
const AFECTADOS = ['/admin/categorias', '/admin/ediciones', '/admin/mesas', '/plataforma'];

function useRefrescar() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) => AFECTADOS.some((p) => String(q.queryKey[0]).startsWith(p)),
    });
}

export const useCategorias = (archivadas = false) => useListarCategorias({ archivadas });
export const useEdiciones = (archivadas = false) => useListarEdiciones({ archivadas });
export const useEdicion = (id: string) => useGetEdicion(id);

export const useCrearCategoria = () =>
  useCrearCategoriaApi({ mutation: { onSuccess: useRefrescar() } });
export const useActualizarCategoria = () =>
  useActualizarCategoriaApi({ mutation: { onSuccess: useRefrescar() } });
export const useArchivarCategoria = () =>
  useArchivarCategoriaApi({ mutation: { onSuccess: useRefrescar() } });
export const useRestaurarCategoria = () =>
  useRestaurarCategoriaApi({ mutation: { onSuccess: useRefrescar() } });

export const useCrearEdicion = () =>
  useCrearEdicionApi({ mutation: { onSuccess: useRefrescar() } });
export const useActualizarEdicion = () =>
  useActualizarEdicionApi({ mutation: { onSuccess: useRefrescar() } });
export const useArchivarEdicion = () =>
  useArchivarEdicionApi({ mutation: { onSuccess: useRefrescar() } });
export const useRestaurarEdicion = () =>
  useRestaurarEdicionApi({ mutation: { onSuccess: useRefrescar() } });
export const useCambiarEstado = () =>
  useCambiarEstadoApi({ mutation: { onSuccess: useRefrescar() } });
