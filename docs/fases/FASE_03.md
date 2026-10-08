# FASE 3 — Clubes, delegados y equipos (prototipo con MSW)

> **Fuente de la verdad:** `PLAN_FRONTEND.md` (§6, §10) y `PLAN_BACKEND.md` (modelos `Club`, `Delegado`, `EdicionEquipo`; decisiones R12, R13).
> **Estado:** 🟡 **Prototipo contra MSW (2026-10-07).** El backend **no ha publicado** `FASE_03.md`, ni endpoints, ni snapshot, ni `FRONT_FASE_03.md`. A diferencia de la Fase 2 (que tenía su especificación), aquí **las rutas, los nombres de campos y los códigos de error son suposiciones mías** a partir del plan. Todo lo marcado como provisional puede cambiar.

## 1. Qué se construyó

| Pantalla | Ruta | Qué hace |
|---|---|---|
| Clubes | `/admin/clubes` | Lista con en cuántas ligas juega cada club y quién lo registró. Crear, renombrar, desactivar. Nombre único sin importar mayúsculas, tildes ni espacios |
| Delegados | `/admin/delegados` | Lista con el estado del PIN: **«PIN aún no usado»** (nunca entró), «PIN temporal» (entró pero no lo cambió) y «PIN propio» (R13). Sus equipos. **Resetear PIN** con entrega de un solo uso |
| Equipos de una liga | `/admin/ligas/[id]/equipos` | Equipos inscritos con su delegado. **Inscribir equipo en un solo formulario (R12):** club existente o nuevo + delegado existente o nuevo; lo nuevo se crea en ese mismo paso. **Cambiar delegado** |
| Login del delegado | `/delegado/<slug-del-cliente>` | Teléfono + PIN de 6 dígitos, controles grandes. Misma respuesta ante teléfono inexistente, PIN errónea o cliente inexistente |
| Inicio del delegado | `/delegado` | **Selector multi-equipo** (un delegado puede llevar varios, de categorías distintas), aviso «tu PIN es temporal» y **cambio de PIN por el propio delegado** |

El detalle de la liga enlaza a sus equipos y el menú del admin suma «Clubes» y «Delegados».

## 2. Reglas del plan que cubre

- **Alta en un paso (R12):** si el club o el delegado son nuevos se crean al inscribir; si algo falla no queda un club o un delegado a medias (se valida todo antes de crear).
- **PIN de 6 dígitos que se ve una sola vez (R13, R16):** pantalla de entrega con «copiar PIN», «copiar mensaje completo» y WhatsApp (al teléfono del delegado, con el mensaje escrito). Resetear invalida el anterior y vuelve a marcar «PIN aún no usado».
- **Un delegado nunca lleva dos equipos de la misma categoría:** el selector deshabilita a quien ya lleva uno («ya lleva un equipo de esta categoría») y el servidor lo rechaza igual.
- **Teléfono único por cliente:** un teléfono repetido pide elegir al delegado existente.
- **Solo con las inscripciones abiertas:** con la liga en otro estado el botón se deshabilita y explica qué falta.
- **«Registrado por»** se muestra en clubes, delegados y equipos.
- **Criterio de salida del plan:** un delegado con 2 equipos en categorías distintas (probado de punta a punta en el E2E).

## 3. Lo provisional (a confirmar con el contrato)

- **Rutas supuestas:** `GET|POST /admin/clubes`, `PATCH /admin/clubes/:id`, `GET /admin/delegados`, `POST /admin/delegados/:id/pin/reset`, `GET|POST /admin/ediciones/:id/equipos`, `PATCH /admin/ediciones/:id/equipos/:equipoId/delegado` (esta última sale de H14 en el plan), `POST /auth/delegado/:orgSlug/login`, `POST /auth/delegado/logout`, `GET /delegado/me`, `POST /delegado/pin`.
- **Login del delegado por el slug del cliente** (`/delegado/<slug>`): el plan no lo fija, pero el teléfono es único **por cliente** (`@@unique([organizacionId, telefono])`), así que hace falta saber el cliente, igual que en la mesa (R15).
- **Cuerpo de inscripción:** `{ club: { id } | { nombre }, delegado: { id } | { nombre, telefono } }`; la respuesta trae `pinEntregado` solo si el delegado se creó en ese paso.
- **Códigos de error inventados:** `CLUB_DUPLICADO`, `CLUB_INACTIVO`, `EQUIPO_DUPLICADO`, `TELEFONO_DUPLICADO`, `DELEGADO_MISMA_CATEGORIA`, `EDICION_NO_ACEPTA_INSCRIPCIONES`. El plan nombra `PLAYER_ALREADY_ACTIVE`, `TRANSFER_LIMIT_REACHED` (Fase 4) y otros que no aplican aquí.
- **«PIN aún no usado» / «PIN temporal»:** salen de `ultimoAccesoEn` y `pinCambiadoEn` (R13). Los DTO exponen `pinSinUsar` y `pinCambiado` ya calculados; el contrato real puede traer las fechas.
- **Cambiar el PIN:** cuerpo `{ pinActual, pinNuevo }`; el plan dice que el delegado puede cambiarlo, no el formato.
- **Portal del delegado sin guard de servidor:** `/delegado` es un componente de cliente porque no hay API real. Con MSW el proxy deja pasar `/delegado` (sesión simulada, solo desarrollo).
- **Slugs reservados:** `login` y `bloqueada` chocan con las rutas fijas de `/delegado/…` y `/mesa/…`. Conviene que el backend los prohíba como slug de cliente.
- **Todo el mock se borra** (`src/mocks/fase3/`, el bypass del proxy y los hooks a mano) al integrar el contrato real.

## 4. Cómo probarlo sin backend

Igual que la Fase 2: backend de la Fase 1 levantado y `NEXT_PUBLIC_USE_MSW=true pnpm dev`. Datos de ejemplo: clubes Los Tigres, Deportivo Norte y Atlético Sur; delegados Pedro Gómez (`+50588880001`, PIN `111111`, nunca entró), Ana Ruiz (`+50588880002`, `222222`) y Marta Díaz (`+50588880009`, `333333`, sin equipos); entrar en `/delegado/sopa`.

## 5. Decisiones de implementación

- **Validación del formulario sin esperar al servidor:** `features/equipos/lib/inscripcion.ts` (puro, probado) valida club y delegado según su modo y arma el cuerpo con el teléfono en E.164. El servidor manda.
- **El formulario no se arma hasta tener los datos:** el modo inicial (club y delegado «existente» o «nuevo») depende de si hay clubes y delegados; armarlo antes de que carguen lo dejaba en «nuevo» por error (lo encontró el E2E).
- **Diálogo de PIN compartido:** `shared/ui/pin-entrega.tsx` sirve a mesas y delegados; cada uno arma su mensaje y su `wa.me`.
- **`aE164` pasó a `shared/lib/telefono.ts`** (lo usan plataforma y delegados; `plataforma/lib/formato.ts` lo reexporta).
- **El PIN nunca se guarda:** vive solo en el estado del diálogo que lo muestra; las mutaciones usan `gcTime: 0`. Los listados no lo traen.
- **Tras cambiar el PIN se vuelve a leer `/delegado/me`** para que desaparezca el aviso de PIN temporal.

## 6. Pruebas

- **Vitest:** la base simulada (club único, alta en un paso, PIN una sola vez y ausente de los listados, sin restos si falla, categoría, teléfono duplicado o inválido, reasignar, resetear, login indistinguible, cambiar PIN) y la validación del formulario.
- **E2E sin backend (`pnpm test:e2e:mock`, 37 pruebas en total, también en el CI):** las 19 de la Fase 3 cubren clubes (duplicado, renombrar, desactivar, conteo), delegados (estados del PIN, resetear), equipos (lista, inscribir en un paso con PIN y copiar, categoría deshabilitada, solo clubes que faltan, teléfono repetido, validación, inscripciones cerradas, cambiar delegado) y el portal del delegado (login indistinguible, validación, cambio de PIN, **un delegado con dos equipos en categorías distintas**).

## 7. Qué NO se hizo (a propósito)

- **Estado del equipo** (`BORRADOR`, `CONFIRMADO`, `DECLINADO`) y **habilitado**: llegan con la renovación (Fase 10) y el arranque de la liga.
- **Desbloquear a un delegado** y **desactivarlo**: el modelo tiene `bloqueadoHasta` y `activo`, pero el plan de la fase no pide estas acciones. Resetear el PIN ya desbloquea.
- **Autorización del dueño para un equipo agregado tras el arranque** (H14) y regenerar el fixture: Fase 5.
- **Escudo del club:** `escudoUrl` espera a Storage (deuda técnica).
- **Lectura de plataforma** (`/plataforma/organizaciones/:id/delegados|equipos`) y los conteos de la ficha: dependen del contrato.
- **Plantilla, calendario y cuentas del equipo** en el portal del delegado: Fases 4 a 6.
- **Mejorar la lista de requisitos de arranque de la liga:** «faltan equipos» aún no usa los equipos simulados.
