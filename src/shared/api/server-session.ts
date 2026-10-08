import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '../config/env';
import { problemToApiError } from './mutator';
import { destinoSeguro, rutaBloqueada, rutaLogin, rutaRefresh, type Portal } from './portales';

export type LecturaPrincipal<T> =
  | { estado: 'ok'; data: T }
  | { estado: 'sin-sesion' } // ni access ni refresh: ir al login
  | { estado: 'expirada' } // hay refresh pero el access venció: ruta cliente que refresca
  | { estado: 'bloqueada' }
  | { estado: 'prohibido' }; // rol equivocado

/**
 * Lee `GET /<portal>/me` desde un Server Component con `at_<portal>`. **Nunca rota el refresh** (R1):
 * si el access venció, devuelve 'expirada' y el layout redirige a la ruta cliente de refresh.
 * Habla directo con la API (el proxy de rewrites es para el navegador).
 */
export async function leerPrincipal<T>(portal: Portal): Promise<LecturaPrincipal<T>> {
  const jar = await cookies();
  const access = jar.get(`at_${portal}`)?.value;
  const hayRefresh = jar.has(`rt_${portal}`);
  if (!access) return hayRefresh ? { estado: 'expirada' } : { estado: 'sin-sesion' };

  const res = await fetch(`${env.API_URL}/${portal}/me`, {
    headers: { cookie: `at_${portal}=${access}`, accept: 'application/json' },
    cache: 'no-store',
  });

  if (res.ok) return { estado: 'ok', data: (await res.json()) as T };
  if (res.status === 401) return hayRefresh ? { estado: 'expirada' } : { estado: 'sin-sesion' };
  const body = await res.json().catch(() => ({}));
  if (res.status === 403) {
    return problemToApiError(res.status, body).code === 'ORG_BLOQUEADA'
      ? { estado: 'bloqueada' }
      : { estado: 'prohibido' };
  }
  throw new Error(`GET /${portal}/me respondió ${res.status}`);
}

/**
 * Guard de los layouts de portal: devuelve el principal o redirige. Un cliente bloqueado va a su
 * pantalla (no a refresh ni a login: la sesión sigue viva y se reactiva sola).
 */
export async function exigirSesion<T>(portal: Portal): Promise<T> {
  const lectura = await leerPrincipal<T>(portal);
  switch (lectura.estado) {
    case 'ok':
      return lectura.data;
    case 'bloqueada':
      redirect(rutaBloqueada(portal));
    case 'expirada': {
      const actual = (await headers()).get('x-next-url');
      redirect(rutaRefresh(portal, destinoSeguro(actual, `/${portal}`)));
    }
    default:
      redirect(rutaLogin(portal));
  }
}
