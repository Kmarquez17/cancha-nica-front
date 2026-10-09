# FASE 3 — Clubes, delegados y equipos

> **Fuente de la verdad:** `docs/contrato/FRONT_FASE_03.md` + `docs/contrato/openapi.snapshot.json` (publicados por el backend, `cancha-nica-api` commit `6931ede`, Fase 3 cerrada) y `../cancha-nica-api/docs/fases/FASE_03.md` (decisiones R12–R18).
> **Estado (2026-10-08):** 🟡 **Integrada con el contrato real y probada contra la simulación (MSW). NO probada contra el backend real ni a mano en el navegador.** Ver §4 (pendiente).

## 1. Qué está hecho

Hooks: los generados con Orval (22 `operationId` nuevos); `features/{clubes,delegados,equipos}/api*.ts` son fachadas finas que invalidan `/admin/clubes`, `/admin/delegados`, `/admin/ediciones` y `/plataforma`. Las mutaciones que pueden devolver un PIN usan `gcTime: 0`.

| Pantalla | Ruta | Qué hace |
|---|---|---|
| Clubes | `/admin/clubes` | Lista con buscador y «ver archivados», ligas y «registrado por». Archivar / restaurar. **No hay «Crear club»** (nacen en el alta del equipo) |
| Delegados | `/admin/delegados` | Acceso `ACTIVO/DESACTIVADO/BLOQUEADO` («bloqueado hasta las HH:MM»), «PIN aún no usado» (`ultimoAccesoEn === null`), «PIN temporal/propio», equipos con su liga. Editar, resetear PIN, desbloquear, activar, desactivar (`DELEGADO_CON_EQUIPOS_ACTIVOS` abre diálogo con enlaces a los equipos) |
| Equipos de la liga | `/admin/ligas/[id]/equipos` | Formulario único (nombre del equipo en la liga, club por autocompletar o por nombre —sin avisos de «club existente»—, delegado existente o nuevo, teléfono local o internacional con vista previa tolerante). Pantalla del PIN de un solo uso; `delegadoExistente: true` muestra el nombre sin PIN. Renombrar (solo esa liga), cambiar delegado, retirar (motivo), reincorporar, equipo tardío (solo `OWNER`). Marcas retirado / excluido / tardío. Botones según estado de la liga y rol (`equipos/lib/permisos.ts`) |
| Arranque de la liga | detalle de la liga | Casilla «No arranca» por equipo → `excluirEquipos`; los retirados no aparecen |
| Login del delegado | `/delegado/<slug>` | Teléfono + PIN; un solo mensaje «Teléfono o PIN incorrectos.»; `DELEGADO_BLOQUEADO` / `IP_LOCKED` / `ORG_BLOQUEADA` |
| Portal del delegado | `/delegado` (grupo `(panel)` con `exigirSesion('delegado')`, `/delegado/refresh`) | Tarjetas por equipo, retirado marcado y no abrible, «Sin ligas activas», aviso «Cambia tu PIN» mientras `pinCambiadoEn === null` (no bloquea), cambio de PIN (`PIN_DEBIL`, `PIN_ACTUAL_INCORRECTO` junto al campo), 401/403/404/409 de `/delegado/ediciones/:id` = «ya no tienes acceso» |
| Plataforma (solo lectura) | ficha del cliente | Pestañas «Equipos» y «Delegados»; los conteos de la ficha ya vienen |

Otros: catálogo de los 13 códigos nuevos en `shared/api/errors/es.ts`; `shared/lib/telefono.ts` (`normalizarTelefono(valor, pais)` con la tabla §9.1 del aviso, `aE164` se mantiene) y `shared/lib/pin.ts` (`pinDebil`); `shared/ui/pin-entrega.tsx` con `nota` opcional; `'delegado'` en `PORTALES_CON_REFRESH`.

**Se corrigieron dos fallos al cerrar:** (1) con delegado «existente», el error `DELEGADO_PHONE_DUPLICATED` no se mostraba en ninguna parte (ahora sale junto al selector); (2) la simulación no guardaba los intentos fallidos del login al recargar (`mocks/respuestas.ts` persiste también en rechazos).

## 2. Simulación y pruebas

- `src/mocks/fase3/` (db + handlers) está **tipada con los DTO generados** y simula los 22 `operationId` con las reglas del aviso (§3–§6). Con MSW apagado no interviene. Se conserva para el E2E sin backend y la exploración sin servidor; entrar en `/delegado/sopa`.
- Vitest: 24 archivos, **323 pruebas verdes** (teléfono, PIN débil, permisos/inscripción, mapa de errores, base simulada, delegado-inicio, ficha de plataforma).
- E2E `pnpm test:e2e:mock`: **verde** (los 31 de `tests/e2e-mock/fase3.spec.ts` y el resto de la suite).
- `pnpm typecheck` y `pnpm lint` (0 errores) y prettier: verdes.

## 3. Cómo continuar en otra sesión

1. Backend local: `node dist/main` desde `../cancha-nica-api` (Postgres en Docker, puerto 5433; **no modificar ese repo**). Si el contrato cambió: copiar `docs/contrato/openapi.snapshot.json` y `FRONT_FASE_03.md`, `pnpm api:generate`.
2. El backend bloquea la red tras 5 logins fallidos (`IP_LOCKED`, ~15 min): no repetir pruebas con credenciales malas.
3. Un E2E mock deja a veces un proceso huérfano en el puerto 3999 (`tests/e2e-mock/api-falsa.mjs`): si Playwright dice «already used», parar ese proceso.

## 4. PENDIENTE (literal)

1. **No existe E2E contra el backend real para la Fase 3.** `tests/e2e-api/` solo cubre hasta la Fase 2. Escribir y correr `pnpm test:e2e:api` (variables `E2E_PLATAFORMA_EMAIL/PASSWORD` leídas del `.env` del backend solo para el comando, nunca en archivos) con el flujo: alta de equipo con delegado nuevo (PIN una vez), delegado existente por teléfono, `EQUIPO_DUPLICADO`, renombrar, retirar/reincorporar, equipo tardío, login del delegado por slug, `/delegado/me`, cambio de PIN, pestañas de plataforma.
2. **Nada de esto se ha probado a mano en el navegador** ni contra el backend real; solo contra la simulación. Revisar a ojo móvil y escritorio.
3. **Semántica de `useClubes({ archivados: true })`:** no se sabe si la API devuelve solo archivados o ambos; la pantalla muestra lo que llegue. Confirmar contra el backend real.
4. **Bypass de sesión simulada:** `src/proxy.ts` y el layout `(delegado)/delegado/(panel)` mantienen una sesión simulada con MSW (`NEXT_PUBLIC_USE_MSW=true`) para el E2E sin backend. Revisar que no pueda activarse fuera de desarrollo/CI.
5. ~~Warnings de lint en `mocks/fase2/db.ts`~~ — resueltos (el hook de pre-commit exige 0 warnings).
6. **Revisión de a11y/UX de la fase** (agente `revisor-ux-a11y`) sin hacer: contraste, foco en diálogos del PIN, tamaños táctiles del portal del delegado.
7. **Auditoría del flujo del PIN:** confirmar que el PIN nunca queda en `localStorage`, URL, caché de React Query ni logs (solo en el estado del diálogo; `gcTime: 0`).
8. **Slugs reservados** `login`, `bloqueada` y `refresh` chocan con rutas fijas de `/delegado/…` y `/mesa/…`: pedir al backend que los prohíba como slug de cliente.
9. **Teléfono:** la tabla de países del front (§9.1) puede quedar corta si el API la amplía; la validación local es solo advertencia. Se envía el teléfono tal cual en el login del delegado (el API lo normaliza).
10. **Cerrar la fase en el plan del front:** añadir el ajuste `Bn` en `PLAN_FRONTEND.md` (§11 del aviso) y marcar el criterio de salida.

## 5. Qué NO entra (otras fases)

- Efecto de retiros y equipos tardíos sobre puntos y calendario: Fase 5 (hoy el API solo guarda el estado; no se promete recálculo en pantalla).
- Jugadores y planteles: Fase 4. Finanzas y sanciones de equipo: Fase 6. Partido en vivo: Fase 7.
- Escudo del club (`escudoUrl` siempre `null`): espera a Storage.
- Carga masiva de equipos: no existe en el API.

## 6. Nota sobre el commit en Windows

El hook de pre-commit (lint-staged) falla con «The command line is too long» si se commitean ~80 archivos de golpe. Commitear por lotes (contrato/generado, mocks y shared, features, tests y docs). El hook además exige `--max-warnings=0`.
