'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useLogout } from '@/shared/api/generated/auth/auth';
import { rutaLogin, type Portal } from '@/shared/api/portales';
import { Button } from '@/shared/ui/button';

export function CerrarSesionButton({ portal }: { portal: Portal }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useLogout();

  async function salir() {
    try {
      await logout.mutateAsync({ params: { portal: portal as 'plataforma' | 'admin' } });
    } finally {
      queryClient.clear();
      router.replace(rutaLogin(portal));
      router.refresh();
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={salir} disabled={logout.isPending}>
      Cerrar sesión
    </Button>
  );
}
