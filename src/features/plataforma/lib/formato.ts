import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Teléfono internacional (con `+` y código de país) -> E.164, o `null` si no es válido. */
export function aE164(valor: string): string | null {
  const limpio = valor.trim();
  if (!limpio.startsWith('+')) return null;
  const tel = parsePhoneNumberFromString(limpio);
  return tel?.isValid() ? tel.number : null;
}

/** "Liga Nica 2026" -> "liga-nica-2026" (cumple ^[a-z0-9]+(-[a-z0-9]+)*$ salvo longitud). */
export function slugDeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/** Si la API no trae `waMeUrl`, se arma con el teléfono (solo dígitos) y el enlace ya conocido. */
export function armarWaMeUrl(telefonoE164: string, enlace: string): string {
  const texto = `Te invito a administrar tu cuenta en Cancha Nica. Crea tu contraseña aquí: ${enlace}`;
  return `https://wa.me/${telefonoE164.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
}

/** Los conteos que el API aún no calcula llegan null o ausentes: se muestran «—», nunca 0. */
export function textoConteo(n: number | null | undefined): string {
  return n == null ? '—' : String(n);
}

export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}
