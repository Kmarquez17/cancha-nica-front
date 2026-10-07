# FASE 1 — Auth y shell (con plataforma multi-liga, R11)

> **Fuente de la verdad:** `PLAN_FRONTEND.md` (raíz). Este documento solo detalla la Fase 1.
> **Estado:** 🚧 En ejecución (2026-10-07). Contrato **confirmado**: snapshot y `docs/contrato/FRONT_FASE_01.md` copiados desde el API; cliente de Orval regenerado.
> **Contrato:** ver `docs/contrato/FRONT_FASE_01.md`. Delegado y mesa no tienen login todavía (fases 2 y 3).

## 1. Alcance

| Bloque | Qué entra | Referencia |
|---|---|---|
| Portal `plataforma` | Route group `(plataforma)`, login, layout y guard propios, cookies `at_/rt_plataforma`. Sin «olvidé mi contraseña» | §4.10 |
| Panel de ligas | Listar (filtro por estado), crear liga + invitar al dueño, editar, bloquear, reactivar | §4.10 |
| Invitación del dueño | Diálogo con enlace de una sola vez: copiar, WhatsApp (`wa.me`), reenviar (anula el anterior) | §4.10 |
| Aceptar invitación | Pantallas públicas `/aceptar-invitacion?token=…` (dueño y admins; abre sesión admin) y `/restablecer-contrasena?token=…` (raíz, nombres exactos) | §4.10 |
| Admin | Login, «olvidé mi contraseña», restablecer, `GET /admin/me` | §4.2 |
| Sesión | `proxy.ts` por prefijo (`/plataforma`, `/admin`, `/delegado`, `/mesa`), mutator con refresh single-flight, ruta cliente `/<portal>/refresh?next=…` | §4.2, R1 |
| Liga bloqueada | `ORG_BLOQUEADA`: mutator, layouts, pantalla `bloqueada` por portal, `POST /sesion/limpiar`, mensaje en login | §4.2.1 |
| Público | 404 de liga bloqueada → «liga no disponible» (estructura base; las vistas llegan en la Fase 8) | §4.6 |
| Shell | Layouts y navegación base de los 4 portales; delegado y mesa solo shell + pantalla «liga no disponible» (sus logins: fases 3 y 2) | §6 |

## 2. Qué NO entra
- Login de delegado (Fase 3) y de mesa (Fase 2).
- Gestión de usuarios admin e invitaciones de ADMIN desde el panel (Fase 10); aquí solo existe la pantalla de aceptar.
- Ver datos internos de una liga desde plataforma (no existe a propósito).
- Deploy en Railway (`FASE_DEPLOY_RAILWAYS`, §8.1 del plan).

## 3. Decisiones de diseño

### 3.1 Sesión por portal (cuatro)
Cada portal tiene su propio par de cookies y su propio guard; ninguno pisa a otro. Refresh por portal: admin 7 d, delegado 30 d, mesa 12 h, plataforma 7 d; **sin «Recordarme»**. Solo el cliente refresca (R1).

### 3.2 `ORG_BLOQUEADA` (corte inmediato)
1. El mutator decide por `code`, no por status. `ORG_BLOQUEADA` **no** dispara refresh ni reintento.
2. Vacía la caché de Query y navega a `/<portal>/bloqueada`.
3. Los layouts de servidor redirigen a `bloqueada` (no a `refresh`) si `me` responde `ORG_BLOQUEADA`. `bloqueada` y `login` viven fuera del group protegido (sin bucles).
4. `proxy.ts` no cambia: solo mira cookies.
5. **No se borran cookies** (la liga puede reactivarse y la misma sesión vuelve). La pantalla ofrece «Reintentar» y «Cerrar sesión».
6. El login muestra el mismo mensaje en línea si responde `ORG_BLOQUEADA` (403).
7. Mesa: la cola persistida se **pausa y conserva** (se cablea del todo en la Fase 7; en esta fase queda el contrato en el mutator y la pantalla).

Mensaje (en `es.ts`): «Esta liga está bloqueada. Contacta al administrador de la app.»

### 3.3 Invitación del dueño
- El secreto vive solo en el estado de la mutación (`gcTime: 0`); nunca en URL, `localStorage`, caché de Query ni Sentry (`beforeSend` lo redacta).
- Aceptar: lee `token` y lo quita de la URL con `history.replaceState`; `Referrer-Policy: no-referrer`, `noindex`; `autocomplete="new-password"`, pegar permitido.
- Mensaje de enlace inválido/vencido/usado/anulado: «Este enlace ya no es válido. Pide uno nuevo a quien te invitó.» (códigos exactos ◇).

### 3.4 Liga bloqueada en `/public`
La API responde 404 igual que una liga inexistente. `notFound()` + `not-found.tsx` genérico, `noindex`, Query sin reintentos ante 404, SSE sin reconexión. El desfase de ISR (30–60 s) se acepta.

## 4. Tareas (orden sugerido)

Cada tarea nace con su prueba. El snapshot ya llegó: no hay tareas bloqueadas.

- [x] **1.1** Ampliar `shared/config` y el mutator: tipo de portal (`plataforma | admin | delegado | mesa`), manejo de `ORG_BLOQUEADA`, refresh single-flight por portal.
- [x] **1.2** `proxy.ts` con los cuatro prefijos y el login adecuado por portal; `bloqueada`, `login`, `aceptar-invitacion` y `refresh` como rutas permitidas.
- [x] **1.3** Ruta cliente `/<portal>/refresh?next=…`.
- [x] **1.4** Pantallas `bloqueada` (4 portales) y mensajes en `es.ts` (`ORG_BLOQUEADA`, credenciales, bloqueos, invitación).
- [x] **1.5** ~~MSW de auth y plataforma~~ → **descartado a propósito:** los guards corren en Server Components y MSW solo intercepta en el navegador, así que no puede simular la sesión. En su lugar, E2E contra la API real (`pnpm test:e2e:api`, ver §5). El E2E de CI (MSW) sigue cubriendo la home.
- [x] **1.6** Portal plataforma: login, layout con guard (`GET /plataforma/me`), navegación.
- [x] **1.7** Panel de ligas: lista y filtro; formulario de crear liga + dueño (RHF + Zod, teléfono E.164); editar.
- [x] **1.8** Bloquear / reactivar con diálogos de confirmación.
- [x] **1.9** Diálogo de invitación: copiar (con `aria-live`), WhatsApp, reenviar con confirmación, vencimiento visible.
- [x] **1.10** Pantalla pública de aceptar invitación (token fuera de la URL, contraseña y repetir).
- [x] **1.11** Admin: login, «olvidé mi contraseña», restablecer (`/restablecer-contrasena`), layout con `GET /admin/me`.
- [ ] **1.12** Shell de delegado y mesa. **Hecho:** pantalla «liga bloqueada» (`/delegado/bloqueada`, `/mesa/bloqueada`). **Pendiente:** layout y navegación; necesitan `GET /delegado/me` y `GET /mesa/me`, que llegan con las fases 3 y 2.
- [x] **1.13** Público: `not-found.tsx` de liga y manejo de 404 en Query.
- [x] **1.14** Orval regenerado con el snapshot real. Pendiente: ajustar `es.ts` con los `code` reales.
- [ ] **1.15** Prueba en iPhone real vía túnel HTTPS (cookies Safari, cuatro portales abiertos a la vez).

## 5. Pruebas
- **Vitest:** mutator (no refresca ante `ORG_BLOQUEADA`; single-flight por portal), esquemas Zod (crear liga, contraseña), armado de `wa.me`, mapa de errores.
- **Componentes:** diálogo de invitación (copiar, reenviar con confirmación, secreto descartado al cerrar), formulario de aceptar.
- **Playwright (con MSW):**
  1. Plataforma crea liga e invita al dueño; copiar y `wa.me`; reenviar invalida el enlace anterior; el dueño acepta y entra.
  2. Bloquear una liga: admin/delegado caen **sin bucle de refresh**; el login muestra el mensaje; `/liga/...` da «no disponible».
  3. Reactivar: todo vuelve.
  4. Cuatro portales abiertos a la vez sin pisarse.

### Verificado (2026-10-07)
- `lint`, `typecheck`, `build`: en verde.
- Vitest: 69 pruebas (mutator y refresh single-flight, `ORG_BLOQUEADA`, anti open redirect, esquemas, formato, diálogo del enlace, token fuera de la URL).
- `test:e2e` (CI, MSW): 2 pruebas.
- `test:e2e:api` (API real local, 7 pruebas): rutas protegidas; credenciales incorrectas; crear liga → invitar → copiar/WhatsApp → aceptar → bloquear con corte inmediato → reactivar con la misma sesión; reenviar anula el enlace anterior; slug duplicado; plataforma y admin a la vez; access vencido → `/refresh` → vuelve a la misma página.
- Las pruebas contra la API real dejan ligas `e2e-…` en la base local (no existe borrado).

## 6. Criterio de salida
- [x] Login/refresh/logout de plataforma y de admin.
- [x] Rutas protegidas por portal; rol equivocado rechazado (rol equivocado: cubierto por el guard; la prueba cruzada llega con delegado/mesa).
- [x] Un dueño invitado acepta, pone contraseña y entra.
- [x] Liga bloqueada: corte al instante, sin bucles, con mensaje claro; reactivada, todo vuelve.
- [x] Copiar, WhatsApp y reenviar funcionan; el enlace no queda en ningún almacenamiento.
- [x] `lint`, `typecheck`, `test`, `test:e2e` y `build` en verde.
- [ ] **Probado en iPhone real**; cuatro portales a la vez.
- [x] Cliente generado desde el snapshot real.

## 7. Preguntas abiertas
- ¿Texto del mensaje de WhatsApp?
- ¿Qué más muestra el panel de cada liga además de estado, dueño e invitación?
- Fuente tipográfica, logo y color primario provisionales (pendiente desde la Fase 0).
