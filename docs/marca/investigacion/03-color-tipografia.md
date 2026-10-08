# 03 — Color y tipografía para Cancha Nica

Investigación de sistema de diseño (solo documentación; no se tocó la app). Todos los números de contraste, oklch, simulaciones de daltonismo, el algoritmo del color de cliente y los pesos de fuentes **fueron calculados o medidos con scripts Node** durante esta investigación (no a ojo). Archivo hermano: `03-tokens-candidatos.css`.

## 1. Resumen

- Se proponen 3 paletas claramente distintas: **A "Cobalto Nica"** (azul bandera + dorado), **B "Volcán"** (naranja/terracota cálido + turquesa) y **C "Selva Tropical"** (verde-teal profundo + lima). Cada una trae tokens completos claro/oscuro (hex y oklch), estados de fútbol y perfil **Mesa AAA (7:1)**.
- Todos los pares de texto de las 3 paletas pasan **AA (4.5:1)** y los de UI/íconos pasan **3:1**, en claro y oscuro. El perfil `.mesa` (tokens que se sobrescriben solo dentro de la consola de Mesa) lleva **todos** los pares de texto a **AAA ≥ 7:1**: 0 pares fallan en las 3 paletas (0 = todo pasa).
- El color de cada cliente se resuelve con un algoritmo de ~100 líneas TypeScript, sin dependencias: elige blanco o casi-negro (`#05080C`), garantiza ≥ 4.5:1, deriva hover/pressed, versión modo oscuro y una versión "texto sobre claro". Probado con 18 colores de ejemplo y un barrido de 20 000 colores aleatorios: peor caso 4.50:1, 0 fallas.
- Daltonismo: nada depende solo del color (forma + icono + texto en tarjetas, en vivo y resultados). Charts 1–5 elegidos por **búsqueda exhaustiva** maximizando la distancia mínima OKLab bajo visión normal, protanopia, deuteranopia y tritanopia (≥ 0.094 en todos los casos) y con 3:1 contra el fondo.
- Tipografía: recomendado **Archivo (variable) + Atkinson Hyperlegible Mono para el marcador** (~51 KB en total, latin subset woff2).
- **Recomendación: Paleta A "Cobalto Nica"** (razones en la sección 9).

### Fuentes y límites de la investigación
- Skill `ui-ux-pro-max` (reglas: contraste 4.5:1, targets 44×44 mínimo, no depender solo del color, tokens semánticos, base 16px, dark mode con pares accesibles) y `frontend-design` (identidad propia, evitar defaults genéricos).
- WebSearch de tendencias deportivas 2024-2026: **resultados de baja calidad** (blogs genéricos, algunos de spam). Lo único aprovechable y citable: [Piktochart — sports color palettes](https://piktochart.com/blog/sports-color-palette/) (colores primarios audaces + neutros para no saturar; rojo profundo y amarillo asociados a energía/dominio) y la nota de accesibilidad de [FotMob en AppleVis](https://applevis.com/comment/5224) / [App Store](https://apps.apple.com/US/app/id488575683) (la app declara soporte de "Differentiate Without Color Alone" y modo oscuro: es la práctica estándar de apps de marcadores). No se encontró fuente fiable sobre paletas concretas 2024-2026; las decisiones de color se basan en los cálculos de abajo, no en esa tendencia.
- Fuentes: pesos medidos descargando los woff2 del subset `latin` desde Google Fonts (incluye á é í ó ú ü ñ ¿ ¡); presencia de la característica OpenType `tnum` verificada leyendo la tabla GSUB de cada TTF.

## 2. Metodología de medición

- Contraste: WCAG 2.x, luminancia relativa con linealización sRGB, `(L1+0.05)/(L2+0.05)`. Umbrales: texto normal AA 4.5, AAA 7; UI/íconos/bordes de campo 3.
- oklch: conversión sRGB → OKLab → OKLCH (Ottosson); los valores son los de cada hex (no al revés), así que son exactos al redondeo mostrado.
- "Tinta" = texto casi-negro propio de cada tema (A `#0A1220`/`#050B16`, B `#1C0F06`/`#1A0B02`, C `#04140F`/`#03100B`); el `*-foreground` de cada color sólido se elige **automáticamente** como el de mayor contraste entre blanco y tinta.
- Daltonismo: matrices de simulación de Machado et al. (2009), severidad 1.0, aplicadas en RGB lineal; distancia de color = distancia euclídea en OKLab (ΔE; ~0.02 es la mínima diferencia perceptible, ≥ 0.08 se distingue con claridad).
- Se mide en dos perfiles: **base** (AA, para toda la app) y **Mesa** (AAA, clase `.mesa`).

### Ajustes hechos al medir (iteración documentada)
Primera medición de los valores iniciales, antes de ajustar:

| Hallazgo (1ª medición) | Ajuste | Resultado |
|---|---|---|
| `tarjeta-amarilla` sobre fondos claros: 1.45–1.48:1 (amarillo sobre blanco) — FALLA 3:1 | El amarillo no se puede oscurecer sin dejar de ser "amarillo" → regla de diseño: la tarjeta amarilla **siempre lleva contorno 2px en `foreground`** (contraste contorno/amarillo en modo claro 11.8–12.2:1; en modo oscuro basta el amarillo contra el fondo, ≥ 3:1) y texto/ícono en tinta. | PASA |
| Pares base que quedaban en AA pero no AAA (muted-foreground sobre muted 6.6:1, primary con blanco 5.2–6.7:1, destructive/success/warning/info 4.7–6.5, roja 5.0–5.6, en vivo 5.0, pendiente 4.8, etc.) | No se subieron los tokens base (se perdería vivacidad); se creó el perfil **`.mesa`** con variantes más oscuras (claro) o más claras (oscuro) movidas solo en L de OKLCH hasta 7:1 | PASA AAA (secciones 5.x "Mesa") |
| `primary` de cada paleta como botón de Mesa (A 6.7, B 5.2, C 5.5) | Token `primary-strong` (A `#1E40AF`, B `#9A3412`, C `#115E59`) en claro; en oscuro se aclara | PASA AAA |

## 3. Paleta A — "Cobalto Nica"
**Concepto:** azul de la bandera de Nicaragua con acento dorado. Institucional y sobrio; deja el verde para el significado "cancha/gol/éxito" y no compite con el color de ningún cliente (el azul tiñe solo los neutros). Es el eje azul/naranja, el más seguro para daltonismo.

| Token | Claro hex | Claro oklch | Oscuro hex | Oscuro oklch |
|---|---|---|---|---|
| background | `#F8FAFC` | oklch(0.984 0.003 0) | `#080D18` | oklch(0.160 0.025 264.6) |
| foreground | `#0A1220` | oklch(0.182 0.031 261.1) | `#EEF2F8` | oklch(0.960 0.009 258.3) |
| card | `#FFFFFF` | oklch(1.000 0.000 0) | `#101829` | oklch(0.211 0.036 264.3) |
| card-foreground | `#0A1220` | oklch(0.182 0.031 261.1) | `#EEF2F8` | oklch(0.960 0.009 258.3) |
| popover | `#FFFFFF` | oklch(1.000 0.000 0) | `#101829` | oklch(0.211 0.036 264.3) |
| popover-foreground | `#0A1220` | oklch(0.182 0.031 261.1) | `#EEF2F8` | oklch(0.960 0.009 258.3) |
| primary | `#1D4ED8` | oklch(0.488 0.217 264.4) | `#7AA7FF` | oklch(0.733 0.137 262.9) |
| primary-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| primary-strong | `#1E40AF` | oklch(0.424 0.181 265.6) | `#93B6FF` | oklch(0.779 0.112 264.3) |
| primary-strong-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| secondary | `#E1E8F2` | oklch(0.929 0.016 257.2) | `#1E2A42` | oklch(0.286 0.047 263.4) |
| secondary-foreground | `#0A1220` | oklch(0.182 0.031 261.1) | `#EEF2F8` | oklch(0.960 0.009 258.3) |
| muted | `#EAEFF5` | oklch(0.950 0.010 252.8) | `#1A2438` | oklch(0.261 0.040 263.5) |
| muted-foreground | `#46546A` | oklch(0.443 0.040 259.3) | `#AAB6C9` | oklch(0.773 0.030 259.6) |
| accent | `#F5B700` | oklch(0.814 0.167 83.9) | `#FBBF24` | oklch(0.837 0.164 84.4) |
| accent-foreground | `#0A1220` | oklch(0.182 0.031 261.1) | `#050B16` | oklch(0.149 0.026 259.1) |
| destructive | `#B91C1C` | oklch(0.505 0.190 27.5) | `#FF7B7B` | oklch(0.736 0.161 21.8) |
| destructive-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| success | `#15803D` | oklch(0.527 0.137 150.1) | `#4ADE80` | oklch(0.800 0.182 151.7) |
| success-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| warning | `#B45309` | oklch(0.555 0.146 49.0) | `#FBBF24` | oklch(0.837 0.164 84.4) |
| warning-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| info | `#0369A1` | oklch(0.500 0.119 242.7) | `#4CC2F5` | oklch(0.769 0.127 230.4) |
| info-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| border | `#D3DBE6` | oklch(0.889 0.017 256.3) | `#26324A` | oklch(0.318 0.046 263.6) |
| input | `#7A889C` | oklch(0.622 0.034 257.3) | `#7C8BA3` | oklch(0.633 0.040 259.8) |
| ring | `#1D4ED8` | oklch(0.488 0.217 264.4) | `#7AA7FF` | oklch(0.733 0.137 262.9) |
| tarjeta-amarilla | `#FACC15` | oklch(0.861 0.173 91.9) | `#FACC15` | oklch(0.861 0.173 91.9) |
| tarjeta-amarilla-foreground | `#0A1220` | oklch(0.182 0.031 261.1) | `#050B16` | oklch(0.149 0.026 259.1) |
| tarjeta-roja | `#C62828` | oklch(0.539 0.194 26.7) | `#F04848` | oklch(0.643 0.205 25.0) |
| tarjeta-roja-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| en-vivo | `#D6204F` | oklch(0.569 0.211 14.3) | `#FF6B8B` | oklch(0.719 0.181 9.5) |
| en-vivo-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| gol | `#15803D` | oklch(0.527 0.137 150.1) | `#4ADE80` | oklch(0.800 0.182 151.7) |
| gol-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| finalizado | `#475569` | oklch(0.446 0.037 257.3) | `#94A3B8` | oklch(0.711 0.035 256.8) |
| finalizado-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| pendiente | `#64748B` | oklch(0.554 0.041 257.4) | `#8794AA` | oklch(0.664 0.036 261.0) |
| pendiente-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| wo | `#6D28D9` | oklch(0.491 0.241 292.6) | `#B49CFF` | oklch(0.753 0.141 293.9) |
| wo-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| chart-1 | `#C2570C` | oklch(0.583 0.156 47.4) | `#FB923C` | oklch(0.758 0.159 55.9) |
| chart-2 | `#7E22CE` | oklch(0.496 0.237 301.9) | `#C4B5FD` | oklch(0.811 0.101 293.6) |
| chart-3 | `#0A7F6A` | oklch(0.534 0.098 175.4) | `#86EFAC` | oklch(0.871 0.136 154.4) |
| chart-4 | `#475569` | oklch(0.446 0.037 257.3) | `#FACC15` | oklch(0.861 0.173 91.9) |
| chart-5 | `#9A3412` | oklch(0.470 0.143 37.3) | `#94A3B8` | oklch(0.711 0.035 256.8) |
| sidebar | `#FFFFFF` | oklch(1.000 0.000 0) | `#101829` | oklch(0.211 0.036 264.3) |
| sidebar-foreground | `#0A1220` | oklch(0.182 0.031 261.1) | `#EEF2F8` | oklch(0.960 0.009 258.3) |
| sidebar-primary | `#1D4ED8` | oklch(0.488 0.217 264.4) | `#7AA7FF` | oklch(0.733 0.137 262.9) |
| sidebar-primary-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#050B16` | oklch(0.149 0.026 259.1) |
| sidebar-accent | `#EAEFF5` | oklch(0.950 0.010 252.8) | `#1A2438` | oklch(0.261 0.040 263.5) |
| sidebar-accent-foreground | `#0A1220` | oklch(0.182 0.031 261.1) | `#EEF2F8` | oklch(0.960 0.009 258.3) |
| sidebar-border | `#D3DBE6` | oklch(0.889 0.017 256.3) | `#26324A` | oklch(0.318 0.046 263.6) |
| sidebar-ring | `#1D4ED8` | oklch(0.488 0.217 264.4) | `#7AA7FF` | oklch(0.733 0.137 262.9) |


## 4. Paleta B — "Volcán"
**Concepto:** naranja Masaya/terracota sobre neutros cálidos (crema/carbón) con acento turquesa. Cálida, enérgica, la más "fin de semana de torneo"; riesgo: choca con clientes naranja/rojos y sus neutros cálidos "tiñen" cualquier color de cliente azul/verde.

| Token | Claro hex | Claro oklch | Oscuro hex | Oscuro oklch |
|---|---|---|---|---|
| background | `#FFFAF5` | oklch(0.988 0.009 67.7) | `#130C07` | oklch(0.162 0.016 58.5) |
| foreground | `#1F140D` | oklch(0.203 0.023 53.5) | `#FBF1E8` | oklch(0.964 0.016 64.7) |
| card | `#FFFFFF` | oklch(1.000 0.000 0) | `#1E140D` | oklch(0.202 0.021 56.2) |
| card-foreground | `#1F140D` | oklch(0.203 0.023 53.5) | `#FBF1E8` | oklch(0.964 0.016 64.7) |
| popover | `#FFFFFF` | oklch(1.000 0.000 0) | `#1E140D` | oklch(0.202 0.021 56.2) |
| popover-foreground | `#1F140D` | oklch(0.203 0.023 53.5) | `#FBF1E8` | oklch(0.964 0.016 64.7) |
| primary | `#C2410C` | oklch(0.553 0.174 38.4) | `#FB923C` | oklch(0.758 0.159 55.9) |
| primary-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| primary-strong | `#9A3412` | oklch(0.470 0.143 37.3) | `#FDBA74` | oklch(0.837 0.117 66.3) |
| primary-strong-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| secondary | `#FCE5D0` | oklch(0.935 0.038 64.8) | `#35231A` | oklch(0.276 0.032 47.5) |
| secondary-foreground | `#3B1706` | oklch(0.256 0.063 44.1) | `#FBF1E8` | oklch(0.964 0.016 64.7) |
| muted | `#F4EBE2` | oklch(0.945 0.015 67.6) | `#2A1D13` | oklch(0.244 0.027 58.6) |
| muted-foreground | `#5A463A` | oklch(0.412 0.034 52.5) | `#C9B5A4` | oklch(0.785 0.033 62.7) |
| accent | `#0E7490` | oklch(0.520 0.094 223.1) | `#22D3EE` | oklch(0.797 0.134 211.5) |
| accent-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| destructive | `#B91C1C` | oklch(0.505 0.190 27.5) | `#FF8080` | oklch(0.744 0.155 21.5) |
| destructive-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| success | `#15803D` | oklch(0.527 0.137 150.1) | `#4ADE80` | oklch(0.800 0.182 151.7) |
| success-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| warning | `#A16207` | oklch(0.554 0.121 66.4) | `#FBBF24` | oklch(0.837 0.164 84.4) |
| warning-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| info | `#0369A1` | oklch(0.500 0.119 242.7) | `#4CC2F5` | oklch(0.769 0.127 230.4) |
| info-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| border | `#E6D8CA` | oklch(0.890 0.024 67.5) | `#41302A` | oklch(0.327 0.027 40.3) |
| input | `#8C7566` | oklch(0.580 0.037 55.0) | `#8F7A6B` | oklch(0.595 0.034 57.5) |
| ring | `#C2410C` | oklch(0.553 0.174 38.4) | `#FB923C` | oklch(0.758 0.159 55.9) |
| tarjeta-amarilla | `#FACC15` | oklch(0.861 0.173 91.9) | `#FACC15` | oklch(0.861 0.173 91.9) |
| tarjeta-amarilla-foreground | `#1C0F06` | oklch(0.184 0.028 56.4) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| tarjeta-roja | `#C62828` | oklch(0.539 0.194 26.7) | `#F04848` | oklch(0.643 0.205 25.0) |
| tarjeta-roja-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| en-vivo | `#C0126B` | oklch(0.530 0.208 358.1) | `#FF6FB5` | oklch(0.736 0.189 352.4) |
| en-vivo-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| gol | `#15803D` | oklch(0.527 0.137 150.1) | `#4ADE80` | oklch(0.800 0.182 151.7) |
| gol-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| finalizado | `#57534E` | oklch(0.444 0.010 73.6) | `#A8A29E` | oklch(0.716 0.009 56.3) |
| finalizado-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| pendiente | `#78716C` | oklch(0.553 0.012 58.1) | `#928A83` | oklch(0.638 0.014 63.8) |
| pendiente-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| wo | `#5B21B6` | oklch(0.432 0.211 292.8) | `#B9A1FF` | oklch(0.766 0.134 294.8) |
| wo-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| chart-1 | `#C2570C` | oklch(0.583 0.156 47.4) | `#FB923C` | oklch(0.758 0.159 55.9) |
| chart-2 | `#7E22CE` | oklch(0.496 0.237 301.9) | `#C4B5FD` | oklch(0.811 0.101 293.6) |
| chart-3 | `#0A7F6A` | oklch(0.534 0.098 175.4) | `#86EFAC` | oklch(0.871 0.136 154.4) |
| chart-4 | `#475569` | oklch(0.446 0.037 257.3) | `#FACC15` | oklch(0.861 0.173 91.9) |
| chart-5 | `#9A3412` | oklch(0.470 0.143 37.3) | `#94A3B8` | oklch(0.711 0.035 256.8) |
| sidebar | `#FFFFFF` | oklch(1.000 0.000 0) | `#1E140D` | oklch(0.202 0.021 56.2) |
| sidebar-foreground | `#1F140D` | oklch(0.203 0.023 53.5) | `#FBF1E8` | oklch(0.964 0.016 64.7) |
| sidebar-primary | `#C2410C` | oklch(0.553 0.174 38.4) | `#FB923C` | oklch(0.758 0.159 55.9) |
| sidebar-primary-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#1A0B02` | oklch(0.169 0.034 57.5) |
| sidebar-accent | `#F4EBE2` | oklch(0.945 0.015 67.6) | `#2A1D13` | oklch(0.244 0.027 58.6) |
| sidebar-accent-foreground | `#1F140D` | oklch(0.203 0.023 53.5) | `#FBF1E8` | oklch(0.964 0.016 64.7) |
| sidebar-border | `#E6D8CA` | oklch(0.890 0.024 67.5) | `#41302A` | oklch(0.327 0.027 40.3) |
| sidebar-ring | `#C2410C` | oklch(0.553 0.174 38.4) | `#FB923C` | oklch(0.758 0.159 55.9) |


## 5. Paleta C — "Selva Tropical"
**Concepto:** verde-teal profundo (más azulado y oscuro que el `#16a34a` provisional) con acento lima. Continuidad con la marca actual; riesgo: el primario se confunde con `success`/`gol` (ambos verdes) y colisiona con clientes verdes (los más probables en fútbol).

| Token | Claro hex | Claro oklch | Oscuro hex | Oscuro oklch |
|---|---|---|---|---|
| background | `#F6FAF8` | oklch(0.982 0.005 165.0) | `#071210` | oklch(0.171 0.017 181.7) |
| foreground | `#06150F` | oklch(0.180 0.025 166.4) | `#ECF6F2` | oklch(0.965 0.012 170.3) |
| card | `#FFFFFF` | oklch(1.000 0.000 0) | `#0E1D1A` | oklch(0.216 0.022 180.0) |
| card-foreground | `#06150F` | oklch(0.180 0.025 166.4) | `#ECF6F2` | oklch(0.965 0.012 170.3) |
| popover | `#FFFFFF` | oklch(1.000 0.000 0) | `#0E1D1A` | oklch(0.216 0.022 180.0) |
| popover-foreground | `#06150F` | oklch(0.180 0.025 166.4) | `#ECF6F2` | oklch(0.965 0.012 170.3) |
| primary | `#0F766E` | oklch(0.511 0.086 186.4) | `#2DD4BF` | oklch(0.785 0.133 181.9) |
| primary-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| primary-strong | `#115E59` | oklch(0.437 0.071 188.2) | `#5EEAD4` | oklch(0.855 0.125 181.1) |
| primary-strong-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| secondary | `#D6EBE5` | oklch(0.923 0.024 176.8) | `#173230` | oklch(0.295 0.033 189.3) |
| secondary-foreground | `#04140F` | oklch(0.174 0.026 171.9) | `#ECF6F2` | oklch(0.965 0.012 170.3) |
| muted | `#E6F0EC` | oklch(0.946 0.012 170.3) | `#16292A` | oklch(0.265 0.025 200.0) |
| muted-foreground | `#42584F` | oklch(0.439 0.031 167.9) | `#A3BDB4` | oklch(0.776 0.031 172.6) |
| accent | `#BEF264` | oklch(0.897 0.179 126.7) | `#BEF264` | oklch(0.897 0.179 126.7) |
| accent-foreground | `#04140F` | oklch(0.174 0.026 171.9) | `#03100B` | oklch(0.158 0.024 169.2) |
| destructive | `#B91C1C` | oklch(0.505 0.190 27.5) | `#FF7B7B` | oklch(0.736 0.161 21.8) |
| destructive-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| success | `#15803D` | oklch(0.527 0.137 150.1) | `#4ADE80` | oklch(0.800 0.182 151.7) |
| success-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| warning | `#B45309` | oklch(0.555 0.146 49.0) | `#FBBF24` | oklch(0.837 0.164 84.4) |
| warning-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| info | `#0369A1` | oklch(0.500 0.119 242.7) | `#4CC2F5` | oklch(0.769 0.127 230.4) |
| info-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| border | `#CFDFD8` | oklch(0.890 0.020 167.9) | `#223A36` | oklch(0.327 0.031 182.7) |
| input | `#6F8A7E` | oklch(0.609 0.036 166.4) | `#6F8F84` | oklch(0.622 0.040 171.9) |
| ring | `#0F766E` | oklch(0.511 0.086 186.4) | `#2DD4BF` | oklch(0.785 0.133 181.9) |
| tarjeta-amarilla | `#FACC15` | oklch(0.861 0.173 91.9) | `#FACC15` | oklch(0.861 0.173 91.9) |
| tarjeta-amarilla-foreground | `#04140F` | oklch(0.174 0.026 171.9) | `#03100B` | oklch(0.158 0.024 169.2) |
| tarjeta-roja | `#C62828` | oklch(0.539 0.194 26.7) | `#F04848` | oklch(0.643 0.205 25.0) |
| tarjeta-roja-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| en-vivo | `#D6204F` | oklch(0.569 0.211 14.3) | `#FF6B8B` | oklch(0.719 0.181 9.5) |
| en-vivo-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| gol | `#15803D` | oklch(0.527 0.137 150.1) | `#86EFAC` | oklch(0.871 0.136 154.4) |
| gol-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| finalizado | `#475569` | oklch(0.446 0.037 257.3) | `#94A3B8` | oklch(0.711 0.035 256.8) |
| finalizado-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| pendiente | `#64748B` | oklch(0.554 0.041 257.4) | `#8794AA` | oklch(0.664 0.036 261.0) |
| pendiente-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| wo | `#6D28D9` | oklch(0.491 0.241 292.6) | `#B49CFF` | oklch(0.753 0.141 293.9) |
| wo-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| chart-1 | `#C2570C` | oklch(0.583 0.156 47.4) | `#FB923C` | oklch(0.758 0.159 55.9) |
| chart-2 | `#7E22CE` | oklch(0.496 0.237 301.9) | `#C4B5FD` | oklch(0.811 0.101 293.6) |
| chart-3 | `#0A7F6A` | oklch(0.534 0.098 175.4) | `#86EFAC` | oklch(0.871 0.136 154.4) |
| chart-4 | `#475569` | oklch(0.446 0.037 257.3) | `#FACC15` | oklch(0.861 0.173 91.9) |
| chart-5 | `#9A3412` | oklch(0.470 0.143 37.3) | `#94A3B8` | oklch(0.711 0.035 256.8) |
| sidebar | `#FFFFFF` | oklch(1.000 0.000 0) | `#0E1D1A` | oklch(0.216 0.022 180.0) |
| sidebar-foreground | `#06150F` | oklch(0.180 0.025 166.4) | `#ECF6F2` | oklch(0.965 0.012 170.3) |
| sidebar-primary | `#0F766E` | oklch(0.511 0.086 186.4) | `#2DD4BF` | oklch(0.785 0.133 181.9) |
| sidebar-primary-foreground | `#FFFFFF` | oklch(1.000 0.000 0) | `#03100B` | oklch(0.158 0.024 169.2) |
| sidebar-accent | `#E6F0EC` | oklch(0.946 0.012 170.3) | `#16292A` | oklch(0.265 0.025 200.0) |
| sidebar-accent-foreground | `#06150F` | oklch(0.180 0.025 166.4) | `#ECF6F2` | oklch(0.965 0.012 170.3) |
| sidebar-border | `#CFDFD8` | oklch(0.890 0.020 167.9) | `#223A36` | oklch(0.327 0.031 182.7) |
| sidebar-ring | `#0F766E` | oklch(0.511 0.086 186.4) | `#2DD4BF` | oklch(0.785 0.133 181.9) |


Notas comunes a las tres paletas:
- Los estados de fútbol comparten familias: amarilla `#FACC15` (todas), roja `#C62828` claro / `#F04848` oscuro, gol verde `#15803D` claro / `#4ADE80` oscuro (C oscuro `#86EFAC`), W.O. violeta (`#6D28D9`/`#B49CFF`), finalizado/pendiente en grises.
- **En vivo** es magenta/rosa (A `#D6204F`, B `#C0126B`) y no rojo puro, para no confundirse con la tarjeta roja ni con `destructive`; aun así nunca se usa solo el color (sección 7).
- Charts 1–5 son **compartidos** por las 3 paletas (sección 7.4) y no dependen del color de marca ni del de cliente.
- `border` es decorativo (separadores); `input` es el borde de campos de formulario y cumple 3:1 (WCAG 1.4.11).

## 6. Contrastes medidos

Nivel: PASA AAA ≥ 7, PASA AA (no AAA) 4.5–6.99, PASA 3:1 para íconos/bordes/gráficos. Las filas con "(no AAA)" son aceptables en la app general; en la consola de Mesa se usan las variantes de la sección 6.4. Ratios con dos decimales, calculados con `lib.js` (WCAG 2.x).

### 6.1 Paleta A — Cobalto Nica (base AA)
| Par (texto o elemento / fondo) | Mín. | Claro | Resultado | Oscuro | Resultado |
|---|---|---|---|---|---|
| foreground / background | 4.5:1 | 17.92 | PASA AAA | 17.29 | PASA AAA |
| foreground / card | 4.5:1 | 18.75 | PASA AAA | 15.78 | PASA AAA |
| foreground / muted | 4.5:1 | 16.21 | PASA AAA | 13.81 | PASA AAA |
| muted-foreground / background | 4.5:1 | 7.33 | PASA AAA | 9.48 | PASA AAA |
| muted-foreground / muted | 4.5:1 | 6.64 | PASA AA (no AAA) | 7.57 | PASA AAA |
| muted-foreground / card | 4.5:1 | 7.67 | PASA AAA | 8.65 | PASA AAA |
| primary-foreground / primary | 4.5:1 | 6.70 | PASA AA (no AAA) | 8.25 | PASA AAA |
| primary-foreground / primary-strong [Mesa] | 4.5:1 | 8.72 | PASA AAA | 9.73 | PASA AAA |
| primary / background (borde, icono) | 3:1 | 6.41 | PASA 3:1 | 8.14 | PASA 3:1 |
| primary / card (borde, icono) | 3:1 | 6.70 | PASA 3:1 | 7.43 | PASA 3:1 |
| ring / background | 3:1 | 6.41 | PASA 3:1 | 8.14 | PASA 3:1 |
| input (borde de campo) / background | 3:1 | 3.44 | PASA 3:1 | 5.62 | PASA 3:1 |
| secondary-foreground / secondary | 4.5:1 | 15.20 | PASA AAA | 12.76 | PASA AAA |
| accent-foreground / accent | 4.5:1 | 10.40 | PASA AAA | 11.80 | PASA AAA |
| destructive como texto / background | 4.5:1 | 6.18 | PASA AA (no AAA) | 7.74 | PASA AAA |
| destructive-foreground / destructive | 4.5:1 | 6.47 | PASA AA (no AAA) | 7.85 | PASA AAA |
| success como texto / background | 4.5:1 | 4.79 | PASA AA (no AAA) | 11.15 | PASA AAA |
| success-foreground / success | 4.5:1 | 5.02 | PASA AA (no AAA) | 11.31 | PASA AAA |
| warning como texto / background | 4.5:1 | 4.80 | PASA AA (no AAA) | 11.64 | PASA AAA |
| warning-foreground / warning | 4.5:1 | 5.02 | PASA AA (no AAA) | 11.80 | PASA AAA |
| info como texto / background | 4.5:1 | 5.67 | PASA AA (no AAA) | 9.57 | PASA AAA |
| info-foreground / info | 4.5:1 | 5.93 | PASA AA (no AAA) | 9.70 | PASA AAA |
| amarilla: texto / fondo | 4.5:1 | 12.24 | PASA AAA | 12.86 | PASA AAA |
| amarilla: claro = contorno foreground (la tarjeta lleva borde) · oscuro = vs background | 3:1 | 12.24 | PASA 3:1 | 12.68 | PASA 3:1 |
| roja: texto / fondo | 4.5:1 | 5.62 | PASA AA (no AAA) | 5.37 | PASA AA (no AAA) |
| roja / background (icono, borde) | 3:1 | 5.37 | PASA 3:1 | 5.30 | PASA 3:1 |
| vivo: texto / fondo | 4.5:1 | 5.03 | PASA AA (no AAA) | 7.25 | PASA AAA |
| vivo / background (icono, borde) | 3:1 | 4.80 | PASA 3:1 | 7.15 | PASA 3:1 |
| gol: texto / fondo | 4.5:1 | 5.02 | PASA AA (no AAA) | 11.31 | PASA AAA |
| gol / background (icono, borde) | 3:1 | 4.79 | PASA 3:1 | 11.15 | PASA 3:1 |
| finalizado: texto / fondo | 4.5:1 | 7.58 | PASA AAA | 7.68 | PASA AAA |
| finalizado / background (icono, borde) | 3:1 | 7.24 | PASA 3:1 | 7.58 | PASA 3:1 |
| pendiente: texto / fondo | 4.5:1 | 4.76 | PASA AA (no AAA) | 6.42 | PASA AA (no AAA) |
| pendiente / background (icono, borde) | 3:1 | 4.55 | PASA 3:1 | 6.33 | PASA 3:1 |
| wo: texto / fondo | 4.5:1 | 7.10 | PASA AAA | 8.57 | PASA AAA |
| wo / background (icono, borde) | 3:1 | 6.79 | PASA 3:1 | 8.45 | PASA 3:1 |
| chart-1 / background (gráfico) | 3:1 | 4.30 | PASA 3:1 | 8.58 | PASA 3:1 |
| chart-2 / background (gráfico) | 3:1 | 6.67 | PASA 3:1 | 10.52 | PASA 3:1 |
| chart-3 / background (gráfico) | 3:1 | 4.72 | PASA 3:1 | 13.83 | PASA 3:1 |
| chart-4 / background (gráfico) | 3:1 | 7.24 | PASA 3:1 | 12.68 | PASA 3:1 |
| chart-5 / background (gráfico) | 3:1 | 6.98 | PASA 3:1 | 7.58 | PASA 3:1 |


### 6.2 Paleta B — Volcán (base AA)
| Par (texto o elemento / fondo) | Mín. | Claro | Resultado | Oscuro | Resultado |
|---|---|---|---|---|---|
| foreground / background | 4.5:1 | 17.39 | PASA AAA | 17.40 | PASA AAA |
| foreground / card | 4.5:1 | 18.04 | PASA AAA | 16.23 | PASA AAA |
| foreground / muted | 4.5:1 | 15.31 | PASA AAA | 14.68 | PASA AAA |
| muted-foreground / background | 4.5:1 | 8.54 | PASA AAA | 9.81 | PASA AAA |
| muted-foreground / muted | 4.5:1 | 7.52 | PASA AAA | 8.28 | PASA AAA |
| muted-foreground / card | 4.5:1 | 8.85 | PASA AAA | 9.15 | PASA AAA |
| primary-foreground / primary | 4.5:1 | 5.18 | PASA AA (no AAA) | 8.49 | PASA AAA |
| primary-foreground / primary-strong [Mesa] | 4.5:1 | 7.31 | PASA AAA | 11.40 | PASA AAA |
| primary / background (borde, icono) | 3:1 | 4.99 | PASA 3:1 | 8.56 | PASA 3:1 |
| primary / card (borde, icono) | 3:1 | 5.18 | PASA 3:1 | 7.99 | PASA 3:1 |
| ring / background | 3:1 | 4.99 | PASA 3:1 | 8.56 | PASA 3:1 |
| input (borde de campo) / background | 3:1 | 4.17 | PASA 3:1 | 4.77 | PASA 3:1 |
| secondary-foreground / secondary | 4.5:1 | 13.16 | PASA AAA | 13.40 | PASA AAA |
| accent-foreground / accent | 4.5:1 | 5.36 | PASA AA (no AAA) | 10.63 | PASA AAA |
| destructive como texto / background | 4.5:1 | 6.24 | PASA AA (no AAA) | 7.99 | PASA AAA |
| destructive-foreground / destructive | 4.5:1 | 6.47 | PASA AA (no AAA) | 7.92 | PASA AAA |
| success como texto / background | 4.5:1 | 4.84 | PASA AA (no AAA) | 11.12 | PASA AAA |
| success-foreground / success | 4.5:1 | 5.02 | PASA AA (no AAA) | 11.03 | PASA AAA |
| warning como texto / background | 4.5:1 | 4.75 | PASA AA (no AAA) | 11.61 | PASA AAA |
| warning-foreground / warning | 4.5:1 | 4.92 | PASA AA (no AAA) | 11.51 | PASA AAA |
| info como texto / background | 4.5:1 | 5.72 | PASA AA (no AAA) | 9.55 | PASA AAA |
| info-foreground / info | 4.5:1 | 5.93 | PASA AA (no AAA) | 9.47 | PASA AAA |
| amarilla: texto / fondo | 4.5:1 | 12.24 | PASA AAA | 12.55 | PASA AAA |
| amarilla: claro = contorno foreground (la tarjeta lleva borde) · oscuro = vs background | 3:1 | 11.78 | PASA 3:1 | 12.66 | PASA 3:1 |
| roja: texto / fondo | 4.5:1 | 5.62 | PASA AA (no AAA) | 5.24 | PASA AA (no AAA) |
| roja / background (icono, borde) | 3:1 | 5.42 | PASA 3:1 | 5.29 | PASA 3:1 |
| vivo: texto / fondo | 4.5:1 | 5.93 | PASA AA (no AAA) | 7.50 | PASA AAA |
| vivo / background (icono, borde) | 3:1 | 5.72 | PASA 3:1 | 7.56 | PASA 3:1 |
| gol: texto / fondo | 4.5:1 | 5.02 | PASA AA (no AAA) | 11.03 | PASA AAA |
| gol / background (icono, borde) | 3:1 | 4.84 | PASA 3:1 | 11.12 | PASA 3:1 |
| finalizado: texto / fondo | 4.5:1 | 7.63 | PASA AAA | 7.62 | PASA AAA |
| finalizado / background (icono, borde) | 3:1 | 7.35 | PASA 3:1 | 7.69 | PASA 3:1 |
| pendiente: texto / fondo | 4.5:1 | 4.80 | PASA AA (no AAA) | 5.66 | PASA AA (no AAA) |
| pendiente / background (icono, borde) | 3:1 | 4.63 | PASA 3:1 | 5.71 | PASA 3:1 |
| wo: texto / fondo | 4.5:1 | 8.98 | PASA AAA | 8.79 | PASA AAA |
| wo / background (icono, borde) | 3:1 | 8.66 | PASA 3:1 | 8.87 | PASA 3:1 |
| chart-1 / background (gráfico) | 3:1 | 4.34 | PASA 3:1 | 8.56 | PASA 3:1 |
| chart-2 / background (gráfico) | 3:1 | 6.73 | PASA 3:1 | 10.50 | PASA 3:1 |
| chart-3 / background (gráfico) | 3:1 | 4.76 | PASA 3:1 | 13.81 | PASA 3:1 |
| chart-4 / background (gráfico) | 3:1 | 7.31 | PASA 3:1 | 12.66 | PASA 3:1 |
| chart-5 / background (gráfico) | 3:1 | 7.04 | PASA 3:1 | 7.56 | PASA 3:1 |


### 6.3 Paleta C — Selva Tropical (base AA)
| Par (texto o elemento / fondo) | Mín. | Claro | Resultado | Oscuro | Resultado |
|---|---|---|---|---|---|
| foreground / background | 4.5:1 | 17.78 | PASA AAA | 17.25 | PASA AAA |
| foreground / card | 4.5:1 | 18.72 | PASA AAA | 15.74 | PASA AAA |
| foreground / muted | 4.5:1 | 16.08 | PASA AAA | 13.74 | PASA AAA |
| muted-foreground / background | 4.5:1 | 7.28 | PASA AAA | 9.51 | PASA AAA |
| muted-foreground / muted | 4.5:1 | 6.58 | PASA AA (no AAA) | 7.58 | PASA AAA |
| muted-foreground / card | 4.5:1 | 7.66 | PASA AAA | 8.68 | PASA AAA |
| primary-foreground / primary | 4.5:1 | 5.47 | PASA AA (no AAA) | 10.42 | PASA AAA |
| primary-foreground / primary-strong [Mesa] | 4.5:1 | 7.58 | PASA AAA | 13.11 | PASA AAA |
| primary / background (borde, icono) | 3:1 | 5.20 | PASA 3:1 | 10.23 | PASA 3:1 |
| primary / card (borde, icono) | 3:1 | 5.47 | PASA 3:1 | 9.33 | PASA 3:1 |
| ring / background | 3:1 | 5.20 | PASA 3:1 | 10.23 | PASA 3:1 |
| input (borde de campo) / background | 3:1 | 3.55 | PASA 3:1 | 5.38 | PASA 3:1 |
| secondary-foreground / secondary | 4.5:1 | 15.17 | PASA AAA | 12.40 | PASA AAA |
| accent-foreground / accent | 4.5:1 | 14.45 | PASA AAA | 14.84 | PASA AAA |
| destructive como texto / background | 4.5:1 | 6.15 | PASA AA (no AAA) | 7.59 | PASA AAA |
| destructive-foreground / destructive | 4.5:1 | 6.47 | PASA AA (no AAA) | 7.73 | PASA AAA |
| success como texto / background | 4.5:1 | 4.76 | PASA AA (no AAA) | 10.93 | PASA AAA |
| success-foreground / success | 4.5:1 | 5.02 | PASA AA (no AAA) | 11.13 | PASA AAA |
| warning como texto / background | 4.5:1 | 4.77 | PASA AA (no AAA) | 11.40 | PASA AAA |
| warning-foreground / warning | 4.5:1 | 5.02 | PASA AA (no AAA) | 11.62 | PASA AAA |
| info como texto / background | 4.5:1 | 5.64 | PASA AA (no AAA) | 9.38 | PASA AAA |
| info-foreground / info | 4.5:1 | 5.93 | PASA AA (no AAA) | 9.55 | PASA AAA |
| amarilla: texto / fondo | 4.5:1 | 12.33 | PASA AAA | 12.66 | PASA AAA |
| amarilla: claro = contorno foreground (la tarjeta lleva borde) · oscuro = vs background | 3:1 | 12.22 | PASA 3:1 | 12.43 | PASA 3:1 |
| roja: texto / fondo | 4.5:1 | 5.62 | PASA AA (no AAA) | 5.29 | PASA AA (no AAA) |
| roja / background (icono, borde) | 3:1 | 5.34 | PASA 3:1 | 5.19 | PASA 3:1 |
| vivo: texto / fondo | 4.5:1 | 5.03 | PASA AA (no AAA) | 7.14 | PASA AAA |
| vivo / background (icono, borde) | 3:1 | 4.77 | PASA 3:1 | 7.01 | PASA 3:1 |
| gol: texto / fondo | 4.5:1 | 5.02 | PASA AA (no AAA) | 13.81 | PASA AAA |
| gol / background (icono, borde) | 3:1 | 4.76 | PASA 3:1 | 13.56 | PASA 3:1 |
| finalizado: texto / fondo | 4.5:1 | 7.58 | PASA AAA | 7.56 | PASA AAA |
| finalizado / background (icono, borde) | 3:1 | 7.20 | PASA 3:1 | 7.43 | PASA 3:1 |
| pendiente: texto / fondo | 4.5:1 | 4.76 | PASA AA (no AAA) | 6.32 | PASA AA (no AAA) |
| pendiente / background (icono, borde) | 3:1 | 4.52 | PASA 3:1 | 6.21 | PASA 3:1 |
| wo: texto / fondo | 4.5:1 | 7.10 | PASA AAA | 8.44 | PASA AAA |
| wo / background (icono, borde) | 3:1 | 6.75 | PASA 3:1 | 8.29 | PASA 3:1 |
| chart-1 / background (gráfico) | 3:1 | 4.28 | PASA 3:1 | 8.41 | PASA 3:1 |
| chart-2 / background (gráfico) | 3:1 | 6.63 | PASA 3:1 | 10.31 | PASA 3:1 |
| chart-3 / background (gráfico) | 3:1 | 4.69 | PASA 3:1 | 13.56 | PASA 3:1 |
| chart-4 / background (gráfico) | 3:1 | 7.20 | PASA 3:1 | 12.43 | PASA 3:1 |
| chart-5 / background (gráfico) | 3:1 | 6.94 | PASA 3:1 | 7.43 | PASA 3:1 |


### 6.4 Perfil Mesa AAA (7:1) — clase `.mesa`
Tokens sobrescritos dentro de `.mesa` (solo los que cambian) y verificación posterior. Todos los pares de texto sobre su fondo alcanzan 7:1.

**Paleta A**
| Par Mesa | Claro | Resultado | Oscuro | Resultado |
|---|---|---|---|---|
| foreground / background | 17.92 | PASA AAA | 17.29 | PASA AAA |
| muted-foreground / background | 7.82 | PASA AAA | 9.48 | PASA AAA |
| muted-foreground / muted | 7.08 | PASA AAA | 7.57 | PASA AAA |
| muted-foreground / card | 8.18 | PASA AAA | 8.65 | PASA AAA |
| secondary-foreground / secondary | 15.20 | PASA AAA | 12.76 | PASA AAA |
| primary-strong: blanco / fondo | 8.72 | PASA AAA | 9.73 | PASA AAA |
| accent: tinta / fondo | 10.40 | PASA AAA | 11.80 | PASA AAA |
| destructive: blanco / fondo | 7.41 | PASA AAA | 7.85 | PASA AAA |
| success: blanco / fondo | 7.35 | PASA AAA | 11.31 | PASA AAA |
| warning: blanco / fondo | 7.38 | PASA AAA | 11.80 | PASA AAA |
| info: blanco / fondo | 7.40 | PASA AAA | 9.70 | PASA AAA |
| amarilla: tinta / fondo | 12.24 | PASA AAA | 12.86 | PASA AAA |
| roja: blanco / fondo | 7.01 | PASA AAA | 7.12 | PASA AAA |
| vivo: blanco / fondo | 7.04 | PASA AAA | 7.25 | PASA AAA |
| gol: blanco / fondo | 7.15 | PASA AAA | 11.31 | PASA AAA |
| finalizado: blanco / fondo | 7.58 | PASA AAA | 7.68 | PASA AAA |
| pendiente: blanco / fondo | 7.03 | PASA AAA | 7.02 | PASA AAA |
| wo: blanco / fondo | 7.10 | PASA AAA | 8.57 | PASA AAA |
| destructive como texto / background | 7.08 | PASA AAA | 7.74 | PASA AAA |
| success como texto / background | 7.02 | PASA AAA | 11.15 | PASA AAA |
| warning como texto / background | 7.06 | PASA AAA | 11.64 | PASA AAA |
| info como texto / background | 7.08 | PASA AAA | 9.57 | PASA AAA |

Ajustes aplicados:
- Claro: primary #1D4ED8 -> #1E40AF; muted-foreground #46546A -> #425065; destructive #B91C1C -> #AE0610; success #15803D -> #00642B; warning #B45309 -> #8D3F01; info #0369A1 -> #015A8B; ring #1D4ED8 -> #1E40AF; tarjeta-roja #C62828 -> #B40A16; en-vivo #D6204F -> #B3003C; gol #15803D -> #00662C; pendiente #64748B -> #4A5A70
- Oscuro: primary #7AA7FF -> #93B6FF; ring #7AA7FF -> #93B6FF; tarjeta-roja #F04848 -> #FF6C66; pendiente #8794AA -> #8E9BB2

**Paleta B**
| Par Mesa | Claro | Resultado | Oscuro | Resultado |
|---|---|---|---|---|
| foreground / background | 17.39 | PASA AAA | 17.40 | PASA AAA |
| muted-foreground / background | 8.54 | PASA AAA | 9.81 | PASA AAA |
| muted-foreground / muted | 7.52 | PASA AAA | 8.28 | PASA AAA |
| muted-foreground / card | 8.85 | PASA AAA | 9.15 | PASA AAA |
| secondary-foreground / secondary | 13.16 | PASA AAA | 13.40 | PASA AAA |
| primary-strong: blanco / fondo | 7.31 | PASA AAA | 11.40 | PASA AAA |
| accent: blanco / fondo | 7.10 | PASA AAA | 10.63 | PASA AAA |
| destructive: blanco / fondo | 7.31 | PASA AAA | 7.92 | PASA AAA |
| success: blanco / fondo | 7.35 | PASA AAA | 11.03 | PASA AAA |
| warning: blanco / fondo | 7.40 | PASA AAA | 11.51 | PASA AAA |
| info: blanco / fondo | 7.29 | PASA AAA | 9.47 | PASA AAA |
| amarilla: tinta / fondo | 12.24 | PASA AAA | 12.55 | PASA AAA |
| roja: blanco / fondo | 7.01 | PASA AAA | 7.04 | PASA AAA |
| vivo: blanco / fondo | 7.02 | PASA AAA | 7.50 | PASA AAA |
| gol: blanco / fondo | 7.15 | PASA AAA | 11.03 | PASA AAA |
| finalizado: blanco / fondo | 7.63 | PASA AAA | 7.62 | PASA AAA |
| pendiente: blanco / fondo | 7.09 | PASA AAA | 7.02 | PASA AAA |
| wo: blanco / fondo | 8.98 | PASA AAA | 8.79 | PASA AAA |
| destructive como texto / background | 7.04 | PASA AAA | 7.99 | PASA AAA |
| success como texto / background | 7.08 | PASA AAA | 11.12 | PASA AAA |
| warning como texto / background | 7.13 | PASA AAA | 11.61 | PASA AAA |
| info como texto / background | 7.03 | PASA AAA | 9.55 | PASA AAA |

Ajustes aplicados:
- Claro: primary #C2410C -> #9A3412; accent #0E7490 -> #056079; destructive #B91C1C -> #AF0A11; success #15803D -> #00642B; warning #A16207 -> #7C4A02; info #0369A1 -> #005B8D; ring #C2410C -> #9A3412; tarjeta-roja #C62828 -> #B40A16; en-vivo #C0126B -> #AF0060; gol #15803D -> #00662C; pendiente #78716C -> #5E5752
- Oscuro: primary #FB923C -> #FDBA74; ring #FB923C -> #FDBA74; tarjeta-roja #F04848 -> #FE6F68; pendiente #928A83 -> #A39B94

**Paleta C**
| Par Mesa | Claro | Resultado | Oscuro | Resultado |
|---|---|---|---|---|
| foreground / background | 17.78 | PASA AAA | 17.25 | PASA AAA |
| muted-foreground / background | 7.75 | PASA AAA | 9.51 | PASA AAA |
| muted-foreground / muted | 7.01 | PASA AAA | 7.58 | PASA AAA |
| muted-foreground / card | 8.16 | PASA AAA | 8.68 | PASA AAA |
| secondary-foreground / secondary | 15.17 | PASA AAA | 12.40 | PASA AAA |
| primary-strong: blanco / fondo | 7.58 | PASA AAA | 13.11 | PASA AAA |
| accent: tinta / fondo | 14.45 | PASA AAA | 14.84 | PASA AAA |
| destructive: blanco / fondo | 7.41 | PASA AAA | 7.73 | PASA AAA |
| success: blanco / fondo | 7.55 | PASA AAA | 11.13 | PASA AAA |
| warning: blanco / fondo | 7.38 | PASA AAA | 11.62 | PASA AAA |
| info: blanco / fondo | 7.40 | PASA AAA | 9.55 | PASA AAA |
| amarilla: tinta / fondo | 12.33 | PASA AAA | 12.66 | PASA AAA |
| roja: blanco / fondo | 7.01 | PASA AAA | 7.01 | PASA AAA |
| vivo: blanco / fondo | 7.04 | PASA AAA | 7.14 | PASA AAA |
| gol: blanco / fondo | 7.15 | PASA AAA | 13.81 | PASA AAA |
| finalizado: blanco / fondo | 7.58 | PASA AAA | 7.56 | PASA AAA |
| pendiente: blanco / fondo | 7.03 | PASA AAA | 7.06 | PASA AAA |
| wo: blanco / fondo | 7.10 | PASA AAA | 8.44 | PASA AAA |
| destructive como texto / background | 7.04 | PASA AAA | 7.59 | PASA AAA |
| success como texto / background | 7.17 | PASA AAA | 10.93 | PASA AAA |
| warning como texto / background | 7.01 | PASA AAA | 11.40 | PASA AAA |
| info como texto / background | 7.03 | PASA AAA | 9.38 | PASA AAA |

Ajustes aplicados:
- Claro: primary #0F766E -> #115E59; muted-foreground #42584F -> #3E544B; destructive #B91C1C -> #AE0610; success #15803D -> #01622B; warning #B45309 -> #8D3F01; info #0369A1 -> #015A8B; ring #0F766E -> #115E59; tarjeta-roja #C62828 -> #B40A16; en-vivo #D6204F -> #B3003C; gol #15803D -> #00662C; pendiente #64748B -> #4A5A70
- Oscuro: primary #2DD4BF -> #5EEAD4; ring #2DD4BF -> #5EEAD4; tarjeta-roja #F04848 -> #FF6C66; pendiente #8794AA -> #8F9DB3

## 7. Color del cliente (`#RRGGBB` arbitrario)

### 7.1 Reglas
1. **Texto sobre el color**: elegir entre blanco `#FFFFFF` y casi-negro `#05080C` el de mayor contraste WCAG. Con estos dos extremos el peor caso teórico es ≈ 4.47:1 (colores con luminancia ≈ 0.18–0.19), por debajo de 4.5.
2. **Corrección**: si el mejor texto no llega a 4.5:1, se mueve **solo L de OKLCH** (pasos de 0.005, conservando matiz y croma) hasta alcanzar 4.5:1. En el barrido solo ~0.4 % de los colores necesitó ajuste y el cambio es imperceptible (p. ej. `#EE0903` → `#EC0200`).
3. **Hover / pressed**: L ± 0.05 / ± 0.09 (oscurecer; si el color es muy oscuro, L < 0.40, aclarar) y **recalcular** el texto para cada estado.
4. **Modo oscuro**: croma × 0.92 (evita vibración sobre fondo oscuro) y L subido hasta 4.5:1 contra el fondo oscuro (`#080D18`); hover en oscuro = más claro (+0.04), pressed = más oscuro (−0.05). El texto se recalcula.
5. **Texto/ícono/borde con el color sobre fondo claro** (`onLight`): el amarillo o el cian sobre blanco no llegan a 3:1, así que se genera una variante oscurecida con ≥ 4.5:1 sobre blanco (no usar el color puro como texto sobre fondo claro).
6. **Coherencia con la marca**: el cliente solo sobrescribe `--primary`, `--primary-foreground`, `--ring`, `--sidebar-primary(-foreground)`. Neutros, estados de fútbol, success/warning/info y charts siguen siendo de Cancha Nica. Si el color del cliente se parece a un estado (rojo, amarillo, verde) los estados mantienen su redundancia de forma/texto, así que no hay ambigüedad. Se recomienda mostrar la previsualización en el formulario de configuración y advertir si el color es casi blanco/negro (`l > 0.95` o `< 0.15`).
7. **Mesa**: la consola de Mesa **no** usa el color del cliente para botones críticos (anotar gol, tarjeta, deshacer): usa `primary-strong` de Cancha Nica con 7:1. El color del cliente se limita al encabezado/escudo.

### 7.2 Código TypeScript (probado, sin dependencias)
Fuente exacta ejecutada en las pruebas (`client-color.ts`, validada con Node `--experimental-strip-types`). Destino sugerido: `src/shared/theme/client-color.ts`.

```ts
// client-color.ts — deriva tokens accesibles desde el color principal (#RRGGBB) de un cliente.
// Sin dependencias. Pensado para src/shared/theme/client-color.ts (server y client).

export const INK = '#05080C'; // "casi negro" con tinte neutro frio
export const WHITE = '#FFFFFF';
export const LIGHT_SURFACE = '#FFFFFF'; // fondo claro de referencia (card)
export const DARK_SURFACE = '#080D18'; // fondo oscuro de referencia (background .dark)

type RGB = [number, number, number];
type Oklch = { l: number; c: number; h: number };

export function parseHex(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (rgb: RGB) =>
  '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const delin = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** Luminancia relativa WCAG 2.x */
export function luminance(hex: string): number {
  const [r, g, b] = (parseHex(hex) ?? [0, 0, 0]).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Razon de contraste WCAG 2.x (1..21) */
export function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function hexToOklch(hex: string): Oklch {
  const [r, g, b] = (parseHex(hex) ?? [0, 0, 0]).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(a, bb), h: (Math.atan2(bb, a) * 180) / Math.PI };
}
function oklchToHex({ l, c, h }: Oklch): string {
  // Reduce croma hasta caer dentro del gamut sRGB (mantiene L y matiz).
  for (let cc = c; cc >= 0; cc -= 0.002) {
    const a = cc * Math.cos((h * Math.PI) / 180), b = cc * Math.sin((h * Math.PI) / 180);
    const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const v = [
      4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
      -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
      -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
    ];
    if (v.every((x) => x >= -0.0005 && x <= 1.0005))
      return toHex(v.map((x) => delin(Math.min(1, Math.max(0, x)))) as RGB);
  }
  return toHex([l, l, l].map((x) => delin(x ** 3)) as RGB);
}

/** Elige blanco o casi-negro: el de mayor contraste. */
export function pickForeground(bg: string): { fg: string; ratio: number } {
  const w = contrast(WHITE, bg), k = contrast(INK, bg);
  return w >= k ? { fg: WHITE, ratio: w } : { fg: INK, ratio: k };
}

/**
 * Garantiza `min` (por defecto 4.5) entre el color y su mejor texto.
 * Solo los colores "medios" (luminancia ~0.17-0.20, ratio maximo ~4.4-4.5) se tocan:
 * se mueve L de OKLCH en pasos de 0.005, conservando matiz y croma.
 */
export function ensureReadable(bg: string, min = 4.5): { color: string; fg: string; ratio: number; adjusted: boolean } {
  let { fg, ratio } = pickForeground(bg);
  if (ratio >= min) return { color: bg.toUpperCase(), fg, ratio, adjusted: false };
  const o = hexToOklch(bg);
  const dir = fg === WHITE ? -1 : 1; // si gana blanco, oscurecer; si gana negro, aclarar
  let color = bg;
  for (let i = 1; i <= 40 && ratio < min; i++) {
    color = oklchToHex({ ...o, l: Math.min(1, Math.max(0, o.l + dir * 0.005 * i)) });
    ({ fg, ratio } = pickForeground(color));
  }
  return { color, fg, ratio, adjusted: true };
}

/** Mueve L hasta que `color` alcance `min` de contraste contra `surface`. Dir: -1 oscurece, +1 aclara. */
function shiftToContrast(color: string, surface: string, min: number, dir: 1 | -1): string {
  const o = hexToOklch(color);
  let out = color;
  for (let i = 0; i <= 120 && contrast(out, surface) < min; i++)
    out = oklchToHex({ ...o, l: Math.min(1, Math.max(0, o.l + dir * 0.005 * i)) });
  return out;
}

export interface ClientTheme {
  primary: string; primaryForeground: string; // boton solido
  hover: string; hoverForeground: string;
  pressed: string; pressedForeground: string;
  /** Version para usar como TEXTO/ICONO/BORDE sobre superficie clara (>= 4.5:1; 3:1 minimo para bordes) */
  onLight: string;
  /** Tinte muy suave para fondos de seleccion/chips (L ~0.96) con texto foreground normal */
  tint: string;
  dark: {
    primary: string; primaryForeground: string; hover: string; hoverForeground: string;
    pressed: string; pressedForeground: string;
    /** texto/icono/borde sobre superficie oscura, >= 4.5:1 */ onDark: string;
  };
  adjusted: boolean;
}

export function deriveClientTheme(inputHex: string): ClientTheme | null {
  if (!parseHex(inputHex)) return null;
  // 1) modo claro: asegurar texto legible sobre el color tal cual (se ajusta solo si es necesario)
  const base = ensureReadable(inputHex);
  const o = hexToOklch(base.color);
  // 2) hover/pressed: oscurecer; si el color ya es muy oscuro (L<0.40), aclarar
  const step = (d: number) => {
    const sign = o.l < 0.4 ? 1 : -1;
    const col = oklchToHex({ ...o, l: o.l + sign * d });
    return ensureReadable(col);
  };
  const hov = step(0.05), prs = step(0.09);
  // 3) texto/icono sobre claro: 4.5:1 vs blanco (si el primario ya cumple, queda igual)
  const onLight = shiftToContrast(base.color, LIGHT_SURFACE, 4.5, -1);
  // 4) tinte
  const tint = oklchToHex({ l: 0.96, c: Math.min(o.c, 0.035), h: o.h });
  // 5) modo oscuro: boton = color con L suficiente para 4.5:1 sobre el fondo oscuro, croma x0.92
  const dBase = (() => {
    const soft = oklchToHex({ ...o, c: o.c * 0.92 });
    const lifted = shiftToContrast(soft, DARK_SURFACE, 4.5, +1);
    return ensureReadable(lifted);
  })();
  const od = hexToOklch(dBase.color);
  const dStep = (d: number) => ensureReadable(oklchToHex({ ...od, l: Math.min(0.97, od.l + d) })); // en oscuro hover = mas claro
  const dh = dStep(0.04), dp = dStep(-0.05);
  return {
    primary: base.color, primaryForeground: base.fg,
    hover: hov.color, hoverForeground: hov.fg, pressed: prs.color, pressedForeground: prs.fg,
    onLight, tint,
    dark: {
      primary: dBase.color, primaryForeground: dBase.fg, hover: dh.color, hoverForeground: dh.fg,
      pressed: dp.color, pressedForeground: dp.fg, onDark: dBase.color,
    },
    adjusted: base.adjusted,
  };
}

```

Aplicación en CSS (inyectar como style en el contenedor de la liga):
```ts
const t = deriveClientTheme(org.colorPrincipal)!;
const style = {
  '--primary': t.primary, '--primary-foreground': t.primaryForeground,
  '--primary-hover': t.hover, '--primary-pressed': t.pressed, '--primary-on-light': t.onLight, '--primary-tint': t.tint,
  '--ring': t.onLight,
  // modo oscuro: usar clases/variables `--primary-dark*` y `[data-theme=dark]`/`.dark` para seleccionarlas
  '--primary-dark': t.dark.primary, '--primary-dark-foreground': t.dark.primaryForeground,
} as React.CSSProperties;
```
Nota: el `--ring` debe ser `onLight` (≥ 4.5:1 sobre blanco; ≥ 3:1 exigido) para que el foco sea visible con colores claros.

### 7.3 Resultados con 18 colores de ejemplo
Columnas: color · hex · mejor texto sin ajustar y su ratio · ¿ajuste de L? · texto final y ratio · hover/pressed (ratio de su texto) · `onLight` y su ratio contra blanco · variante oscura (ratio contra el fondo oscuro; texto y ratio del botón).

| Color | Hex | Mejor texto | ¿Ajuste? | Final | Hover / pressed | onLight (vs blanco) | Oscuro (vs fondo oscuro) |
|---|---|---|---|---|---|---|---|
| verde actual | #16A34A | negro 6.09 | no | negro 6.09 | #00923F / #038438 (5.0 / 4.8) | #04893B 4.52 | #2DA150 5.85 (negro 6.04) |
| amarillo | #FACC15 | negro 13.10 | no | negro 13.10 | #E7BC05 / #D8B003 (11.1 / 9.7) | #8E7302 4.56 | #F7CD3B 12.72 (negro 13.14) |
| dorado | #FFD700 | negro 14.31 | no | negro 14.31 | #ECC70D / #DDBA0B (12.2 / 10.6) | #8C7501 4.51 | #FCD839 13.89 (negro 14.35) |
| cian | #06B6D4 | negro 8.27 | no | negro 8.27 | #00A5C1 / #0598B1 (6.8 / 5.9) | #078298 4.51 | #2FB5D0 7.99 (negro 8.26) |
| naranja | #F97316 | negro 7.16 | no | negro 7.16 | #E46603 / #D25D00 (5.9 / 5.1) | #C25500 4.57 | #F3782E 6.97 (negro 7.20) |
| azul oscuro | #1E3A8A | blanco 10.36 | no | blanco 10.36 | #2A499A / #3554A7 (8.3 / 7.1) | #1E3A8A 10.36 | #5778C6 4.54 (negro 4.69) |
| rojo | #DC2626 | blanco 4.83 | no | blanco 4.83 | #CA0012 / #B6000F (6.0 / 7.0) | #DC2626 4.83 | #DE3F38 4.51 (negro 4.66) |
| violeta | #7C3AED | blanco 5.70 | no | blanco 5.70 | #6F24DB / #6408CD (7.1 / 8.5) | #7C3AED 5.70 | #8C59FA 4.56 (negro 4.71) |
| rosa | #EC4899 | negro 5.69 | no | negro 5.69 | #DA358A / #CC247E (4.6 / 5.1) | #D63187 4.52 | #E65198 5.55 (negro 5.73) |
| teal | #0F766E | blanco 5.47 | no | blanco 5.47 | #02665F / #005A54 (6.8 / 8.1) | #0F766E 5.47 | #36877E 4.55 (negro 4.70) |
| lima | #84CC16 | negro 10.16 | no | negro 10.16 | #77BB06 / #6EAD02 (8.5 / 7.3) | #528301 4.56 | #88CA35 9.76 (negro 10.08) |
| gris medio | #808080 | negro 5.08 | no | negro 5.08 | #717171 / #666666 (4.9 / 5.7) | #767676 4.54 | #808080 4.92 (negro 5.08) |
| negro | #000000 | blanco 21.00 | no | blanco 21.00 | #000000 / #020202 (21.0 / 20.7) | #000000 21.00 | #7A7A7A 4.53 (negro 4.67) |
| blanco | #FFFFFF | negro 20.07 | no | negro 20.07 | #EEEEEE / #E1E1E1 (17.3 / 15.3) | #767676 4.54 | #FFFFFF 19.42 (negro 20.07) |
| azul medio | #2563EB | blanco 5.17 | no | blanco 5.17 | #1652DA / #0745CC (6.5 / 7.7) | #2563EB 5.17 | #3973EF 4.51 (negro 4.66) |
| verde medio | #22C55E | negro 8.81 | no | negro 8.81 | #06B451 / #00A64A (7.3 / 6.3) | #01883B 4.58 | #3BC365 8.49 (negro 8.77) |
| magenta | #C026D3 | blanco 4.71 | no | blanco 4.71 | #AF03C2 / #9E00AF (5.8 / 6.8) | #C026D3 4.71 | #C23ED3 4.55 (negro 4.70) |
| borde 4.5 (azul #0070D1) | #0070D1 | blanco 4.95 | no | blanco 4.95 | #0162B8 / #0057A4 (6.1 / 7.2) | #0070D1 4.95 | #287CD6 4.57 (negro 4.72) |

Barrido de robustez (20 000 colores aleatorios, todos los estados y variantes):
`SWEEP n=20000 ajustados=86 (0.4%) peor contraste=4.500 bajo4.5=0 fallas_tabla=0`

Ejemplos reales de colores corregidos por la regla 2:
```
EJEMPLO #CE3D91 mejor texto #05080C 4.49 -> #D03F93 #05080C 4.60
EJEMPLO #9850ED mejor texto #05080C 4.50 -> #9952EF #05080C 4.59
EJEMPLO #D328AD mejor texto #FFFFFF 4.49 -> #D126AB #FFFFFF 4.59
```

Los 18 colores incluyen amarillo, dorado, cian, naranja, azul oscuro, blanco, negro y grises. Mínimo de todos los pares generados: 4.50:1.

## 8. Daltonismo y redundancia

### 8.1 Regla general
Ningún significado depende solo del color: **color + forma + texto/ícono**. Los íconos llevan `aria-hidden` cuando acompañan texto visible; si no hay texto, `aria-label`. Animaciones (pulso de "en vivo") respetan `prefers-reduced-motion`.

| Estado | Color | Forma/ícono | Texto |
|---|---|---|---|
| Tarjeta amarilla | `tarjeta-amarilla` + **contorno 2px foreground** | Rectángulo vertical (carta) con **una** muesca/raya | "Amarilla" (y minuto, p. ej. `23'`) |
| Segunda amarilla | amarilla + roja | Dos cartas superpuestas | "2ª amarilla" |
| Tarjeta roja | `tarjeta-roja` | Rectángulo vertical **con aspa (X)** o esquina rellena | "Roja" |
| En vivo | `en-vivo` | Punto pulsante (círculo) + borde izquierdo de 4px en la tarjeta | "EN VIVO" + minuto; en reduced-motion el punto queda fijo |
| Gol | `gol` | Balón | "Gol" + minuto + jugador |
| Finalizado | `finalizado` | Check circular | "FIN" |
| Pendiente | `pendiente` | Reloj | Hora ("19:30") |
| W.O. | `wo` | Ícono "prohibido"/línea cruzada | "W.O." |
| Ganó / Empató / Perdió | `success` / `finalizado` / `destructive` | Círculo con ✓ / guion / × (formas distintas) | Letra **G / E / P** (con `aria-label` "Ganó"…) y, en tablas, marcador |
| Tabla de posiciones (zona de ascenso/descenso) | color de franja | Franja lateral con patrón (rayas vs. liso) | Leyenda textual |

Además en Mesa: botones de evento con ícono **y** etiqueta ("Amarilla", "Roja", "Gol") siempre visibles, nunca solo color; y el contraste de la tinta sobre el amarillo es ≥ 12:1.

### 8.2 Medición: pares críticos bajo simulación
Celdas = "ΔE OKLab · ΔL" (diferencia de luminosidad percibida). Una diferencia de L ≥ 0.15 mantiene los pares distinguibles aunque cambie el tono; donde ΔE baja de ~0.10 en alguna visión, la redundancia de forma/texto es **obligatoria** (no opcional).

| Paleta/modo | Par | Normal | Protanopia | Deuteranopia | Tritanopia |
|---|---|---|---|---|---|
| A claro | amarilla vs roja (ΔE · ΔL) | 0.38 · 0.32 | 0.41 · 0.40 | 0.32 · 0.32 | 0.32 · 0.29 |
| A claro | roja vs en-vivo | 0.06 · 0.03 | 0.05 · 0.02 | 0.04 · 0.03 | 0.04 · 0.03 |
| A claro | ganó (success) vs perdió (destructive) | 0.29 · 0.02 | 0.15 · 0.15 | 0.04 · 0.01 | 0.31 · 0.00 |
| A claro | ganó vs empató (finalizado) | 0.17 · 0.08 | 0.16 · 0.10 | 0.13 · 0.09 | 0.11 · 0.09 |
| A claro | gol vs en-vivo | 0.33 · 0.04 | 0.12 · 0.10 | 0.06 · 0.06 | 0.34 · 0.06 |
| A oscuro | amarilla vs roja (ΔE · ΔL) | 0.30 · 0.22 | 0.32 · 0.30 | 0.22 · 0.21 | 0.28 · 0.22 |
| A oscuro | roja vs en-vivo | 0.09 · 0.08 | 0.11 · 0.10 | 0.09 · 0.07 | 0.08 · 0.06 |
| A oscuro | ganó (success) vs perdió (destructive) | 0.32 · 0.06 | 0.19 · 0.18 | 0.05 · 0.05 | 0.34 · 0.09 |
| A oscuro | ganó vs empató (finalizado) | 0.21 · 0.09 | 0.19 · 0.12 | 0.15 · 0.09 | 0.15 · 0.09 |
| A oscuro | gol vs en-vivo | 0.35 · 0.08 | 0.24 · 0.21 | 0.08 · 0.07 | 0.36 · 0.11 |
| B claro | amarilla vs roja (ΔE · ΔL) | 0.38 · 0.32 | 0.41 · 0.40 | 0.32 · 0.32 | 0.32 · 0.29 |
| B claro | roja vs en-vivo | 0.10 · 0.01 | 0.11 · 0.00 | 0.09 · 0.01 | 0.03 · 0.01 |
| B claro | ganó (success) vs perdió (destructive) | 0.29 · 0.02 | 0.15 · 0.15 | 0.04 · 0.01 | 0.31 · 0.00 |
| B claro | ganó vs empató (finalizado) | 0.16 · 0.08 | 0.14 · 0.12 | 0.10 · 0.08 | 0.14 · 0.09 |
| B claro | gol vs en-vivo | 0.34 · 0.00 | 0.18 · 0.13 | 0.05 · 0.01 | 0.31 · 0.01 |
| B oscuro | amarilla vs roja (ΔE · ΔL) | 0.30 · 0.22 | 0.32 · 0.30 | 0.22 · 0.21 | 0.28 · 0.22 |
| B oscuro | roja vs en-vivo | 0.15 · 0.09 | 0.17 · 0.12 | 0.14 · 0.08 | 0.11 · 0.08 |
| B oscuro | ganó (success) vs perdió (destructive) | 0.31 · 0.06 | 0.19 · 0.17 | 0.05 · 0.05 | 0.33 · 0.08 |
| B oscuro | ganó vs empató (finalizado) | 0.20 · 0.08 | 0.16 · 0.13 | 0.11 · 0.08 | 0.17 · 0.08 |
| B oscuro | gol vs en-vivo | 0.37 · 0.06 | 0.24 · 0.18 | 0.11 · 0.06 | 0.34 · 0.09 |
| C claro | amarilla vs roja (ΔE · ΔL) | 0.38 · 0.32 | 0.41 · 0.40 | 0.32 · 0.32 | 0.32 · 0.29 |
| C claro | roja vs en-vivo | 0.06 · 0.03 | 0.05 · 0.02 | 0.04 · 0.03 | 0.04 · 0.03 |
| C claro | ganó (success) vs perdió (destructive) | 0.29 · 0.02 | 0.15 · 0.15 | 0.04 · 0.01 | 0.31 · 0.00 |
| C claro | ganó vs empató (finalizado) | 0.17 · 0.08 | 0.16 · 0.10 | 0.13 · 0.09 | 0.11 · 0.09 |
| C claro | gol vs en-vivo | 0.33 · 0.04 | 0.12 · 0.10 | 0.06 · 0.06 | 0.34 · 0.06 |
| C oscuro | amarilla vs roja (ΔE · ΔL) | 0.30 · 0.22 | 0.32 · 0.30 | 0.22 · 0.21 | 0.28 · 0.22 |
| C oscuro | roja vs en-vivo | 0.09 · 0.08 | 0.11 · 0.10 | 0.09 · 0.07 | 0.08 · 0.06 |
| C oscuro | ganó (success) vs perdió (destructive) | 0.32 · 0.06 | 0.19 · 0.18 | 0.05 · 0.05 | 0.34 · 0.09 |
| C oscuro | ganó vs empató (finalizado) | 0.21 · 0.09 | 0.19 · 0.12 | 0.15 · 0.09 | 0.15 · 0.09 |
| C oscuro | gol vs en-vivo | 0.34 · 0.15 | 0.28 · 0.27 | 0.14 · 0.14 | 0.36 · 0.18 |


Lectura honesta de los números:
- **Amarilla vs roja**: bien separadas (ΔE 0.22–0.41, ΔL 0.21–0.40) en las 4 visiones; se distinguen sobre todo por **luminosidad**. Aun así llevan forma y texto distintos.
- **Roja vs en-vivo**: ΔE solo 0.03–0.17 (en A claro 0.06; en tritanopia 0.03-0.04). Son colores demasiado parecidos para depender del tono. Regla de diseño: "en vivo" **nunca** se representa con el rectángulo de tarjeta y siempre lleva el punto pulsante + texto "EN VIVO"; la tarjeta roja siempre es un rectángulo con X + texto "Roja". Si se quiere más separación, cambiar en-vivo a otro matiz (p. ej. cian) es una opción pendiente de decisión de marca.
- **Ganó vs perdió** (verde vs rojo): en deuteranopia ΔE 0.04–0.05 y ΔL ≈ 0.01–0.05: **prácticamente indistinguibles solo por color**. Por eso G/E/P + ícono con formas distintas es obligatorio, no decorativo. En protanopia ΔE 0.15–0.19, en tritanopia ≥ 0.31.
- **Gol vs en-vivo**: débil en deuteranopia (0.05–0.11); misma regla de forma/texto (balón + minuto vs punto + "EN VIVO").
- Se evitó rojo vs verde como única distinción en cualquier componente.

### 8.3 Charts 1–5: cómo se verificaron
Método: de un banco de 23 colores candidatos (claro) y 20 (oscuro), filtrados a **≥ 3:1 contra el fondo**, se evaluaron **todas las combinaciones de 5** (C(n,5), búsqueda exhaustiva) y se eligió la de mayor **mínimo ΔE entre cualquier par**, calculado en visión normal, protanopia, deuteranopia y tritanopia. Se reordenaron para que series adyacentes no sean las más parecidas.

**Modo claro**: chart-1 `#C2570C`, chart-2 `#7E22CE`, chart-3 `#0A7F6A`, chart-4 `#475569`, chart-5 `#9A3412`

| Visión | ΔE mínimo (OKLab) | Par más cercano |
|---|---|---|
| normal | 0.117 | chart-1/chart-5 |
| protanopia | 0.101 | chart-1/chart-3 |
| deuteranopia | 0.096 | chart-3/chart-4 |
| tritanopia | 0.094 | chart-2/chart-4 |

**Modo oscuro**: chart-1 `#FB923C`, chart-2 `#C4B5FD`, chart-3 `#86EFAC`, chart-4 `#FACC15`, chart-5 `#94A3B8`

| Visión | ΔE mínimo (OKLab) | Par más cercano |
|---|---|---|
| normal | 0.126 | chart-2/chart-5 |
| protanopia | 0.109 | chart-2/chart-5 |
| deuteranopia | 0.105 | chart-1/chart-4 |
| tritanopia | 0.103 | chart-2/chart-5 |


Por qué no se verificó "a ojo": el banco incluye tonos Okabe-Ito/Tailwind y la selección es la óptima de la búsqueda. Aun así, para gráficos de series: usar **marcadores de forma distinta** (círculo, cuadrado, triángulo, rombo, cruz), **trazos distintos** (sólido, guiones, puntos) o **etiquetas directas** en vez de leyenda por color; los chart-n sobre `background` cumplen 3:1 (tablas 6.x). Valores de ΔE ≥ 0.09 equivalen a diferencias claramente visibles; con eso ya es seguro pero no sustituye la redundancia.

Tokens recomendados (claro): `chart-1 #C2570C`, `chart-2 #7E22CE`, `chart-3 #0A7F6A`, `chart-4 #475569`, `chart-5 #9A3412`. (oscuro): `#FB923C`, `#C4B5FD`, `#86EFAC`, `#FACC15`, `#94A3B8`. Limitación: chart-1 y chart-5 (naranja/marrón) son parientes; cuando haya 5 series se deben combinar con trazo/marcador distinto, y para ≤ 4 series usar 1–4.

## 9. Tipografía

Pesos medidos = archivo woff2 del subset `latin` de Google Fonts (el que carga `next/font/google` con `subsets: ['latin']`; incluye tildes y ñ). `tnum` verificado en la tabla GSUB; las fuentes monoespaciadas son tabulares por construcción.

| Fuente | Archivos latin | KB | `tnum` | Notas |
|---|---|---|---|---|
| Barlow Condensed 700 | 1 | 21.9 | sí | Condensada deportiva; cabe nombres largos de equipo |
| Barlow 400 + 600 | 2 | 21.7 + 22.2 | sí | Texto legible, tono deportivo |
| Archivo (variable 400-800) | 1 | 34.1 | sí | Grotesca variable: titulares 800 y texto 400/500 con un solo archivo |
| Atkinson Hyperlegible Mono (variable 400-700) | 1 | 17.3 | monoespaciada | Diseñada por Braille Institute para distinguir caracteres |
| Atkinson Hyperlegible Next (variable) | 1 | 33.2 | sí | Alternativa proporcional |
| Bricolage Grotesque 700 | 1 | 21.9 | sí | Display con carácter, menos "deportiva" |
| Figtree (variable 400-700) | 1 | 19.7 | sí | Texto geométrico amable |
| Geist (variable) / Geist Mono | 1 / 1 | 28.7 / 22.6 | sí / mono | Lo que usa hoy el proyecto (51.3 KB) |
| Inter (variable) | 1 | 47.1 | sí | Pesada para el beneficio |
| JetBrains Mono / Roboto Mono (var.) | 1 / 1 | 30.7 / 32.0 | mono | Más pesadas que Atkinson Mono |

### Par 1 — "Deportivo condensado" (≈ 66 KB solo latin)
- **Titulares y nombres de equipo:** Barlow Condensed 700. **Texto:** Barlow 400/600. **Números de tabla:** Barlow con `font-variant-numeric: tabular-nums`.
- Pros: carácter claramente deportivo (inspirado en señalética), condensada: nombres largos como "Deportivo Walter Ferrety" caben en móvil. Contras: 3 archivos estáticos (más peticiones), Barlow regular es algo menos legible que una grotesca moderna en 14 px.

### Par 2 — "Neutro versátil" (≈ 51 KB) **← recomendado**
- **Titulares y texto:** Archivo (un solo archivo variable; titulares `wght 800`, texto 400–500, tablas con `tabular-nums`). **Marcador de Mesa y relojes:** Atkinson Hyperlegible Mono 700.
- Pros: un archivo para toda la UI (34 KB), peso total más bajo que el par 1 y similar al actual (Geist+Geist Mono 51 KB); legibilidad alta; tildes/ñ en el subset latin. Contras: menos "deportiva" que una condensada; se compensa con peso 800 y mayúsculas en titulares.

### Par 3 — "Con personalidad" (≈ 59 KB)
- **Titulares:** Bricolage Grotesque 700 (21.9). **Texto:** Figtree (19.7). **Marcador:** Atkinson Hyperlegible Mono (17.3).
- Pros: marca más distintiva. Contras: Bricolage es expresiva y puede cansar en tablas; tres familias.

### Marcador de Mesa: qué usar para los dígitos
**Atkinson Hyperlegible Mono 700**, con `font-variant-numeric: tabular-nums` (redundante, es monoespaciada) para que `10:23` no "baile" al avanzar el reloj. Razones: (1) está diseñada para maximizar la diferencia entre caracteres similares — el 1 lleva base/serif, el 0 se distingue del O y del 6, el 3 y el 8 tienen aperturas diferentes; (2) solo 17.3 KB; (3) soporte latin completo. Nota honesta: esta afirmación se basa en la documentación y propósito de diseño de la fuente (Braille Institute), no se hizo prueba visual con usuarios; **se debe validar con una captura real de 1/7, 3/8, 0/6 a 96–144 px en una tablet** antes de cerrar. Alternativa si no convence: Barlow Condensed 700 con `tnum` (más angosta, útil en pantallas pequeñas).

Tamaños sugeridos para Mesa: marcador `clamp(4rem, 18vw, 9rem)` peso 700; reloj `clamp(2.5rem, 10vw, 5rem)`; nombre de equipo ≥ 1.5rem; texto de botones ≥ 1.125rem (18px) peso 600; `line-height: 1` en cifras grandes.

### Implementación en `next/font/google` (Next.js 16)
```ts
import { Archivo, Atkinson_Hyperlegible_Mono } from 'next/font/google';
export const sans = Archivo({ subsets: ['latin'], variable: '--font-sans', display: 'swap' }); // variable: se carga el eje de peso completo
export const marcador = Atkinson_Hyperlegible_Mono({ subsets: ['latin'], variable: '--font-marcador', display: 'swap', weight: ['700'] });
```
Nota: cargar solo `latin`; verificar en `node_modules/next/dist/docs/` la API vigente de `next/font` (AGENTS.md avisa de cambios). No se probó el build; el snippet es orientativo. Peso para Android gama media: mantener ≤ 60 KB de fuentes, `display: swap`, precarga solo de la fuente de texto; el marcador solo se carga en la ruta de Mesa/partido.

## 10. Recomendación final: Paleta A — "Cobalto Nica"

Razones (cada una respaldada por las mediciones arriba):
1. **No compite con el color del cliente.** La marca base es azul y los neutros llevan un tinte azulado frío; cualquier color de cliente (verde, rojo, naranja, amarillo) convive bien. Paleta B tiñe todo de cálido; Paleta C choca con los clientes verdes, que serán los más frecuentes en fútbol.
2. **Los significados del fútbol quedan libres.** Verde = gol/éxito, amarillo y rojo = tarjetas, magenta = en vivo; el primario azul no se confunde con ninguno. En C, primario y `success`/`gol` serían ambos verdes.
3. **Mejor comportamiento con daltonismo.** El eje azul-naranja es el que menos se degrada en protanopia/deuteranopia; el primario no depende de la distinción rojo-verde.
4. **Contraste.** Todas las parejas pasan AA en claro/oscuro; en Mesa, `primary-strong #1E40AF` con blanco llega a AAA con holgura y la variante oscura `#93B6FF` con tinta también; solo se requieren ajustes menores (tabla 6.4) para llevar el resto a 7:1.
5. **Continuidad y migración sencilla.** El cambio de `#16a34a` a azul es una sustitución de tokens (mismos nombres que `globals.css`); el verde provisional sigue vivo como `success`/`gol`.

Riesgos a vigilar de la Paleta A:
- El acento dorado `#F5B700` se parece a la tarjeta amarilla `#FACC15`. Regla: el dorado se usa solo en marca/decoración (insignias de campeón, acentos del sitio) y **nunca** en pantallas de eventos del partido ni sobre tablas de disciplina.
- Azul es el color más común en SaaS: la diferenciación debe venir de tipografía (Archivo 800 en mayúsculas), del dorado y del marcador grande en Atkinson Mono.
- Validar la elección con 2–3 clientes reales y una captura a pleno sol en Android: la medición de contraste WCAG es necesaria pero no sustituye una prueba de campo del modo Mesa.

### Próximos pasos sugeridos (fuera del alcance de esta investigación)
1. Copiar la paleta ganadora a `globals.css` (mantener nombres), agregar `success/warning/info`, estados de fútbol y `.mesa` en `@theme inline`.
2. Implementar `client-color.ts` + pruebas unitarias con los 18 colores (los de la tabla 7.3).
3. Crear componentes `EstadoBadge`, `TarjetaIcono`, `ResultadoGEP` con redundancia de sección 8.1.
4. Validar tipografía del marcador con captura real de 1/7, 3/8, 0/6 en tablet.
