import type { NextConfig } from 'next';
// Falla rápido (dev y build) si las variables de entorno son inválidas.
import { env } from './src/shared/config/env';

const nextConfig: NextConfig = {
  // El E2E contra la API real usa su propio directorio para no chocar con un `pnpm dev` abierto.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  turbopack: {
    // msw 3 marca "msw/browser" con "node": null; solo se importa en el cliente (src/mocks/msw-provider.tsx).
    resolveAlias: { 'msw/browser': './node_modules/msw/lib/browser/index.js' },
  },
  async headers() {
    // Los enlaces de invitación/restablecer llevan un token en la URL: que no salga en el Referer.
    const sinReferer = [{ key: 'Referrer-Policy', value: 'no-referrer' }];
    return [
      { source: '/aceptar-invitacion', headers: sinReferer },
      { source: '/restablecer-contrasena', headers: sinReferer },
    ];
  },
  async rewrites() {
    // El prefijo /api se elimina al reenviar: la API real expone /ping, /auth/...
    return [{ source: '/api/:path*', destination: `${env.API_URL}/:path*` }];
  },
};

export default nextConfig;
