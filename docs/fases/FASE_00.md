# FASE 0 — Fundaciones (repo `cancha-nica-front`)

> **Fuente de la verdad:** `PLAN_FRONTEND.md` (raíz del repo). Este documento solo detalla la Fase 0.
> **Estado:** ✅ 0a (local) · ☐ 0b (nube)
> **Independencia:** este repo **no necesita el repo `cancha-nica-api` para empezar**. Genera su cliente desde `docs/contrato/openapi.snapshot.json` y simula las respuestas con MSW. Cuando la API exista, se cambia a la URL real.
> **Cómo usarlo con Claude:** abre una sesión **dentro del repo `cancha-nica-front`** y pide, por ejemplo: *«Ejecuta la tarea 0.4 de `docs/fases/FASE_00.md`»*.

---

## 1. Objetivo

Dejar un **esqueleto de front funcionando de punta a punta antes de construir pantallas de negocio**: las cuatro zonas de rutas (público, admin, delegado, mesa) creadas y vacías, el tema y los tokens, el cliente de la API generado y tipado, el proxy `/api/*`, el manejo de errores en español y el CI.

Esta fase **no** implementa login ni pantallas reales. Solo la base.

## 2. Dos entregas

| | **0a — Local** | **0b — Nube** |
|---|---|---|
| Qué es | Front en tu PC (puerto 3001), con la API real o con MSW | Front desplegado en Railway |
| Cuentas | Ninguna | GitHub, Railway (y opcional Sentry) |
| Costo | 0 | Railway cobra por uso: fijar alertas de gasto antes de cobrar inscripciones |
| Cuándo | **Ahora** | Cuando la API esté desplegada |

## 3. Prerrequisitos (0a)

| Herramienta | Estado en tu PC | Acción |
|---|---|---|
| Node.js 22 | ✅ | ninguna |
| Git | ✅ | ninguna |
| **pnpm** | ❌ | `npm install -g pnpm` |

> **Nota de versiones.** Next, Tailwind, shadcn y Orval cambian entre versiones. Los fragmentos son la **intención**; al ejecutar, sigue la guía de la versión instalada y anota las versiones reales al final. En particular: el archivo de interceptación de rutas se llama `middleware.ts` en versiones anteriores de Next y `proxy.ts` en las recientes; verifícalo y fíjalo.

## 4. Decisiones previas (ya tomadas en `PLAN_FRONTEND.md`)

Una sola app con route groups (F1) · proxy `/api/*` con cookies same-site (F2, R1) · Orval + TanStack Query (F3) · Tailwind v4 + shadcn (F4) · Zustand solo en la mesa (F5, F14) · React Hook Form + Zod con mapa de errores (F7) · PWA instalable básica (F8) · Vitest + Playwright (F10) · estructura por feature con `app/` delgado (F14).

---

## 5. Tareas de 0a (local)

### 0.1 Crear el proyecto Next ✅
```bash
pnpm dlx create-next-app@latest cancha-nica-front --ts --tailwind --app --src-dir --eslint --use-pnpm
cd cancha-nica-front
git init   # si no lo hizo
```
Copia `PLAN_FRONTEND.md` a la raíz y `docs/` (incluye la especificación y `docs/fases/`).
Fija el puerto: en `package.json`, `"dev": "next dev -p 3001"`.
**Comprobación:** `pnpm dev` abre `http://localhost:3001`.

### 0.2 Dependencias base ✅
```bash
pnpm add @tanstack/react-query zod react-hook-form @hookform/resolvers zustand date-fns libphonenumber-js
pnpm add -D orval msw vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @playwright/test husky lint-staged prettier
pnpm dlx shadcn@latest init
```
**Comprobación:** `pnpm build` sigue funcionando.

### 0.3 Estructura de carpetas (vacía pero lista) ✅
Crea la estructura de la sección 4.1 del plan:
```
src/
├─ app/
│  ├─ (public)/liga/[orgSlug]/[edicionSlug]/page.tsx        (placeholder)
│  ├─ (admin)/admin/login/page.tsx                           (placeholder)
│  ├─ (delegado)/delegado/login/page.tsx                     (placeholder)
│  ├─ (mesa)/mesa/[edicionSlug]/login/page.tsx               (placeholder)
│  ├─ layout.tsx · globals.css · manifest.ts
├─ features/{auth,ediciones,mesas,clubes,equipos,delegados,roster,fixture,posiciones,goleo,partido-vivo,finanzas,sanciones,eliminatorias,auditoria,public}/
└─ shared/{api,ui,lib,config}/
```
Cada `page.tsx` muestra solo el nombre de la zona. **Regla:** `app/` solo tiene rutas y composición; la lógica vive en `features/`.
**Comprobación:** las cuatro rutas abren y muestran su placeholder.

### 0.4 Variables de entorno validadas ✅
`src/shared/config/env.ts` con Zod:
```ts
import { z } from 'zod';
const schema = z.object({
  API_URL: z.string().url(),                        // destino del proxy (servidor)
  NEXT_PUBLIC_SSE_URL: z.string().url().optional(), // SSE directo a la API (Fase 8)
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_USE_MSW: z.enum(['true', 'false']).default('false'),
});
export const env = schema.parse({
  API_URL: process.env.API_URL,
  NEXT_PUBLIC_SSE_URL: process.env.NEXT_PUBLIC_SSE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_USE_MSW: process.env.NEXT_PUBLIC_USE_MSW,
});
```
`.env.example`:
```
API_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_USE_MSW=false
```
**Comprobación:** sin `API_URL` el build falla con un mensaje claro.

### 0.5 Proxy `/api/*` hacia la API ✅
`next.config.ts`:
```ts
async rewrites() {
  return [{ source: '/api/:path*', destination: `${process.env.API_URL}/:path*` }];
}
```
El prefijo `/api` **se elimina** al reenviar (la API real expone `/ping`, `/auth/...`).
**Comprobación:** con la API local arriba, `http://localhost:3001/api/ping` devuelve el JSON de la API. Sin API, usa MSW (0.7).

### 0.6 Cliente de la API con Orval ✅
`orval.config.ts`:
```ts
import { defineConfig } from 'orval';
export default defineConfig({
  canchaNica: {
    input: './docs/contrato/openapi.snapshot.json',   // snapshot del backend; también puede ser la URL de /docs-json
    output: {
      target: './src/shared/api/generated/endpoints.ts',
      schemas: './src/shared/api/generated/models',
      client: 'react-query',
      mode: 'tags-split',
      override: { mutator: { path: './src/shared/api/mutator.ts', name: 'apiFetch' } },
    },
  },
});
```
Script: `"api:generate": "orval"`. **El código generado se versiona** y nunca se edita a mano.
> El snapshot lo entrega el repo `cancha-nica-api` (`docs/contrato/openapi.snapshot.json`). Mientras no lo tengas, crea uno mínimo a mano con `getPing` para poder avanzar.
**Comprobación:** `pnpm api:generate` crea `useGetPing`.

### 0.7 Mutator, `ApiError` y mensajes en español ✅
`src/shared/api/mutator.ts` — esqueleto (la lógica completa del refresh se termina en la Fase 1):
```ts
export class ApiError extends Error {
  constructor(public status: number, public code: string, public title: string,
              public detail?: string, public requestId?: string) { super(title); }
}

let refreshing: Promise<boolean> | null = null;     // single-flight (R1)

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${url}`, { ...init, credentials: 'include' });
  if (res.ok) return (await res.json()) as T;
  const p = await res.json().catch(() => ({}));
  throw new ApiError(res.status, p.code ?? 'UNKNOWN', p.title ?? 'Error', p.detail, p.requestId);
}
```
`src/shared/api/errors/es.ts`: diccionario `code → mensaje` con los códigos del catálogo (sección 4.9 del backend; al menos `ROSTER_FULL`, `PLAYER_ALREADY_ACTIVE`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `IP_LOCKED` y un genérico con el `requestId`).
**Comprobación:** test unitario: un `problem+json` con `code: 'ROSTER_FULL'` se convierte en `ApiError` y `es.ts` devuelve su mensaje.

### 0.8 TanStack Query y página de prueba ✅
Crea un `QueryProvider` (cliente de React Query) en `src/shared/api/` y úsalo en el layout raíz. En `/` (o en una ruta `/_estado`) muestra:
```tsx
'use client';
export function EstadoApi() {
  const { data, isLoading, error } = useGetPing();
  if (isLoading) return <p>Conectando…</p>;
  if (error) return <p>API sin conexión ❌</p>;
  return <p>API conectada ✅ {data?.serverNow}</p>;
}
```
**Comprobación:** con la API local arriba → «API conectada ✅». Con la API caída → «sin conexión ❌».

### 0.9 MSW para trabajar sin backend ✅
```bash
pnpm dlx msw init public/ --save
```
Crea `src/mocks/handlers.ts` con `GET /api/ping → { ok: true, serverNow: <ahora> }` y un `problem+json` de ejemplo. Actívalo solo si `NEXT_PUBLIC_USE_MSW=true`.
**Comprobación:** con `NEXT_PUBLIC_USE_MSW=true` y la API apagada, la página muestra «API conectada ✅».

### 0.10 Tema, tokens y shadcn ✅
- Tokens como variables CSS en `globals.css`: `--color-primary` (parte de la marca de la liga; valor por defecto `#16a34a`), radios, espaciado y escala tipográfica. Tema claro y oscuro.
- Añade con shadcn: `button`, `input`, `label`, `card`, `sonner` (toasts), `dialog`.
- `next/font` para la tipografía.
**Comprobación:** el cambio claro/oscuro funciona y respeta el contraste AA.

### 0.11 PWA instalable básica ✅
`src/app/manifest.ts` (nombre, `display: 'standalone'`, colores) e iconos 192 y 512 en `public/`. **Sin** service worker (F8).
**Comprobación:** en Chrome, «Instalar app» aparece disponible.

### 0.12 Pruebas ✅
- **Vitest:** `ApiError`/`es.ts` (0.7) y el esquema de entorno (0.4).
- **Playwright (humo):** abre `/` con MSW activo y comprueba «API conectada».
**Comprobación:** `pnpm test` y `pnpm test:e2e` en verde.

### 0.13 Calidad ✅
Scripts `lint`, `typecheck` (`tsc --noEmit`), `test`, `test:e2e`, `build`. Husky + lint-staged con ESLint y Prettier en `pre-commit`.
**Comprobación:** un commit con error de lint es rechazado.

### 0.14 CI en GitHub Actions ✅
`.github/workflows/ci.yml`: pnpm + Node 22, `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `test`, `build` y Playwright de humo (con MSW, **sin** la API). Agrega un paso que avise si `pnpm api:generate` produce cambios sin versionar (el contrato quedó desactualizado).
**Comprobación:** en verde en *Actions* (si aún no subes el repo, déjalo escrito).

---

## 6. Estructura esperada al terminar 0a
```
cancha-nica-front/
├─ PLAN_FRONTEND.md
├─ orval.config.ts · next.config.ts · .env.example
├─ docs/
│  ├─ especificacion_mvp_futsal.md
│  ├─ fases/FASE_00.md
│  └─ contrato/openapi.snapshot.json
├─ public/{mockServiceWorker.js, icon-192.png, icon-512.png}
├─ src/
│  ├─ app/            (4 zonas con placeholders + manifest)
│  ├─ features/       (carpetas vacías por dominio)
│  ├─ shared/{api/{generated,mutator.ts,errors/es.ts}, ui, lib, config/env.ts}
│  └─ mocks/handlers.ts
├─ tests/ (Vitest y Playwright)
└─ .github/workflows/ci.yml
```

## 7. Criterio de salida de 0a ✅
- [x] `pnpm dev` levanta en `http://localhost:3001` y las 4 zonas de rutas abren.
- [x] Sin `API_URL` el build **falla** con un mensaje claro.
- [x] `pnpm api:generate` produce `useGetPing` desde el snapshot.
- [x] Con la API local: «API conectada ✅» vía `/api/ping`. Sin API y con MSW: lo mismo.
- [x] Un `problem+json` se convierte en `ApiError` y se traduce con `es.ts`.
- [x] Tema claro/oscuro y manifest funcionan.
- [x] `lint`, `typecheck`, `test`, `test:e2e` y `build` en verde.
- [x] `PLAN_FRONTEND.md` y la especificación están en el repo.

---

## 8. Tareas de 0b (nube)

> Requiere cuentas de **GitHub** y **Railway**, y la API desplegada (0b del repo `cancha-nica-api`) para el proxy real.

### 0.15 Subir a GitHub y activar el CI
### 0.16 Servicio en Railway
1. Nuevo servicio desde el repo `cancha-nica-front` (rama `main`/`master`). Build `pnpm build`, arranque `pnpm start` (Next usa el `PORT` de Railway). Fija Node 22 con `"engines": { "node": ">=22" }` en `package.json`.
2. Variables (**antes del build**, porque `API_URL` y las `NEXT_PUBLIC_*` se evalúan al construir): `API_URL` (URL de la API en Railway; si ambos servicios están en el mismo proyecto puede usarse la URL interna), `NEXT_PUBLIC_SITE_URL` (dominio público del front), `NEXT_PUBLIC_USE_MSW=false`.
3. Genera el dominio público (`*.up.railway.app`) y, si se quiere, habilita *PR environments* para previews.
**Comprobación:** abre la URL de Railway desde el celular: «API conectada ✅» (esto prueba el proxy hacia la API).

### 0.17 CORS en la API para previews
Añade a la API el dominio de producción del front (Railway) en `CORS_ORIGINS` y el patrón de previews (`CORS_ORIGIN_PATTERNS`), **solo** para rutas públicas y SSE (B4).

### 0.18 Verificar que el proxy no rompe nada
Comprueba que `/api/ping` responde por el proxy del front en Railway y anota si los rewrites bufferizan el SSE (se prueba de verdad en la Fase 8; si lo hacen, el SSE ya está previsto para ir **directo** a la API con `NEXT_PUBLIC_SSE_URL`).

### 0.19 Sentry (opcional ahora)
`@sentry/nextjs`, DSN por variable y `beforeSend` que elimina cookies y cabeceras de autorización. Puede dejarse para la Fase 11.

### 0.20 Dominio propio (cuando haya presupuesto)
Con dominio propio la cookie puede pasar al dominio raíz y el proxy deja de ser imprescindible. No bloquea nada.

## 9. Criterio de salida de 0b ✅
- [ ] La URL de Railway abre desde el celular y muestra «API conectada ✅».
- [ ] El CI corre en verde en GitHub y, si se habilitan los *PR environments*, cada PR crea su preview.
- [ ] Las variables están documentadas en `.env.example` y configuradas en Railway.

---

## 10. Riesgos de esta fase
| Riesgo | Mitigación |
|---|---|
| El front se bloquea esperando al backend | Snapshot OpenAPI + MSW (0.6 y 0.9) |
| Contrato desactualizado | Código de Orval versionado + aviso en CI |
| Cambios de API entre versiones de Next/Tailwind/shadcn | Anotar versiones fijadas |
| Costo por uso en Railway | Alertas de gasto y revisión del plan antes de cobrar inscripciones |
| Los rewrites bufferizan SSE | SSE directo a la API (decidido en el plan, F6) |

## 11. Entregables para el repo `cancha-nica-api`
- Confirmación de que `getPing` funciona por el proxy.
- La **URL del front** (dominio de Railway) para `CORS_ORIGINS`.

## 12. Preguntas abiertas de esta fase
- Fuente tipográfica, logo y color primario provisionales.
- ¿Sentry ahora o en la Fase 11?

## 13. Versiones fijadas (completar al ejecutar)
| Paquete | Versión |
|---|---|
| Node | 22.15.0 |
| pnpm | 12.9.1 |
| Next | 16.3.8 (Turbopack) |
| React | 19.2.8 |
| Tailwind | 4.3.3 |
| shadcn | 4.21.2 (estilo radix-nova) |
| Orval | 8.40.0 |
| TanStack Query | 5.104.1 |
| Zod | 4.6.5 |
| MSW | 3.0.2 |
| Vitest | 5.0.3 |
| Playwright | 1.63 |

> Notas: en Next 16 el archivo de interceptación es `proxy.ts` (se crea en la Fase 1). MSW 3 requiere el alias `turbopack.resolveAlias` de `msw/browser` en `next.config.ts`. pnpm 12 bloquea scripts de build: `esbuild` permitido en `pnpm-workspace.yaml`.
