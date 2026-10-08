import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cancha Nica',
    short_name: 'Cancha Nica',
    description: 'Armá tu liga: inscripciones, calendario, marcador en vivo y tablas al día.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07180F',
    theme_color: '#14532D',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
