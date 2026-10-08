import { z } from 'zod';
import { refinarReglas, reglasObjeto } from '../lib/reglas';
import { dineroObjeto } from '../lib/sanciones';
import { MODALIDADES } from '../tipos';

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige una fecha.');

/** Datos de la liga + reglas de la modalidad + sanciones y dinero, todo plano para react-hook-form. */
export const ligaSchema = reglasObjeto
  .extend(dineroObjeto.shape)
  .extend({
    nombre: z
      .string()
      .trim()
      .min(3, 'Escribe el nombre (mínimo 3 letras).')
      .max(80, 'Máximo 80 caracteres.'),
    categoriaId: z.string().min(1, 'Elige una categoría.'),
    modalidad: z.enum(MODALIDADES),
    fechaInicio: fecha,
    fechaFinEstimada: z
      .string()
      .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Elige una fecha.'),
    slug: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v),
        'Solo minúsculas, números y guiones.',
      ),
  })
  .superRefine((v, ctx) => {
    refinarReglas(v, ctx);
    if (v.fechaFinEstimada !== '' && v.fechaFinEstimada < v.fechaInicio)
      ctx.addIssue({
        code: 'custom',
        path: ['fechaFinEstimada'],
        message: 'No puede ser anterior al inicio.',
      });
  });

export type LigaValues = z.infer<typeof ligaSchema>;
