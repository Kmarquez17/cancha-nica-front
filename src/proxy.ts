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

  // En la mesa la edición va en la URL (/mesa/[edicionSlug]/login); /mesa/bloqueada es global.
  const esPublica = [resto[0], portal === 'mesa' ? resto[1] : undefined].some(
    (pagina) => pagina !== undefined && PUBLICAS.has(pagina),
  );

  const haySesion = request.cookies.has(`at_${portal}`) || request.cookies.has(`rt_${portal}`);

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
