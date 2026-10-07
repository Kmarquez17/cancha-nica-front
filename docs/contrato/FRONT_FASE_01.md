# Aviso al front — Fase 1 (auth, cuentas y plataforma multi-liga)

> **Fuente de verdad del contrato:** `docs/contrato/openapi.snapshot.json` (regenerado al cerrar la fase; 19 operaciones). Este documento explica lo que el OpenAPI no dice: flujos, pantallas y reglas de sesión.
> **Decisiones de origen:** `PLAN_BACKEND.md`, decisión **R11** (historial) y secciones 4.2 y 13.

## 1. Qué cambia para el front

- Hay **cuatro portales** de sesión independientes: `plataforma` (el dueño de la app), `admin` (dueño y admins de una liga), `delegado` y `mesa`. En esta fase **solo están activos `plataforma` y `admin`**; delegado y mesa llegan en las Fases 2 y 3.
- Cada portal usa **dos cookies** `httpOnly; SameSite=Lax; Path=/` (`Secure` en producción): `at_<portal>` (access, 15 min) y `rt_<portal>` (refresh rotatorio). **Los tokens nunca viajan en el cuerpo** y el JS del navegador no puede leerlas.
- Un portal no pisa la sesión de otro: se puede estar en `plataforma` y en `admin` a la vez.

## 2. Reglas de sesión (cómo debe comportarse el front)

| Situación                                                                    | Qué hacer                                                                                                                                                             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Petición responde **401** `UNAUTHORIZED`                                     | Llamar **una vez** a `refreshSession` (`POST /auth/refresh?portal=<portal>`). Si da `204`, repetir la petición original. Si da 401, ir al login de ese portal.        |
| **Quién refresca**                                                           | **Solo el cliente.** Los Server Components solo leen con `at_<portal>`; nunca rotan.                                                                                  |
| Dos pestañas refrescan a la vez                                              | Es seguro: el refresh anterior sigue válido 10 s. Reusar uno viejo fuera de ese margen **cierra toda la sesión** (401 en el siguiente refresh).                       |
| **403** `ORG_BLOQUEADA` (en cualquier petición, en el refresh o en el login) | Mostrar pantalla de **«liga bloqueada, contacta al administrador de la app»**. **No borrar las cookies**: si la liga se reactiva, la misma sesión vuelve a funcionar. |
| **429** `IP_LOCKED` / `ACCOUNT_LOCKED`                                       | Mensaje de «demasiados intentos, espera unos minutos». En `ACCOUNT_LOCKED` ofrecer «olvidé mi contraseña» (restablecer levanta el bloqueo).                           |
| **429** `TOO_MANY_REQUESTS`                                                  | Reintentar más tarde.                                                                                                                                                 |
| Logout                                                                       | `POST /auth/logout?portal=<portal>` (idempotente, `204`).                                                                                                             |

`GET /<portal>/me` (`getPlataformaMe`, `getAdminMe`) sirve para validar la sesión en el servidor y precargar datos. Si la cuenta se desactivó, responde 401 aunque el access token siga vigente.

## 3. Endpoints nuevos

| operationId              | Método y ruta                                                | Quién                | Éxito                                  | Errores principales                                                         |
| ------------------------ | ------------------------------------------------------------ | -------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `plataformaLogin`        | `POST /auth/plataforma/login`                                | público              | 200 `PlataformaPrincipalDto` + cookies | 401 `INVALID_CREDENTIALS`, 429                                              |
| `getPlataformaMe`        | `GET /plataforma/me`                                         | plataforma           | 200 `PlataformaPrincipalDto`           | 401                                                                         |
| `listarOrganizaciones`   | `GET /plataforma/organizaciones?estado&q&limit&offset`       | plataforma           | 200 `{ items, total }`                 | 400                                                                         |
| `crearOrganizacion`      | `POST /plataforma/organizaciones`                            | plataforma           | 201 `OrganizacionDto`                  | 400, 409 `ORG_SLUG_DUPLICATED`                                              |
| `getOrganizacion`        | `GET /plataforma/organizaciones/{id}`                        | plataforma           | 200 `OrganizacionDto`                  | 404                                                                         |
| `actualizarOrganizacion` | `PATCH /plataforma/organizaciones/{id}`                      | plataforma           | 200 `OrganizacionDto`                  | 400, 404                                                                    |
| `bloquearOrganizacion`   | `POST /plataforma/organizaciones/{id}/bloquear` `{ motivo }` | plataforma           | 200 `OrganizacionDto`                  | 409 `ORG_ESTADO_INVALIDO`                                                   |
| `reactivarOrganizacion`  | `POST /plataforma/organizaciones/{id}/reactivar`             | plataforma           | 200 `OrganizacionDto`                  | 409 `ORG_ESTADO_INVALIDO`                                                   |
| `invitarDueno`           | `POST /plataforma/organizaciones/{id}/invitacion`            | plataforma           | 201 `InvitacionCreadaDto`              | 409 `ORG_YA_TIENE_OWNER`, `EMAIL_YA_REGISTRADO`                             |
| `aceptarInvitacion`      | `POST /auth/aceptar-invitacion` `{ token, password }`        | público              | 200 `AdminPrincipalDto` + cookies      | 400 `TOKEN_INVALIDO_O_EXPIRADO`, `PASSWORD_DEBIL`; 403 `ORG_BLOQUEADA`; 409 |
| `adminLogin`             | `POST /auth/admin/login`                                     | público              | 200 `AdminPrincipalDto` + cookies      | 401 `INVALID_CREDENTIALS`, 403 `ORG_BLOQUEADA`, 429                         |
| `getAdminMe`             | `GET /admin/me`                                              | OWNER, ADMIN         | 200 `AdminPrincipalDto`                | 401, 403                                                                    |
| `invitarAdmin`           | `POST /admin/usuarios/invitar`                               | **solo OWNER**       | 201 `InvitacionCreadaDto`              | 403 (ADMIN), 409 `EMAIL_YA_REGISTRADO`                                      |
| `olvideContrasena`       | `POST /auth/olvide-contrasena` `{ email }`                   | público              | **202** siempre igual                  | 400 (formato)                                                               |
| `restablecerContrasena`  | `POST /auth/restablecer` `{ token, password }`               | público              | **204** (no abre sesión)               | 400, 403 `ORG_BLOQUEADA`                                                    |
| `refreshSession`         | `POST /auth/refresh?portal=`                                 | cookie `rt_<portal>` | 204                                    | 401, 403 `ORG_BLOQUEADA`                                                    |
| `logout`                 | `POST /auth/logout?portal=`                                  | cookie               | 204                                    | —                                                                           |

Los DTO de respuesta (`OrganizacionDto`, `InvitacionCreadaDto`, `AdminPrincipalDto`, …) están completos en el OpenAPI.

## 4. Pantallas y rutas que el front debe tener

1. **Login de plataforma** y **login de admin** (formularios distintos, portales distintos).
2. **`/aceptar-invitacion?token=…`** — **ruta pública**. Lee el token, **lo quita de la URL** (`history.replaceState`) y pide una contraseña (10–128 caracteres). Llama a `aceptarInvitacion`; al éxito ya hay sesión `admin`.
3. **`/restablecer-contrasena?token=…`** — **ruta pública**, igual que la anterior. Llama a `restablecerContrasena`; al éxito (`204`) **no hay sesión**: llevar al login.
4. **«Olvidé mi contraseña»** — llama a `olvideContrasena` y muestra siempre el mensaje de la respuesta (sea cual sea el correo).
5. **Pantalla de liga bloqueada** (ver sección 2).
6. **Panel de plataforma:** lista de ligas (con su dueño y su invitación pendiente), crear liga, editar, bloquear (con motivo) y reactivar, e invitar o reenviar la invitación del dueño.

> Los enlaces que llegan por correo o WhatsApp se construyen con la variable `FRONT_URL` del API: `{FRONT_URL}/aceptar-invitacion?token=…` y `{FRONT_URL}/restablecer-contrasena?token=…`. Las dos rutas deben existir con esos nombres exactos.

## 5. Flujo: alta de una liga

1. `crearOrganizacion` (nombre + slug; opcionales: zona horaria, moneda, país, color, teléfono). El `slug` **no se puede cambiar después** (va en las URLs públicas).
2. `invitarDueno` con `{ email, nombre, telefono?, enviarEmail? }`. La respuesta trae, **una sola vez**:
   - `enlace` — mostrarlo con botón **copiar**.
   - `waMeUrl` — si se mandó teléfono, botón **«Enviar por WhatsApp»** (abre el chat con el mensaje armado). `null` si no hay teléfono.
   - `emailEnviado` y `reenvio`.
3. **El token no se puede volver a ver.** Si la persona no se registra: volver a llamar a `invitarDueno` genera un enlace nuevo y **anula el anterior** (`reenvio: true`). La invitación vence a los **7 días**.
4. En `listarOrganizaciones` / `getOrganizacion`, `owner` trae al dueño activo y `invitacionOwner` la invitación vigente sin usar (`null` si no hay). Con eso el panel decide si mostrar «Reenviar invitación».
5. **Una liga tiene un solo dueño** (`ORG_YA_TIENE_OWNER` si ya lo hay). Un correo no puede estar en dos cuentas (`EMAIL_YA_REGISTRADO`).

`invitarAdmin` (lo usa el OWNER desde su panel) es igual pero crea un **ADMIN** en la liga del dueño; reenviar al mismo correo anula su enlace anterior.

## 6. Reglas de validación a replicar en formularios

| Campo                     | Regla                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`                    | 3–40 caracteres; minúsculas, números y guiones simples (`^[a-z0-9]+(-[a-z0-9]+)*$`)                                                                            |
| `nombre` (liga y persona) | 3–80 caracteres                                                                                                                                                |
| `telefono`                | **Formato internacional** con `+` y código de país, p. ej. `+50588888888` (se aceptan espacios y guiones al escribir; el API los normaliza). Lo exige WhatsApp |
| `moneda` / `pais`         | ISO 4217 en mayúsculas (`NIO`) / ISO 3166-1 de 2 letras (`NI`)                                                                                                 |
| `zonaHoraria`             | IANA, p. ej. `America/Managua`                                                                                                                                 |
| `colorPrimario`           | `#RRGGBB`                                                                                                                                                      |
| contraseña nueva          | 10–128 caracteres, distinta del correo o de su parte local, no un solo carácter repetido. El API devuelve `PASSWORD_DEBIL` con el motivo en `detail`           |
| `motivo` de bloqueo       | 3–500 caracteres                                                                                                                                               |

Los errores de validación llegan como `400` `VALIDATION_ERROR` con la lista de mensajes en `errors`.

## 7. Códigos de error nuevos

`INVALID_CREDENTIALS` (401) · `ACCOUNT_LOCKED` / `IP_LOCKED` (429) · `ORG_BLOQUEADA` (403) · `ORG_SLUG_DUPLICATED` (409) · `ORG_ESTADO_INVALIDO` (409) · `ORG_YA_TIENE_OWNER` (409) · `EMAIL_YA_REGISTRADO` (409) · `PASSWORD_DEBIL` (400) · `TOKEN_INVALIDO_O_EXPIRADO` (400) · `PAYLOAD_TOO_LARGE` (413) · `UNSUPPORTED_MEDIA_TYPE` (415). El catálogo completo es el enum `ErrorCode` del OpenAPI.

## 8. Lo que todavía NO existe

- Login de **delegado** y de **mesa** (Fases 2 y 3).
- Rutas `/public/...` (Fase 8). Cuando existan, las de una liga bloqueada responderán `404`, igual que una liga inexistente.
- Un access token ya emitido sigue valiendo hasta 15 min tras restablecer la contraseña o desactivar la cuenta (los refresh sí se revocan al instante).
