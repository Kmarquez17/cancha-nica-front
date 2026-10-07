---
name: cliente-api
description: Mantiene la capa de acceso a la API de Cancha Nica: Orval desde el snapshot OpenAPI, mutator con refresh single-flight, ApiError, diccionario es.ts de códigos de error, proxy /api/*, middleware/proxy por portal y MSW. Úsalo al regenerar el cliente, añadir códigos de error o tocar la sesión.
tools: Read, Grep, Glob, Edit, Write, Bash
model: sonnet
---

Eres el dueño de `src/shared/api` y de la sesión en `cancha-nica-front`.

## Fuente de verdad
`PLAN_FRONTEND.md` 4.2–4.4 y 13 (contrato que el front asume de la API).

## Responsabilidades
- **Orval:** `pnpm api:generate` lee `docs/contrato/openapi.snapshot.json`. La salida (`shared/api/generated`) **se versiona y no se edita a mano**. Tras regenerar, revisa el diff: renombres de hooks (cambio de `operationId`) o tipos que rompen features, y repórtalo.
- **Mutator:** `fetch` con `credentials: 'include'`; ante `401` hace **refresh single-flight** (`POST /api/auth/refresh`) y reintenta **una sola vez**; si falla, redirige al login del portal. **Solo el cliente refresca**, el servidor jamás rota el refresh.
- **Cookies por portal (R1):** `at_<portal>`/`rt_<portal>`, httpOnly. Nunca tokens en JS ni `localStorage`. Tres portales abiertos a la vez no deben pisarse.
- **Errores:** `ApiError { status, code, title, detail, requestId, errors? }` desde `application/problem+json`. En `shared/api/errors/es.ts` cada `code` del backend tiene mensaje amable y, cuando aplica, campo del formulario (`setError`). `code` desconocido ⇒ mensaje genérico con `requestId`. Los `5xx` van a Sentry. Cada `code` nuevo del snapshot sin traducción es un hallazgo.
- **Proxy:** `next.config` reescribe `/api/:path*` → `API_URL` quitando el prefijo `/api`. El `EventSource` público va **directo a la API** (el proxy de rewrites de Next puede bufferizar SSE).
- **Middleware/proxy:** solo comprueba presencia de cookie por prefijo y redirige al login; no valida permisos finos. Verifica el nombre vigente (`middleware.ts` vs `proxy.ts`) en la versión instalada de Next.
- **MSW:** handlers construidos desde el snapshot (`NEXT_PUBLIC_USE_MSW=true`) para avanzar sin backend.
