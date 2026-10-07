import { z } from 'zod';
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

export const ligaSchema = z.object({
  nombre,
  slug: z
    .string()
    .trim()
    .min(3, 'Usa al menos 3 caracteres.')
    .max(40, 'Usa como máximo 40 caracteres.')
    .regex(SLUG_RE, 'Solo minúsculas, números y guiones simples.'),
  telefonoContacto: telefonoOpcional,
  zonaHoraria: z.string().trim(),
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
export type LigaValues = z.infer<typeof ligaSchema>;

export const duenoSchema = z.object({
  duenoNombre: nombre,
  duenoEmail: z.email({ error: 'Escribe un correo válido.' }),
  duenoTelefono: telefonoOpcional,
  enviarEmail: z.boolean(),
});
export type DuenoValues = z.infer<typeof duenoSchema>;

export const nuevaLigaSchema = ligaSchema.and(duenoSchema);
export type NuevaLigaValues = z.infer<typeof nuevaLigaSchema>;

export const editarLigaSchema = ligaSchema.omit({ slug: true });
export type EditarLigaValues = z.infer<typeof editarLigaSchema>;

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
