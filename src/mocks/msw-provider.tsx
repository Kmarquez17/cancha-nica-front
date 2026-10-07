'use client';

import { useEffect, useState, type ReactNode } from 'react';

const USE_MSW = process.env.NEXT_PUBLIC_USE_MSW === 'true';

// Una sola promesa por pestaña: StrictMode ejecuta los efectos dos veces y worker.start() no es reentrante.
let starting: Promise<unknown> | null = null;
function startWorker() {
  starting ??= import('./browser').then(({ worker }) => worker.start());
  return starting;
}

/** Arranca el worker de MSW antes de renderizar los hijos (evita la carrera con el primer fetch). */
export function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!USE_MSW);

  useEffect(() => {
    if (!USE_MSW) return;
    let cancelled = false;
    startWorker().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready ? <>{children}</> : null;
}
