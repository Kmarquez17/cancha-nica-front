import { describe, expect, it } from 'vitest';
import {
  PRESETS,
  formAReglas,
  normalizarNombre,
  presetAForm,
  reglasAForm,
  reglasFormSchema,
  slugDeEdicion,
} from '@/features/ediciones/lib/reglas';
import { MODALIDADES } from '@/features/ediciones/tipos';

describe('presets de modalidad', () => {
  it.each(MODALIDADES)('el preset de %s pasa todas las invariantes', (m) => {
    expect(reglasFormSchema.safeParse(presetAForm(m)).success).toBe(true);
  });

  it('ida y vuelta entre reglas del API y valores del formulario', () => {
    for (const m of MODALIDADES) {
      const { reglas, parametros } = PRESETS[m];
      expect(formAReglas(reglasAForm(reglas, parametros))).toEqual({ reglas, parametros });
    }
  });

  it('la inferioridad de la roja pasa de milisegundos a minutos y viceversa', () => {
    expect(presetAForm('FUTSAL').inferioridadMin).toBe(2);
    expect(presetAForm('FUTBOL_11').inferioridadMin).toBeNull();
    const f = { ...presetAForm('FUTSAL'), inferioridadMin: 5 };
    expect(formAReglas(f).reglas.roja.inferioridadMs).toBe(300_000);
  });

  it('con las faltas apagadas no viajan límites de faltas', () => {
    const f = { ...presetAForm('FUTSAL'), registraFaltas: false };
    const { reglas, parametros } = formAReglas(f);
    expect(reglas.faltasPersonalesParaAmarilla).toBeNull();
    expect(parametros.limiteFaltasAcumuladas).toBeNull();
  });
});

describe('invariantes (4.14), cada una por separado y en su campo', () => {
  const base = presetAForm('FUTSAL');
  const campoDe = (cambio: Partial<typeof base>) => {
    const r = reglasFormSchema.safeParse({ ...base, ...cambio });
    return r.success ? [] : r.error.issues.map((i) => i.path[0]);
  };

  it('mínimo para jugar menor que los jugadores en cancha', () => {
    expect(campoDe({ minJugadoresPartido: 5 })).toContain('minJugadoresPartido');
  });
  it('convocados no menor que los jugadores en cancha', () => {
    expect(campoDe({ maxConvocados: 4 })).toContain('maxConvocados');
  });
  it('plantel mínimo no menor que el mínimo para jugar', () => {
    expect(campoDe({ rosterMin: 3 })).toContain('rosterMin');
  });
  it('plantel máximo no menor que los convocados', () => {
    expect(campoDe({ rosterMax: 10 })).toContain('rosterMax');
  });
  it('plantel mínimo no mayor que el máximo', () => {
    expect(campoDe({ rosterMin: 19 })).toContain('rosterMin');
  });
  it('con faltas encendidas hace falta un límite', () => {
    expect(campoDe({ limiteFaltasAcumuladas: null })).toContain('limiteFaltasAcumuladas');
  });
  it('un gol del rival solo cancela una inferioridad con duración', () => {
    expect(campoDe({ inferioridadMin: null, cancelaPorGolRival: true })).toContain(
      'cancelaPorGolRival',
    );
  });
  it('rechaza números inválidos con un mensaje en español', () => {
    const r = reglasFormSchema.safeParse({ ...base, rosterMax: Number.NaN });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe('Escribe un número.');
  });
});

describe('nombres', () => {
  it('«sub 18», «Sub-18» y «SUB18» son la misma categoría', () => {
    const n = normalizarNombre('Sub-18');
    expect(normalizarNombre('sub 18')).toBe(n);
    expect(normalizarNombre('SUB18')).toBe(n);
  });
  it('ignora tildes', () => {
    expect(normalizarNombre('Máster')).toBe(normalizarNombre('master'));
  });
  it('arma el slug de una liga', () => {
    expect(slugDeEdicion('Apertura 2026')).toBe('apertura-2026');
    expect(slugDeEdicion('  ¡Copa Ñandú!  ')).toBe('copa-nandu');
  });
});
