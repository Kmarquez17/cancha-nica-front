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

  // El login de la mesa es /mesa/<slug-del-cliente> (R15): un solo segmento. /mesa/bloqueada es global.
  const esLoginMesa = portal === 'mesa' && resto.length === 1 && resto[0] !== '';
  const esPublica = esLoginMesa || (resto[0] !== undefined && PUBLICAS.has(resto[0]));

  // Con MSW la sesión de la mesa es simulada (no hay cookie real): solo en desarrollo, mientras no exista el backend de la Fase 2.
  const mesaSimulada = portal === 'mesa' && process.env.NEXT_PUBLIC_USE_MSW === 'true';
  const haySesion =
    mesaSimulada || request.cookies.has(`at_${portal}`) || request.cookies.has(`rt_${portal}`);

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
