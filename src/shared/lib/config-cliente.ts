import { z } from 'zod';

/** Zona horaria IANA válida (Intl lanza RangeError si no existe). */
export function esZonaHoraria(valor: string): boolean {
  try {
    new Intl.DateTimeFormat('es', { timeZone: valor });
    return true;
  } catch {
    return false;
  }
}

/**
 * Configuración regional del cliente. Plataforma solo la indica al CREAR; después la edita el
 * dueño o un admin desde su portal (R15). Vacío = no enviar.
 */
export const configCamposSchema = z.object({
  zonaHoraria: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || esZonaHoraria(v),
      'Zona horaria IANA válida, p. ej. America/Managua.',
    ),
  moneda: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^[A-Z]{3}$/.test(v),
      'Código ISO de 3 letras mayúsculas, p. ej. NIO.',
    ),
  pais: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^[A-Z]{2}$/.test(v),
      'Código ISO de 2 letras mayúsculas, p. ej. NI.',
    ),
  colorPrimario: z
    .string()
    .trim()
    .refine((v) => v === '' || /^#[0-9a-fA-F]{6}$/.test(v), 'Formato #RRGGBB.'),
});
export type ConfigValues = z.infer<typeof configCamposSchema>;
