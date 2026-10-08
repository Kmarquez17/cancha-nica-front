# FASE 2 — Admin: ligas, categorías y mesas (prototipo con MSW)

> **Fuente de la verdad:** `PLAN_FRONTEND.md` (§4.9, §6, §10) y `FASE_02.md` del backend (`../cancha-nica-api/docs/fases/FASE_02.md`).
> **Estado:** 🟡 **Prototipo contra MSW (2026-10-07).** El backend de la Fase 2 está en construcción (solo tiene las reglas internas: presets y máquina de estados) y todavía no existen el snapshot ni `FRONT_FASE_02.md`. Todo lo que dependa del contrato real es **provisional** y está marcado.

## 1. Qué se construyó

| Pantalla | Ruta | Qué hace |
|---|---|---|
| Inicio del admin | `/admin` | Guía «Para empezar» (categoría → liga → mesa, en ese orden porque cada paso necesita el anterior) y resumen de lo que existe |
| Categorías | `/admin/categorias` | Catálogo del cliente: crear, editar, archivar y restaurar. Nombre único sin importar mayúsculas, tildes ni guiones |
| Ligas | `/admin/ligas` | Listado con estado (píldora con icono y texto), modalidad y categoría; ver archivadas |
| Nueva liga | `/admin/ligas/nueva` | Categoría + modalidad. Al elegir modalidad se **carga el preset** y se pueden ajustar las reglas |
| Detalle de liga | `/admin/ligas/[id]` | Cambio de estado con **reporte de requisitos**, «forzar» solo para el dueño, **finalizar con confirmación irreversible**; edición con campos bloqueados según el estado; archivar y restaurar (solo en configuración) |
| Mesas | `/admin/mesas` | Hasta 6. Alta con **PIN visible una sola vez** (copiar PIN, copiar mensaje, WhatsApp), resetear PIN, desbloquear, activar/desactivar, **ligas que puede operar**, «bloqueada hasta…» |
| Login de mesa | `/mesa/<slug-del-cliente>` | Usuario `MESAn` + PIN de 6 dígitos, controles grandes. Misma respuesta ante usuario inexistente, PIN errónea o mesa inactiva |
| Inicio de la mesa | `/mesa` | `GET /mesa/me`: las ligas asignadas. Los partidos llegan con el calendario (Fase 5) y la consola (Fase 7) |

## 2. Cómo se probó sin backend

- **MSW simula solo los endpoints nuevos** (`src/mocks/fase2/`). Una base en memoria reproduce las reglas de `FASE_02.md`: categoría única normalizada, una sola liga abierta por categoría y modalidad, edición por estado, máximo 6 mesas, PIN de 6 dígitos, estado de la liga, login de mesa. Persiste en `sessionStorage` para sobrevivir a una recarga.
- **Los guards de servidor no se pueden simular** (MSW solo intercepta en el navegador). Para ver el admin hace falta **el backend de la Fase 1 levantado** con `NEXT_PUBLIC_USE_MSW=true`: la sesión pasa a la API real y MSW responde lo nuevo.
- **La sesión de la mesa es simulada** (no hay cookie real): con MSW el proxy deja pasar `/mesa`. Es solo para desarrollo y desaparece con el backend real.

```
# terminal 1: backend de la Fase 1        # terminal 2:
NEXT_PUBLIC_USE_MSW=true pnpm dev
```

Usuario de prueba de la mesa (solo MSW): `MESA1` / `123456` en `/mesa/sopa`. `MESA2` aparece bloqueada para probar «Desbloquear».

## 3. Lo provisional (cambia cuando llegue el contrato)

- **Tipos e hooks escritos a mano** (`features/ediciones/tipos.ts`, `features/*/api.ts`) con las rutas de `FASE_02.md`. Se reemplazan por los generados con Orval (`pnpm api:generate`); las claves de query ya empiezan por la ruta, como las de Orval.
- **Nombres de campos y códigos** supuestos: `CATEGORIA_DUPLICADA`, `EDICION_PRECONDICIONES`, `EDICION_TRANSICION_INVALIDA`, `FORBIDDEN` (admin que fuerza), `MESA_BLOQUEADA`, cuerpo de `PUT /admin/mesas/:id/ediciones` (`{ edicionIds }`), `POST …/activar|desactivar` (el prototipo usa `PATCH { activa }`). Los demás vienen escritos así en `FASE_02.md`.
- **Reporte de incumplimientos:** el plan dice que se «devuelve», sin forma. Se asumió 409 con `errors: string[]`.
- **Presets de FÚTBOL 9 y 11:** son provisionales también en el backend.
- **Mesas:** `waMeUrl` puede venir `null` (no hay teléfono de la mesa); entonces el botón abre `wa.me/?text=…` para elegir contacto.
- **Todo el mock se borra** (`src/mocks/fase2/`, el bypass del proxy y los hooks a mano) al integrar el contrato real.

## 4. Decisiones de implementación

- **Reglas como datos** (§4.9): ninguna pantalla pregunta por el nombre de la modalidad; el formulario trabaja con los parámetros (`registraFaltas`, `relojModo`, `roja.inferioridadMs`…). Las invariantes de 4.14 se validan también en el cliente para marcar el campo correcto; el servidor manda.
- **Minutos en pantalla, milisegundos en el API** para la inferioridad de la roja.
- **El PIN nunca se guarda:** vive solo en el estado del diálogo que lo muestra; las mutaciones usan `gcTime: 0`. Al cerrar desaparece y no hay forma de recuperarlo (hay que resetear).
- **Estados y accesos con forma + icono + texto**, nunca solo color (tokens de marca, contraste verificado).
- **Mesa en AAA:** la pantalla de login y el inicio de la mesa usan el perfil `.mesa` de la marca (7:1).

## 5. Pruebas

- **Vitest:** presets e invariantes (cada una por separado y en su campo), transiciones, campos editables por estado, normalización de nombres; la base simulada (categorías, ligas, estados, forzar y 403, finalizar con confirmación, pausa, una sola liga abierta, 7.ª mesa, PIN, login indistinguible, alcance al instante); proxy de la mesa; diálogo del PIN y estados de acceso.
- **Recorrido en navegador** con MSW (API falsa solo para la sesión): crear categoría y el error de duplicado, nueva liga con preset y error de invariante, requisitos de arranque, forzar, reglas congeladas en juego, alta de mesa con PIN y copiar, 6 mesas, login de mesa con PIN errónea y correcto. Hecho a mano; **no es un test automatizado del repo**.

## 6. Qué NO se hizo (a propósito)

- **Reglas de sanción y financieras:** el plan las precarga en la edición y su efecto llega en las Fases 6 y 7. Falta su pantalla; sus valores por defecto (4.12 y H15) no están en el plan del front.
- **Renombrar el operador de una mesa:** existe el endpoint (`PATCH`), falta el control.
- **Color de la liga en la mesa y la página pública:** el componente `TemaCliente` ya existe; se conecta cuando esas pantallas lean el cliente.
- **Lectura de plataforma** (`/plataforma/organizaciones/:id/categorias|ediciones|mesas`) y los conteos de la ficha: dependen del contrato.
- **Guard de servidor de la mesa** (`GET /mesa/me` en el layout, como en los demás portales): hoy `/mesa` es un componente de cliente porque no hay API real.
- **E2E automatizado contra la API real:** llega con el backend de la Fase 2.
