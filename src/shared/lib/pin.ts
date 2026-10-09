/** PIN de 6 dígitos (texto: puede empezar con 0). */
export const PIN_VALIDO = /^\d{6}$/;

/**
 * ¿El PIN es débil? (`FRONT_FASE_03.md` §9.2): todos los dígitos iguales, escalera completa ascendente o
 * descendente sin dar la vuelta, o un bloque más corto que se repite. Con `actual`, también si es igual a él.
 * Solo da retroalimentación inmediata: el API manda (`400 PIN_DEBIL`).
 */
export function pinDebil(pin: string, actual?: string): boolean {
  if (!PIN_VALIDO.test(pin)) return false;
  if (actual !== undefined && pin === actual) return true;
  const d = [...pin].map(Number);
  if (d.every((x) => x === d[0])) return true;
  if (d.every((x, i) => i === 0 || x === d[i - 1] + 1)) return true;
  if (d.every((x, i) => i === 0 || x === d[i - 1] - 1)) return true;
  for (let n = 1; n <= 3; n++) {
    if (pin.length % n === 0 && pin === pin.slice(0, n).repeat(pin.length / n)) return true;
  }
  return false;
}
