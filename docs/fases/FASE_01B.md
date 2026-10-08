# FASE 1b — Modelo de cliente y plataforma de solo lectura (R15)

> **Fuente de la verdad:** `PLAN_FRONTEND.md` (§4.10, §6, §13.8). Contrato: `docs/contrato/FRONT_FASE_01B.md` y `docs/contrato/openapi.snapshot.json`.
> **Estado:** ✅ Implementada (2026-10-07). Fase alterna de la Fase 1: ajusta el vocabulario y la visibilidad de plataforma; no cambia la sesión.

## 1. Idea en una frase

Se distingue **cliente** (la organización que Kevin da de alta, p. ej. SOPA; en el API `Organizacion`) de **liga** (un torneo del cliente; en el API será `Edicion`, aún no existe). El panel de plataforma gestiona **clientes** y **solo lee** lo que hacen; el dueño edita su propia configuración.

## 2. Qué se hizo

| Pieza | Detalle |
|---|---|
| Cliente de API | Regenerado con el snapshot de la 1b (`getOrganizacion` → `ClienteFichaDto`, `getAdminOrganizacion`, `actualizarAdminOrganizacion`, `PLATAFORMA_SOLO_LECTURA`) |
| Vocabulario | «Ligas» → «Clientes», «crear liga» → «crear cliente», «Activa/Bloqueada» → «Activo/Bloqueado», mensajes de error y pantalla «Cuenta del cliente bloqueada» |
| Rutas del front | `/plataforma/ligas` → **`/plataforma/clientes`** (`/nuevo`, `/[id]`). Las rutas, `operationId`, DTO y códigos del **API** no cambian |
| ⚠ Cambio rompedor | «Editar cliente» (plataforma) envía **solo `nombre` y `telefonoContacto`**. Zona horaria, moneda, país y color solo se indican al **crear** |
| Ficha de cliente | Solo lectura: datos y estado, motivo del bloqueo, dueño, invitación con «Reenviar», **tabla de admins** (estado ACTIVO / INACTIVO / INVITACION_PENDIENTE, «desde», vencimiento), configuración regional y **fichas de conteos** |
| Conteos | `null`/ausente → «—» con «Aún no disponible», **nunca 0**. Espacios preparados: Categorías, Ligas, Mesas, Delegados, Equipos |
| Portal admin | **Configuración del cliente** (`/admin/configuracion`): zona horaria, moneda, país y color. La usan el dueño **y** los admins. Nombre, slug y teléfono: solo lectura (los administra plataforma) |
| Bloqueo | Texto nuevo. Sin borrar cookies: al reactivar vuelve la misma sesión. Plataforma sigue viendo la ficha de un cliente bloqueado y puede reactivarlo |
| `PLATAFORMA_SOLO_LECTURA` | Error inesperado (mensaje genérico + código de soporte); no redirige ni se confunde con sesión caída |

## 3. Decisiones de implementación

- **Invalidar, no `setQueryData`:** las escrituras de plataforma devuelven `OrganizacionDto` (sin `admins` ni `conteos`); pisar la ficha con eso la rompería. Se invalida la lista y la ficha.
- **Solo lo que cambió:** el formulario de configuración envía únicamente los campos modificados (`cambiosDeConfig`), y solo esos cuatro.
- **Esquema compartido:** la validación de configuración regional vive en `shared/lib/config-cliente.ts` (la usan crear cliente en plataforma y configurar en admin) para respetar la regla de que una feature no importa de otra.
- **Zona horaria:** se valida con `Intl.DateTimeFormat` (IANA real), no con una lista fija.
- **«Admins» cuenta cuentas:** una invitación pendiente no es un admin; va en «Invitaciones de admin pendientes».

## 4. Pruebas

- **Vitest (88):** `textoConteo`; `ConteosCliente` (null → «—», 0 → 0, se llena al dejar de ser null); `TablaAdmins`; `ClienteFicha` (solo lectura, «Reenviar», bloqueado, **PATCH solo con `nombre` y `telefonoContacto`**, sin campos de configuración); `ConfiguracionCliente` (solo lo cambiado, validaciones, 400 del servidor); `PLATAFORMA_SOLO_LECTURA`.
- **E2E contra la API real (`pnpm test:e2e:api`, 9):** además de los de la Fase 1: ficha con admins y conteos «—»; el **ADMIN** (no solo el dueño) acepta su invitación y configura el cliente; plataforma edita solo contacto sin pisar la configuración; cliente bloqueado visible en plataforma, admin cae a «cuenta bloqueada» y vuelve con la misma sesión al reactivar.
- `test:e2e:api` usa su propio directorio de build (`NEXT_DIST_DIR=.next-e2e`) para no chocar con un `pnpm dev` abierto.

## 5. Qué NO se hizo (a propósito)

- **Login de mesa:** será `/mesa/<slug-del-cliente>` y llega con la Fase 2 del API (hasta 6 mesas por cliente, a nivel de cliente).
- **Listados para plataforma** de categorías, ligas, mesas, delegados y equipos (◇; el API los añade en las Fases 2 y 3). La ficha ya tiene el espacio.
- **Pantalla de admins del cliente** (invitar/gestionar): el dueño invita admins por API (`invitarAdmin`); su pantalla es de la Fase 10.

## 6. Pendiente del backend

- Fase 2: `GET /plataforma/organizaciones/:id/{categorias,ediciones,mesas}` y los conteos `categorias`, `ediciones`, `mesas`.
- Fase 3: `…/delegados`, `…/equipos` y sus conteos.
- Fase 2: mesas a nivel de cliente y su login; formulario de crear liga con `EDICION_CATEGORIA_ABIERTA`.
