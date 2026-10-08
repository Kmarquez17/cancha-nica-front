import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Teléfono internacional (con `+` y código de país) -> E.164, o `null` si no es válido. */
export function aE164(valor: string): string | null {
  const limpio = valor.trim();
  if (!limpio.startsWith('+')) return null;
  const tel = parsePhoneNumberFromString(limpio);
  return tel?.isValid() ? tel.number : null;
}
