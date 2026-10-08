'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CambiarPinBody, DelegadoLoginBody, DelegadoMeDto } from '@/features/equipos/tipos';
import { apiFetch } from '@/shared/api/mutator';

/** Hooks del portal del delegado (Fase 3). PROVISIONAL, ver `equipos/api.ts`. */
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export function useDelegadoLogin(orgSlug: string) {
  return useMutation({
    mutationFn: (data: DelegadoLoginBody) =>
      apiFetch<void>(`/auth/delegado/${orgSlug}/login`, json('POST', data)),
  });
}

export function useDelegadoLogout() {
  return useMutation({ mutationFn: () => apiFetch<void>('/auth/delegado/logout', json('POST')) });
}

export const useDelegadoMe = () =>
  useQuery({
    queryKey: ['/delegado/me'],
    queryFn: () => apiFetch<DelegadoMeDto>('/delegado/me'),
    retry: false,
  });

export function useCambiarPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CambiarPinBody) => apiFetch<void>('/delegado/pin', json('POST', data)),
    // El aviso «tu PIN es temporal» sale de /delegado/me: hay que volver a leerlo.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/delegado/me'] }),
  });
}
