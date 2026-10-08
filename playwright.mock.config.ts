import { defineConfig, devices } from '@playwright/test';

/**
 * E2E de la Fase 2 sin backend: una API falsa responde solo la sesión del admin y MSW simula los endpoints
 * nuevos en el navegador (src/mocks/fase2). Corre en local y en CI. Se retira cuando exista el contrato real
 * y el E2E contra la API (`pnpm test:e2e:api`) cubra estas pantallas.
 */
const PUERTO = 3013;
const PUERTO_API = 3999;

export default defineConfig({
  testDir: './tests/e2e-mock',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: 'on-first-retry',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node tests/e2e-mock/api-falsa.mjs',
      url: `http://localhost:${PUERTO_API}/admin/me`,
      reuseExistingServer: false,
      env: { PUERTO_API_FALSA: String(PUERTO_API) },
    },
    {
      command: `pnpm exec next dev -p ${PUERTO}`,
      url: `http://localhost:${PUERTO}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_USE_MSW: 'true',
        API_URL: `http://localhost:${PUERTO_API}`,
        NEXT_DIST_DIR: '.next-e2e-mock',
      },
    },
  ],
});
