import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Escribe un correo válido.' }),
  password: z.string().min(1, 'Escribe tu contraseña.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const olvideSchema = z.object({
  email: z.email({ error: 'Escribe un correo válido.' }),
});
export type OlvideValues = z.infer<typeof olvideSchema>;

/** Misma regla que el API: 10–128 caracteres y no un solo carácter repetido. El resto lo valida el API. */
export const passwordSchema = z
  .string()
  .min(10, 'Usa al menos 10 caracteres.')
  .max(128, 'Usa como máximo 128 caracteres.')
  .refine((v) => new Set(v).size > 1, 'No uses un solo carácter repetido.');

export const definirPasswordSchema = z
  .object({
    password: passwordSchema,
    repetir: z.string(),
  })
  .refine((v) => v.password === v.repetir, {
    path: ['repetir'],
    error: 'Las contraseñas no coinciden.',
  });
export type DefinirPasswordValues = z.infer<typeof definirPasswordSchema>;
