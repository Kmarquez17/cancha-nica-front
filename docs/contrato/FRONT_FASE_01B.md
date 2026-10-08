# Aviso al front — Fase 1b (modelo de cliente y plataforma de solo lectura)

> **Fuente de verdad del contrato:** `docs/contrato/openapi.snapshot.json` (regenerado). Este documento explica lo que el OpenAPI no dice.
> **Decisión de origen:** **R15** en `PLAN_BACKEND.md` (sección 1b «Vocabulario», 4.2 y 13). Detalle de la fase: `docs/fases/FASE_01B.md`.
> **Importante:** hay **un cambio rompedor** en el formulario de edición del panel de plataforma (sección 3).

## 1. Qué cambia, en una frase

El producto distingue **cliente** (la organización que Kevin da de alta, p. ej. «SOPA») de **liga** (un torneo de ese cliente). El panel de plataforma gestiona **clientes** y **solo lee** lo que ellos hacen; el dueño de cada cliente edita su propia configuración.

## 2. Terminología y equivalencias

**Las rutas, los `operationId`, los nombres de DTO y los códigos de error NO cambian.** Solo cambian las etiquetas y textos.

| Concepto de negocio | Cómo se llama en la pantalla                         | En el API (sin cambios)                                                  |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Cliente             | **Cliente** (antes «Liga» en el panel de plataforma) | `Organizacion`, `/plataforma/organizaciones`, `OrganizacionDto`, `ORG_*` |
| Liga (torneo)       | **Liga** (aún no existe en el API)                   | `Edicion`, `/admin/ediciones` (Fase 2)                                   |
| Dueño / Admin       | Dueño / Admin                                        | `OWNER` / `ADMIN`                                                        |

**Textos de error que cambian** (los `code` son los mismos; si el front muestra `title`/`detail`, ya vienen actualizados):

| Código                | Antes                                                                                              | Ahora                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `ORG_BLOQUEADA`       | La liga está bloqueada                                                                             | El cliente está bloqueado                                                                                   |
| `ORG_SLUG_DUPLICATED` | Ya existe una liga con ese slug                                                                    | Ya existe un cliente con ese slug                                                                           |
| `ORG_YA_TIENE_OWNER`  | La liga ya tiene un dueño activo                                                                   | El cliente ya tiene un dueño activo                                                                         |
| `ORG_ESTADO_INVALIDO` | La liga no admite ese cambio de estado (`La liga ya está bloqueada` / `La liga no está bloqueada`) | El cliente no admite ese cambio de estado (`El cliente ya está bloqueado` / `El cliente no está bloqueado`) |

**A renombrar en el front:** el menú y los títulos del panel de plataforma («Ligas» → «Clientes»), «crear liga» → «crear cliente», la pantalla de bloqueo («liga bloqueada» → «cuenta del cliente bloqueada»), y los textos de las invitaciones.

## 3. Endpoints

### Cambian

| operationId              | Método y ruta                           | Quién      | Cambio                                                                                                                                                                                  |
| ------------------------ | --------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getOrganizacion`        | `GET /plataforma/organizaciones/{id}`   | plataforma | **Ahora devuelve la ficha del cliente** (`ClienteFichaDto`): todo lo de antes **más** `admins[]` y `conteos`. Es aditivo: lo que el front ya lee sigue igual.                           |
| `actualizarOrganizacion` | `PATCH /plataforma/organizaciones/{id}` | plataforma | ⚠ **CAMBIO ROMPEDOR:** solo acepta `nombre` y `telefonoContacto`. Enviar `zonaHoraria`, `moneda`, `pais`, `colorPrimario` (o cualquier otro campo) responde **400 `VALIDATION_ERROR`**. |

> **Qué hacer en el formulario «editar cliente» de plataforma:** dejar solo **nombre** y **teléfono de contacto**. Zona horaria, moneda, país y color **siguen pudiéndose indicar al CREAR** el cliente (valores iniciales), pero después los edita el dueño (siguiente tabla). El `slug` sigue sin poderse cambiar.

### Nuevos

| operationId                   | Método y ruta               | Quién        | Éxito                       | Errores                                                  |
| ----------------------------- | --------------------------- | ------------ | --------------------------- | -------------------------------------------------------- |
| `getAdminOrganizacion`        | `GET /admin/organizacion`   | OWNER, ADMIN | 200 `OrganizacionConfigDto` | 401, 403 `ORG_BLOQUEADA`                                 |
| `actualizarAdminOrganizacion` | `PATCH /admin/organizacion` | OWNER, ADMIN | 200 `OrganizacionConfigDto` | 400 (campo no permitido o inválido), 403 `ORG_BLOQUEADA` |

`PATCH /admin/organizacion` acepta **solo** `zonaHoraria`, `moneda`, `pais` y `colorPrimario` (opcionales). Nombre, slug y teléfono de contacto los administra plataforma y aquí dan 400. Un cuerpo vacío o con los mismos valores no hace nada.

## 4. La ficha del cliente (`ClienteFichaDto`)

Además de los datos de siempre (`id`, `nombre`, `slug`, `estado`, `motivoBloqueo`, `owner`, `invitacionOwner`…):

- **`admins[]`** (los admins del cliente, sin el dueño), ordenados por fecha:
  - `id` (`null` si aún es una invitación), `nombre`, `email`
  - `estado`: `ACTIVO` · `INACTIVO` · `INVITACION_PENDIENTE`
  - `desde`: fecha de alta de la cuenta, o de envío de la invitación
  - `expiraEn`: solo en `INVITACION_PENDIENTE`
- **`conteos`**: `admins`, `adminsActivos`, `invitacionesAdminPendientes` (números) y `categorias`, `ediciones`, `mesas`, `delegados`, `equipos` (**`null` por ahora**: «aún no disponible»; cada fase los habilita).

> **Cómo pintarlo:** muestra los conteos con `null` como «—» y **no** como 0. No hay teléfonos ni datos personales de las cuentas: es una vista de solo lectura.

**Plataforma sigue viendo la ficha de un cliente bloqueado** (con su `motivoBloqueo`) y puede reactivarlo.

## 5. Códigos de error nuevos

| Código                    | HTTP | Cuándo                                                                                                                                                                                              |
| ------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PLATAFORMA_SOLO_LECTURA` | 403  | La sesión de plataforma intentó escribir algo que no está permitido. **El front no debería provocarlo** (solo existen las cinco escrituras de plataforma); si aparece, es un error de programación. |

Las cinco escrituras que plataforma sí puede hacer sobre un cliente: **crear** (`crearOrganizacion`), **editar contacto** (`actualizarOrganizacion`), **invitar o reenviar al dueño** (`invitarDueno`), **bloquear** (`bloquearOrganizacion`) y **reactivar** (`reactivarOrganizacion`).

## 6. Reglas de sesión y bloqueo

Las reglas de sesión **no cambian** (ver `FRONT_FASE_01.md`). Lo que ahora está **garantizado y probado**:

- Al bloquear un cliente caen **al instante y con el mismo token** el dueño, los admins, los delegados, las mesas y las páginas `/public/...` (estas responden 404, igual que un cliente inexistente). También se cortan el refresh, el login, aceptar una invitación y restablecer la contraseña.
- La respuesta de todo lo anterior es **403 `ORG_BLOQUEADA`** (y 404 en `/public`). El front debe mostrar la pantalla de «cuenta bloqueada» y **no borrar las cookies**: al reactivar, la misma sesión vuelve a funcionar.
- Bloquear a un cliente **no afecta a otro**.

## 7. Pantallas que debe añadir o renombrar

1. **Panel de plataforma → «Clientes»** (renombrar): la lista y las acciones de siempre.
2. **Ficha de cliente (solo lectura)**, nueva o ampliada: datos y estado, motivo del bloqueo, dueño, invitación del dueño (con «Reenviar»), tabla de admins con su estado y fecha, y las fichas de conteos. Dejar **espacios preparados** para «Categorías», «Ligas», «Mesas» y «Delegados»: se muestran cuando su conteo deje de ser `null`.
3. **Editar cliente (plataforma):** solo nombre y teléfono de contacto.
4. **Configuración del cliente (portal admin), nueva:** formulario con zona horaria, moneda, país y color, con `getAdminOrganizacion` y `actualizarAdminOrganizacion`. Puede ver y cambiarlo el dueño **y** los admins.
5. **Pantalla de cliente bloqueado:** actualizar el texto.

## 8. Lo que viene (no implementar todavía)

Listados de **solo lectura** para plataforma, propuestos (◇), que añadirá cada fase:

| Endpoint                                        | Fase                                         |
| ----------------------------------------------- | -------------------------------------------- |
| `GET /plataforma/organizaciones/:id/categorias` | 2                                            |
| `GET /plataforma/organizaciones/:id/ediciones`  | 2                                            |
| `GET /plataforma/organizaciones/:id/mesas`      | 2 (su forma depende de una decisión abierta) |
| `GET /plataforma/organizaciones/:id/delegados`  | 3                                            |
| `GET /plataforma/organizaciones/:id/equipos`    | 3                                            |

## 9. Decisiones resueltas que tocarán al front en la Fase 2

Las resolvió el dueño del producto; **aún no están implementadas** (llegan con el API de la Fase 2; `docs/fases/FASE_01B.md`, sección 6):

- **Mesas a nivel de cliente:** una mesa pertenece al cliente y opera las ligas que el dueño le asigne. El login de mesa será **`/mesa/<slug-del-cliente>`** (no el de la edición) y habrá hasta **6 mesas por cliente**, cada una con su PIN. **No construir el login de mesa antes de que llegue el API de la Fase 2.**
- **Regla de una edición abierta:** se mantiene. Un cliente no tiene dos ligas abiertas de la misma categoría y modalidad; el formulario de crear liga debe mostrar el error `EDICION_CATEGORIA_ABIERTA` cuando ocurra.
