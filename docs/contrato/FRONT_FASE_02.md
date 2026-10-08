# Aviso al front — Fase 2 (categorías, ligas, mesas y login de mesa)

> **Fuente de verdad del contrato:** `docs/contrato/openapi.snapshot.json` (regenerado; 26 `operationId` nuevos). Este documento explica lo que el OpenAPI no dice: pantallas, reglas por estado y errores.
> **Detalle de la fase:** `docs/fases/FASE_02.md`. **Vocabulario:** cliente = organización que da de alta Plataforma; **liga** = una edición (torneo) del cliente (`Edicion` en el API).
> **No hay cambios rompedores** respecto a la Fase 1b: todo lo de aquí es nuevo.

## 1. Mapa de lo nuevo

| Portal                    | Pantalla                                                   | Rutas                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin (`OWNER`, `ADMIN`)  | Categorías                                                 | `GET/POST /admin/categorias`, `PATCH /admin/categorias/:id`, `POST …/:id/archivar`, `POST …/:id/restaurar`                                                                |
| Admin                     | Ligas (lista, crear, detalle)                              | `GET/POST /admin/ediciones`, `GET/PATCH /admin/ediciones/:id`, `POST …/:id/estado`, `POST …/:id/archivar`, `POST …/:id/restaurar`                                         |
| Admin                     | Mesas (lista, alta con PIN, alcance)                       | `GET/POST /admin/mesas`, `PATCH /admin/mesas/:id`, `PUT …/:id/ediciones`, `POST …/:id/pin/reset`, `POST …/:id/desbloquear`, `POST …/:id/activar`, `POST …/:id/desactivar` |
| Mesa                      | Login en `/mesa/<slug-del-cliente>` y elegir liga          | `POST /auth/mesa/:orgSlug/login`, `GET /mesa/me`, `GET /mesa/ediciones/:edicionId`                                                                                        |
| Plataforma (solo lectura) | Pestañas de la ficha del cliente: categorías, ligas, mesas | `GET /plataforma/organizaciones/:id/categorias`, `…/ediciones`, `…/mesas`; la ficha trae `conteos.categorias`, `conteos.ediciones`, `conteos.mesas`                       |

Todos con `credentials: 'include'` (cookies httpOnly). Ningún token ni PIN se lee desde JavaScript. Refresh y logout de la mesa usan lo de siempre con `?portal=mesa` (`POST /auth/refresh?portal=mesa`, `POST /auth/logout?portal=mesa`).

**Plataforma no escribe nada de esto.** Sus pantallas de categorías, ligas y mesas son solo lectura: no muestres botones de crear, editar ni resetear.

## 2. Categorías

- `GET /admin/categorias` devuelve las activas; `?archivadas=true` agrega las archivadas (están marcadas `activa: false`).
- Campos: `nombre` (hasta 60), `edadMinima` y `edadMaxima` opcionales (5 a 80; `null` = sin límite). Cada una trae `ediciones` (cuántas ligas la usan) y `creadoPor {id, nombre}` («registrada por»).
- **Unicidad sin distinguir mayúsculas, tildes ni signos:** «Sub-18», «sub 18» y «SUB.18» son la misma → `409 CATEGORIA_DUPLICADA`. Muestra el `detail` tal cual.
- Rango invertido (mínima mayor que la máxima) o nombre sin letras ni números → `400 VALIDATION_ERROR`.
- Para **borrar** un límite de edad en el `PATCH`, envía `null` (no lo omitas: omitir = no cambiar).
- **Archivar** es el reemplazo del borrado; es idempotente. Una categoría archivada **no admite ligas nuevas** (`409 CATEGORIA_ARCHIVADA`) pero las ligas que ya la usan siguen funcionando. Cambiar el rango de una categoría **no** toca el de las ligas ya creadas.

## 3. Ligas

### 3.1 Crear

`POST /admin/ediciones` con `{ nombre, categoriaId, modalidad, fechaInicio?, fechaFinEstimada? }` → `201`, liga en `CONFIGURACION`.

- `modalidad`: `FUTSAL`, `FUTBOL_9` o `FUTBOL_11`. Carga el **preset** de esa modalidad (tabla 3.2). Los presets de fútbol 9 y 11 son provisionales; el de futsal está validado.
- Precarga también la edad mínima y máxima de la categoría, las reglas de sanción y financieras por defecto (3.4) y costos en `"0.00"`.
- El `slug` (enlace público futuro) se genera del nombre y recibe un sufijo (`-2`, `-3`) si ya existe; **nunca da error por repetido**. Se puede cambiar solo en `CONFIGURACION`.
- Categoría de otro cliente o inexistente → `404`; archivada → `409 CATEGORIA_ARCHIVADA`.

### 3.2 Presets

|                                              | `FUTSAL`    | `FUTBOL_9`   | `FUTBOL_11`  |
| -------------------------------------------- | ----------- | ------------ | ------------ |
| `reglasModalidad.jugadoresEnCancha`          | 5           | 9            | 11           |
| `minJugadoresPartido`                        | 4           | 6            | 7            |
| `maxConvocados`                              | 12          | 14           | 18           |
| `relojModo`                                  | `REGRESIVO` | `PROGRESIVO` | `PROGRESIVO` |
| `registraFaltas`                             | sí          | no           | no           |
| `faltasPersonalesParaAmarilla`               | 3           | `null`       | `null`       |
| `roja.inferioridadMs` / `cancelaPorGolRival` | 120000 / sí | `null` / no  | `null` / no  |
| `duracionTiempoRegular` (min)                | 20          | 30           | 45           |
| `duracionTiempoEliminatoria` (min)           | 25          | 35           | 45           |
| `limiteFaltasAcumuladas`                     | 6           | `null`       | `null`       |
| `rosterMin` / `rosterMax`                    | 6 / 18      | 10 / 22      | 14 / 30      |

Otros valores iniciales: `minEquiposArranque` 4, `maxEquiposPorJugador` 3, `clasificadosPlayoff` `null` (sin playoffs), `tercerPuesto` `false`.

### 3.3 Qué se puede editar según el estado

La respuesta de la liga ya trae **`camposEditables`** (lista de nombres) y **`transicionesPosibles`** (estados a los que se puede pasar). **Úsalos para habilitar o deshabilitar campos y botones; no dupliques la regla.**

| Estado                                    | Editable                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `CONFIGURACION`                           | Todo                                                                     |
| `EN_REGISTRO`                             | Todo menos `slug`, `fechaInicio` y `categoriaId`                         |
| `EN_CURSO`, `EN_ELIMINATORIAS`, `PAUSADA` | Solo `nombre`, `fechaFinEstimada`, `costoInscripcion` y `costoArbitraje` |
| `FINALIZADA`                              | Nada                                                                     |

`PATCH /admin/ediciones/:id` acepta cualquier subconjunto de: `nombre, slug, categoriaId, modalidad, reglasModalidad, duracionTiempoRegular, duracionTiempoEliminatoria, limiteFaltasAcumuladas, rosterMin, rosterMax, maxEquiposPorJugador, minEquiposArranque, edadMinima, edadMaxima, fechaInicio, fechaFinEstimada, clasificadosPlayoff, tercerPuesto, reglasSanciones, reglasFinancieras, costoInscripcion, costoArbitraje`. Cualquier otro campo (por ejemplo `estado` o `organizacionId`) → `400`.

- **Todo o nada:** si la petición toca aunque sea un campo bloqueado, no se aplica ninguno.
- `costoInscripcion` y `costoArbitraje` van como **texto** decimal (`"15"`, `"7.50"`); llegan como `"15.00"`. Un costo nuevo aplica solo a cargos futuros.
- `clasificadosPlayoff`: `4`, `8`, `16` o `null`. `fechaInicio` y `fechaFinEstimada` en ISO 8601; `null` las borra.
- **Cambiar la `modalidad` recarga el preset de la nueva** (reglas y duraciones). Lo que envíes en la misma petición se respeta encima. Avisa al usuario de que sus ajustes de reglas se reemplazan.
- Una liga **archivada** no se edita ni cambia de estado hasta restaurarla (`409 EDICION_ARCHIVADA`).

### 3.4 Reglas de sanción y financieras

Se envían **completas** (objeto entero, no parcial) y se validan:

```json
"reglasSanciones": {
  "rojaDirectaFechas": 1, "dobleAmarillaFechas": 1,
  "amarillasAcumuladasParaFecha": 5, "conteoAmarillasEnEliminatorias": "MANTIENE",
  "multaAmarilla": "0.00", "multaRoja": "0.00", "multaBloqueaConvocatoria": true,
  "walkover": { "marcador": [3, 0], "multaInfractor": "0.00", "exclusionTrasNWalkovers": null },
  "inferioridadNumerica": { "multaInfractor": "0.00" }
}
"reglasFinancieras": { "bloquearEquipoPorDeudaInscripcion": false, "bloquearEquipoPorDeudaArbitraje": false }
```

`conteoAmarillasEnEliminatorias`: `MANTIENE` o `REINICIA`. Las multas son texto decimal sin signo y con hasta 2 decimales. En el marcador de W.O. el primero (ganador) debe ser mayor que el segundo. **Hoy solo se guardan:** su efecto llega en las Fases 6 y 7.

### 3.5 Cambios de estado

```
CONFIGURACION → EN_REGISTRO → EN_CURSO → EN_ELIMINATORIAS → FINALIZADA
                     ↕ PAUSADA ↕ (solo desde EN_REGISTRO o EN_CURSO; vuelve al estado previo)
EN_CURSO → FINALIZADA (solo si la liga no tiene playoffs)
```

No hay vuelta atrás a `CONFIGURACION`, y **finalizar es irreversible**.

`POST /admin/ediciones/:id/estado` con `{ a, forzar?, confirmar? }` → `200` con la liga actualizada.

- **Si no se cumplen las condiciones:** `409` con la lista completa en **`incumplimientos`**: `[{ codigo, mensaje, forzable }]`. Muéstrala como checklist.
  - `EDICION_PRECONDICIONES_NO_CUMPLIDAS`: hay incumplimientos. Los **forzables** se pueden saltar con `forzar: true`: `EQUIPOS_INSUFICIENTES`, `ROSTER_INCOMPLETO`, `FIXTURE_NO_GENERADO`, `SIN_MESA_ACTIVA`, `FASE_REGULAR_INCOMPLETA`. Los **no forzables** nunca: `CLASIFICADOS_NO_DEFINIDOS`, `EDICION_CON_PLAYOFFS`, `PARTIDOS_PENDIENTES`, `FINAL_NO_CERRADA`, `PARTIDO_EN_CURSO`.
  - `EDICION_CATEGORIA_ABIERTA`: ya hay otra liga **abierta** (`EN_REGISTRO`, `EN_CURSO`, `EN_ELIMINATORIAS` o `PAUSADA`) de la misma categoría **y modalidad**. No se fuerza. La misma categoría en otra modalidad sí se permite. Pausar una liga **no** libera la categoría; finalizarla sí.
  - `EDICION_ESTADO_INVALIDO`: ese salto no existe.
  - `EDICION_SOLO_LECTURA`: la liga ya está finalizada.
- **`forzar: true` solo lo puede el `OWNER`.** Si lo manda un `ADMIN` → `403`, incluso si no hacía falta. Muestra el botón «Forzar» solo al dueño, y solo después de mostrar el checklist.
- **Finalizar** exige `confirmar: true`; sin él → `400 CONFIRMACION_REQUERIDA`. Pide una confirmación explícita («no se puede deshacer»). Lo puede hacer el dueño o un admin.
- **Hoy todavía no hay equipos ni calendario** (Fases 3 a 5): por eso, en este momento, pasar `EN_REGISTRO → EN_CURSO` siempre devuelve incumplimientos y solo el dueño puede avanzar con «Forzar». Es lo esperado hasta esas fases.

### 3.6 Archivar una liga creada por error

`POST /admin/ediciones/:id/archivar` solo funciona en `CONFIGURACION` (si no → `409 EDICION_ESTADO_INVALIDO`). `…/restaurar` la devuelve. El listado las oculta por defecto: `GET /admin/ediciones?archivadas=true`. Filtros del listado: `estado`, `modalidad`, `categoriaId`. Cada liga trae `creadoPor` («registrada por»).

## 4. Mesas

Las mesas son **del cliente**, hasta **6** (`MESA1` … `MESA6`, el número lo asigna el servidor), y cada una opera solo las ligas que se le asignen.

- `GET /admin/mesas`: por mesa, `username`, `nombreOperador`, `activo`, **`acceso { estado, bloqueadaHasta }`**, `ediciones [{id, nombre, estado}]` y `creadoPor`. `acceso.estado` es `ACTIVA`, `DESACTIVADA` o **`BLOQUEADA`** (muestra «bloqueada hasta las HH:MM»; es por intentos fallidos de PIN). **El listado nunca trae el PIN.**
- `POST /admin/mesas` (`{ nombreOperador? }`) → `201 { mesa, pin, loginUrl, waMeUrl }`. La 7.ª → `409 MESA_LIMIT_REACHED`. Desactivar una mesa **no libera** su lugar.
- **Pantalla del PIN** (alta y reset): se muestra **una sola vez**, no se puede recuperar. Ofrece «Copiar» (el PIN y/o el acceso completo), el botón de WhatsApp (`waMeUrl`, abre el chat con el mensaje listo y deja elegir a quién enviarlo) y el enlace `loginUrl` (`{FRONT_URL}/mesa/<slug>`). Advierte que al cerrar la pantalla ya no se podrá ver; si se pierde, se resetea.
- `POST /admin/mesas/:id/pin/reset` → `200 { mesa, pin, loginUrl, waMeUrl }`. El PIN anterior deja de servir, se cierran las sesiones abiertas de esa mesa (no podrá renovarlas) y **se levanta el bloqueo por intentos**. El acceso que la mesa ya tenía abierto puede durar hasta 15 minutos más.
- `POST …/desbloquear`: levanta el bloqueo sin cambiar el PIN. `POST …/desactivar`: la mesa pierde el acceso **al instante** (incluso con la sesión abierta). `POST …/activar`: la devuelve. Ambos son idempotentes.
- `PATCH /admin/mesas/:id` con `{ nombreOperador }` (`null` lo borra).
- **Alcance:** `PUT /admin/mesas/:id/ediciones` con `{ edicionIds: [uuid] }` **reemplaza** el alcance (`[]` la deja sin ligas). Solo ligas del propio cliente (otra → `404`); las que se agregan no pueden estar archivadas ni finalizadas (`409`); las que ya tenía se pueden conservar. Surte efecto **al instante**, aunque la mesa esté operando. Pantalla sugerida: checklist de ligas por mesa.

## 5. Login de la mesa (`/mesa/<slug-del-cliente>`)

`POST /auth/mesa/:orgSlug/login` con `{ username, pin }` (`username` no distingue mayúsculas, p. ej. `mesa1`).

- `200`: cookies `at_mesa` (15 min) y `rt_mesa` (**12 h**) y cuerpo `{ id, username, nombreOperador, organizacion {id, nombre, slug}, ediciones [...] }` (solo ligas no finalizadas dentro de su alcance).
- **Un solo mensaje de error para todo:** PIN errado, mesa inexistente, cliente inexistente y mesa desactivada devuelven el mismo `401 INVALID_CREDENTIALS`. No intentes distinguirlos. Texto sugerido: «Usuario o PIN incorrectos».
- `429 MESA_BLOQUEADA`: la mesa se bloquea tras 10 intentos fallidos (15 min); `429 IP_LOCKED`: la red se bloquea tras 5 fallos. Mensaje: «Demasiados intentos. Espera unos minutos o pide al dueño que desbloquee la mesa». Otro `429 TOO_MANY_REQUESTS` aparece por pedir demasiado rápido.
- `403 ORG_BLOQUEADA`: el cliente está bloqueado (solo se ve con el PIN correcto).
- `GET /mesa/me`: la mesa de la sesión y sus ligas. Si responde `401` con sesión previa, la mesa fue **desactivada** o la sesión venció: intenta un refresh y, si falla, vuelve al login.
- `GET /mesa/ediciones/:edicionId`: la liga con sus reglas (`reglasModalidad`, duraciones, límite de faltas). Respuestas: `404` (no existe o es de otro cliente), `403` (la liga no está en su alcance), `409 EDICION_SOLO_LECTURA` (la liga ya finalizó), `401` (mesa desactivada). Una liga en **pausa** no corta la sesión de la mesa.
- Si cambian el alcance, finalizan o archivan la liga mientras la mesa trabaja, el siguiente request ya lo refleja (403/409/404). Trata esos códigos como «ya no tienes acceso a esta liga» y vuelve a `GET /mesa/me`.

## 6. Códigos de error nuevos

Todos son RFC 7807 (`application/problem+json`) con `code`, `title`, `detail`. Los extras viajan como campos adicionales del mismo objeto.

| `code`                                | Status | Cuándo                                                    | Extra                                      |
| ------------------------------------- | ------ | --------------------------------------------------------- | ------------------------------------------ |
| `CATEGORIA_DUPLICADA`                 | 409    | Nombre equivalente ya existe                              |                                            |
| `CATEGORIA_ARCHIVADA`                 | 409    | Crear/mover una liga a una categoría archivada            |                                            |
| `EDICION_CAMPO_CONGELADO`             | 409    | Campo no editable en el estado actual                     | `camposBloqueados [{campo, codigo}]`       |
| `MODALIDAD_BLOQUEADA`                 | 409    | Cambiar modalidad o sus reglas con la liga en curso       | `camposBloqueados`                         |
| `EDICION_SOLO_LECTURA`                | 409    | Liga finalizada                                           | `camposBloqueados` (al editar)             |
| `EDICION_ARCHIVADA`                   | 409    | Operar una liga archivada                                 |                                            |
| `EDICION_ESTADO_INVALIDO`             | 409    | Transición inexistente; archivar fuera de `CONFIGURACION` |                                            |
| `EDICION_PRECONDICIONES_NO_CUMPLIDAS` | 409    | Faltan condiciones para el cambio de estado               | `incumplimientos`                          |
| `EDICION_CATEGORIA_ABIERTA`           | 409    | Otra liga abierta de la misma categoría y modalidad       | `incumplimientos` (en cambios de estado)   |
| `CONFIRMACION_REQUERIDA`              | 400    | Finalizar sin `confirmar: true`                           |                                            |
| `MODALIDAD_REGLAS_INVALIDAS`          | 400    | Las reglas rompen una invariante                          | `erroresReglas [{codigo, campo, mensaje}]` |
| `MESA_LIMIT_REACHED`                  | 409    | Ya existen las 6 mesas                                    |                                            |
| `MESA_BLOQUEADA`                      | 429    | Login de una mesa bloqueada por intentos                  |                                            |

`VALIDATION_ERROR` (400) trae `errors` (lista de textos) cuando falla un DTO o las reglas de sanción/financieras. Cualquier byte nulo en un texto → `400`.

`erroresReglas[].codigo` posibles: `FORMA_INVALIDA`, `MIN_JUGADORES_NO_MENOR_QUE_EN_CANCHA`, `CONVOCADOS_MENOR_QUE_EN_CANCHA`, `ROSTER_MIN_MENOR_QUE_MIN_JUGADORES`, `ROSTER_MAX_MENOR_QUE_CONVOCADOS`, `ROSTER_MIN_MAYOR_QUE_MAX`, `FALTAS_APAGADAS_CON_LIMITE`, `FALTAS_APAGADAS_CON_AMARILLA`, `FALTAS_ACTIVAS_SIN_LIMITE`, `CANCELA_POR_GOL_SIN_INFERIORIDAD`. Resalta el `campo` indicado.

## 7. Cosas que conviene saber

- **«Registrado por»:** categorías, ligas y mesas traen `creadoPor { id, nombre }`. Muéstralo en listados y detalle.
- **Permisos:** el dueño y el admin hacen exactamente lo mismo en estas pantallas, con una sola excepción: **`forzar` es solo del dueño**.
- **Aislamiento:** un id de otro cliente responde `404` igual que uno inexistente. No hay forma de saber si existe.
- **Plataforma bloqueando un cliente** corta también a las mesas al instante (`403 ORG_BLOQUEADA`); al reactivarlo vuelven con las mismas sesiones.
- **Pendiente de otras fases:** equipos, delegados, jugadores y calendario (Fases 3 a 5). Hasta entonces, las ligas no pueden arrancar sin «Forzar» y los botones de gestión de equipos no existen.
