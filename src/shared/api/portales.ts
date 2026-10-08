/** Los cuatro portales con sesión propia (R1, R11). Cada uno tiene cookies `at_<portal>` / `rt_<portal>`. */
export const PORTALES = ['plataforma', 'admin', 'delegado', 'mesa'] as const;
export type Portal = (typeof PORTALES)[number];

/** Portales con login y refresh ya disponibles en la API (el delegado llega en la Fase 3). */
export const PORTALES_CON_REFRESH: readonly Portal[] = ['plataforma', 'admin', 'mesa'];

/** Deduce el portal de una ruta del API (`/admin/me`) o de la app (`/admin/ediciones`). */
export function portalDeRuta(ruta: string): Portal | null {
  const primero = ruta.split('?')[0].split('/')[1];
  return (PORTALES as readonly string[]).includes(primero) ? (primero as Portal) : null;
}

export const rutaLogin = (portal: Portal) => (portal === 'mesa' ? '/' : `/${portal}/login`);
export const rutaBloqueada = (portal: Portal) => `/${portal}/bloqueada`;
export const rutaInicio = (portal: Portal) =>
  portal === 'plataforma' ? '/plataforma/clientes' : `/${portal}`;

export function rutaRefresh(portal: Portal, next: string) {
  return `/${portal}/refresh?next=${encodeURIComponent(next)}`;
}

/** Solo rutas internas: evita open redirect con `?next=//evil.com` o `https://…`. */
export function destinoSeguro(next: string | null | undefined, porDefecto: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return porDefecto;
  }
  return next;
}
