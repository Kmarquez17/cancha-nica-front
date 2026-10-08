import { configCamposSchema } from '@/shared/lib/config-cliente';

export type { ConfigValues } from '@/shared/lib/config-cliente';

const OBLIGATORIOS = ['zonaHoraria', 'moneda', 'pais', 'colorPrimario'] as const;

/** Al editar, los cuatro campos tienen valor: no se puede dejar uno vacío. */
export const configEditarSchema = configCamposSchema.superRefine((v, ctx) => {
  for (const campo of OBLIGATORIOS) {
    if (v[campo] === '') {
      ctx.addIssue({ code: 'custom', path: [campo], message: 'Este campo es obligatorio.' });
    }
  }
});
