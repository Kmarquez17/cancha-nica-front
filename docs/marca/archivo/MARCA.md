# Cancha Nica — Guía de marca (propuesta v1)

> **Estado:** propuesta para decidir (2026-10-07). **No se aplicó nada a la app.** Para verla: abre `docs/marca/tablero-de-marca.html` en el navegador (es un solo archivo, con logos, fuentes y PNG incrustados).
> **Base:** tres investigaciones en `docs/marca/investigacion/` (benchmark visual, cultura y nombre, color y tipografía) más el diseño del logo hecho y verificado visualmente en esta sesión.

## 1. Idea de marca: «Organizado y justo»

La liga de barrio, en serio. Resultados claros y reglas claras: nadie discute la tabla. Es el concepto que la investigación cultural recomendó (de tres) y encaja con el producto: lo más legible es el marcador y la tabla.

- **Organizado:** control sin ponerse seria de más.
- **Justo:** una sola fuente de verdad, reglas visibles.
- **De barrio:** voz cercana, con toque nica sin caricatura; fotografía de canchas reales, no de estadios europeos.

**Eslóganes propuestos:** «Tu liga, en tu bolsillo.» · «Aquí se juega limpio y se cuenta bien.» · «Del barrio a la tabla.»

**Hueco de diferenciación (benchmark):** casi todo el software deportivo usa verde césped con blanco o un balón genérico. Los marcadores (FotMob, Sofascore) son gigantes pero no hablan de «liga de barrio»; el competidor conceptual más cercano es *Torneo by Sofascore* (ligas amateur). La marca de Cancha Nica puede ocupar: cercanía local + flujo de mesa + neutralidad para que luzca el color de cada cliente.

## 2. Nombre

| | |
|---|---|
| **Veredicto** | Conservar «Cancha Nica» para el lanzamiento en Nicaragua. |
| **Por qué** | Cercano, popular, orgulloso; «cancha» = campo de juego, «nica» = nicaragüense. |
| **Riesgo** | «Cancha» es genérico y existen apps de reserva de canchas con nombre parecido (p. ej. «Cancha – Reserva tu jugada» en iOS, «CANCHA» de Grupo Reforma en México). No hay colisión directa encontrada. |
| **Expansión** | Definir desde ya la regla «Cancha + país» si se sale de Nicaragua. |
| **Sin verificar** | Dominios (.com, .app, .com.ni), cuentas en redes y registro de marca. La búsqueda web fue de buscador estadounidense y **no concluye para Nicaragua**. Esto no es asesoría legal: consulta un abogado antes de invertir en la marca. |

## 3. Logo: el banderín de córner

**Concepto:** poste = línea de banda · arco = esquina de la cancha · triángulo dorado = banderín (y doble lectura de volcán). Es una forma simple que funciona a 16 px, no usa balón genérico ni el escudo patrio, y deja el protagonismo al color del cliente.

**Cómo se llegó:** se exploraron 4 conceptos (tabla de posiciones, cancha en planta, banderín de córner, monograma CN) y se compararon a 16/32/64/160 px sobre fondo claro, oscuro y gris. Tabla se confundía con un ícono genérico de lista, el monograma resultó tosco y la cancha en planta es un recurso muy visto; ganó el banderín.

**Logotipo:** «Cancha» en tinta + «Nica» en cobalto, en **Archivo ExtraBold** convertido a trazados (no depende de que la fuente esté instalada).

| Archivo (`docs/marca/logo/`) | Uso |
|---|---|
| `icono.svg` | App, favicon, avatar (baldosa cobalto) |
| `icono-sin-fondo.svg` · `icono-sin-fondo-oscuro.svg` | Sobre fondo claro / oscuro, sin baldosa |
| `icono-mono.svg` | Una tinta (sellos, impresión, bordado); hereda `currentColor` |
| `icono-maskable.svg` | PWA maskable (a sangre, dibujo dentro de la zona segura) |
| `logo-horizontal.svg` · `logo-horizontal-oscuro.svg` · `logo-horizontal-mono.svg` | Cabeceras, documentos |
| `logo-vertical.svg` | Portadas, splash |
| `png/icon-192.png` `icon-512.png` `icon-maskable-512.png` `apple-touch-icon.png` `favicon-32.png` `favicon-16.png` | Íconos listos |
| `png/og-1200x630.png` | Tarjeta para compartir por WhatsApp/Facebook (ejemplo con eslogan) |
| `conceptos/` | Los 4 conceptos explorados (referencia) |

**Reglas**
- Mínimos: ícono 16 px; logotipo horizontal ≈ 220 px de ancho.
- Espacio libre: al menos la altura del banderín (≈ 30 % del lado) alrededor del ícono.
- Sobre fotografía o color de cliente: ícono con baldosa cobalto o versión monocromo.
- El dorado es solo gráfico: no lleva texto encima (bajo contraste sobre blanco).
- **No** mostrar el logo dentro de pantallas de eventos del partido: el dorado `#F5B700` se parece a la tarjeta amarilla `#FACC15`.
- **No** usar la bandera, el escudo ni el arco iris nacionales (la ley de símbolos patrios de 1971, reformada en 2002, restringe su uso comercial; el texto consultado fue parcial, por eso se recomienda validación legal).

## 4. Color: Paleta A «Cobalto Nica»

Azul inspirado en la bandera (sin copiarla) + dorado, con neutros de tinte azul frío. Elegida entre tres candidatas (A Cobalto, B Volcán naranja/turquesa, C Selva verde-teal) por la investigación de color; las razones medibles:

1. **No compite con el color del cliente** (B tiñe todo de cálido; C choca con los clientes verdes, que serán los más frecuentes).
2. **Deja libres los significados del fútbol:** verde = gol, amarillo y rojo = tarjetas, magenta = en vivo.
3. **Mejor comportamiento con daltonismo** (eje azul-naranja).
4. **Contraste medido por script (WCAG 2.x):** foreground/background 17.92:1 · primary/background 6.41:1 · primary-foreground/primary 6.70:1 (AA); en la consola de Mesa, `primary-strong #1E40AF` con blanco 8.72:1 (AAA). Todas las parejas de texto pasan AA en claro y oscuro; el perfil `.mesa` lleva todas a ≥ 7:1.
5. **Migración sencilla:** mismos nombres de token que `globals.css`.

| Rol | Claro | Oscuro |
|---|---|---|
| Cobalto (`--primary`) | `#1D4ED8` | `#7AA7FF` |
| Cobalto fuerte (`--primary-strong`, Mesa) | `#1E40AF` | `#93B6FF` |
| Dorado (`--accent`) | `#F5B700` | `#FBBF24` |
| Texto (`--foreground`) | `#0A1220` | `#EEF2F8` |
| Fondo (`--background`) | `#F8FAFC` | `#080D18` |

Estados del fútbol (siempre **color + forma + texto**): amarilla `#FACC15` con contorno de 2 px (sobre blanco solo llega a 1.45:1, por eso el contorno), roja `#C62828`, en vivo `#D6204F`, gol `#15803D`, finalizado `#475569`, pendiente `#64748B`, W.O. `#6D28D9`. Detalle completo, tablas de contraste y daltonismo en `investigacion/03-color-tipografia.md`.

**Color de cada cliente:** la marca ocupa los neutros y el logo; el color del cliente tiñe botones y acentos. Un algoritmo elige texto blanco o `#05080C` según el contraste, corrige la luminosidad en el 0,4 % de casos límite y deriva hover, pressed y variante oscura (probado con 18 colores y 20 000 aleatorios, peor caso 4.50:1; código en `03-color-tipografia.md` §7).

**Tokens listos:** `docs/marca/tokens-propuestos.css` (paleta A completa con perfil `.mesa`).

**Honestidad sobre el azul:** el azul es el color más común en SaaS (Sofascore usa `#374DF5`, TeamSnap `#006FF5`). La diferenciación no viene del azul sino de: el banderín dorado, Archivo ExtraBold, el marcador grande en Atkinson Mono y el hecho de ceder el protagonismo al color del cliente.

## 5. Tipografía

- **Archivo** (variable 400–800): titulares (800) y texto. Un solo archivo de 34 KB.
- **Atkinson Hyperlegible Mono 700:** marcador y reloj de la Mesa (17 KB), diseñada para distinguir caracteres parecidos.
- Total ≈ 51 KB (similar a los 51 KB de Geist + Geist Mono actuales). Ambas en Google Fonts (`next/font/google`); Archivo y Atkinson se distribuyen con licencia libre (verifica la licencia en la ficha de cada fuente antes de redistribuir los archivos).
- **Verificado en esta sesión:** a tamaño de marcador los dígitos confundibles (0/6, 1/7, 3/8, 5/6) se distinguen claramente (el 0 lleva barra, el 1 base). **Falta** validarlo en una tablet real a pleno sol.
- Alternativa si no convence: Barlow Condensed + Barlow (más deportiva y condensada, 66 KB).

## 6. Voz

Cercana, clara, breve, con toque nica sin jerga forzada; nunca regaña, celebra sin exagerar. Decidir el trato (tú/vos): la UI escrita suele ser neutra.

| Momento | Texto |
|---|---|
| Tabla al día | Tabla al día. Hace 2 min. |
| Gol | ¡Gol de Los Cuervos! 2-1, minuto 34. |
| Sin conexión | Sin señal por ahora. Tus eventos están guardados y se envían solos. |
| Error | No pudimos guardar el resultado. Intenta de nuevo; nada se perdió. |
| Fin | Pitazo final. Resultado confirmado. |

## 7. Contexto de uso (cómo condiciona el diseño)

Datos verificados con fuente: 4,89 M de usuarios de internet (69,6 %) y 8,89 M de conexiones móviles (126 % de la población) a fines de 2025 (DataReportal); Android 16/13/14/15 como versiones más usadas (StatCounter, junio 2026). **No verificado:** % Android vs iOS, uso actual de WhatsApp, crecimiento del futsal. Implicaciones (opinión): PWA ligera, SVG y WebP/AVIF, fuentes ≤ 60 KB, contraste alto, objetivos táctiles ≥ 48 px, tarjeta Open Graph para reenviar por WhatsApp.

## 8. Qué se evitó (clichés del benchmark)

Balón genérico, verde césped con blanco, escudos heráldicos detallados, rojo «en vivo» como color de marca, swooshes y cursivas de velocidad, postales turísticas de Nicaragua y fotos de estadios europeos.

## 9. Qué necesito que decidas

1. ¿**Banderín de córner** como logo, o prefieres otro concepto? (la cancha en planta es la alternativa más sólida; está en `logo/conceptos/b-cancha.svg`)
2. ¿**Paleta A Cobalto** con dorado, o una de las otras dos (en `investigacion/03-color-tipografia.md`)?
3. ¿Mantienes **«Cancha Nica»** tras verificar dominio, redes y registro?
4. ¿Tipografía **Archivo + Atkinson Mono**, o la alternativa condensada?

## 10. Cómo aplicarlo a la app (cuando decidas; ~1 hora)

1. `src/app/globals.css`: reemplazar `--primary`/`--ring` (hoy `#16a34a` provisional) por los tokens de `tokens-propuestos.css`; agregar `success/warning/info`, estados del fútbol y el perfil `.mesa`.
2. `src/app/layout.tsx`: cambiar Geist por Archivo y cargar Atkinson Mono solo en la ruta de Mesa/partido.
3. `public/`: reemplazar `icon-192.png` e `icon-512.png` por los de `docs/marca/logo/png/`, añadir `icon-maskable-512.png` (el manifest hoy reutiliza el 512 como maskable) y `apple-touch-icon.png`; poner `icono.svg` como `src/app/icon.svg`.
4. `src/app/manifest.ts`: `theme_color: '#1D4ED8'`.
5. Metadatos Open Graph por defecto con `og-1200x630.png`.
6. Logo en las pantallas de acceso (`TarjetaAcceso`) y en la cabecera de los portales.
7. Implementar el algoritmo del color de cliente con sus pruebas unitarias.
8. Revisar tests y E2E que dependan de textos o colores.

## 11. Límites de esta propuesta

- El benchmark visual cubre parcialmente el mercado: hex verificados solo de FotMob (`#049C63`), Sofascore (`#374DF5`) y TeamSnap (`#006FF5`/`#F56B15`); el resto quedó sin verificar y así está marcado. La sección de tendencias 2024–2026 se apoya en blogs: orientación, no evidencia fuerte.
- No se verificaron: dominios, redes, registro de marca, colores oficiales de los clubes nicaragüenses (y no se usan), si el guardabarranco es ave nacional oficial.
- El logo se evaluó en pantalla a varios tamaños; falta probarlo impreso y en un celular real bajo luz solar.
- Los PNG se generaron con Chromium (Playwright) a partir de los SVG; los SVG son la fuente de verdad.
- El diseño del logo lo hizo el asistente: es una **propuesta**, no un diseño profesional entregado por un estudio. Si la marca va a tener inversión fuerte, conviene que un diseñador la pula y la registre.

## 12. Inventario

```
docs/marca/
├─ MARCA.md                      ← este documento
├─ tablero-de-marca.html         ← vista previa completa (abrir en el navegador)
├─ tokens-propuestos.css         ← paleta A lista para adoptar
├─ logo/  (SVG, png/, conceptos/)
└─ investigacion/
   ├─ 01-benchmark-visual.md
   ├─ 02-cultura-y-nombre.md
   ├─ 03-color-tipografia.md
   └─ 03-tokens-candidatos.css   ← las 3 paletas completas
```
