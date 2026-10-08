'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api/mutator';
import type {
  ClubDto,
  DelegadoConPinDto,
  DelegadoDto,
  DelegadoInscripcion,
  EquipoDto,
  EquipoInscritoDto,
  InscribirEquipoBody,
} from './tipos';

/**
 * Hooks de clubes, delegados y equipos (Fase 3). PROVISIONAL: escritos a mano con rutas supuestas hasta que el
 * backend publique el contrato; se reemplazan por los generados con Orval.
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

// Un cambio en equipos mueve clubes (conteo), delegados (equipos) y el listado de la liga.
const TODO = ['/admin/clubes', '/admin/delegados', '/admin/ediciones'];

// ---------- clubes

export const useClubes = () =>
  useQuery({ queryKey: ['/admin/clubes'], queryFn: () => apiFetch<ClubDto[]>('/admin/clubes') });

export function useCrearClub() {
  const invalidar = useInvalidar(TODO);
  return useMutation({
    mutationFn: (nombre: string) => apiFetch<ClubDto>('/admin/clubes', json('POST', { nombre })),
    onSuccess: invalidar,
  });
}

export function useActualizarClub() {
  const invalidar = useInvalidar(TODO);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre?: string; activo?: boolean } }) =>
      apiFetch<ClubDto>(`/admin/clubes/${id}`, json('PATCH', data)),
    onSuccess: invalidar,
  });
}

// ---------- delegados

export const useDelegados = () =>
  useQuery({
    queryKey: ['/admin/delegados'],
    queryFn: () => apiFetch<DelegadoDto[]>('/admin/delegados'),
  });

export function useResetearPinDelegado() {
  const invalidar = useInvalidar(['/admin/delegados', '/admin/ediciones']);
  // gcTime 0: el PIN de la respuesta no se queda en la caché de mutaciones.
  return useMutation({
    gcTime: 0,
    mutationFn: (id: string) =>
      apiFetch<DelegadoConPinDto>(`/admin/delegados/${id}/pin/reset`, json('POST')),
    onSuccess: invalidar,
  });
}

// ---------- equipos de una liga

export const useEquipos = (edicionId: string) =>
  useQuery({
    queryKey: [`/admin/ediciones/${edicionId}/equipos`],
    queryFn: () => apiFetch<EquipoDto[]>(`/admin/ediciones/${edicionId}/equipos`),
  });

export function useInscribirEquipo(edicionId: string) {
  const invalidar = useInvalidar(TODO);
  return useMutation({
    gcTime: 0,
    mutationFn: (data: InscribirEquipoBody) =>
      apiFetch<EquipoInscritoDto>(`/admin/ediciones/${edicionId}/equipos`, json('POST', data)),
    onSuccess: invalidar,
  });
}

export function useReasignarDelegado(edicionId: string) {
  const invalidar = useInvalidar(TODO);
  return useMutation({
    gcTime: 0,
    mutationFn: ({ equipoId, delegado }: { equipoId: string; delegado: DelegadoInscripcion }) =>
      apiFetch<EquipoInscritoDto>(
        `/admin/ediciones/${edicionId}/equipos/${equipoId}/delegado`,
        json('PATCH', { delegado }),
      ),
    onSuccess: invalidar,
  });
}
