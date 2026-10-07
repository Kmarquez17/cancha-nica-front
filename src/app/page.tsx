import { EstadoApi } from '@/shared/api/estado-api';
import { ThemeToggle } from '@/shared/ui/theme-toggle';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <EstadoApi />
      <ThemeToggle />
    </main>
  );
}
