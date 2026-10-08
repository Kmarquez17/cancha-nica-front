# FASE 2 — Admin: ligas, categorías y mesas

> **Fuente de la verdad:** `PLAN_FRONTEND.md` (§4.9, §6, §10), `docs/contrato/FRONT_FASE_02.md` y `docs/contrato/openapi.snapshot.json` (copiados del backend, fase cerrada).
> **Estado:** ✅ **Integrada con el contrato real (2026-10-08)**, antes prototipo con MSW. Probada de punta a punta contra el backend local.

## 1. Qué hay

| Pantalla | Ruta | Qué hace |
|---|---|---|
| Inicio del admin | `/admin` | Guía «Para empezar» (categoría → liga → mesa) y resumen |
| Categorías | `/admin/categorias` | Crear, editar, archivar y restaurar. Edades de 5 a 80, cuántas ligas usa cada una. Nombre único sin importar mayúsculas, tildes ni signos |
| Ligas | `/admin/ligas` | Listado con estado (píldora con icono y texto), modalidad y categoría; ver archivadas |
| Nueva liga | `/admin/ligas/nueva` | **Solo lo básico** (nombre, categoría, modalidad, fechas): el servidor carga el preset, las edades de la categoría y los valores por defecto. Muestra un resumen del preset |
| Detalle de liga | `/admin/ligas/[id]` | **Estado:** botones según `transicionesPosibles`, checklist de `incumplimientos` (forzables y no), «Forzar» solo para el dueño, finalizar con confirmación irreversible. **Configuración:** datos, edades, reglas de la modalidad, arranque y eliminatorias, sanciones y multas, dinero. Archivar y restaurar |
| Mesas | `/admin/mesas` | Hasta 6. Alta con **PIN visible una sola vez** (copiar, mensaje completo, WhatsApp del API), resetear PIN, desbloquear, activar y desactivar, **ligas que opera**, nombre del operador |
| Login de mesa | `/mesa/<slug-del-cliente>` | Usuario `MESAn` + PIN de 6 dígitos, controles grandes. **Sesión real con cookies** |
| Inicio de la mesa | `/mesa` | `GET /mesa/me`: sus ligas. **Protegida en el servidor** (`(mesa)/(panel)/layout.tsx`) con refresh en `/mesa/refresh` |
| Ficha del cliente (plataforma) | `/plataforma/clientes/[id]` | Sección «Lo que armó el cliente»: categorías, ligas y mesas **en solo lectura**, cargadas al abrir cada pestaña. Los conteos de la ficha ya traen valores |

## 2. Cómo se integró con el contrato real

- **Cliente generado:** `pnpm api:generate` con el snapshot nuevo. Los hooks son los de Orval; `features/ediciones/api.ts` y `features/mesas/api.ts` solo son fachadas finas que agregan el refresco de datos tras una escritura (el generador no lo hace).
- **La API manda, el front no duplica reglas.** Los campos editables salen de `camposEditables` y los botones de estado de `transicionesPosibles`. Se borraron la matriz de estados y la tabla de campos por estado que había escrito a mano.
- **El `PATCH` es «todo o nada».** Si toca un solo campo bloqueado no aplica ninguno, así que el formulario envía **solo lo que cambió** (`cambiosDeEdicion`, con pruebas) y no reenvía campos que siguen igual aunque estén bloqueados.
- **Errores con campos extra.** `ApiError` ahora conserva el cuerpo completo (`cuerpo`) para leer `incumplimientos`, `erroresReglas` y `camposBloqueados`. Las reglas rotas se marcan en su campo; el checklist de arranque distingue lo que se puede saltar.
- **Fechas.** El contrato usa `date-time`; la pantalla pide solo el día y lo guarda a medianoche UTC, mostrándolo en UTC para que no se corra un día según la zona.
- **Reglas de la modalidad, sanciones y finanzas** son objetos libres en el snapshot (`{ [key: string]: unknown }`); `features/ediciones/tipos.ts` les da forma según `FRONT_FASE_02.md`.
- **Cambiar la modalidad** recarga el preset del servidor; el formulario ya lo muestra y avisa de que se reemplazan los ajustes de reglas.
- **Mesa con sesión real:** `POST /auth/mesa/:orgSlug/login`, `GET /mesa/me`, cierre con `POST /auth/logout?portal=mesa`. El prototipo usaba rutas inventadas para el cierre.

## 3. Lo que cambió respecto del prototipo (supuestos que el contrato corrigió)

| Supuesto del prototipo | Contrato real |
|---|---|
| Crear la liga enviaba reglas y costos | Solo `nombre`, `categoriaId`, `modalidad` y fechas; lo demás se ajusta con `PATCH` |
| Activar y desactivar mesa con `PATCH { activa }` | `POST …/activar` y `POST …/desactivar` |
| Respuesta del alta de mesa = mesa + PIN planos | `{ mesa, pin, loginUrl, waMeUrl }` |
| Estado de la mesa por `activa` y `bloqueadaHasta` | `activo` y `acceso { estado, bloqueadaHasta }` |
| Categoría archivada = `archivada` | `activa: false` (+ `ediciones`: cuántas ligas la usan) |
| `EN_CURSO → FINALIZADA` no existía | Existe si la liga no tiene eliminatorias (`EDICION_CON_PLAYOFFS`, no forzable) |
| Un solo código de requisitos | `EDICION_PRECONDICIONES_NO_CUMPLIDAS` con lista `{ codigo, mensaje, forzable }` |
| Códigos `EDICION_TRANSICION_INVALIDA`, `EDICION_PRECONDICIONES` | `EDICION_ESTADO_INVALIDO`, `EDICION_PRECONDICIONES_NO_CUMPLIDAS`, más `EDICION_CAMPO_CONGELADO` y `EDICION_ARCHIVADA` |
| Edades de 0 a 99 | De 5 a 80 |
| Cierre de sesión de mesa en `/auth/mesa/logout` | `/auth/logout?portal=mesa` |

## 4. Pruebas

- **Vitest:** presets e invariantes; el formulario contra el contrato (`edicionAForm`, `cambiosDeEdicion`: solo lo que cambió, null para borrar, sanciones completas); lectura de los errores extra; fechas; la simulación fiel al contrato (todo o nada, forzables y no forzables, eliminatorias, alcance de mesas, login indistinguible); diálogo del PIN; ficha de plataforma en solo lectura.
- **E2E sin backend (`pnpm test:e2e:mock`, también en el CI):** la interfaz contra una simulación **tipada con los DTO generados**, así que si la forma de los datos se aparta del contrato, falla el compilador. 34 pruebas de esta fase.
- **E2E contra la API real (`pnpm test:e2e:api`, 13 pruebas de la fase):** crea un cliente nuevo y recorre categorías, ligas (preset, `camposEditables` reales, arrancar sin requisitos y forzar, categoría y modalidad ya abiertas, reglas congeladas, costos editables), mesas (PIN una sola vez, alcance, desactivar y activar, resetear), **login de mesa con cookies reales** y la lectura de plataforma. Necesita el backend en `localhost:3000` y las credenciales del seed en variables de entorno (nunca en archivos).
  - **Límite de intentos:** el backend bloquea la red tras 5 logins fallidos (`IP_LOCKED`, ~15 min). Las suites reales hacen pocos a propósito; correrlas varias veces seguidas puede toparse con el bloqueo.

## 5. Lo que queda de simulación

`src/mocks/fase2/` **se conserva** como simulación fiel al contrato para el E2E sin backend y para explorar la interfaz sin servidor. Con el backend real y `NEXT_PUBLIC_USE_MSW=false` no interviene. El proxy y la guarda de la mesa tienen un desvío de **sesión simulada solo con MSW**.

## 6. Qué NO se hizo (a propósito)

- **Efecto de las sanciones y multas:** hoy solo se guardan; se aplican en las Fases 6 y 7.
- **Equipos, delegados y calendario:** Fases 3 a 5. Por eso arrancar una liga siempre devuelve incumplimientos y solo el dueño puede avanzar con «Forzar» (es lo esperado, lo dice el contrato).
- **Probar a un `ADMIN` que intenta forzar (403):** lo cubre el backend; el front solo oculta el botón al que no es dueño.
- **`GET /mesa/ediciones/:id`** (la liga con sus reglas, para la consola): llega con la Fase 7.
