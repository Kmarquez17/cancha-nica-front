/**
 * Color de cada cliente (liga). Reemplaza solo --primary, --primary-foreground, --ring y --sidebar-primary*
 * (docs/marca/MANUAL-DE-MARCA.md §3.6). Si el color no se lee bien se ajusta (tono igual, luz distinta) hasta cumplir:
 *   - texto sobre el color: 4,5:1 (AA) o 7:1 en Mesa (AAA);
 *   - color contra el fondo de la app (bordes, foco, botón): 3:1.
 * El texto sobre el color se elige entre blanco y Tinta, el que tenga más contraste.
 */

export const FONDO_CLARO = '#F4F8F3';
export const FONDO_OSCURO = '#07180F';
export const TEXTO_BLANCO = '#FFFFFF';
export const TEXTO_TINTA = '#04110A';

const HEX = /^#[0-9a-fA-F]{6}$/;

export type Rgb = [number, number, number];
export type Hsl = [number, number, number]; // h 0-360, s y l 0-1

export function esHex(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && HEX.test(valor);
}

export function hexARgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

export function rgbAHex([r, g, b]: Rgb): string {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(Math.min(255, Math.max(0, v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

export function luminancia(hex: string): number {
  const [r, g, b] = hexARgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function rgbAHsl([r, g, b]: Rgb): Hsl {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function hslARgb([h, s, l]: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Texto (blanco o Tinta) con más contraste sobre `fondo`. */
export function textoSobre(fondo: string): string {
  return contraste(TEXTO_BLANCO, fondo) >= contraste(TEXTO_TINTA, fondo)
    ? TEXTO_BLANCO
    : TEXTO_TINTA;
}

export type TemaColor = { primary: string; primaryForeground: string; ajustado: boolean };

function cumple(color: string, fondo: string, minTexto: number): boolean {
  return contraste(color, fondo) >= 3 && contraste(textoSobre(color), color) >= minTexto;
}

/** Acerca el color a cumplir moviendo solo la luz (tono y saturación se conservan). */
function ajustar(hex: string, fondo: string, minTexto: number, direccion: 1 | -1): TemaColor {
  let color = hex.toUpperCase();
  if (cumple(color, fondo, minTexto)) {
    return { primary: color, primaryForeground: textoSobre(color), ajustado: false };
  }
  const [h, s, l0] = rgbAHsl(hexARgb(color));
  for (let paso = 1; paso <= 100; paso++) {
    const l = Math.min(1, Math.max(0, l0 + (direccion * paso) / 100));
    color = rgbAHex(hslARgb([h, s, l]));
    if (cumple(color, fondo, minTexto)) break;
  }
  return { primary: color, primaryForeground: textoSobre(color), ajustado: true };
}

export type TemaCliente = { claro: TemaColor; oscuro: TemaColor };

/**
 * Valores para tema claro y oscuro a partir del color del cliente (`#RRGGBB`).
 * En claro el color se oscurece si hace falta; en oscuro se aclara. `null` si el color no es válido.
 */
export function temaDeCliente(
  color: string | null | undefined,
  nivel: 'normal' | 'mesa' = 'normal',
): TemaCliente | null {
  if (!esHex(color)) return null;
  const minTexto = nivel === 'mesa' ? 7 : 4.5;
  return {
    claro: ajustar(color, FONDO_CLARO, minTexto, -1),
    oscuro: ajustar(color, FONDO_OSCURO, minTexto, 1),
  };
}

/** CSS con las variables del cliente. `alcance` limita a un contenedor; sin él afecta a toda la página. */
export function cssTemaCliente(tema: TemaCliente, alcance?: string): string {
  const vars = (t: TemaColor) =>
    `--primary:${t.primary};--primary-foreground:${t.primaryForeground};--ring:${t.primary};` +
    `--sidebar-primary:${t.primary};--sidebar-primary-foreground:${t.primaryForeground};--sidebar-ring:${t.primary};`;
  const claro = alcance ?? ':root:root';
  const oscuro = alcance ? `.dark ${alcance}` : ':root.dark';
  return `${claro}{${vars(tema.claro)}}${oscuro}{${vars(tema.oscuro)}}`;
}
