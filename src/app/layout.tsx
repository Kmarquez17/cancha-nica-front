import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/shared/api/query-provider';
import { MswProvider } from '@/mocks/msw-provider';
import { ThemeProvider } from '@/shared/ui/theme-provider';
import { Toaster } from '@/shared/ui/sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Cancha Nica',
  description: 'Gestión de ligas y torneos de fútbol',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
