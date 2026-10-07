
ESPECIFICACIÓN FUNCIONAL Y TÉCNICA (MVP)
Plataforma de Gestión de Torneos de Fútbol Sala (Futsal 5v5)
1. Arquitectura General y Jerarquía de Accesos
[ SUPERADMIN / DUEÑO DE LIGA ]
  │
  ├── 1. Entidad Edición de Torneo (Ciclo de Vida Multitemporada)
  │     ├── Estados: CONFIGURACION -> EN_REGISTRO -> EN_CURSO -> EN_ELIMINATORIAS -> FINALIZADA (PAUSADA)
  │     └── Parámetros: Tiempos (20m regular / 25m playoff), Límite faltas (6), Costos arbitraje/inscripción
  │
  ├── 2. Control de Mesa Técnica (Máximo 3 Accesos por Liga)
  │     ├── Credenciales: Username (MESA1, MESA2, MESA3) + PIN numérico (ej. 0203)
  │     ├── Switch de bloqueo ON/OFF por operador
  │     └── Vistas: Partidos de Hoy (operables) vs. Partidos Futuros (solo lectura)
  │
  ├── 3. Control de Clubes y Delegados
  │     ├── Club Permanente vs. Roster por Edición
  │     ├── Acceso Delegado: Teléfono WhatsApp + PIN (sin contraseñas tradicionales)
  │     └── Regla Multiequipo: Puede tener N equipos en ligas/categorías distintas, NUNCA en la misma
  │
  └── 4. Libro de Pases Dinámico
        ├── Fase Regular: Abierta para altas (mín 6, máx 18) y bajas
        └── Eliminatorias: Bloqueo automático e irrevocable de nóminas

2. Especificación de Módulos
MÓDULO A: Dueño de la Liga (Administración Central)
Creación de Ediciones: Genera temporadas consecutivas (ej. Liga HLD 2026 #1 y posterior #2). Al finalizar una edición, esta pasa a modo Historial (Solo Lectura) sin perder estadísticas de campeones, goleo o actas.


Gestión de Mesas Técnicas (Límite estricto de 3):



Asignación de hasta 3 cuentas operativas por liga (MESA1, MESA2, MESA3).


Cada mesa cuenta con su propio PIN y estado (ACTIVO / BLOQUEADO).


El dueño puede resetear el PIN o deshabilitar accesos en cualquier momento.


Módulo Financiero Centralizado:



Control de pagos de inscripción por equipo (saldo total vs. abonos registrados).


Control de pagos de arbitrajes reportados por jornada.


Registro de multas por sanciones disciplinarias pendientes de cobro.


Resolución de Conflictos Post-Partido:



Facultad exclusiva de reabrir actas cerradas para rectificar marcadores, sancionar alineaciones indebidas o computar fallos de reuniones directivas con recálculo automático de la tabla.


MÓDULO B: Portal del Delegado (Móvil First - Teléfono + PIN)
Autenticación y Selector Multi-Equipo:



Ingreso mediante número telefónico y PIN de 4 dígitos.


Si gestiona más de un equipo en categorías diferentes, un selector inicial le permite alternar entre planteles.


Gestión de Plantilla en Fase Regular:



Tope de Nómina: Mínimo 6 jugadores para estar habilitado, máximo 18 activos simultáneos.


Cédula / Documento como Llave Maestra: Búsqueda rápida por documento. Si el jugador ya existe en la base global, precarga sus datos.


Restricción de Duplicidad: El sistema bloquea si el jugador ya está activo en otro equipo de la misma categoría. Sí permite jugar en categorías distintas (ej. Sub-18 y Libre).


Traspasos: Máximo 3 equipos por temporada. Al pasar de un equipo A a un equipo B, el sistema aplica automáticamente 1 partido de congelamiento.


Sin botón "Eliminar": Solo existe la acción de Baja (libera uno de los 18 cupos). Para el jugador 19 se requiere dar de baja previa a uno activo.


Interruptor de Eliminatorias:



Cuando el torneo pasa a EN_ELIMINATORIAS, se ocultan y deshabilitan automáticamente todas las funciones de edición, altas y bajas.


Dashboard Informativo:



Consulta en vivo de saldos (inscripción, arbitrajes y multas).


Calendario con resultados, actas cerradas y próximos partidos.


Tabla de posiciones actualizada al instante.


Renovación de Temporada (#1 -> #2):



Herramienta de importación con checklist para conservar un porcentaje de jugadores (ej. el 10%) y descartar al resto sin reescribir fichas.


MÓDULO C: Mesa Técnica en Vivo (Consola Operativa)
Acceso y Agenda:



Login rápido con MESA_X + PIN.


Pestaña "Hoy": Lista de partidos del día habilitados para iniciar/continuar.


Pestaña "Futuros": Calendario de siguientes jornadas en modo lectura.


Pre-Partido:



Selección de hasta 12 convocados por equipo.


Bloqueo visual de jugadores con multas de tarjetas impagas, sanciones deportivas o congelamiento por traspaso.


Validación mínima: Al menos 4 jugadores habilitados por bando.


Checklist de pago de arbitraje (Local y Visitante).


Tablero en Vivo (Reloj y Eventos):



Control de Periodos: Reloj reglamentario (20 min en regular / 25 min en eliminatorias). Bloqueo estricto: Prohibido pasar al 2T hasta que el 1T llegue a 00:00.


Faltas Colectivas: Conteo independiente por tiempo (reseteo a 0 en 2T). Al llegar a la 6.ª falta, lanza alerta: "Tiro para [Rival], [Infractor] llegó al límite de faltas". La alerta incluye botón manual para ocultarse tras el cobro y vuelve a dispararse en faltas sucesivas (7.ª, 8.ª).


Faltas Individuales: Registro por dorsal. A la 3.ª falta personal en el partido, el sistema alerta: "🟨 3 Faltas acumuladas: Mostrar Amarilla a #X" y registra la tarjeta.


Expulsión (Tarjeta Roja): Descuenta 1 jugador e inicia un temporizador de 02:00 minutos de inferioridad numérica. Si el rival marca un gol antes de cumplirse el tiempo, la penalización se cancela automáticamente.


Regla de 4 Jugadores: Botón de contingencia para suspender el partido si un equipo queda con 3 jugadores en cancha.


Feed de Incidencias: Vista rápida en pantalla limitada a los últimos 10 eventos + modal con historial completo y filtros por categoría (Todos, ⚽ Goles, ⚠️ Faltas, 🟨 Tarjetas).


Resolución de Partidos y Contingencias:



Walkover (W.O.): Marcador automático 3 - 0. La mesa acredita los 3 goles al o los jugadores que señale el delegado del equipo ganador.


Tanda de Penales (Playoffs): Ronda de 3 tiros; si persiste el empate se amplía a tiros 4 y 5; si continúa igualado, activa muerte súbita 1 a 1.


Cierre de Acta: Al finalizar, el partido se bloquea para la mesa y actualiza al instante la tabla general y la tabla de goleo individual.
3. Esquema de Base de Datos Relacional Completo (PostgreSQL)
SQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZACIONES Y EDICIONES
CREATE TABLE organizaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono_contacto VARCHAR(20),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE torneos_ediciones (
    id SERIAL PRIMARY KEY,
    organizacion_id INT REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    estado VARCHAR(25) DEFAULT 'CONFIGURACION',
    duracion_tiempo_regular INT DEFAULT 20,
    duracion_tiempo_eliminatoria INT DEFAULT 25,
    limite_faltas_acumuladas INT DEFAULT 6,
    costo_inscripcion NUMERIC(10,2) DEFAULT 0.00,
    costo_arbitraje NUMERIC(10,2) DEFAULT 0.00,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ACCESOS DE MESA TÉCNICA (MÁXIMO 3 POR EDICIÓN/LIGA)
CREATE TABLE liga_mesas (
    id SERIAL PRIMARY KEY,
    edicion_id INT REFERENCES torneos_ediciones(id) ON DELETE CASCADE,
    username VARCHAR(20) NOT NULL,
    pin VARCHAR(6) NOT NULL,
    nombre_operador VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(edicion_id, username)
);

-- 3. CLUBES Y DELEGADOS
CREATE TABLE clubes (
    id SERIAL PRIMARY KEY,
    organizacion_id INT REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    escudo_url TEXT,
    delegado_nombre VARCHAR(100) NOT NULL,
    delegado_telefono VARCHAR(20) NOT NULL,
    delegado_pin VARCHAR(6) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edicion_equipos (
    id SERIAL PRIMARY KEY,
    edicion_id INT REFERENCES torneos_ediciones(id) ON DELETE CASCADE,
    club_id INT REFERENCES clubes(id) ON DELETE CASCADE,
    saldo_inscripcion_pagado NUMERIC(10,2) DEFAULT 0.00,
    deuda_arbitraje NUMERIC(10,2) DEFAULT 0.00,
    deuda_multas NUMERIC(10,2) DEFAULT 0.00,
    habilitado BOOLEAN DEFAULT TRUE,
    UNIQUE(edicion_id, club_id)
);

-- 4. PADRÓN GLOBAL DE JUGADORES Y ROSTERS
CREATE TABLE jugadores (
    id SERIAL PRIMARY KEY,
    documento_identidad VARCHAR(30) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    foto_url TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edicion_rosters (
    id SERIAL PRIMARY KEY,
    edicion_equipo_id INT REFERENCES edicion_equipos(id) ON DELETE CASCADE,
    jugador_id INT REFERENCES jugadores(id) ON DELETE RESTRICT,
    dorsal INT NOT NULL,
    posicion VARCHAR(30) DEFAULT 'Jugador de Campo',
    estado VARCHAR(25) DEFAULT 'ACTIVO',
    fechas_suspension_restantes INT DEFAULT 0,
    multas_pendientes NUMERIC(10,2) DEFAULT 0.00,
    UNIQUE(edicion_equipo_id, jugador_id),
    UNIQUE(edicion_equipo_id, dorsal)
);

CREATE TABLE historial_traspasos (
    id SERIAL PRIMARY KEY,
    edicion_id INT REFERENCES torneos_ediciones(id) ON DELETE CASCADE,
    jugador_id INT REFERENCES jugadores(id),
    equipo_origen_id INT REFERENCES edicion_equipos(id),
    equipo_destino_id INT REFERENCES edicion_equipos(id),
    fecha_traspaso TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. PARTIDOS, EVENTOS Y ESTADÍSTICAS
CREATE TABLE partidos (
    id SERIAL PRIMARY KEY,
    edicion_id INT REFERENCES torneos_ediciones(id) ON DELETE CASCADE,
    jornada INT NOT NULL,
    fase VARCHAR(20) DEFAULT 'REGULAR',
    equipo_local_id INT REFERENCES edicion_equipos(id),
    equipo_visitante_id INT REFERENCES edicion_equipos(id),
    cancha VARCHAR(50),
    fecha_hora TIMESTAMP,
    estado VARCHAR(25) DEFAULT 'PROGRAMADO',
    goles_local INT DEFAULT 0,
    goles_visitante INT DEFAULT 0,
    penales_local INT DEFAULT NULL,
    penales_visitante INT DEFAULT NULL,
    arbitraje_pagado_local BOOLEAN DEFAULT FALSE,
    arbitraje_pagado_visitante BOOLEAN DEFAULT FALSE,
    mesa_id INT REFERENCES liga_mesas(id),
    cerrado_en TIMESTAMP
);

CREATE TABLE partido_convocados (
    id SERIAL PRIMARY KEY,
    partido_id INT REFERENCES partidos(id) ON DELETE CASCADE,
    edicion_equipo_id INT REFERENCES edicion_equipos(id),
    jugador_id INT REFERENCES jugadores(id),
    dorsal INT NOT NULL,
    es_titular BOOLEAN DEFAULT FALSE,
    UNIQUE(partido_id, jugador_id)
);

CREATE TABLE partido_eventos (
    id SERIAL PRIMARY KEY,
    partido_id INT REFERENCES partidos(id) ON DELETE CASCADE,
    periodo INT NOT NULL,
    minuto INT NOT NULL,
    edicion_equipo_id INT REFERENCES edicion_equipos(id),
    jugador_id INT REFERENCES jugadores(id),
    tipo_evento VARCHAR(20) NOT NULL,
    observacion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

4. Matriz de Reglas y Validaciones de Negocio
Situación Operativa
Regla de Validación Aplicada
Creación de Mesas
El backend valida COUNT(liga_mesas) < 3 por edición antes de insertar un nuevo acceso.
Asignación de Delegado
Un número de teléfono no puede asignarse a dos equipos dentro de la misma edicion_id.
Inscripción de Jugador
La cédula no puede estar en estado ACTIVO en dos equipos que pertenezcan a la misma categoría/edición.
Límite de Jugadores
Cada equipo requiere al menos 6 inscritos para participar y un máximo de 18 simultáneos. Para registrar al número 19, debe darse de baja a uno previo.
Cambio de Periodo
La consola de Mesa Técnica bloquea el botón "Pasar a 2T" hasta que el cronómetro del 1T llegue a 00:00.
Faltas Acumuladas
El contador se reinicia a 0 al iniciar el 2T. La 6.ª falta dispara alerta de tiro de castigo para el rival.
3 Faltas Individuales
El sistema acumula faltas por dorsal en el partido. Al llegar a 3, dispara alerta de tarjeta amarilla inmediata.
Expulsión (Roja)
Cronómetro regresivo de 02:00 minutos de inferioridad numérica. Se cancela de inmediato si el equipo rival anota un gol.
Mínimo en Cancha
Si un equipo queda con menos de 4 jugadores en cancha, se habilita la suspensión por inferioridad numérica.
Cierre de Edición
Al pasar el torneo a FINALIZADA, los datos se preservan como solo lectura y se habilita la creación de la siguiente edición con importación de nóminas.


