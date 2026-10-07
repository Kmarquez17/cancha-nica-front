import { z } from 'zod';

const schema = z.object({
  API_URL: z.url({
    error: 'API_URL es obligatoria y debe ser una URL (ej. http://localhost:3000)',
  }), // destino del proxy (servidor)
  NEXT_PUBLIC_SSE_URL: z.url().optional(), // SSE directo a la API (Fase 8)
  NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3001'),
  NEXT_PUBLIC_USE_MSW: z.enum(['true', 'false']).default('false'),
});

export function parseEnv(source: Record<string, string | undefined>) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const detalle = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas:\n${detalle}\nRevisa .env.example`);
  }
  return result.data;
}

export const env = parseEnv({
  API_URL: process.env.API_URL,
  NEXT_PUBLIC_SSE_URL: process.env.NEXT_PUBLIC_SSE_URL || undefined,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_USE_MSW: process.env.NEXT_PUBLIC_USE_MSW || undefined,
});
