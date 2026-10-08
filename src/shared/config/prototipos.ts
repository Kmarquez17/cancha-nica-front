/**
 * Pantallas que existen solo como prototipo con datos simulados (MSW) porque el backend aún no publica su
 * contrato: hoy, clubes, delegados, equipos y el portal del delegado (Fase 3). Sin MSW no se ofrecen en el menú,
 * porque llamarían a endpoints que no existen. Se quita cuando la Fase 3 tenga contrato real.
 */
export const HAY_PROTOTIPOS = process.env.NEXT_PUBLIC_USE_MSW === 'true';
