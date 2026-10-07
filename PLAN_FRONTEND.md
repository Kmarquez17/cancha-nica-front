# PLAN FRONTEND — Cancha Nica: plataforma de gestión de torneos de fútbol (futsal y campo)

> **Estado:** Fase 0 (stack, decisiones y revisión de coherencia) CERRADA el 2026-10-05. Decisiones: F1–F16 + ajustes por H1–H19, R1–R10, M1–M8 (modalidades, 2026-10-06) y **R11 (plataforma multi-liga, 2026-10-07)** del backend. R11 añade un cuarto portal `plataforma` y el error `ORG_BLOQUEADA`; sus endpoints están **◇ pendientes de confirmar** (sección 13.8).
> **Fuente funcional:** `especificacion_mvp_futsal.md`. Describe la modalidad **FUTSAL** (preset de referencia); las demás modalidades (M1–M8) se tratan en la sección **4.9** y llegan como datos de la edición, no como código aparte.
> **Independencia:** este repo se entiende **solo**. Lo que asume de la API está en la sección **13** (contrato) y puede avanzar sin ella usando `docs/contrato/openapi.snapshot.json` y MSW. `PLAN_BACKEND.md` es el documento hermano y debe mantenerse alineado, pero no hace falta abrirlo para trabajar aquí. Ante contradicción, vale la **sección más reciente** (R11 > M > R > B > H > base).
> **Uso:** este archivo va en la raíz del repo `cancha-nica-front` y es la fuente de la verdad. De él se derivan los planes por fase (`docs/fases/FASE_XX.md`).

---

## 1. Resumen ejecutivo

Una sola aplicación **Next.js (App Router) + TypeScript** con cinco experiencias separadas por *route groups*: **Público**, **Plataforma** (escritorio; el dueño de la app gestiona las ligas, R11), **Admin** (escritorio; el dueño de una liga), **Delegado** (móvil) y **Mesa** (móvil/tablet, uso de pie y a la luz del sol). Consume la API NestJS mediante un cliente generado con **Orval** a partir del OpenAPI, y se despliega en **Railway** (mismo proveedor que la API). La consola de la Mesa es una SPA client-side con reloj local reconciliado con el servidor y una cola de eventos resistente a cortes breves.

---

## 2. Registro de decisiones

| # | Tema | Decisión | Notas |
|---|---|---|---|
| F1 | Portales | **Una sola app Next.js con route groups** | `(public)`, `(plataforma)` (R11), `(admin)`, `(delegado)`, `(mesa)` |
| F2 | Sesión/cookies | **Proxy vía rewrites de Next** (`/api/*` → Railway, sin el prefijo `/api` al reenviar) | Cookies `at_/rt_<portal>` con `Path=/` (R1); sin CORS en rutas con sesión |
| F3 | Cliente de API | **Orval** desde OpenAPI + **TanStack Query** | `pnpm api:generate`; mutator central para errores |
| F4 | UI | **Tailwind v4 + shadcn/ui (Radix)** | lucide-react, Sonner, TanStack Table |
| F5 | Mesa en vivo | **SPA client-side**, Zustand + cola de eventos | `clientEventId`, optimistic UI, reintentos con backoff, Wake Lock |
| F6 | Tiempo real | **Polling con TanStack Query**; **SSE** solo en la vista de partido en vivo | `EventSource` directo a la API, con fallback a polling |
| F7 | Formularios | **React Hook Form + Zod** + mapa de códigos de error | `es.ts` traduce `code` de problem+json |
| F8 | Móvil | **Mobile-first + PWA instalable básica** | Manifest, iconos, sin service worker de datos |
| F9 | Rutas por rol | **Middleware + guard en layouts + sesión por portal** | Cuatro logins (R11 añade plataforma); `GET /plataforma/me`, `/admin/me`, `/delegado/me`, `/mesa/me` (B2); el servidor usa `at_<portal>` y **nunca** rota el refresh (R1) |
| F10 | Testing | **Vitest** (lógica) + **Playwright** (flujos críticos) | MSW para aislar la API cuando haga falta |
| F11 | Deploy | **Railway** (servicio Node con `next start`), junto a la API; dominio propio cuando haya presupuesto | Costo por uso: fijar alertas de gasto antes de abrir inscripciones |
| F12 | Público | **Server Components + ISR** + hidratación de Query | `revalidate` 30–60 s, Open Graph dinámico |
| F13 | Diseño | **Sistema de diseño ligero con tokens**, marca de liga configurable | Densidad distinta por portal; tema claro/oscuro |
| F14 | Estructura | **Por feature + `app/` delgado** | Servidor = Query; Zustand solo en la mesa |
| F15 | Pantallas | **Alcance completo de la especificación** | Sección 6 |
| F16 | A11y/Perf | **WCAG AA + CWV verdes en público + presupuesto móvil** | AAA de contraste en la consola de mesa |

### Ajustes derivados de las decisiones del backend H1–H19 (2026-10-05)

| Origen | Impacto en el front |
|---|---|
| H1/H2 | Pantalla de **llaves** (admin y público): árbol con casillas «por definir» hasta que se resuelve el origen; re-siembra manual del dueño |
| H3 | Consola de penales **tiro a tiro** (orden, ronda, pateador); muestra el resultado de la tanda separado del marcador |
| H4/H7/H8 | Formulario de **reglas de sanción** por edición; flujos de W.O. (reparto de goles entre jugadores del ganador) y de suspensión por quedar bajo `minJugadoresPartido` (en futsal, 3 jugadores) con confirmación explícita |
| H5 | La marca (logo + color) y la zona horaria/moneda salen de la organización; «Hoy» en la mesa usa el día **local** |
| H9 | **No hay botón «traspaso»**: el delegado B da de alta por cédula y se le informa «registrado como traspaso, congelado 1 partido»; mensajes para `PLAYER_ALREADY_ACTIVE` y `TRANSFER_LIMIT_REACHED` |
| H10 | Mensaje `AGE_OUT_OF_RANGE` y, para el dueño, pantalla de **excepciones de edad** |
| H11 | La mesa **anula** (con motivo) y re-registra eventos; el feed muestra los anulados tachados |
| H12 | **Checklist de renovación** (jugadores y equipos en borrador, confirmar/declinar) |
| H13 | Documentos **enmascarados** (`****4321`) salvo para el dueño; el público nunca ve documento, fecha de nacimiento ni fotos de menores |
| H14 | Reporte de **precondiciones** al arrancar la edición, con opción «forzar» y reasignación de delegado |
| H15 | Advertencias de deuda en el pre-partido; jugador con multa impaga bloqueado visualmente |
| H16 | La tabla marca **empates sin resolver** y el dueño fija el orden manual (arrastrar). Desempate: puntos → enfrentamiento directo → dif. de gol → goles a favor. La vista pública puede mostrar «desempate por enfrentamiento directo» como nota al pie del grupo empatado |
| H17 | Pantalla de **configuración del fixture** (vueltas, días, canchas, franjas) y reprogramación con motivo |
| H18 | Pantallas de **«olvidé mi contraseña»**, **restablecer** y **aceptar invitación**; gestión de admins |
| H19 | Sin botones «eliminar» de negocio: se **archiva**; acción «anonimizar jugador» solo para el dueño |

### Ajustes derivados de la revisión de coherencia, R1–R10 (2026-10-05)

| Origen | Impacto en el front |
|---|---|
| R1 | Sesión por portal con cookies `at_<portal>` / `rt_<portal>`. El **refresh lo hace solo el cliente**, en *single-flight* (una única petición en curso; las demás esperan su resultado). Si un Server Component recibe un 401, redirige a una ruta cliente `/<portal>/refresh?next=…` que refresca y vuelve. Los tres portales pueden estar abiertos en el mismo navegador sin pisarse |
| R2 | El login de mesa vive en **`/mesa/[edicionSlug]/login`**. El dueño comparte el enlace o un QR desde el panel («copiar enlace de mesa»). Mensajes diferenciados para `ACCOUNT_LOCKED` e `IP_LOCKED`. El panel del dueño muestra el aviso de cuenta bloqueada y el botón «desbloquear» |
| R3 | La tabla no incluye partidos `REABIERTO`; el partido reabierto muestra «en revisión». Marcador oficial = `golesLocalFinal/VisitanteFinal`; el marcador en vivo de la consola sale de los eventos |
| R4 | Mensaje `EDICION_CATEGORIA_ABIERTA` al intentar abrir una edición de una categoría que ya tiene una abierta |
| R5 | Mensaje `TRANSFER_LIMIT_REACHED` explicado como «este jugador ya estuvo en 3 equipos esta edición» |
| R6 | El delegado ve sus saldos y el detalle por cargo (multa de jugador, arbitraje, inscripción) con estado pagado/pendiente. El checklist de arbitraje del pre-partido registra un abono (no un check local) |
| R8 | Banner «Edición en pausa» en los portales de mesa y delegado (acciones deshabilitadas). Al llegar el reloj del 2T a 00:00 el reloj se detiene y se ofrece «Finalizar partido» (o «Ir a penales» en una llave empatada) |
| R9 | La consola maneja `PARTIDO_EN_USO` con un diálogo «Este partido lo opera otro dispositivo — Tomar el control». La cola envía en orden y espera la confirmación de cada evento |
| R10 | Búsqueda por cédula: muestra solo nombre, apellido y año de nacimiento; si es un jugador nuevo, pide los demás datos. Mensaje de límite de búsquedas. **Un 4xx de negocio detiene la cola de la mesa** y muestra «corregir» o «descartar» sobre el evento rechazado; los siguientes esperan |

### Ajustes derivados de las modalidades, M1–M8 (2026-10-06)

El producto es **Cancha Nica** y sirve a futsal y a fútbol de campo (9 u 11). El front **no tiene versiones por modalidad**: lee `modalidad` y `reglasModalidad` de la edición y adapta pantallas y motor (sección 4.9).

| Origen | Impacto en el front |
|---|---|
| M1/M2 | El formulario de **crear/editar edición** tiene un selector de modalidad que **precarga el preset** (jugadores en cancha, mínimo, convocados, duraciones, rosters, faltas, efecto de la roja, modo de reloj) y deja ajustar cada valor. Mensaje para `MODALIDAD_REGLAS_INVALIDAS` en el campo que corresponda |
| M3 | Sin cambios en tabla, llaves, finanzas, sanciones por tarjeta, W.O., penales, traspasos ni auth |
| M4 | Modalidad y reglas **solo lectura** desde `EN_CURSO`, con explicación; mensaje `MODALIDAD_BLOQUEADA` |
| M5 | `EDICION_CATEGORIA_ABIERTA` ahora considera la modalidad: el mensaje dice «ya hay una edición abierta de esta categoría en <modalidad>» |
| M6 | La renovación muestra la modalidad heredada y la deja editable mientras la edición #2 esté en `CONFIGURACION` |
| M7 | Sin botón de sustituciones en el MVP; los jugadores en cancha se derivan (`jugadoresEnCancha − rojas vigentes`) |
| M8 | La consola pinta el reloj en cuenta atrás (`REGRESIVO`) o hacia arriba con tiempo agregado (`PROGRESIVO`) |

### Ajustes derivados de la plataforma multi-liga, R11 (2026-10-07)

El dueño de la app gestiona **N ligas** desde un panel propio. Todos los endpoints de plataforma están marcados ◇ en el backend: **se anotan como pendientes de confirmar** (13.8) y el cliente de Orval **no se regenera** hasta que exista el `openapi.snapshot.json` de la Fase 1 del API; mientras tanto se trabaja con MSW sobre el contrato asumido.

| Tema | Impacto en el front |
|---|---|
| Cuarto portal `plataforma` | Route group `(plataforma)`, login, layout y guard propios, cookies `at_plataforma` / `rt_plataforma` (refresh de 7 días). Cuenta única creada por seed: **sin** «olvidé mi contraseña» ni registro (se recupera por seed/CLI). Sin 2FA en el MVP. Ver 4.10 |
| Panel de ligas | Listar, crear liga + invitar a su dueño, editar, bloquear y reactivar. La plataforma **no ve datos internos** de una liga: no hay enlace «entrar como admin» |
| Invitación del dueño | `INVITACION_OWNER` (7 días). El panel muestra el enlace **una sola vez** con «Copiar» y «WhatsApp» (`wa.me` con el teléfono del invitado), más «Reenviar» (anula el anterior). Pantalla pública de aceptar invitación y poner contraseña. Ver 4.10 |
| `ORG_BLOQUEADA` | Dar de baja = bloquear. Corte inmediato en admin, delegado y mesa: pantalla «liga no disponible» por portal, sin bucles de refresh y sin perder la cola de la mesa. Ver 4.2.1 |
| `/public` de liga bloqueada | La API responde 404; el front muestra «liga no disponible» y no reintenta. Ver 4.6 |
| Refresh por portal | Admin 7 d, delegado 30 d, mesa 12 h, plataforma 7 d; **sin «Recordarme»** (cierra la pregunta F1 sobre «recordarme»). Los 12 h de la mesa cubren un partido completo |

### Valores por defecto asumidos (no se preguntaron; corregir si no aplican)
- **Idioma:** solo español, pero todos los textos pasan por un diccionario (`es.ts`) para poder añadir otros idiomas sin refactor.
- **Zona horaria:** las fechas llegan en UTC y se muestran en la `zonaHoraria` de la organización (ya definida en el backend, H5). «Hoy» en la mesa se calcula con el día **local** de la organización.
- **Moneda:** `Intl.NumberFormat` con moneda configurable por organización; los montos llegan como `string` decimal y **nunca** se operan como `float`.
- **Teléfonos:** `libphonenumber-js`; se normaliza a E.164 antes de enviar.

---

## 3. Stack

| Área | Elección |
|---|---|
| Framework | Next.js (última estable, App Router), React, TypeScript estricto |
| Gestor | pnpm |
| Estilos | Tailwind CSS v4, CSS variables (tokens), `tailwind-merge`, `class-variance-authority` |
| Componentes | shadcn/ui (Radix), lucide-react, Sonner (toasts), TanStack Table |
| Datos | TanStack Query v5, **Orval** (hooks + tipos desde OpenAPI) |
| Estado cliente | Zustand (solo mesa en vivo y UI efímera) |
| Formularios | React Hook Form, Zod, `@hookform/resolvers` |
| Fechas/teléfono | `date-fns` (+ `date-fns-tz`), `libphonenumber-js` |
| Errores | Sentry (`@sentry/nextjs`) |
| Calidad | ESLint, Prettier, `tsc --noEmit`, Husky + lint-staged |
| Tests | Vitest + Testing Library, Playwright, MSW |
| CI | GitHub Actions (lint, typecheck, test, build, Lighthouse como aviso) |
| Deploy | Railway (entorno por PR si se habilita) |

> **Nota de versión:** el archivo de interceptación de rutas se llama `middleware.ts` en versiones anteriores de Next y `proxy.ts` en las más recientes. Al crear el proyecto, verificar el nombre vigente en la versión instalada y fijarlo aquí.

---

## 4. Arquitectura

### 4.1 Estructura de carpetas

```
cancha-nica-front/
├─ PLAN_FRONTEND.md          ← este archivo
├─ docs/
│  ├─ especificacion_mvp_futsal.md
│  └─ fases/
├─ orval.config.ts
├─ next.config.ts            ← rewrites /api/* → API_URL
├─ public/                   ← manifest, iconos PWA
└─ src/
   ├─ middleware.ts (o proxy.ts)
   ├─ app/                   ← SOLO rutas, layouts y composición
   │  ├─ (public)/liga/[orgSlug]/[edicionSlug]/{page,tabla,calendario,goleo,llaves,partido/[id]}
   │  ├─ (plataforma)/plataforma/{login, (panel)/ligas/{page, nueva, [id]}}   (R11)
   │  ├─ (admin)/admin/{login, aceptar-invitacion, bloqueada, (panel)/...}
   │  ├─ (delegado)/delegado/{login, bloqueada, (app)/...}
   │  ├─ (mesa)/mesa/{bloqueada, [edicionSlug]/{login, (app)/...}}
   │  ├─ layout.tsx · globals.css · manifest.ts
   ├─ features/              ← una carpeta por dominio
   │  ├─ auth/               (formularios de login, sesión, refresh)
   │  ├─ plataforma/         (R11: ligas, invitación del dueño)
   │  ├─ ediciones/ · mesas/ · clubes/ · equipos/ · delegados/
   │  ├─ roster/             (alta por cédula, bajas, traspasos)
   │  ├─ fixture/ · posiciones/ · goleo/
   │  ├─ partido-vivo/       (store Zustand, cola de eventos, reloj, consola)
   │  ├─ finanzas/ · sanciones/ · eliminatorias/ · auditoria/
   │  └─ public/             (vistas públicas)
   │     └─ cada feature: components/ hooks/ schemas/ lib/
   └─ shared/
      ├─ api/
      │  ├─ generated/       ← salida de Orval (no editar a mano)
      │  ├─ mutator.ts       (fetch + refresh + ApiError)
      │  └─ errors/          (ApiError, es.ts: code → mensaje)
      ├─ ui/                 (shadcn + componentes propios)
      ├─ lib/                (formato de dinero/fecha/teléfono, utils)
      └─ config/             (env, constantes)
```

Reglas: `app/` no contiene lógica de negocio; una feature **no importa** de otra, **salvo** `features/public`, que está pensada para **componer** las piezas de presentación de `posiciones`, `goleo` y `eliminatorias` (esas features exponen un `index.ts` público con sus componentes de solo lectura). Si dos features comparten otra cosa, sube a `shared/`. Los portales comparten `shared/ui` y `shared/lib`.

### 4.2 Sesión, cookies y rutas protegidas
- El navegador solo habla con el dominio público del front (Railway). `next.config` reescribe `/api/:path*` → `API_URL/:path*` (el prefijo `/api` se elimina al reenviar). Las cookies se emiten según **R1**: `at_<portal>` y `rt_<portal>`, `httpOnly; Secure; SameSite=Lax; Path=/`, same-site y sin CORS.
- **Tokens en cookies httpOnly, nunca en JavaScript ni `localStorage`.** El mutator de Orval envía las cookies (`credentials: 'include'`). Ante un `401` ejecuta un **refresh en single-flight** (`POST /api/auth/refresh`) y reintenta **una sola vez**; si falla, redirige al login del portal correspondiente. **Solo el cliente refresca**; el servidor jamás rota el refresh (evita la carrera con la rotación).
- **Middleware/proxy:** por prefijo (`/plataforma`, `/admin`, `/delegado`, `/mesa`) comprueba la presencia de `rt_<portal>` o `at_<portal>` y redirige al login adecuado (para la mesa, a `/mesa/[edicionSlug]/login`). **No** valida permisos finos.
- **Layouts de grupo:** hacen `GET /<portal>/me` **en servidor** con `at_<portal>` para confirmar el rol, precargar el principal y rechazar roles equivocados. Si `at_<portal>` venció (401), redirigen a la ruta cliente de refresh. El backend sigue siendo la autoridad real.
- Cuatro pantallas de login: Plataforma (email + contraseña, **sin** «olvidé mi contraseña»; R11), Admin (email + contraseña, con «olvidé mi contraseña», restablecer y aceptar invitación), Delegado (teléfono + PIN, `inputmode="numeric"`) y Mesa (`/mesa/[edicionSlug]/login`, usuario `MESA_X` + PIN; la edición viene de la URL).
- **SSE y rewrites:** el proxy de rewrites de Next puede bufferizar streams. El `EventSource` público se conecta **directo a la API** (sin cookies; CORS habilitado solo para ese endpoint, ajuste B4).

#### 4.2.1 Liga bloqueada: `ORG_BLOQUEADA` (R11)
Cuando la plataforma bloquea una liga, la API rechaza **en cada petición** de admin, delegado y mesa (aunque el `at_<portal>` siga vigente), y también `POST /auth/refresh` y los logins. Por eso la sesión «cae al instante» y el front debe distinguir esto de un 401 normal:

- **Mutator:** un `ApiError` con `code = ORG_BLOQUEADA` **no** dispara el refresh ni el reintento (un refresh solo recibiría el mismo error y entraría en bucle). Se corta, se vacía la caché de TanStack Query y se navega a `/<portal>/bloqueada` (mesa: `/mesa/bloqueada`, global: el error no trae el slug de la edición). La API responde **403** `ORG_BLOQUEADA` (confirmado en el snapshot de la Fase 1); aun así el front decide por `code`, nunca por status.
- **Layouts de servidor:** si el `GET /<portal>/me` responde `ORG_BLOQUEADA`, redirigen a `/<portal>/bloqueada` (**no** a `/<portal>/refresh`). Las rutas `bloqueada` y `login` viven **fuera** del group protegido, así que no se vuelve a evaluar el guard.
- **Proxy (`proxy.ts`):** solo mira la presencia de cookies, no puede saber que la liga está bloqueada. No se le añade lógica: a lo sumo, la pantalla `bloqueada` es una ruta permitida aunque haya cookies. La detección ocurre en el primer `me` o en la primera petición.
- **Cookies: NO se borran** (confirmado por el backend). Si la liga se reactiva, la misma sesión vuelve a funcionar. La pantalla `bloqueada` solo informa y ofrece «Reintentar» (vuelve a pedir `me`) y «Cerrar sesión» (`POST /auth/logout?portal=…`, idempotente 204, solo si el usuario lo pide).
- **Pantalla `bloqueada` (por portal):** mensaje sin datos internos: «Esta liga está bloqueada. Contacta al administrador de la app.» Sin reintento automático; botones «Reintentar» y «Cerrar sesión».
- **Login:** si el login responde `ORG_BLOQUEADA`, se muestra el mismo mensaje en línea (no «credenciales inválidas»).
- **Mesa (caso crítico):** la cola de eventos está persistida en `localStorage` por `partidoId`. Ante `ORG_BLOQUEADA` la cola se **pausa** (no se descarta, no cuenta como 4xx de negocio de R10) y el indicador pasa a «Pendiente (n) — liga no disponible». Si la liga se reactiva, al volver a entrar por el login la consola retoma el envío en orden. Nunca se borran eventos por este error.
- **Formularios abiertos (admin/delegado):** el corte es inmediato y no se puede avisar antes; lo que estaba sin guardar se pierde. La pantalla solo informa, sin prometer recuperación.
- **Reactivación:** al reactivar, todo vuelve con la misma sesión (las cookies no se tocaron); «Reintentar» alcanza.

### 4.3 Datos del servidor
- Orval genera hooks por `operationId` (ej. `useGetEdiciones`, `useCerrarActa`). El script `pnpm api:generate` lee el `/docs-json` del backend (URL por variable de entorno). El resultado se **versiona** en git para que el build no dependa de la API; CI avisa si hay diferencias contra el OpenAPI actual.
- **Convención de claves:** las genera Orval; las invalidaciones se agrupan por recurso (`ediciones`, `roster`, `partidos`, `posiciones`).
- **Polling:** `refetchInterval` de 10–30 s en tablas y dashboards, **pausado con la pestaña oculta** (`refetchIntervalInBackground: false`).
- **Dinero:** `string` decimal de punta a punta; se formatea solo al renderizar.

### 4.4 Errores de negocio
`ApiError { status, code, title, detail, requestId, errors? }` se construye desde `application/problem+json`. El diccionario `shared/api/errors/es.ts` mapea cada `code` del backend (`ROSTER_FULL`, `PLAYER_ALREADY_ACTIVE`, `CLOCK_NOT_ELAPSED`…) a un mensaje amable y, cuando aplica, a un campo del formulario (`setError`). Un `code` desconocido muestra un mensaje genérico con el `requestId` para soporte. Los `5xx` se envían a Sentry.

### 4.5 Mesa en vivo (el módulo de mayor riesgo)
Ruta `/mesa/partido/[id]`, client component.

- **Store (Zustand):** `periodo`, `relojEstado`, `elapsedMs` base, `serverOffset`, marcador, faltas por equipo/dorsal, inferioridades vigentes, `colaEventos[]`, `estadoSync`.
- **Reloj local:** se pinta con `requestAnimationFrame`/`setInterval` calculando `elapsed = base + (performance.now() − marcaLocal)`; se muestra como `duración − elapsed` (cuenta atrás, `REGRESIVO`) o como `elapsed` pasando de la duración con «+N» de tiempo agregado (`PROGRESIVO`). En **cada respuesta** del servidor se reconcilia con `serverNow`/`elapsedMs` (ajuste B5) para corregir deriva. El servidor es la autoridad.
- **Eventos:** cada acción crea `{ clientEventId: crypto.randomUUID(), tipo, periodo, tiempoMs, ... }`, se refleja **al instante** (optimistic UI) y entra a la cola, persistida en `localStorage` (clave por `partidoId`). El worker envía **en orden, uno a la vez**, esperando la confirmación de cada uno, con **backoff exponencial**. `200/201` = éxito (idempotencia, B9); `5xx`/red = reintento. **Un `4xx` de negocio detiene la cola (R10):** se muestra el evento rechazado con el motivo y se ofrece «corregir» o «descartar»; los eventos siguientes esperan hasta resolverlo. Si el servidor responde `PARTIDO_EN_USO`, se pausa la cola y se ofrece «tomar el control» (R9).
- **Indicador permanente:** `Sincronizado` · `Pendiente (n)` · `Sin conexión`. Al cerrar el acta se **bloquea** hasta que la cola esté vacía.
- **Lease (R9):** la consola renueva el lease con cada petición y con un latido cada 30 s mientras está abierta. Si otro dispositivo toma el control, la consola pasa a **solo lectura** y avisa.
- **Reglas en cliente (solo UX; el servidor valida):** botón «Pasar a 2T» deshabilitado hasta cumplir la duración reglamentaria (00:00 en `REGRESIVO`; duración cumplida en `PROGRESIVO`); botón de contingencia por quedar bajo `minJugadoresPartido`. **Según `reglasModalidad` (4.9):** alertas de faltas colectivas («Tiro para [Rival]…», con botón para ocultar y reaparición en la siguiente) y de faltas personales solo si `registraFaltas`; temporizador de inferioridad de 02:00 que se cancela con gol rival solo si `roja.inferioridadMs` está definido y `cancelaPorGolRival` (en campo, la roja deja al equipo con uno menos hasta el final). Los valores del futsal (6.ª falta, 3 faltas personales, 02:00, 3 jugadores) son el preset, no constantes del código.
- **Motor puro** (`partido-vivo/lib/engine.ts`) sin React: calcula faltas, alertas e inferioridad desde la lista de eventos **y de `reglasModalidad`** (recibida como parámetro; nunca se compara contra el nombre de la modalidad). Debe mantenerse **equivalente** al motor del backend (`faltas.engine.ts`); se prueba con los mismos casos, **una tabla por modalidad** (tabla de casos compartida en la documentación).
- **UX de cancha:** botones ≥56 px, alto contraste (AAA), vibración háptica (`navigator.vibrate`) en alertas, **Wake Lock** para no apagar la pantalla, bloqueo de zoom accidental y de pull-to-refresh, orientación vertical y horizontal.
- **Feed:** últimos 10 eventos + modal con historial completo y filtros (Todos, Goles, Faltas, Tarjetas). Corregir un evento = anularlo (el backend marca `anulado`), nunca borrarlo.

### 4.6 Vista pública
Server Components con ISR (`revalidate` 30–60 s) y `tags` invalidables. El cliente hidrata TanStack Query con los datos iniciales y sigue con polling. La página de un partido en curso abre un `EventSource` a `/public/.../stream` y actualiza la caché con `setQueryData`; si el stream cae, vuelve a polling. Open Graph dinámico (imagen con marcador/tabla) para previews en WhatsApp. Rutas: `/liga/[orgSlug]/[edicionSlug]/…`.

**Liga bloqueada (R11):** la API responde **404** en todas las rutas `/public/organizaciones/:orgSlug/...` de una liga bloqueada, igual que una inexistente (no se filtra que existe).
- **Server Components:** ante 404 llaman a `notFound()`; `app/(public)/liga/[orgSlug]/not-found.tsx` muestra «Esta liga no está disponible» con enlace al inicio. El mensaje es el mismo para «no existe» y «bloqueada». Las páginas llevan `noindex` en ese caso.
- **ISR:** una página ya generada puede seguir sirviéndose hasta su siguiente revalidación (`revalidate` 30–60 s); ese desfase se acepta. La API no conoce al front, así que no hay invalidación por `tag` al bloquear (◇ si más adelante se quiere un webhook). Un 404 nunca se cachea como éxito.
- **Cliente:** TanStack Query no reintenta ante 404 (`retry: false` para ese status). Si un polling en una página abierta empieza a devolver 404 (se bloqueó mientras alguien miraba), se sustituye el contenido por el mismo «liga no disponible».
- **SSE:** si el `stream` responde 404 o el `EventSource` falla y el polling de respaldo recibe 404, se cierra el stream y **no** se reconecta.
- **Open Graph / metadatos:** si la liga no está disponible, `generateMetadata` devuelve título genérico y sin imagen de la liga.
- Al reactivar, todo vuelve solo (con el mismo desfase de ISR).

### 4.7 Diseño y temas
- **Tokens** como CSS variables (`--color-primary`, `--radius`, escala tipográfica, espaciado). Tema claro/oscuro.
- **Marca de la liga** (logo + color primario) leída de la organización; con valores por defecto.
- **Densidades por portal:** Admin denso (tablas, filtros); Delegado limpio y móvil; Mesa de alto contraste y táctil; Público ligero y orientado a compartir.
- Estados de tarjeta/alerta **nunca solo por color**: icono + texto (🟨/🟥).

### 4.8 Accesibilidad y rendimiento (F16)
- **A11y:** contraste AA (AAA en la consola de mesa), foco visible, navegación por teclado, `label` en todos los inputs, `aria-live` para alertas de partido, `prefers-reduced-motion`.
- **Core Web Vitals (público, móvil medio):** LCP < 2.5 s, CLS < 0.1, INP < 200 ms. Lighthouse en CI como **aviso**, no bloqueante.
- **Presupuesto:** < 150 kB de JS inicial en público y delegado. Admin y tablas pesadas con `dynamic import`. `next/font`, `next/image`.

### 4.9 Modalidades (M1–M8)

La edición trae `modalidad` (`FUTSAL`, `FUTBOL_9`, `FUTBOL_11`) y `reglasModalidad`; el contrato exacto y los presets están en el backend (4.14) y en la sección 13.5. El front los trata como **datos**:

- **Un solo hook** `useReglasModalidad(edicionId)` en `shared/` (o en la feature `ediciones`, expuesto por su `index.ts`) entrega las reglas ya tipadas por Orval. Ninguna pantalla ni motor hace `if (modalidad === 'FUTSAL')`: se pregunta por el parámetro (`registraFaltas`, `relojModo`, `roja.inferioridadMs`…).
- **Mesa:** sin `registraFaltas` no se renderizan el botón de falta, el contador colectivo ni las alertas; el panel de la roja explica el efecto real («2 minutos con uno menos» o «hasta el final del partido»); el pre-partido usa `maxConvocados` y `minJugadoresPartido`; el reloj sigue `relojModo`.
- **Admin:** el selector de modalidad precarga el preset y valida las invariantes en cliente con Zod (el servidor manda). Después de `EN_CURSO` los campos se muestran deshabilitados.
- **Público:** una insignia con la modalidad en la cabecera de la edición; los textos de faltas y de reglas se muestran solo si aplican.
- **Plantilla del delegado:** los límites del roster salen de `rosterMin`/`rosterMax` de la edición, no de constantes (los mensajes dicen «máximo {n} jugadores»).
- **Textos:** las cadenas dependientes de la modalidad llevan parámetros en `es.ts` (`{jugadoresEnCancha}`, `{minJugadoresPartido}`), sin números pegados.

### 4.10 Plataforma multi-liga (R11)

**Portal `plataforma`** (`/plataforma`, escritorio). Login (email + contraseña) → `POST /auth/plataforma/login`; principal `GET /plataforma/me`; layout y guard propios con cookies `at_plataforma` / `rt_plataforma` y refresh en single-flight igual que los demás portales. Es una cuenta única creada por seed: sin registro, sin «olvidé mi contraseña» y sin 2FA. Los intentos fallidos se bloquean escalonadamente en la API (`INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `IP_LOCKED`, ya traducidos). **No ve datos internos de ninguna liga:** no hay «entrar como» ni listados de ediciones, equipos o jugadores.

**Panel de ligas** (`features/plataforma`):
- **Listar:** tabla de ligas con nombre, slug, estado (`ACTIVA` / `BLOQUEADA`, con texto y no solo color), dueño (nombre, y si su invitación está pendiente, vencida o aceptada) y fecha de alta. Filtro por estado.
- **Crear liga + invitar a su dueño:** un solo formulario (React Hook Form + Zod) con los datos de la liga y los del dueño (nombre, email, **teléfono E.164**, necesario para el botón de WhatsApp) y la opción «enviar también por email». Son **dos llamadas**: `crearOrganizacion` (nombre, slug —inmutable—; opcionales zona horaria, moneda, país, color, teléfono) y luego `invitarDueno` (`{ email, nombre, telefono?, enviarEmail? }`); al terminar se abre el diálogo de invitación (abajo).
- **Editar:** `PATCH /plataforma/organizaciones/:id`. El cambio de dueño lo hace plataforma (hay un solo OWNER por liga): se modela como nueva invitación de dueño; el detalle exacto ◇.
- **Bloquear** (`POST …/bloquear`, **`motivo` obligatorio de 3–500 caracteres**): diálogo de confirmación que explica el efecto («sus usuarios pierden el acceso de inmediato y su sitio público deja de verse; no se borra nada»). **Reactivar** (`POST …/reactivar`): confirmación simple. Ambos invalidan la lista. No existe «eliminar».
- Textos y confirmaciones en `es.ts`; cada acción queda auditada en el backend (`TipoActor.PLATAFORMA`), el front no la registra.

**Invitación del dueño (diálogo del panel)** — `POST /plataforma/organizaciones/:id/invitacion` devuelve `enlace` y `waMeUrl` **una sola vez**; el token en claro no vuelve a existir.
- Se muestra en un diálogo con: el enlace (campo de solo lectura), **«Copiar enlace»** (`navigator.clipboard`, con confirmación en un `aria-live` y plan B de selección manual) y **«Enviar por WhatsApp»** (abre `waMeUrl`; si la API no lo trae, el front lo arma con `https://wa.me/<teléfono sin +>?text=<mensaje codificado>`). Aviso visible: «Este enlace solo se muestra ahora. Si lo pierdes, usa Reenviar.»
- **Reenviar:** genera un enlace nuevo y **anula el anterior**; pide confirmación («el enlace anterior dejará de funcionar»). La vigencia es de 7 días y se muestra la fecha de vencimiento.
- **Higiene del secreto:** el enlace vive solo en el estado de la mutación (`gcTime: 0`, `useMutation` sin persistencia); nunca en `localStorage`, en la URL, en la caché de Query ni en Sentry/logs (se redacta en `beforeSend`). Al cerrar el diálogo se descarta.

**Aceptar invitación del dueño (pantalla pública, sin sesión)** — lo que faltaba definir en el front:
- Ruta **pública `/aceptar-invitacion?token=…`** (raíz, nombre exacto: los enlaces los arma la API con `FRONT_URL`). Una sola pantalla y un solo endpoint (`aceptarInvitacion`) para dueño y admins. Análoga: **`/restablecer-contrasena?token=…`** (`restablecerContrasena`, 204, **no abre sesión** → lleva al login).
- Al cargar: lee el `token` y lo quita de la URL con `history.replaceState`; la página responde `Referrer-Policy: no-referrer` y `noindex` para que el token no se filtre. No hay `GET` de previsualización: solo el formulario.
- Formulario: **contraseña** (10–128 caracteres, distinta del correo y no un solo carácter repetido; `PASSWORD_DEBIL` trae el motivo en `detail`) y **repetir contraseña**; `autocomplete="new-password"` y pegar permitido.
- Éxito: **la API ya abre sesión `admin`** (200 `AdminPrincipalDto` + cookies) → redirige al panel de admin. Errores: `TOKEN_INVALIDO_O_EXPIRADO` (vencido, usado o anulado por un reenvío) → «Este enlace ya no es válido. Pide uno nuevo a quien te invitó»; `PASSWORD_DEBIL`; `ORG_BLOQUEADA`; 409.

---

## 5. Convenciones

- **Nombres:** componentes `PascalCase`, hooks `useX`, archivos de feature en `kebab-case`.
- **Idioma del código:** identificadores en inglés técnico; textos de UI solo en `es.ts` / archivos de mensajes.
- **Server vs Client:** por defecto Server Components; `"use client"` solo donde hay interacción/estado. La mesa en vivo es 100 % cliente.
- **Formularios:** un esquema Zod por formulario en `schemas/`, reutilizado para tipos.
- **Variables de entorno:** `API_URL` (rewrites y SSE), `NEXT_PUBLIC_SSE_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SITE_URL`. Validadas con Zod al arrancar; `.env.example` versionado.
- **Git:** ramas por fase (`fase-06-mesa-en-vivo`), Conventional Commits.
- **Regla de contrato:** el front **nunca** edita `shared/api/generated`. Si el contrato no sirve, se pide el cambio al backend y se regenera.

---

## 6. Pantallas del MVP por portal (F15)

### Público — `/liga/[orgSlug]/[edicionSlug]` (SSR + ISR)
Home de la edición · Tabla de posiciones · Calendario y resultados · Goleo · Llaves de eliminatorias · Partido (acta y en vivo por SSE) · «Liga no disponible» (liga bloqueada o inexistente, R11).

### Plataforma (escritorio) — `/plataforma` (R11)
Login · Ligas (lista con filtro por estado) · Nueva liga + invitar al dueño · Detalle/editar liga · Bloquear / reactivar · Diálogo de invitación (copiar, WhatsApp, reenviar). Sin acceso a datos internos de las ligas.

### Admin (escritorio) — `/admin`
Login · Aceptar invitación (también la del dueño, R11) · «Liga no disponible» (`ORG_BLOQUEADA`) · Dashboard de la edición activa · Ediciones (lista, crear **eligiendo modalidad y ajustando su preset**, configurar, cambiar estado) · Mesas (3: PIN, bloquear, resetear) · Clubes y delegados · Equipos de la edición · Jugadores/rosters (lectura y excepciones) · Fixture (generar y editar) · Partidos (detalle, **reabrir acta**) · Finanzas (inscripción, arbitraje, multas) · Sanciones · Eliminatorias · Renovación de temporada (checklist) · Auditoría · Usuarios admin.

### Delegado (móvil) — `/delegado`
Login teléfono + PIN · «Liga no disponible» · Selector de equipo · Inicio (saldos, próximo partido, posición) · Plantilla (lista, alta por cédula con precarga, baja, traspaso; **sin botón eliminar**; se oculta en `EN_ELIMINATORIAS`) · Calendario y resultados · Tabla · Finanzas del equipo.

### Mesa (móvil/tablet) — `/mesa`
Login `MESA_X` + PIN en `/mesa/[edicionSlug]/login` · «Liga no disponible» (cola pausada, no descartada) · Agenda **Hoy** (día local; operable) / **Futuros** (lectura) · Pre-partido (hasta `maxConvocados` convocados y mínimo `minJugadoresPartido` habilitados, bloqueos visuales, checklist de arbitraje = abonos; futsal: 12 y 4) · **Consola en vivo** (reloj, faltas si la modalidad las registra, tarjetas, expulsión, feed, correcciones por anulación, penales, W.O.) · Cierre de acta.

---

## 7. Estrategia de pruebas

| Nivel | Qué cubre | Herramienta |
|---|---|---|
| Unitario | Motor de faltas/inferioridad **con los tres presets de modalidad**, reconciliación del reloj (`REGRESIVO` y `PROGRESIVO`), cola de eventos (reintentos, idempotencia, orden), mapa de errores, esquemas Zod, formateo de dinero/fecha | Vitest |
| Componentes | Formulario de alta de jugador, selector de equipo, alertas de la consola | Vitest + Testing Library |
| E2E | Login de los 4 actores (incluye plataforma), crear liga + invitación del dueño (copiar, wa.me, reenviar anula el anterior, aceptar y poner contraseña), **bloquear una liga y ver caer admin/delegado/mesa sin bucle de refresh, la mesa conservando su cola, y `/liga/...` en 404; reactivar y que todo vuelva**, alta de jugador (límites `rosterMin`/`rosterMax` de la edición, duplicado), operar partido hasta cerrar acta en futsal y en fútbol 11 (incluye corte de red simulado), vista pública y su actualización | Playwright (+ API real en Docker o MSW) |
| Calidad | ESLint, `tsc`, build, Lighthouse (aviso) | GitHub Actions |

---

## 8. Despliegue (Railway)

- **Proyecto:** servicio en Railway conectado al repo `cancha-nica-front`; `main` = producción; entorno de preview por PR si se habilita (*PR environments*). Build `pnpm build`, arranque `pnpm start` (Next lee `PORT` de Railway). Node 22 fijado con `engines` en `package.json`.
- **Variables:** `API_URL` (URL de la API en Railway), `NEXT_PUBLIC_SSE_URL`, `NEXT_PUBLIC_SITE_URL`, Sentry, y el `orgSlug` por defecto. **Deben existir en el *build*:** `API_URL` se evalúa al construir los rewrites y las `NEXT_PUBLIC_*` se incrustan en el bundle; cambiarlas obliga a redesplegar.
- **Rewrites:** `/api/:path*` → `API_URL`. Verificar en el entorno desplegado que **no** buferizan el SSE (si lo hacen, el stream va directo, como ya está previsto).
- **Costos:** Railway cobra por uso; configurar alertas de gasto y revisar el plan antes de que la liga cobre inscripciones.
- **Dominio:** `*.up.railway.app` al inicio; dominio propio cuando haya presupuesto (habilita cookie en dominio raíz y quita la dependencia del proxy).
- **PWA:** `manifest.ts` + iconos; instalable para delegado y mesa.

### 8.1 FASE_DEPLOY_RAILWAYS (diferida)

> **Estado:** ⏸ Diferida a propósito. Se ejecuta **al final**, cuando el front esté terminado y probado en local, para no generar costos en Railway antes de tiempo. Corresponde a las tareas 0.16–0.20 de la Fase 0b (0.15, GitHub + CI, no cuesta y ya se hizo). Mientras tanto todo se prueba en local: `pnpm dev` en el puerto 3001, con la API local o con MSW.

**Requisitos antes de empezar**
- [ ] El front está terminado y probado en local (`lint`, `typecheck`, `test`, `test:e2e`, `build` en verde).
- [ ] La API (`cancha-nica-api`) tiene su propio despliegue en Railway y una URL pública.
- [ ] Alertas de gasto configuradas en Railway y plan revisado.
- [ ] CI en verde en GitHub (0.15).

#### ⏸ 0.16 Servicio en Railway
1. Nuevo servicio desde el repo `cancha-nica-front` (rama `main`/`master`). Build `pnpm build`, arranque `pnpm start` (Next usa el `PORT` de Railway). Fija Node 22 con `"engines": { "node": ">=22" }` en `package.json`.
2. Variables (**antes del build**, porque `API_URL` y las `NEXT_PUBLIC_*` se evalúan al construir): `API_URL` (URL de la API en Railway; si ambos servicios están en el mismo proyecto puede usarse la URL interna), `NEXT_PUBLIC_SITE_URL` (dominio público del front), `NEXT_PUBLIC_USE_MSW=false`.
3. Genera el dominio público (`*.up.railway.app`) y, si se quiere, habilita *PR environments* para previews.
**Comprobación:** abre la URL de Railway desde el celular: «API conectada ✅» (esto prueba el proxy hacia la API).

#### ⏸ 0.17 CORS en la API para previews
Añade a la API el dominio de producción del front (Railway) en `CORS_ORIGINS` y el patrón de previews (`CORS_ORIGIN_PATTERNS`), **solo** para rutas públicas y SSE (B4).

#### ⏸ 0.18 Verificar que el proxy no rompe nada
Comprueba que `/api/ping` responde por el proxy del front en Railway y anota si los rewrites bufferizan el SSE (se prueba de verdad en la Fase 8; si lo hacen, el SSE ya está previsto para ir **directo** a la API con `NEXT_PUBLIC_SSE_URL`).

#### ⏸ 0.19 Sentry (opcional ahora)
`@sentry/nextjs`, DSN por variable y `beforeSend` que elimina cookies y cabeceras de autorización. Puede dejarse para la Fase 11.

#### ⏸ 0.20 Dominio propio (cuando haya presupuesto)
Con dominio propio la cookie puede pasar al dominio raíz y el proxy deja de ser imprescindible. No bloquea nada.

**Criterio de salida**
- [ ] La URL de Railway abre desde el celular y muestra «API conectada ✅».
- [ ] El CI corre en verde en GitHub y, si se habilitan los *PR environments*, cada PR crea su preview.
- [ ] Las variables están documentadas en `.env.example` y configuradas en Railway.
- [ ] Anotada la URL del front para `CORS_ORIGINS` de la API.

**Limitantes mientras esté diferida:** Wake Lock y service worker exigen HTTPS (en el celular por red local no funcionan; usar un túnel HTTPS o `localhost`); Safari/iOS y cookies se prueban con un iPhone real vía túnel; el comportamiento del SSE tras el proxy solo se confirma con el deploy (aproximar en local con `pnpm build && pnpm start`).

---

## 9. Riesgos y deuda técnica

| Riesgo / deuda | Mitigación |
|---|---|
| Reloj de la mesa se desfasa o el navegador duerme la pestaña | Reconciliación con `serverNow` en cada respuesta, Wake Lock, recalcular al volver a primer plano (`visibilitychange`) |
| Pérdida de eventos en cortes de red | Cola persistida + idempotencia + bloqueo de cierre hasta vaciar la cola |
| Divergencia entre el motor de faltas del front y del back | Tabla de casos compartida y tests en ambos repos; el servidor siempre gana |
| Contrato desincronizado entre repos | Orval versionado + CI que detecta diferencias del OpenAPI |
| Rewrites del proxy de Next y SSE | EventSource directo a la API |
| Costo por uso en Railway | Alertas de gasto y revisión del plan antes de cobrar inscripciones |
| Safari/iOS y cookies | Same-site por proxy; probar en iPhone real desde la Fase 1 |
| Refresh del servidor y del cliente en carrera (rotación) | Refresh solo desde el cliente, en single-flight (R1) |
| Dos dispositivos en el mismo partido | Lease con «tomar el control» y consola de solo lectura al perder el control (R9) |
| Un evento rechazado deja la cola incoherente | Un 4xx de negocio detiene la cola hasta corregir o descartar (R10) |
| **Deuda:** subida de escudos/fotos (Supabase Storage) | Fase 11; los campos son `null` y se muestran iniciales/placeholder |
| **Deuda:** PWA completa con caché offline | Fuera del MVP; la base actual no lo impide |
| **Deuda:** i18n real | Textos ya centralizados en `es.ts` |

---

## 10. Fases de desarrollo

Las fases del front siguen el orden **revisado** del backend (R7). **Una fase del front se abre cuando su endpoint ya existe** (o se simula con MSW para avanzar en paralelo). Cada fase cierra con: pantallas + tests + accesibilidad básica revisada + `docs/fases/FASE_XX.md` actualizado.

| Fase | Nombre | Depende de (back) | Alcance | Criterio de salida |
|---|---|---|---|---|
| **0** | Fundaciones | F0 | **Detalle completo en `docs/fases/FASE_00.md`.** **0a (local):** proyecto Next, estructura de carpetas con las 4 zonas, env validado, proxy `/api/*`, Orval desde el snapshot, mutator con `ApiError` y `es.ts`, TanStack Query, MSW, tema y tokens, PWA básica, Vitest y Playwright de humo, CI. **0b (nube), diferida a la sección 8.1 (`FASE_DEPLOY_RAILWAYS`) hasta terminar el front:** Railway, variables, CORS en la API para previews | **0a:** «API conectada ✅» con API real o con MSW; `api:generate` produce `useGetPing`; CI verde. **0b:** la URL de Railway abre desde el celular |
| **1** | Auth y shell | F1 (incl. R11) | **Portal `plataforma` (R11):** login, layout/guard, panel de ligas (listar, crear + invitar al dueño, editar, bloquear, reactivar) y diálogo de invitación (copiar, wa.me, reenviar). **Login de admin**, «olvidé mi contraseña», restablecer y **aceptar invitación (admin y dueño)**, middleware/proxy, `GET /plataforma/me` y `GET /admin/me`, cookies por portal, **manejo de `ORG_BLOQUEADA` (4.2.1) y 404 público de liga bloqueada (4.6)**, layouts y navegación base de los cuatro portales (delegado y mesa con el shell y su pantalla «liga no disponible»; sus logins llegan en las fases 2 y 3) | Login/refresh/logout de plataforma y admin; rutas protegidas; dueño invitado que acepta y entra; liga bloqueada corta al instante sin bucles y se reactiva; **probado en iPhone real**; cuatro portales abiertos a la vez sin pisarse |
| **2** | Admin: ediciones y mesas | F2 | Dashboard, CRUD de ediciones, parámetros, **selector de modalidad con preset editable y `useReglasModalidad` (4.9)**, cambio de estado con reporte de precondiciones, banner de pausa, gestión de las 3 mesas (PIN visible una vez, copiar enlace de mesa y mensaje `wa.me`, bloquear, resetear, desbloquear), **login de mesa `/mesa/[edicionSlug]/login`** y `GET /mesa/me` | Un dueño crea una edición **en cada modalidad** (los presets cargan y las reglas inválidas se rechazan en el campo correcto) y 3 mesas de punta a punta; una mesa entra por el enlace |
| **3** | Admin: clubes, delegados y equipos | F3 | Clubes, delegados, inscripción de equipos, reasignación de delegado, **login del delegado**, `GET /delegado/me` y selector multi-equipo | Delegado con 2 equipos en categorías distintas; mensajes de error por `code` |
| **4** | Delegado: plantilla | F4 | Lista de plantel, alta por cédula (búsqueda limitada, R10), baja, límites `rosterMin`/`rosterMax` de la edición (futsal 6/18), 3 equipos distintos, excepciones de edad (admin), documento enmascarado, ocultar edición en eliminatorias y en pausa | Casos máximo y máximo+1 (18/19 en futsal), duplicado y bloqueo con mensajes claros; usable con una mano |
| **5** | Admin: fixture y calendario | F5 | Configuración del fixture (vueltas, días, canchas, franjas), generar, editar fecha/hora/cancha con revalidación, reprogramar con motivo, vista de calendario | Fixture generado y ajustado desde el panel |
| **6** | Finanzas y sanciones | F6 | Pantallas de ledger (cargos, abonos aplicados, anulaciones), arbitraje, multas de jugador, sanciones manuales y reglas por edición, saldos y detalle por cargo en el portal del delegado | Saldos coinciden con el backend; una multa se paga con un abono aplicado |
| **7** | **Mesa en vivo** (7a / 7b) | F7 | **7a:** agenda Hoy/Futuros, pre-partido, consola con reloj (`REGRESIVO`/`PROGRESIVO`) y faltas (solo si `registraFaltas`), lease y «tomar el control», cola de eventos en orden. **7b:** tarjetas y roja, correcciones por anulación, cierre de acta, W.O., inferioridad numérica, penales, cola detenida ante 4xx | Partido completo en Playwright con corte de red simulado **en futsal y en fútbol 11**; reloj reconciliado en ambos modos; `PARTIDO_EN_USO` probado |
| **8** | Público, tablas y goleo | F8 | Vistas públicas con ISR, tabla (empates sin resolver y orden manual del dueño), calendario, goleo, SSE del partido, Open Graph, dashboard del delegado (tabla, calendario) | Core Web Vitals verdes en móvil; preview al compartir por WhatsApp |
| **9** | Eliminatorias (cuadro) | F9 | Llaves (árbol con «por definir»), siembra y re-siembra manual, tanda de penales en la vista pública, cierre de edición | Playoff completo hasta `FINALIZADA` |
| **10** | Reaperturas y renovación | F10 | Reabrir acta (confirmación y motivo, estado «en revisión»), checklist de renovación (equipos y jugadores en borrador), auditoría, usuarios admin e invitaciones | Reapertura refleja el recálculo de la tabla |
| **11** | Endurecimiento | F11 | Auditoría de accesibilidad, rendimiento, **subida de escudos/fotos (Supabase)**, revisión de PWA, anonimización de jugadores (dueño), pulido | Checklist de producción firmado |

> **Impacto de R11 en otras fases:** **Fase 7** — la cola de la mesa se pausa (no se descarta) ante `ORG_BLOQUEADA` y se reanuda tras reactivar y volver a entrar (4.2.1); criterio adicional: prueba con liga bloqueada a mitad de partido. **Fase 8** — vistas públicas, SSE, polling y Open Graph manejan el 404 de liga bloqueada (4.6). **Fase 10** — «usuarios admin e invitaciones» solo cubre ADMIN invitados por el dueño; el dueño y su cambio los gestiona plataforma. Las fases 2–6 no cambian, salvo que sus pantallas heredan el manejo global de `ORG_BLOQUEADA` del mutator.

> **Paralelismo:** mientras el backend construye la Fase *n*, el front puede avanzar la Fase *n−1* o prototipar con MSW. La **Fase 7** es la de mayor riesgo y conviene prototipar el store y la cola desde la Fase 1.

---

## 11. Preguntas abiertas por fase (se iteran al abrir cada fase)

Solo quedan las **realmente abiertas**; el resto se resolvió en F1–F16 y en los ajustes H/R.

- **F0:** ¿Fuente tipográfica? ¿Logo y color primario provisionales? (el `orgSlug` es único en el MVP y vive en una variable de entorno)
- **F1:** ~~Duración de sesión y «recordarme»~~ → **resuelto por el backend (R11):** refresh de admin 7 d, delegado 30 d, mesa 12 h, plataforma 7 d; sin «Recordarme». Abiertas: ¿el enlace de aceptar invitación del dueño reutiliza `/admin/aceptar-invitacion`? ¿Tras aceptar, la API inicia sesión o se redirige al login? ¿Texto del mensaje de WhatsApp de la invitación? ¿Bloquear pide un motivo? ¿Qué muestra el panel de plataforma de cada liga además del estado y del dueño?
- **F2:** ¿Confirmaciones adicionales para cambios de estado irreversibles? ¿Cómo se ve la edición pausada para el público? ¿Los presets de fútbol 9 y 11 (definidos en el backend, 4.14) son correctos? ¿Se muestra la modalidad en la URL pública o solo como insignia?
- **F3:** ¿Importación masiva de clubes y delegados (CSV) o alta uno a uno?
- **F4:** ¿Escaneo de cédula con cámara o solo digitación? ¿Qué datos mínimos se piden en el alta de un jugador nuevo?
- **F5:** ¿Calendario por semana o lista por jornada? ¿Arrastrar y soltar para reprogramar?
- **F6:** ¿Se pueden adjuntar comprobantes de pago? ¿Exportar a Excel o PDF?
- **F7:** ¿Tablet horizontal como diseño principal de la mesa? ¿Sonido en las alertas? ¿Latido del lease cada cuánto?
- **F8:** ¿Imagen de Open Graph con `@vercel/og`? ¿Cómo se explica al público un «empate sin resolver»?
- **F9:** ¿Cuadro como árbol o como lista en móvil?
- **F10:** ¿Cómo se avisa al delegado de que un acta fue reabierta?
- **F11:** ¿Analítica y consentimiento?

---

## 12. Cómo trabajar con este documento

1. Fuente de la verdad del front. Si una decisión cambia, se edita aquí primero y se anota en el registro.
2. Para cada fase: crear `docs/fases/FASE_XX.md` a partir de la sección 10, resolver las preguntas de la sección 11, implementar y marcar el criterio de salida.
3. Todo cambio que toque el contrato con la API se refleja en `PLAN_BACKEND.md` (ajustes `Bn`) y se regenera el cliente con Orval.

### Historial
- 2026-10-07 — **R11 · Plataforma multi-liga:** cuarto portal `plataforma` (cookies `at_/rt_plataforma`, sin «olvidé mi contraseña») con panel de ligas (listar, crear + invitar al dueño, editar, bloquear, reactivar); diálogo de invitación con enlace de una sola vez, copiar, `wa.me` y reenviar; pantalla pública de aceptar invitación del dueño; manejo global de `ORG_BLOQUEADA` (pantalla «liga no disponible» por portal, sin bucles de refresh, cola de la mesa pausada y conservada); 404 público de liga bloqueada. Endpoints ◇ pendientes (13.8): el cliente no se regenera hasta tener el snapshot de la Fase 1 del API. Cambian las fases 1, 7 y 8 (y la 10 en alcance). Sección 11/F1: sesión y «recordarme» resueltos por el backend.
- 2026-10-06 — **Cancha Nica y modalidades:** el producto se llama Cancha Nica; repo `cancha-nica-front`. Ajustes M1–M8 del backend: sección 4.9 (la edición trae `modalidad` y `reglasModalidad`; motor, mesa, admin, público y plantilla leen parámetros, nunca el nombre de la modalidad), selector de modalidad con preset en el admin, reloj `REGRESIVO`/`PROGRESIVO`, faltas opcionales, textos parametrizados. Fases 2, 4 y 7 actualizadas.
- 2026-10-05 — Desempate corregido en el backend (H16): vuelve el enfrentamiento directo. Sin cambios de alcance en las pantallas.
- 2026-10-05 — **Revisión de coherencia:** sesión por portal (R1), login de mesa por slug (R2), regla de imports de `features/public` corregida, cola detenida ante 4xx (R10), lease (R9), fases renumeradas (R7) y sección 11 depurada.
- 2026-10-05 — Fase 0 (stack y decisiones) cerrada con 16 decisiones (borrador para revisión). Añadidos ajustes B1–B9 al Plan Backend.

---

## 13. Contrato que este front asume de la API (autosuficiente)

> Este repo **no necesita leer `PLAN_BACKEND.md`**: aquí está lo que el front espera de la API y cómo avanzar mientras no existe. Los nombres de ruta marcados con ◇ son **propuestos** y se confirman con el snapshot real de cada fase.

### 13.1 Cómo se conecta
- El navegador **solo habla con el dominio del front**. `next.config` reenvía `/api/:path*` a `API_URL`, **eliminando** el prefijo `/api` (la API real expone `/auth/...`, `/admin/...`).
- El contrato llega como un archivo: **`docs/contrato/openapi.snapshot.json`** (lo entrega el repo de la API al cerrar cada fase). `pnpm api:generate` regenera el cliente desde ese archivo; el resultado se versiona y no se edita a mano.
- **Sin API disponible:** `NEXT_PUBLIC_USE_MSW=true` activa los handlers simulados (`src/mocks/handlers.ts`), construidos a partir del snapshot.

### 13.2 Sesión (R1, R2)
- Cuatro portales independientes (`plataforma` ◇ R11, `admin`, `delegado`, `mesa`); cada uno tiene dos cookies `httpOnly` (`at_<portal>`, `rt_<portal>`, `Path=/`). El front **nunca** lee ni guarda tokens en JavaScript.
- Logins ◇: `POST /auth/admin/login` · `POST /auth/delegado/login` · `POST /auth/mesa/:edicionSlug/login`. Principal: `GET /admin/me`, `GET /delegado/me`, `GET /mesa/me`. Cuenta: `olvide-contrasena`, `restablecer`, `aceptar-invitacion` ◇.
- **El refresh lo hace solo el cliente**, en *single-flight*: una única petición `POST /auth/refresh?portal=…`; las demás esperan su resultado. Ante un `401` se refresca y se reintenta **una vez**. Los Server Components usan `at_<portal>` para leer y, si reciben un 401, redirigen a una ruta cliente que refresca y vuelve; **nunca** rotan.
- El login de mesa vive en `/mesa/[edicionSlug]/login` (el dueño comparte el enlace o un QR).

### 13.3 Errores
La API responde `application/problem+json` con `code`, `title`, `detail`, `requestId`. El front los convierte en `ApiError` y traduce con `es.ts`. Los códigos que el front debe saber mostrar al menos: `ROSTER_FULL`, `ROSTER_MIN_NOT_MET`, `PLAYER_ALREADY_ACTIVE`, `TRANSFER_LIMIT_REACHED`, `PLAYER_FROZEN`, `NOMINA_BLOQUEADA`, `AGE_OUT_OF_RANGE`, `DOCUMENTO_INVALIDO`, `EDICION_ESTADO_INVALIDO`, `EDICION_CATEGORIA_ABIERTA`, `EDICION_PAUSADA`, `MESA_LIMIT_REACHED`, `MESA_BLOQUEADA`, `DELEGADO_PHONE_DUPLICATED`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `IP_LOCKED`, `BUSQUEDA_LIMITE_EXCEDIDO`, `CLOCK_NOT_ELAPSED`, `MATCH_CLOSED`, `PARTIDO_EN_USO`, `JUGADOR_BLOQUEADO`, `LLAVE_PARTIDO_EMPATADO`, `WALKOVER_GOLES_INVALIDOS`, `FIXTURE_CONFLICTO`, `MODALIDAD_BLOQUEADA`, `EVENTO_NO_PERMITIDO_EN_MODALIDAD`, `MODALIDAD_REGLAS_INVALIDAS`, **`ORG_BLOQUEADA`** (R11; se maneja de forma global, ver 4.2.1). Un `code` desconocido muestra un mensaje genérico con el `requestId`. Los códigos de token de invitación (inválido, vencido, usado, anulado) ◇ se añaden con el snapshot.

### 13.4 Convenciones de datos que el front asume
IDs UUID · fechas ISO-8601 en UTC (se muestran en la zona de la organización) · **dinero como string decimal** (nunca `float`) · teléfonos E.164 · documento ya **enmascarado** salvo para el dueño · listados paginados ◇ `{ items, page, pageSize, total }`.

### 13.5 Partido en vivo
- Cada respuesta trae `serverNow`, `periodoActual`, `relojEstado` y `elapsedMs`: el front **reconcilia** su reloj local con ellos.
- Cada evento lleva un `clientEventId` (UUID); `200` o `201` = éxito. El servidor asigna el orden (`seq`).
- `409 PARTIDO_EN_USO` = otro dispositivo tiene el partido: el front ofrece «tomar el control» (◇ `POST …/tomar-control`) y pasa a solo lectura si lo pierde.
- Un 4xx de negocio **detiene la cola**; los siguientes eventos esperan.
- **Modalidad (M1):** el detalle de la edición, también el público, trae `modalidad` (`FUTSAL` | `FUTBOL_9` | `FUTBOL_11`) y `reglasModalidad` ◇ `{ jugadoresEnCancha, minJugadoresPartido, maxConvocados, relojModo, registraFaltas, faltasPersonalesParaAmarilla, roja: { inferioridadMs, cancelaPorGolRival } }`, además de `duracionTiempoRegular/Eliminatoria`, `limiteFaltasAcumuladas` (puede ser `null`), `rosterMin` y `rosterMax`. El front adapta la consola y los formularios a esos datos (4.9). Un `FALTA` en una edición sin faltas devuelve `EVENTO_NO_PERMITIDO_EN_MODALIDAD`.
- En `REGRESIVO`, al llegar el reloj del 2T a 00:00 el front lo detiene; en `PROGRESIVO` sigue corriendo (tiempo agregado) y la mesa cierra el periodo. En ambos ofrece «Finalizar» o «Ir a penales».

### 13.6 Público
Rutas `/public/organizaciones/:orgSlug/ediciones/:edicionSlug/{tabla,partidos,goleo,llaves}` y SSE `…/partidos/:id/stream`. **Liga bloqueada (R11):** todas responden **404**, igual que una liga inexistente (4.6). El SSE va **directo a la API** con `NEXT_PUBLIC_SSE_URL` (sin cookies); el resto de las rutas públicas pueden ir por el proxy con ISR.

### 13.7 Qué pedir a la API al cerrar cada fase
- Un `openapi.snapshot.json` actualizado.
- La lista de `code` nuevos.
- Cualquier ruta ◇ confirmada o renombrada.

### 13.8 Plataforma multi-liga (R11) — ✅ CONFIRMADO con el snapshot de la Fase 1 (2026-10-07)

> El cliente ya se regeneró (`pnpm api:generate`). Fuente: `docs/contrato/openapi.snapshot.json` y `docs/contrato/FRONT_FASE_01.md`. La tabla de abajo se conserva como registro de lo que se asumió; **lo que vale es el snapshot**. Diferencias respecto a lo asumido: rutas públicas `/aceptar-invitacion` y `/restablecer-contrasena` en la raíz; `ORG_BLOQUEADA` = 403 y **no** se borran cookies; `bloquear` exige `motivo`; aceptar invitación abre sesión; no hay `GET` de previsualización; el refresh anterior sigue válido 10 s.
Endpoints que el front asume y **no genera todavía** (el cliente de Orval se regenera solo cuando exista el `docs/contrato/openapi.snapshot.json` de la Fase 1 del API; hoy solo trae `/ping`):

| Endpoint ◇ | Uso en el front | Por confirmar |
|---|---|---|
| `POST /auth/plataforma/login` | Login de plataforma | Cuerpo (email, contraseña); no devuelve tokens, solo cookies |
| `GET /plataforma/me` | Guard del layout | Forma del principal (id, nombre, email) |
| `GET /plataforma/organizaciones` | Lista de ligas | Paginación, filtro por estado, si incluye estado de la invitación del dueño |
| `POST /plataforma/organizaciones` | Crear liga + dueño | Campos de la liga (nombre, slug, zona horaria…) y del dueño (nombre, email, teléfono); si ya devuelve la invitación o requiere llamar a `…/invitacion` |
| `PATCH /plataforma/organizaciones/:id` | Editar liga | Campos editables; cómo se cambia de dueño |
| `POST …/:id/bloquear` · `POST …/:id/reactivar` | Bloquear/reactivar | Si piden motivo; respuesta |
| `POST …/:id/invitacion` | Crear/reenviar invitación del dueño | Devuelve `enlace` y `waMeUrl` una sola vez; parámetro para «enviar por email»; vigencia (7 d) y anulación del enlace anterior |
| Aceptar invitación del dueño | Pantalla pública | ¿Mismo `aceptar-invitacion` que el de admins? ¿`GET` de previsualización? ¿Inicia sesión al terminar? |
| Error `ORG_BLOQUEADA` | Mutator, layouts, login | Status HTTP (¿403?) y que llegue también en `POST /auth/refresh` y en los logins |
| 404 de `/public/...` | Vistas públicas | Confirmado en el plan del backend; falta verlo en el snapshot |

Mientras tanto: MSW con handlers de plataforma construidos desde esta tabla (marcados como provisionales) y esquemas Zod propios del formulario; al llegar el snapshot se reemplazan por los tipos generados.
