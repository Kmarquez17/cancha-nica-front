'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';

const subscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const montado = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const oscuro = montado && resolvedTheme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      onClick={() => setTheme(oscuro ? 'light' : 'dark')}
    >
      {oscuro ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
