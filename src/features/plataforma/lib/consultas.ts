import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalida la lista y la ficha de clientes. Se invalida en vez de `setQueryData` porque las
 * escrituras devuelven un `OrganizacionDto` sin `admins` ni `conteos`: pisar la ficha con esa
 * respuesta rompería la vista.
 */
export function refrescarClientes(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (q) => String(q.queryKey[0]).startsWith('/plataforma/organizaciones'),
  });
}
