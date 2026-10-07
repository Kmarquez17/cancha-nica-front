import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra la API REAL (sin MSW): cubre lo que el mock del navegador no puede, como los guards
 * de los Server Components. Requiere la API local en API_URL y credenciales de plataforma:
 *   E2E_PLATAFORMA_EMAIL / E2E_PLATAFORMA_PASSWORD   (la cuenta del seed)
 * No corre en el CI del repo; se lanza a mano con `pnpm test:e2e:api`.
 */
const PUERTO = 3011;
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e-api',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: 'on-first-retry',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec next dev -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_PUBLIC_USE_MSW: 'false', API_URL },
  },
});
