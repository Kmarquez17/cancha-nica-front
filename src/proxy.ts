import { NextResponse, type NextRequest } from 'next/server';

type Portal = 'plataforma' | 'admin' | 'delegado' | 'mesa';

/** Páginas de un portal que se pueden abrir sin sesión. */
const PUBLICAS = new Set(['login', 'bloqueada', 'refresh', 'olvide-contrasena']);

/**
 * Guard grueso por prefijo: solo mira si hay alguna cookie del portal. No valida permisos ni
 * sabe si el cliente está bloqueado (eso lo resuelve el layout con `GET /<portal>/me`).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, portal, ...resto] = pathname.split('/') as [string, Portal, ...string[]];

  // El login de la mesa y del delegado es /<portal>/<slug-del-cliente>: un solo segmento (R15).
  // /<portal>/bloqueada y /<portal>/login son globales y están en PUBLICAS.
  const esLoginPorSlug =
    (portal === 'mesa' || portal === 'delegado') && resto.length === 1 && resto[0] !== '';
  const esPublica = esLoginPorSlug || (resto[0] !== undefined && PUBLICAS.has(resto[0]));

  // Con MSW la sesión de la mesa y del delegado es simulada (no hay cookie real): solo en desarrollo, mientras
  // el backend de las Fases 2 y 3 no exista.
  const sesionSimulada =
    (portal === 'mesa' || portal === 'delegado') && process.env.NEXT_PUBLIC_USE_MSW === 'true';
  const haySesion =
    sesionSimulada || request.cookies.has(`at_${portal}`) || request.cookies.has(`rt_${portal}`);

  if (!esPublica && !haySesion) {
    const login = portal === 'mesa' ? '/' : `/${portal}/login`;
    return NextResponse.redirect(new URL(login, request.url));
  }

  // Los layouts de servidor necesitan saber la ruta actual para volver tras refrescar.
  const headers = new Headers(request.headers);
  headers.set('x-next-url', pathname + search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/plataforma/:path*', '/admin/:path*', '/delegado/:path*', '/mesa/:path*'],
};
