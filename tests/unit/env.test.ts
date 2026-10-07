import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/shared/config/env';

describe('parseEnv', () => {
  it('lanza con mensaje claro sin API_URL', () => {
    expect(() => parseEnv({})).toThrow('Variables de entorno inválidas');
    expect(() => parseEnv({})).toThrow(/API_URL/);
  });

  it('lanza con API_URL inválida', () => {
    expect(() => parseEnv({ API_URL: 'no-es-url' })).toThrow('Variables de entorno inválidas');
  });

  it('aplica defaults', () => {
    const e = parseEnv({ API_URL: 'http://localhost:3000' });
    expect(e.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3001');
    expect(e.NEXT_PUBLIC_USE_MSW).toBe('false');
    expect(e.NEXT_PUBLIC_SSE_URL).toBeUndefined();
  });

  it('acepta valores válidos', () => {
    const e = parseEnv({
      API_URL: 'https://api.example.com',
      NEXT_PUBLIC_SITE_URL: 'https://app.example.com',
      NEXT_PUBLIC_USE_MSW: 'true',
      NEXT_PUBLIC_SSE_URL: 'https://api.example.com/sse',
    });
    expect(e.NEXT_PUBLIC_USE_MSW).toBe('true');
    expect(e.NEXT_PUBLIC_SITE_URL).toBe('https://app.example.com');
  });

  it('rechaza USE_MSW fuera de true/false', () => {
    expect(() => parseEnv({ API_URL: 'http://x.com', NEXT_PUBLIC_USE_MSW: 'yes' })).toThrow();
  });
});
