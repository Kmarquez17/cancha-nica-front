import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Mono, Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/shared/api/query-provider';
import { MswProvider } from '@/mocks/msw-provider';
import { ThemeProvider } from '@/shared/ui/theme-provider';
import { Toaster } from '@/shared/ui/sonner';

// Interfaz y texto
const barlow = Barlow({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

// Logotipo y titulares: Condensada ExtraBold cursiva
const barlowCondensed = Barlow_Condensed({
  variable: '--font-barlow-condensed',
  subsets: ['latin'],
  weight: ['800'],
  style: ['italic'],
});

// Marcador y reloj (Mesa y partido). Sin precarga: solo se descarga cuando una pantalla lo usa.
const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: '--font-atkinson-mono',
  subsets: ['latin'],
  weight: ['700'],
  preload: false,
});

const descripcion = 'Armá tu liga: inscripciones, calendario, marcador en vivo y tablas al día.';

export const metadata: Metadata = {
  title: { default: 'Cancha Nica', template: '%s · Cancha Nica' },
  description: descripcion,
  applicationName: 'Cancha Nica',
  openGraph: {
    type: 'website',
    siteName: 'Cancha Nica',
    locale: 'es_NI',
    title: 'Cancha Nica · ¡La liga es tuya!',
    description: descripcion,
  },
  twitter: { card: 'summary_large_image', title: 'Cancha Nica · ¡La liga es tuya!' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#14532D' },
    { media: '(prefers-color-scheme: dark)', color: '#07180F' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${barlow.variable} ${barlowCondensed.variable} ${atkinsonMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <MswProvider>
            <QueryProvider>{children}</QueryProvider>
          </MswProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
