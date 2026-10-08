'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api/mutator';
import type {
  ActualizarEdicionBody,
  CambiarEstadoBody,
  CategoriaDto,
  CrearCategoriaBody,
  CrearEdicionBody,
  EdicionDto,
} from './tipos';

/**
 * Hooks de la Fase 2 escritos a mano (PROVISIONAL). Mismas rutas y forma que tendrán los generados con Orval,
 * para que el cambio sea reemplazar el import. Las claves empiezan por la ruta, como las de Orval.
 */
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

function useInvalidar(prefijos: string[]) {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) => prefijos.some((p) => String(q.queryKey[0]).startsWith(p)),
    });
}

// ---------- categorías

export const useCategorias = (archivadas = false) =>
  useQuery({
    queryKey: ['/admin/categorias', { archivadas }],
    queryFn: () =>
      apiFetch<CategoriaDto[]>(`/admin/categorias${archivadas ? '?archivadas=true' : ''}`),
  });

export function useCrearCategoria() {
  const invalidar = useInvalidar(['/admin/categorias']);
  return useMutation({
    mutationFn: (data: CrearCategoriaBody) =>
      apiFetch<CategoriaDto>('/admin/categorias', json('POST', data)),
    onSuccess: invalidar,
  });
}

export function useActualizarCategoria() {
  const invalidar = useInvalidar(['/admin/categorias']);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrearCategoriaBody> }) =>
      apiFetch<CategoriaDto>(`/admin/categorias/${id}`, json('PATCH', data)),
    onSuccess: invalidar,
  });
}

export function useArchivarCategoria() {
  const invalidar = useInvalidar(['/admin/categorias']);
  return useMutation({
    mutationFn: ({ id, archivar }: { id: string; archivar: boolean }) =>
      apiFetch<CategoriaDto>(
        `/admin/categorias/${id}/${archivar ? 'archivar' : 'restaurar'}`,
        json('POST'),
      ),
    onSuccess: invalidar,
  });
}

// ---------- ediciones (ligas)

export const useEdiciones = (archivadas = false) =>
  useQuery({
    queryKey: ['/admin/ediciones', { archivadas }],
    queryFn: () =>
      apiFetch<EdicionDto[]>(`/admin/ediciones${archivadas ? '?archivadas=true' : ''}`),
  });

export const useEdicion = (id: string) =>
  useQuery({
    queryKey: [`/admin/ediciones/${id}`],
    queryFn: () => apiFetch<EdicionDto>(`/admin/ediciones/${id}`),
  });

export function useCrearEdicion() {
  const invalidar = useInvalidar(['/admin/ediciones']);
  return useMutation({
    mutationFn: (data: CrearEdicionBody) =>
      apiFetch<EdicionDto>('/admin/ediciones', json('POST', data)),
    onSuccess: invalidar,
  });
}

export function useActualizarEdicion(id: string) {
  const invalidar = useInvalidar(['/admin/ediciones', '/admin/mesas']);
  return useMutation({
    mutationFn: (data: ActualizarEdicionBody) =>
      apiFetch<EdicionDto>(`/admin/ediciones/${id}`, json('PATCH', data)),
    onSuccess: invalidar,
  });
}

export function useArchivarEdicion(id: string) {
  const invalidar = useInvalidar(['/admin/ediciones']);
  return useMutation({
    mutationFn: (archivar: boolean) =>
      apiFetch<EdicionDto>(
        `/admin/ediciones/${id}/${archivar ? 'archivar' : 'restaurar'}`,
        json('POST'),
      ),
    onSuccess: invalidar,
  });
}

export function useCambiarEstado(id: string) {
  const invalidar = useInvalidar(['/admin/ediciones', '/admin/mesas']);
  return useMutation({
    mutationFn: (data: CambiarEstadoBody) =>
      apiFetch<EdicionDto>(`/admin/ediciones/${id}/estado`, json('POST', data)),
    onSuccess: invalidar,
  });
}
