import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Teléfono internacional (con `+` y código de país) -> E.164, o `null` si no es válido. */
export function aE164(valor: string): string | null {
  const limpio = valor.trim();
  if (!limpio.startsWith('+')) return null;
  const tel = parsePhoneNumberFromString(limpio);
  return tel?.isValid() ? tel.number : null;
}

type Pais = { codigo: string; largos: number[]; troncal?: string };

/** Tabla de `FRONT_FASE_03.md` §9.1 (origen: `src/dominio/telefono.ts` del API). El API puede ampliarla sin avisar. */
const PAISES: Record<string, Pais> = {
  NI: { codigo: '505', largos: [8] },
  CR: { codigo: '506', largos: [8] },
  PA: { codigo: '507', largos: [7, 8] },
  HN: { codigo: '504', largos: [8] },
  GT: { codigo: '502', largos: [8] },
  SV: { codigo: '503', largos: [8] },
  EC: { codigo: '593', largos: [8, 9], troncal: '0' },
  CO: { codigo: '57', largos: [10] },
  MX: { codigo: '52', largos: [10] },
  US: { codigo: '1', largos: [10], troncal: '1' },
};

const POR_CODIGO = Object.values(PAISES).sort((a, b) => b.codigo.length - a.codigo.length);

/** Nacional válido para el país (quitando el troncal si con eso el largo queda bien), o `null`. */
function nacionalValido(p: Pais, digitos: string): string | null {
  const probar = (n: string) => (!n.startsWith('0') && p.largos.includes(n.length) ? n : null);
  const directo = probar(digitos);
  if (directo) return directo;
  if (p.troncal && digitos.startsWith(p.troncal)) return probar(digitos.slice(p.troncal.length));
  return null;
}

/**
 * Normaliza a E.164 igual que el API (§9.1), o `null` si no se puede. Es solo retroalimentación inmediata: el API
 * manda, así que quien la use debe **advertir** y no bloquear el envío.
 * `pais` es el ISO del cliente (`Organizacion.pais`).
 */
export function normalizarTelefono(valor: string, pais?: string | null): string | null {
  let t = valor.trim().replace(/[\s\-.()]/g, '');
  if (!t) return null;
  const conMas = t.startsWith('+');
  if (conMas) t = t.slice(1);
  if (!/^\d+$/.test(t)) return null;

  let internacional = conMas;
  if (!conMas && t.startsWith('00')) {
    internacional = true;
    t = t.slice(2);
  }

  if (internacional) {
    const p = POR_CODIGO.find((c) => t.startsWith(c.codigo));
    if (p) {
      const nacional = nacionalValido(p, t.slice(p.codigo.length));
      return nacional ? `+${p.codigo}${nacional}` : null;
    }
    return /^[1-9]\d{7,14}$/.test(t) ? `+${t}` : null;
  }

  const p = pais ? PAISES[pais.toUpperCase()] : undefined;
  if (!p) return null; // país no soportado: solo acepta internacional
  // También se acepta el código de país escrito sin `+`.
  if (t.startsWith(p.codigo)) {
    const conCodigo = nacionalValido(p, t.slice(p.codigo.length));
    if (conCodigo && !nacionalValido(p, t)) return `+${p.codigo}${conCodigo}`;
  }
  const nacional = nacionalValido(p, t);
  return nacional ? `+${p.codigo}${nacional}` : null;
}
