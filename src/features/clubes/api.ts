'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  useArchivarClub as useArchivarClubApi,
  useListarClubes,
  useRestaurarClub as useRestaurarClubApi,
} from '@/shared/api/generated/admin/admin';

/** Clubes: hooks generados con Orval; aquí solo se vuelve a leer lo que cambia tras una escritura. */
const AFECTADOS = ['/admin/clubes', '/admin/delegados', '/admin/ediciones', '/plataforma'];

function useRefrescar() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) => AFECTADOS.some((p) => String(q.queryKey[0]).startsWith(p)),
    });
}

/** `q` filtra por nombre sin distinguir mayúsculas ni tildes (sirve para autocompletar). */
export const useClubes = (opciones: { q?: string; archivados?: boolean } = {}) =>
  useListarClubes({
    ...(opciones.q ? { q: opciones.q } : {}),
    ...(opciones.archivados ? { archivados: true } : {}),
  });

export const useArchivarClub = () =>
  useArchivarClubApi({ mutation: { onSuccess: useRefrescar() } });
export const useRestaurarClub = () =>
  useRestaurarClubApi({ mutation: { onSuccess: useRefrescar() } });
