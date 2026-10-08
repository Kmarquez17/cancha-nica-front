'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from './mutator';
import { accionParaError } from './session-errors';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    // Sesión caída o cliente bloqueado: se corta aquí, una sola vez, para cualquier query o mutación.
    const manejarSesion = (error: unknown, nombreMutacion?: string) => {
      const accion = accionParaError(error, {
        rutaActual: window.location.pathname,
        nombreMutacion,
      });
      if (!accion) return;
      client.clear();
      window.location.assign(accion.destino);
    };

    const client: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError: (error) => manejarSesion(error) }),
      mutationCache: new MutationCache({
        onError: (error, _vars, _ctx, mutation) =>
          manejarSesion(error, mutation.options.mutationKey?.[0] as string | undefined),
      }),
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          // No reintentar errores 4xx (son deterministas, incluido el 404 de un cliente bloqueado y
          // ORG_BLOQUEADA); sí red/5xx, hasta 2 veces.
          retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
        },
      },
    });
    return client;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
