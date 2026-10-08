/**
 * El contrato maneja las fechas de la liga como `date-time` ISO 8601. La pantalla solo pide el día, así que se
 * guarda siempre a medianoche UTC y se muestra el día en UTC: así no se corre un día según la zona horaria.
 */

/** `2026-11-01T00:00:00.000Z` -> `2026-11-01` (valor de un `<input type="date">`). */
export const aFechaInput = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10) : '';

/** `2026-11-01` -> `2026-11-01T00:00:00.000Z`; vacío -> `null`. */
export const aIso = (fecha: string): string | null => (fecha ? `${fecha}T00:00:00.000Z` : null);

/** «1 nov 2026». */
export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(iso),
  );
}
