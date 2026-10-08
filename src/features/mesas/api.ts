'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MesaConPinDto, MesaDto, MesaLoginBody, MesaMeDto } from '@/features/ediciones/tipos';
import { apiFetch } from '@/shared/api/mutator';

/** Hooks de mesas y login de mesa (PROVISIONAL, ver `ediciones/api.ts`). */
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

function useInvalidarMesas() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['/admin/mesas'] });
}

export const useMesas = () =>
  useQuery({ queryKey: ['/admin/mesas'], queryFn: () => apiFetch<MesaDto[]>('/admin/mesas') });

export function useCrearMesa() {
  const invalidar = useInvalidarMesas();
  // gcTime 0: el PIN de la respuesta no se queda en la caché de mutaciones.
  return useMutation({
    gcTime: 0,
    mutationFn: (data: { nombreOperador?: string | null }) =>
      apiFetch<MesaConPinDto>('/admin/mesas', json('POST', data)),
    onSuccess: invalidar,
  });
}

export function useActualizarMesa() {
  const invalidar = useInvalidarMesas();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { nombreOperador?: string | null; activa?: boolean };
    }) => apiFetch<MesaDto>(`/admin/mesas/${id}`, json('PATCH', data)),
    onSuccess: invalidar,
  });
}

export function useAsignarEdiciones() {
  const invalidar = useInvalidarMesas();
  return useMutation({
    mutationFn: ({ id, edicionIds }: { id: string; edicionIds: string[] }) =>
      apiFetch<MesaDto>(`/admin/mesas/${id}/ediciones`, json('PUT', { edicionIds })),
    onSuccess: invalidar,
  });
}

export function useResetearPin() {
  const invalidar = useInvalidarMesas();
  return useMutation({
    gcTime: 0,
    mutationFn: (id: string) =>
      apiFetch<MesaConPinDto>(`/admin/mesas/${id}/pin/reset`, json('POST')),
    onSuccess: invalidar,
  });
}

export function useDesbloquearMesa() {
  const invalidar = useInvalidarMesas();
  return useMutation({
    mutationFn: (id: string) => apiFetch<MesaDto>(`/admin/mesas/${id}/desbloquear`, json('POST')),
    onSuccess: invalidar,
  });
}

// ---------- portal de la mesa

export function useMesaLogin(orgSlug: string) {
  return useMutation({
    mutationFn: (data: MesaLoginBody) =>
      apiFetch<void>(`/auth/mesa/${orgSlug}/login`, json('POST', data)),
  });
}

export function useMesaLogout() {
  return useMutation({ mutationFn: () => apiFetch<void>('/auth/mesa/logout', json('POST')) });
}

export const useMesaMe = () =>
  useQuery({
    queryKey: ['/mesa/me'],
    queryFn: () => apiFetch<MesaMeDto>('/mesa/me'),
    retry: false,
  });
