import { describe, expect, it } from 'vitest';
import { aE164, armarWaMeUrl, slugDeNombre } from '@/features/plataforma/lib/formato';
import {
  bloquearSchema,
  invitarSchema,
  ligaSchema,
  nuevaLigaSchema,
} from '@/features/plataforma/schemas';
import { definirPasswordSchema } from '@/features/auth/schemas';

describe('aE164', () => {
  it('normaliza teléfonos internacionales válidos', () => {
    expect(aE164('+505 8888 8888')).toBe('+50588888888');
    expect(aE164('+1 (202) 555-0123')).toBe('+12025550123');
  });

  it('rechaza sin + , inválidos o vacíos', () => {
    expect(aE164('88888888')).toBeNull();
    expect(aE164('+50')).toBeNull();
    expect(aE164('')).toBeNull();
  });
});

describe('slugDeNombre', () => {
  it('genera slugs válidos', () => {
    expect(slugDeNombre('Liga Nica 2026')).toBe('liga-nica-2026');
    expect(slugDeNombre('  Fútbol  Ñandú!! ')).toBe('futbol-nandu');
    expect(slugDeNombre('a'.repeat(60)).length).toBeLessThanOrEqual(40);
  });
});

describe('armarWaMeUrl', () => {
  it('usa solo dígitos y codifica el mensaje con el enlace', () => {
    const url = armarWaMeUrl('+50588888888', 'https://app/aceptar-invitacion?token=abc');
    expect(url.startsWith('https://wa.me/50588888888?text=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('https://app/aceptar-invitacion?token=abc');
  });
});

describe('ligaSchema', () => {
  const base = {
    nombre: 'Liga Nica',
    slug: 'liga-nica',
    telefonoContacto: '',
    zonaHoraria: '',
    moneda: '',
    pais: '',
    colorPrimario: '',
  };

  it('acepta opcionales vacíos', () => {
    expect(ligaSchema.safeParse(base).success).toBe(true);
  });

  it.each(['ab', 'Liga', 'liga--nica', '-liga', 'liga_nica', 'a'.repeat(41)])(
    'rechaza slug %s',
    (slug) => {
      expect(ligaSchema.safeParse({ ...base, slug }).success).toBe(false);
    },
  );

  it('valida moneda, país, color y teléfono', () => {
    expect(ligaSchema.safeParse({ ...base, moneda: 'nio' }).success).toBe(false);
    expect(ligaSchema.safeParse({ ...base, pais: 'NIC' }).success).toBe(false);
    expect(ligaSchema.safeParse({ ...base, colorPrimario: '#12345' }).success).toBe(false);
    expect(ligaSchema.safeParse({ ...base, telefonoContacto: '88888888' }).success).toBe(false);
    expect(
      ligaSchema.safeParse({
        ...base,
        moneda: 'NIO',
        pais: 'NI',
        colorPrimario: '#1A2b3C',
        telefonoContacto: '+50588888888',
      }).success,
    ).toBe(true);
  });
});

describe('nuevaLigaSchema / invitarSchema / bloquearSchema', () => {
  it('exige datos del dueño', () => {
    const r = nuevaLigaSchema.safeParse({
      nombre: 'Liga Nica',
      slug: 'liga-nica',
      telefonoContacto: '',
      zonaHoraria: '',
      moneda: '',
      pais: '',
      colorPrimario: '',
      duenoNombre: 'Ana',
      duenoEmail: 'no-es-correo',
      duenoTelefono: '',
      enviarEmail: true,
    });
    expect(r.success).toBe(false);
  });

  it('invitar: nombre 3–80 y correo válido', () => {
    expect(
      invitarSchema.safeParse({
        nombre: 'Ana López',
        email: 'a@b.com',
        telefono: '',
        enviarEmail: true,
      }).success,
    ).toBe(true);
    expect(
      invitarSchema.safeParse({ nombre: 'Al', email: 'a@b.com', telefono: '', enviarEmail: true })
        .success,
    ).toBe(false);
  });

  it('bloquear: motivo 3–500', () => {
    expect(bloquearSchema.safeParse({ motivo: 'ab' }).success).toBe(false);
    expect(bloquearSchema.safeParse({ motivo: 'Falta de pago' }).success).toBe(true);
    expect(bloquearSchema.safeParse({ motivo: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('definirPasswordSchema', () => {
  it('10–128, no repetido y coincide', () => {
    expect(definirPasswordSchema.safeParse({ password: 'corta', repetir: 'corta' }).success).toBe(
      false,
    );
    expect(
      definirPasswordSchema.safeParse({ password: 'a'.repeat(12), repetir: 'a'.repeat(12) })
        .success,
    ).toBe(false);
    expect(
      definirPasswordSchema.safeParse({ password: 'clave-segura-1', repetir: 'otra-cosa-123' })
        .success,
    ).toBe(false);
    expect(
      definirPasswordSchema.safeParse({ password: 'clave-segura-1', repetir: 'clave-segura-1' })
        .success,
    ).toBe(true);
  });
});
