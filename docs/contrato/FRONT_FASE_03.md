# Aviso al front — Fase 3 (clubes, delegados y equipos)

> **Fuente de verdad del contrato:** `docs/contrato/openapi.snapshot.json` (regenerado; 22 `operationId` nuevos y 13 códigos de error en el enum `ErrorCode`). Este documento explica lo que el OpenAPI no dice: pantallas, reglas por estado y rol, y errores.
> **Detalle de la fase:** `docs/fases/FASE_03.md`. **Prototipo aprobado:** `docs/prototipos/alta-equipo-pin.html`. **Vocabulario:** cliente = organización que da de alta Plataforma; **liga** = una edición (`Edicion` en el API); **club** = identidad permanente del cliente; **equipo** = un club inscrito en una liga (`EdicionEquipo`), con su propio nombre y su propio delegado; **delegado** = persona identificada por su teléfono.
> **Cambios rompedores: ninguno.** Todo lo de aquí es nuevo, salvo una adición opcional al cuerpo de `POST /admin/ediciones/:id/estado` (`excluirEquipos`, sección 7) y los conteos `delegados` y `equipos` de la ficha del cliente, que antes venían en `null`. Ningún `operationId` publicado cambió.

## 1. Mapa de lo nuevo

| Portal                    | Pantalla                                                             | Rutas (`operationId`)                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin (`OWNER`, `ADMIN`)  | Clubes                                                               | `GET /admin/clubes` (`listarClubes`, `?q=`, `?archivados=true`), `POST /admin/clubes/:id/archivar` (`archivarClub`), `POST /admin/clubes/:id/restaurar` (`restaurarClub`)                                                                                                                                                                                                                            |
| Admin                     | Delegados                                                            | `GET /admin/delegados` (`listarDelegados`), `PATCH /admin/delegados/:id` (`actualizarDelegado`), `POST …/:id/pin/reset` (`resetearPinDelegado`), `POST …/:id/desbloquear` (`desbloquearDelegado`), `POST …/:id/activar` (`activarDelegado`), `POST …/:id/desactivar` (`desactivarDelegado`)                                                                                                          |
| Admin                     | Equipos de la liga (alta, lista, detalle, renombrar, delegado, baja) | `POST /admin/ediciones/:edicionId/equipos` (`inscribirEquipo`), `GET` mismo path (`listarEquipos`, `?estado=`), `GET …/equipos/:equipoId` (`obtenerEquipo`), `PATCH …/equipos/:equipoId` (`renombrarEquipo`), `PATCH …/equipos/:equipoId/delegado` (`reasignarDelegadoEquipo`), `POST …/equipos/:equipoId/retirar` (`retirarEquipo`), `POST …/equipos/:equipoId/reincorporar` (`reincorporarEquipo`) |
| Admin                     | Arranque de la liga                                                  | `POST /admin/ediciones/:id/estado` ya existía; ahora acepta `excluirEquipos` (sección 7)                                                                                                                                                                                                                                                                                                             |
| Delegado                  | Login en `/delegado/<slug-del-cliente>`, selector de equipos, perfil | `POST /auth/delegado/:orgSlug/login` (`delegadoLogin`), `GET /delegado/me` (`getDelegadoMe`), `GET /delegado/ediciones/:edicionId` (`getDelegadoEdicion`), `POST /delegado/pin` (`cambiarPinDelegado`)                                                                                                                                                                                               |
| Plataforma (solo lectura) | Pestañas de la ficha del cliente: delegados y equipos                | `GET /plataforma/organizaciones/:id/delegados` (`listarDelegadosDeOrganizacion`), `GET /plataforma/organizaciones/:id/equipos` (`listarEquiposDeOrganizacion`); la ficha trae `conteos.delegados` (activos) y `conteos.equipos` (inscritos, sin retirados)                                                                                                                                           |

Todos con `credentials: 'include'` (cookies httpOnly). Ningún token ni PIN se lee desde JavaScript. El login del delegado emite `at_delegado` (15 min) y `rt_delegado` (**30 días**); refresh y logout con `POST /auth/refresh?portal=delegado` y `POST /auth/logout?portal=delegado`.

**Plataforma no escribe nada de esto.** Sus pestañas de delegados y equipos son solo lectura: sin botones de crear, editar, resetear, retirar ni activar. Tampoco ve jamás un PIN ni un hash. El test de contrato del API sigue mostrando solo las 5 escrituras permitidas de Plataforma.

## 2. Pantallas a construir

### 2.1 Clubes (admin)

- Lista con buscador (`?q=` filtra por nombre sin distinguir mayúsculas ni tildes: úsalo para autocompletar) y conmutador «ver archivados» (`?archivados=true`).
- Cada club (`ClubDto`): `nombre`, `escudoUrl` (puede ser `null`), `activo`, `equipos` (cuántos tiene), `ligas [{id, nombre}]` (en cuáles), `creadoPor {id, nombre}` («registrado por») y `creadoEn`.
- Acciones: **Archivar** y **Restaurar** (idempotentes). Un club archivado no se ofrece en listas ni se reutiliza en silencio; sus equipos siguen.
- **No hay «Crear club».** Los clubes nacen en el formulario de alta de equipo (2.3). No inventes un botón.

### 2.2 Delegados (admin)

- Tabla de `listarDelegados` (`DelegadoDto`): `nombre`, `telefono` (E.164), `activo`, `acceso`, `ultimoAccesoEn`, `pinCambiadoEn`, `equipos [{id, nombre, estado, edicion {id, nombre, estado}}]` (incluye retirados) y `creadoPor`.
- **Marca «PIN aún no usado»** cuando `ultimoAccesoEn === null` (el delegado nunca entró). Opcional: etiqueta «PIN temporal» mientras `pinCambiadoEn === null` y «PIN propio» cuando tiene fecha.
- **Estado de acceso** (`acceso.estado`): `ACTIVO`, `DESACTIVADO` o `BLOQUEADO`. En `BLOQUEADO` muestra «bloqueado hasta las HH:MM» con `acceso.bloqueadoHasta`.
- Acciones por fila:
  - **Editar** (`PATCH`, `{ nombre?, telefono? }`): cambiar el teléfono revalida formato y unicidad y **cierra las sesiones** del delegado. Avisa antes.
  - **Resetear PIN** (`pin/reset`): muestra la pantalla del PIN (2.3, punto 3). El PIN anterior deja de servir, se cierran sus sesiones y se levanta el bloqueo.
  - **Desbloquear**: levanta el bloqueo sin cambiar el PIN. Muéstralo solo si `acceso.estado === 'BLOQUEADO'`.
  - **Activar / Desactivar**: desactivar corta el acceso **al instante**, incluso con sesión abierta. Si el delegado lleva un equipo vivo en una liga no finalizada → `409 DELEGADO_CON_EQUIPOS_ACTIVOS`: indica que primero hay que reasignar el equipo (enlace a la pantalla de equipos de esa liga).
- **No existe «invitar» ni «crear delegado» suelto:** se crean en el formulario del equipo.

### 2.3 Formulario único de alta de equipo y pantalla del PIN (como `docs/prototipos/alta-equipo-pin.html`)

1. **Formulario** (`POST /admin/ediciones/:edicionId/equipos`, `201`):
   - `nombre` del equipo (hasta 80). Es el nombre **en esta liga**.
   - **Club** (opcional): un autocompletar sobre `listarClubes?q=`. Si eliges uno, envía `club: { id }`. Si solo escribes el nombre, **no envíes `club`**: el API reutiliza en silencio el club del cliente con el mismo nombre (sin distinguir mayúsculas, tildes ni signos) o crea uno nuevo. **No muestres avisos de «el club ya existe»**: reutilizar entre ligas es lo normal.
   - **Delegado**, una de dos formas (`oneOf`):
     - existente: `delegado: { id }` (elegido de `listarDelegados`);
     - nuevo: `delegado: { nombre, telefono }`. El `telefono` puede ir **local** (`8888 8888`) o internacional (`+505…`, `00505…`); el API lo normaliza a E.164 con el país del cliente. Si ese teléfono ya es de un delegado del cliente, **se reutiliza** (conserva su nombre y su PIN).
   - Con la liga `EN_CURSO` esta misma acción es el «equipo tardío» y **solo la hace el dueño** (sección 5).
2. **Respuesta** (`EquipoConAccesoDto`): `equipo` (`EquipoDto`), `delegadoExistente`, y **solo si el delegado es nuevo** `pin`, `loginUrl` y `waMeUrl` (si no, los tres vienen `null`).
   - `delegadoExistente: true`: muestra «Equipo inscrito con un delegado existente (no se genera PIN)» y **el nombre del delegado** (`equipo.delegado.nombre`) para que quien inscribe confirme visualmente que no se equivocó de persona. No hay PIN que mostrar.
   - `pin` presente: pasa a la pantalla del PIN.
3. **Pantalla del PIN de un solo uso** (alta de equipo con delegado nuevo, reasignar a un delegado nuevo y reset de PIN):
   - Muestra el `pin` (6 dígitos, puede empezar con 0: trátalo como **texto**, nunca como número) con «Copiar PIN» y/o «Copiar acceso completo», el botón de WhatsApp (`waMeUrl`: abre el chat **con el teléfono del delegado** y el mensaje ya escrito) y el enlace `loginUrl` (`{FRONT_URL}/delegado/<slug-del-cliente>`).
   - Advierte que **se muestra una sola vez**, no se puede recuperar al cerrar la pantalla ni al recargar; si se pierde, se resetea desde «Delegados». Que el PIN no viva en `localStorage`, en la URL ni en el estado global; solo en memoria de esa pantalla.
   - Informa que el PIN es **temporal**: el delegado puede cambiarlo cuando entre.

### 2.4 Equipos de la liga (admin)

- Lista `listarEquipos` (`?estado=` filtra por `BORRADOR`, `CONFIRMADO`, `DECLINADO`, `RETIRADO`; sin filtro trae todos, **incluidos los retirados**, que vienen con `retirado: true`, `retiradoEn`, `motivoRetiro` y `retiradoPor`). Cada `EquipoDto` trae `nombre`, `estado`, `habilitado` (`false` = excluido al arrancar), `inscritoTardio`, `club {id, nombre}`, `delegado {id, nombre, telefono, activo}`, `creadoPor` («registrado por») y `creadoEn`. Marca visualmente retirados, excluidos y tardíos.
- Acciones por equipo:
  - **Renombrar** (`PATCH`, `{ nombre }`): cambia el nombre **solo en esta liga**. Duplicado dentro de la liga → `EQUIPO_DUPLICADO`.
  - **Reasignar delegado** (`PATCH …/delegado`, `{ delegado: { id } | { nombre, telefono } }`): igual que en el alta. Devuelve `EquipoConAccesoDto`; si el delegado es nuevo, pantalla del PIN. El anterior pierde este equipo **al instante** y conserva los demás.
  - **Retirar** (`POST …/retirar`, `{ motivo }` obligatorio, hasta 500): pide el motivo en un diálogo y avisa de que «no se borra, queda retirado». Con la liga en marcha, avisa además de que **es definitivo**.
  - **Reincorporar** (`POST …/reincorporar`): solo se ofrece si `retirado` y la liga está en `CONFIGURACION` o `EN_REGISTRO`.
  - **Equipo tardío**: botón «Agregar equipo» con la liga `EN_CURSO`, **solo si el rol es `OWNER`**.
- Renombrar y reasignar no se pueden en una liga finalizada (`409 EDICION_SOLO_LECTURA`) ni archivada (`409 EDICION_ARCHIVADA`).
- **El efecto de un retiro o de un equipo tardío sobre puntos y calendario llega en la Fase 5**; hoy el API solo guarda el estado. No prometas recálculos en pantalla.

### 2.5 Portal del delegado

1. **Login** en `/delegado/<slug-del-cliente>`: campos teléfono y PIN. El teléfono puede escribirse local; el API lo normaliza con el país del cliente.
2. `GET /delegado/me` devuelve `DelegadoPrincipalDto`: `id`, `nombre`, `telefono`, `pinCambiadoEn`, `organizacion {id, nombre, slug}` y `equipos` (los de ligas **no finalizadas**, cada uno con `id`, `nombre`, `estado`, `retirado`, `retiradoEn`, `club {id, nombre}` y `edicion {id, nombre, slug, modalidad, estado, categoria {id, nombre}}`).
3. **Selector de equipos:** una tarjeta por equipo (el mismo delegado puede llevar uno en cada liga, con nombres distintos). Un equipo retirado se muestra **marcado** y no se puede abrir. Si `equipos` está vacío (todas sus ligas finalizaron), muestra «Sin ligas activas».
4. **Aviso «Cambia tu PIN»:** visible **mientras `pinCambiadoEn === null`**. Es un aviso, **no un bloqueo**: cambiarlo en el primer ingreso es opcional. Desaparece al recargar `me` con `pinCambiadoEn` ya lleno.
5. **Cambiar PIN** (`POST /delegado/pin`, `{ pinActual, pinNuevo }`, `204` sin cuerpo): conserva la sesión actual y cierra las demás. Tras el `204`, recarga `GET /delegado/me`.
6. Al entrar a una liga: `GET /delegado/ediciones/:edicionId` devuelve `{ edicion, equipo }` (**su** equipo en esa liga). El API decide el acceso en cada petición (sección 6).

## 3. Reglas por estado de la liga y rol

No dupliques estas reglas para decidir qué mostrar si puedes evitarlo (la liga trae `transicionesPosibles`); sirven para habilitar/ocultar botones y para entender los errores. **La fuente de verdad es el API**: si discrepa, manda el API.

| Estado de la liga              | Inscribir equipo           | Retirar                     | Reincorporar  |
| ------------------------------ | -------------------------- | --------------------------- | ------------- |
| `CONFIGURACION`, `EN_REGISTRO` | dueño y admin              | dueño y admin               | dueño y admin |
| `EN_CURSO`                     | **solo el dueño** (tardío) | **solo el dueño**           | no            |
| `PAUSADA`                      | no                         | **solo el dueño**           | no            |
| `EN_ELIMINATORIAS`             | no                         | no (se define en la Fase 9) | no            |
| `FINALIZADA`, liga archivada   | no                         | no                          | no            |

- Un admin que intenta algo «solo del dueño» recibe **`403`** (`FORBIDDEN`, sin código de negocio). Oculta o deshabilita el botón para el `ADMIN`.
- «No» = **`409`** con el código de la tabla de la sección 6: `INSCRIPCION_CERRADA`, `RETIRO_CERRADO` o `REINCORPORACION_CERRADA`.
- Un equipo retirado **sigue ocupando su nombre** en esa liga (inscribir otro con el mismo nombre → `EQUIPO_DUPLICADO`).
- Retirar y reincorporar son **idempotentes**: repetir devuelve `200` con el equipo sin cambios (no sobrescribe el motivo original).
- Reincorporar devuelve el equipo a `CONFIRMADO` con su nombre.
- Todo lo demás (clubes, delegados, inscribir/renombrar/reasignar) lo hacen `OWNER` y `ADMIN` por igual.

## 4. Semántica del PIN

- 6 dígitos (texto, con posibles ceros a la izquierda). Se muestra **una sola vez**: en el alta de equipo con delegado nuevo, al reasignar a un delegado nuevo y en `pin/reset`. En la base solo hay un hash: **ni listados, ni plataforma, ni auditoría lo traen**.
- `pin`, `loginUrl` y `waMeUrl` vienen juntos. `loginUrl` = `{FRONT_URL}/delegado/<slug>`. `waMeUrl` abre el chat con **el teléfono del delegado** y el mensaje (acceso y PIN) ya escrito; no lo reconstruyas en el front.
- **`delegadoExistente: true`:** el delegado ya existía (por `id` o porque su teléfono ya estaba registrado en el cliente). Conserva su nombre y su PIN; `pin`, `loginUrl` y `waMeUrl` vienen `null`. Muestra su nombre y no ofrezcas copiar nada.
- El PIN entregado es **temporal**. El delegado lo cambia con `POST /delegado/pin`. Mientras `pinCambiadoEn` sea `null`, aviso visible.
- Reset por el dueño o admin: el PIN anterior deja de servir, se cierran las sesiones y se levanta el bloqueo. El acceso ya abierto puede durar hasta 15 minutos.
- Un PIN actual incorrecto en `POST /delegado/pin` **cuenta como intento fallido** (mismo bloqueo que el login): tras varios, `429 DELEGADO_BLOQUEADO`.
- El API rechaza con `400 PIN_DEBIL` un PIN nuevo obvio **o igual al actual**.

## 5. Login del delegado (`/delegado/<slug-del-cliente>`)

`POST /auth/delegado/:orgSlug/login` con `{ telefono, pin }`.

- `200`: cookies de sesión y el mismo cuerpo que `GET /delegado/me`. Registra `ultimoAccesoEn` (la marca «PIN aún no usado» desaparece).
- **Un solo mensaje de error para todo:** cliente inexistente, teléfono inexistente o mal escrito, PIN errado y delegado desactivado devuelven el mismo `401 INVALID_CREDENTIALS`. No intentes distinguirlos. Texto sugerido: «Teléfono o PIN incorrectos».
- `429 DELEGADO_BLOQUEADO`: bloqueo temporal por intentos fallidos. Mensaje: «Demasiados intentos. Espera unos minutos o pide al dueño de la liga que te desbloquee». `429 IP_LOCKED` (la red) y `429 TOO_MANY_REQUESTS` (ritmo) también pueden aparecer.
- `403 ORG_BLOQUEADA`: el cliente está bloqueado (solo se ve con el PIN correcto).
- Sesión de **30 días**. Si `GET /delegado/me` responde `401` con sesión previa, el delegado fue **desactivado** o la sesión venció: intenta un refresh (`?portal=delegado`) y, si falla, vuelve al login.

## 6. Alcance del delegado por liga

`GET /delegado/ediciones/:edicionId` y toda ruta futura con `:edicionId` responden según el estado **en ese momento**, con el mismo token:

| Código                     | Significado                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `401`                      | Sesión inválida o delegado desactivado: volver al login.                             |
| `404`                      | La liga no existe, es de otro cliente o está archivada.                              |
| `403`                      | No lleva un equipo operativo en esa liga (un equipo retirado o excluido no la abre). |
| `409 EDICION_SOLO_LECTURA` | La liga ya finalizó: sale de su alcance.                                             |

Trata `403/404/409` como «ya no tienes acceso a esta liga» y vuelve a `GET /delegado/me`. Reasignar, retirar, desactivar o finalizar surten efecto **al instante**.

## 7. Cambio en `POST /admin/ediciones/:id/estado`: `excluirEquipos`

Cuerpo: `{ a, forzar?, confirmar?, excluirEquipos?: [equipoId] }` (uuid de equipos **de esa liga**).

- Solo se acepta en el arranque (`EN_REGISTRO` → `EN_CURSO`); en cualquier otro cambio, `400 VALIDATION_ERROR`.
- Los excluidos quedan `habilitado = false` (no se borran) y **no cuentan** para el mínimo `minEquiposArranque`. Si el conteo baja del mínimo, vuelve a salir `EQUIPOS_INSUFICIENTES` (forzable por el dueño). Un equipo de otra liga → `404`.
- Los equipos **retirados no cuentan** para el arranque.
- Hasta la Fase 4 no hay planteles: el reporte de arranque incluye siempre `ROSTER_INCOMPLETO` (forzable por el dueño). Es lo esperado.
- Pantalla sugerida: al pulsar «Iniciar liga», lista de equipos con casilla «No arranca» y el checklist `incumplimientos` de siempre.

## 8. Códigos de error nuevos

Todos son RFC 7807 (`application/problem+json`) con `code`, `title`, `detail`. Muestra el `detail` del API cuando exista; los mensajes sugeridos son solo de respaldo. Los códigos ya existen en el enum `ErrorCode` del OpenAPI.

| `code`                         | Status | Cuándo                                                                                                                       | Mensaje sugerido                                                             |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `EQUIPO_DUPLICADO`             | 409    | Mismo nombre (sin mayúsculas, tildes ni signos) en la misma liga, aunque esté retirado. Al inscribir y al renombrar          | «Ups, ya hay un equipo con ese nombre en esta liga». Resalta el campo nombre |
| `EQUIPO_CLUB_DUPLICADO`        | 409    | Ese club ya tiene un equipo en esta liga                                                                                     | «Ese club ya está inscrito en esta liga»                                     |
| `CLUB_ARCHIVADO`               | 409    | El nombre coincide con un club archivado                                                                                     | «Ese club está archivado. Restáuralo para usarlo» (enlace a Clubes)          |
| `TELEFONO_INVALIDO`            | 400    | Teléfono que no se puede normalizar (largo, caracteres, país no soportado sin `+`)                                           | Muestra el `detail`; resalta el campo teléfono                               |
| `DELEGADO_PHONE_DUPLICATED`    | 409    | El delegado ya lleva otro equipo en esa liga (un delegado, un equipo por liga). También al editar el teléfono a uno ya usado | «Ese delegado ya lleva un equipo en esta liga»                               |
| `DELEGADO_DESACTIVADO`         | 409    | Se intenta asignar un equipo a un delegado desactivado                                                                       | «Ese delegado está desactivado. Actívalo o elige otro»                       |
| `DELEGADO_CON_EQUIPOS_ACTIVOS` | 409    | Desactivar a un delegado que lleva un equipo no retirado en una liga no finalizada                                           | «Reasigna sus equipos antes de desactivarlo»                                 |
| `INSCRIPCION_CERRADA`          | 409    | Liga en `PAUSADA`, `EN_ELIMINATORIAS`, `FINALIZADA` o archivada                                                              | «Esta liga ya no admite inscripciones»                                       |
| `RETIRO_CERRADO`               | 409    | Retirar en `EN_ELIMINATORIAS`, `FINALIZADA` o liga archivada                                                                 | «Esta liga ya no admite retiros»                                             |
| `REINCORPORACION_CERRADA`      | 409    | Reincorporar con la liga en marcha o después, o archivada                                                                    | «Con la liga en marcha un equipo retirado no vuelve»                         |
| `PIN_DEBIL`                    | 400    | PIN nuevo obvio o igual al actual (`POST /delegado/pin`)                                                                     | «Elige un PIN menos obvio: sin repetidos, escaleras ni patrones»             |
| `PIN_ACTUAL_INCORRECTO`        | 400    | `pinActual` no coincide (cuenta como intento fallido)                                                                        | «El PIN actual no es correcto»                                               |
| `DELEGADO_BLOQUEADO`           | 429    | Login (o cambio de PIN) del delegado bloqueado por intentos                                                                  | «Demasiados intentos. Espera unos minutos o pide que te desbloqueen»         |

Códigos que ya existían y también aparecen aquí: `INVALID_CREDENTIALS` (401), `ORG_BLOQUEADA` (403), `IP_LOCKED` (429), `EDICION_SOLO_LECTURA` y `EDICION_ARCHIVADA` (409), `EDICION_PRECONDICIONES_NO_CUMPLIDAS` (409), `VALIDATION_ERROR` (400: DTO inválido, `motivo` vacío al retirar, nombre vacío, `excluirEquipos` fuera de lugar), `NOT_FOUND` (404: liga, club, equipo o delegado inexistente o de otro cliente; no hay forma de distinguirlo) y `FORBIDDEN` (403: acción solo del dueño).

**Cómo mapear en el front:** cambia por `code`, nunca por `title` ni por `detail`. Para los de campo (`EQUIPO_DUPLICADO`, `TELEFONO_INVALIDO`, `PIN_DEBIL`, `PIN_ACTUAL_INCORRECTO`) muestra el mensaje junto al campo; para los de estado de la liga (`*_CERRADA`) muestra un aviso general y refresca la liga; para `DELEGADO_CON_EQUIPOS_ACTIVOS`, un diálogo con la salida (reasignar). `403` sin código en una acción del dueño = «Solo el dueño puede hacerlo». Un código desconocido → cae al `detail` y a un mensaje genérico.

## 9. Reglas que el front puede replicar para validar en vivo

**La fuente de verdad es siempre el API.** Replica estas reglas solo para dar retroalimentación inmediata; nunca bloquees el envío si tu validación local falla en algo que el API acepta, y siempre muestra el error real del API. Origen: `src/dominio/telefono.ts` y `src/dominio/pin-debil.ts`.

### 9.1 Teléfono

1. Quita espacios, guiones, puntos y paréntesis. Lo demás que no sea dígito (salvo un `+` inicial) lo invalida.
2. Si empieza con `+` o `00`: es internacional (`00` equivale a `+`). Si el código de país está en la tabla de abajo, el número nacional debe tener un largo válido; si no, basta con `^\+[1-9][0-9]{7,14}$`.
3. Si no, es local y se completa con el país del cliente (`Organizacion.pais`, que el front conoce desde la sesión del admin). Si el país no está en la tabla, solo se acepta internacional.
4. El nacional no puede empezar con `0`; el prefijo troncal (Ecuador `0`, EE. UU. `1`) se quita si con eso el largo queda válido. También se acepta el código de país escrito sin `+` (`50588888888`).

| País (ISO) | Código | Largo nacional | Troncal |
| ---------- | ------ | -------------- | ------- |
| `NI`       | 505    | 8              |         |
| `CR`       | 506    | 8              |         |
| `PA`       | 507    | 7 u 8          |         |
| `HN`       | 504    | 8              |         |
| `GT`       | 502    | 8              |         |
| `SV`       | 503    | 8              |         |
| `EC`       | 593    | 8 o 9          | `0`     |
| `CO`       | 57     | 10             |         |
| `MX`       | 52     | 10             |         |
| `US`       | 1      | 10             | `1`     |

Resultado: E.164 (`+50588888888`). Muéstralo normalizado como vista previa. El API puede ampliar esta tabla sin avisar: por eso la validación local debe ser **tolerante** (solo advertir).

### 9.2 PIN débil

Un PIN de 6 dígitos es débil si es: (a) **todos los dígitos iguales** (`000000`, `777777`); (b) una **escalera** completa ascendente o descendente, sin dar la vuelta (`123456`, `234567`, `654321`; `890123` no cuenta); (c) un **patrón que se repite** con un bloque más corto que el PIN (`121212`, `123123`, `120120`). Además, al cambiar el PIN, **no puede ser igual al actual** (también `PIN_DEBIL`). El formato es `^\d{6}$`. Úsalo para validar `pinNuevo` en vivo; el API manda.

## 10. Cosas que conviene saber

- **«Registrado por»:** clubes, delegados y equipos traen `creadoPor { id, nombre }`. Muéstralo en listados y detalle.
- **Nombre por liga:** el nombre del equipo es de cada liga; renombrar en una no toca otra. El mismo club puede llamarse distinto en cada liga y **no se avisa** de nada al reutilizarlo.
- **Un delegado, un equipo por liga:** puede llevar uno en cada liga distinta.
- **Aislamiento:** un id de otro cliente responde `404` igual que uno inexistente.
- **Plataforma bloqueando un cliente** corta también a los delegados (`403 ORG_BLOQUEADA`); al reactivarlo vuelven.
- **No hay carga masiva:** el alta es de uno en uno.
- **Pendiente de otras fases:** jugadores y planteles (Fase 4), calendario y sorteo, con el efecto de retiros y equipos tardíos sobre puntos (Fase 5), finanzas y sanciones (Fase 6) y partido en vivo (Fase 7).

## 11. Para `PLAN_FRONTEND.md`

Añade un ajuste `Bn` con: (1) las pantallas de la sección 2; (2) el login `/delegado/<slug>` y las rutas de refresh/logout con `?portal=delegado`; (3) el catálogo de errores de la sección 8 en el mapeador de errores; (4) `excluirEquipos` en el arranque (sección 7); (5) la validación local tolerante de teléfono y PIN (sección 9); (6) regenerar el cliente Orval desde el snapshot.
