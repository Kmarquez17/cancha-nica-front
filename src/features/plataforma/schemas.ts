import { z } from 'zod';
import { configCamposSchema } from '@/shared/lib/config-cliente';
import { aE164 } from './lib/formato';

const nombre = z
  .string()
  .trim()
  .min(3, 'Usa al menos 3 caracteres.')
  .max(80, 'Usa como máximo 80 caracteres.');

const telefonoOpcional = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || aE164(v) !== null,
    'Usa el formato internacional con + y código de país, p. ej. +50588888888.',
  );

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Crear cliente: datos propios + configuración inicial. */
export const clienteSchema = z
  .object({
    nombre,
    slug: z
      .string()
      .trim()
      .min(3, 'Usa al menos 3 caracteres.')
      .max(40, 'Usa como máximo 40 caracteres.')
      .regex(SLUG_RE, 'Solo minúsculas, números y guiones simples.'),
    telefonoContacto: telefonoOpcional,
  })
  .and(configCamposSchema);
export type ClienteValues = z.infer<typeof clienteSchema>;

export const duenoSchema = z.object({
  duenoNombre: nombre,
  duenoEmail: z.email({ error: 'Escribe un correo válido.' }),
  duenoTelefono: telefonoOpcional,
  enviarEmail: z.boolean(),
});
export type DuenoValues = z.infer<typeof duenoSchema>;

export const nuevoClienteSchema = clienteSchema.and(duenoSchema);
export type NuevoClienteValues = z.infer<typeof nuevoClienteSchema>;

/**
 * Editar cliente desde plataforma: SOLO nombre y teléfono de contacto. Enviar zona horaria,
 * moneda, país o color responde 400 `VALIDATION_ERROR` (cambio rompedor de la Fase 1b).
 */
export const editarClienteSchema = z.object({ nombre, telefonoContacto: telefonoOpcional });
export type EditarClienteValues = z.infer<typeof editarClienteSchema>;

export const bloquearSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(3, 'Explica el motivo (mínimo 3 caracteres).')
    .max(500, 'Usa como máximo 500 caracteres.'),
});
export type BloquearValues = z.infer<typeof bloquearSchema>;

/** "" -> undefined, para no enviar campos vacíos al API. */
export const vacioAUndefined = (v: string): string | undefined =>
  v.trim() === '' ? undefined : v.trim();

export const invitarSchema = z.object({
  nombre,
  email: z.email({ error: 'Escribe un correo válido.' }),
  telefono: telefonoOpcional,
  enviarEmail: z.boolean(),
});
export type InvitarValues = z.infer<typeof invitarSchema>;
